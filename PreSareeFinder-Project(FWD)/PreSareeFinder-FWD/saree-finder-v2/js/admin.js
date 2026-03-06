/* ============================================================
   js/admin.js — Admin (Salesman) Panel Logic
   Hyderabad Saree Finder
   ============================================================
   Only loaded on admin-dashboard.html.
   Regular users never see this file.

   HOW PERSISTENCE IS USED HERE:
   ──────────────────────────────
   Every write operation in this file ends with a call to one
   of the three update functions defined in data.js:
     • updateImage(id, url)        → calls saveSareesToStorage()
     • updateDiscount(id, %, orig) → calls saveSareesToStorage()
     • updateStock(id, bool)       → calls saveSareesToStorage()

   After any of these, the change is permanent in localStorage
   and both admin re-render and the customer pages will reflect
   the updated data.

   DOM RE-RENDERING:
   After every change, renderAdminPanel() is called to rebuild
   the HTML table from the updated SAREES array so the admin
   sees the change immediately without a page refresh.
   ============================================================ */


/* ─────────────────────────────────────────────────────────────
   ADMIN UI STATE
   ───────────────────────────────────────────────────────────── */
var currentAdminSection = "inventory"; /* "inventory" | "add-saree" | "store-info" */
var editingSareeId       = null;        /* null = new saree | number = editing */


/* ═══════════════════════════════════════════════════════════════
   PANEL ENTRY POINT
   ═══════════════════════════════════════════════════════════════ */

/**
 * renderAdminPanel()
 * ───────────────────
 * Main render dispatcher. Called on page load and after every
 * data change to rebuild the admin UI from the current SAREES array.
 *
 * Because SAREES is always loaded from localStorage at page start
 * (by data.js), this function always shows the latest persisted data.
 */
function renderAdminPanel() {
  var session = getSession();
  if (!session || session.role !== "admin") return;

  /* Keep store name in header and sidebar up to date */
  var el = document.getElementById("adminStoreName");
  if (el) el.textContent = session.store;

  /* Highlight the active sidebar item */
  document.querySelectorAll(".sidebar-item").forEach(function(b) {
    b.classList.remove("active");
  });
  var activeBtn = document.getElementById("sidebar-" + currentAdminSection);
  if (activeBtn) activeBtn.classList.add("active");

  /* Render the correct section */
  if (currentAdminSection === "inventory")  renderInventory(session);
  if (currentAdminSection === "add-saree")  renderAddForm(session);
  if (currentAdminSection === "store-info") renderStoreInfo(session);
}


/**
 * goToSection(section)
 * ─────────────────────
 * Switch which admin section is visible.
 * Resets any editing state so the form always starts fresh.
 */
function goToSection(section) {
  currentAdminSection = section;
  editingSareeId      = null;
  renderAdminPanel();
}


/* ═══════════════════════════════════════════════════════════════
   SECTION 1: INVENTORY TABLE
   ═══════════════════════════════════════════════════════════════ */

/**
 * renderInventory(session)
 * ─────────────────────────
 * Builds the saree table for this admin's store.
 * Reads directly from the global SAREES array (loaded from localStorage).
 *
 * Each row has three quick-action buttons:
 *   ✏  Edit      → opens full edit form
 *   📷 Image     → inline image URL / file upload popup
 *   💰 Price     → inline price/discount popup
 *   📦 Stock     → toggles available/unavailable immediately
 *   🗑  Delete   → removes with confirmation
 */
function renderInventory(session) {
  var content = document.getElementById("adminContent");
  if (!content) return;

  /*
   * IMPORTANT: SAREES here is already the localStorage version
   * because data.js called loadSareesFromStorage() when it loaded.
   * We just filter for this admin's store.
   */
  var storeSarees = SAREES.filter(function(s) {
    return s.store === session.store;
  });

  var total     = storeSarees.length;
  var avail     = storeSarees.filter(function(s) { return s.available; }).length;
  var discounted= storeSarees.filter(function(s) { return s.discount > 0; }).length;

  var html = [
    '<div class="admin-section-header">',
    '  <h2>📦 Inventory</h2>',
    '  <p>Managing sarees for <strong>' + session.store + '</strong> — data auto-saved to browser storage</p>',
    '</div>',

    /* ── Stats bar ── */
    '<div class="stats-row">',
    '  <div class="stat-box"><span class="stat-num">' + total      + '</span><span class="stat-label">Total</span></div>',
    '  <div class="stat-box"><span class="stat-num">' + avail      + '</span><span class="stat-label">In Stock</span></div>',
    '  <div class="stat-box"><span class="stat-num">' + (total - avail) + '</span><span class="stat-label">Out of Stock</span></div>',
    '  <div class="stat-box"><span class="stat-num">' + discounted  + '</span><span class="stat-label">On Sale</span></div>',
    '</div>',

    /* ── Reset link (dev tool) ── */
    '<p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:14px">',
    '  <a href="#" onclick="confirmReset();return false;" style="color:var(--maroon)">',
    '  ↺ Reset all data to defaults</a>',
    '</p>',

    '<div style="overflow-x:auto">',
    '<table class="admin-table">',
    '<thead><tr>',
    '  <th>Image</th><th>Name</th><th>Category</th>',
    '  <th>Price / Discount</th><th>Stock</th><th>Actions</th>',
    '</tr></thead>',
    '<tbody>',
  ];

  if (storeSarees.length === 0) {
    html.push('<tr><td colspan="6" class="empty-row">No sarees yet — click "Add Saree".</td></tr>');
  } else {
    storeSarees.forEach(function(s) {
      /* Price display: show sale price + strikethrough original when discounted */
      var priceCell = s.discount > 0
        ? formatPrice(s.price) +
          ' <small style="text-decoration:line-through;color:#aaa">' + formatPrice(s.originalPrice) + '</small>' +
          ' <span class="discount-pill">-' + s.discount + '%</span>'
        : formatPrice(s.price);

      html.push(
        '<tr id="row-' + s.id + '">',

        /* Thumbnail — clicking opens the image update popup */
        '<td>',
        '  <img src="' + s.img + '" alt="' + s.name + '" class="table-thumb"',
        '       onerror="this.src=\'' + FALLBACK_IMG + '\'"',
        '       title="Click Edit to change image" style="cursor:pointer">',
        '</td>',

        '<td><strong>' + s.name + '</strong></td>',
        '<td>' + s.category + '</td>',
        '<td>' + priceCell + '</td>',

        /* Stock pill — colour coded */
        '<td>',
        '  <span class="status-pill ' + (s.available ? 'status-avail' : 'status-unavail') + '">',
        '    ' + (s.available ? '✓ In Stock' : '✗ Out of Stock'),
        '  </span>',
        '</td>',

        /* Action buttons */
        '<td class="action-cell">',
        '  <button class="tbl-btn edit-btn"   onclick="editSaree(' + s.id + ')">✏ Edit</button>',
        '  <button class="tbl-btn img-btn"    onclick="showImagePopup(' + s.id + ')">📷 Image</button>',
        '  <button class="tbl-btn price-btn"  onclick="showPricePopup(' + s.id + ')">💰 Price</button>',
        '  <button class="tbl-btn toggle-btn" onclick="quickToggleStock(' + s.id + ')">',
        '    ' + (s.available ? '📦 Out of Stock' : '✅ In Stock'),
        '  </button>',
        '  <button class="tbl-btn delete-btn" onclick="deleteSaree(' + s.id + ')">🗑 Delete</button>',
        '</td>',

        '</tr>',

        /*
         * INLINE POPUP ROWS — hidden by default.
         * Shown when admin clicks 📷 Image or 💰 Price.
         * This keeps the workflow fast without navigating away.
         */

        /* Image update popup row */
        '<tr id="imgPopup-' + s.id + '" style="display:none;background:var(--gold-pale)">',
        '  <td colspan="6" style="padding:16px">',
        '    <strong style="color:var(--maroon)">📷 Update Image for: ' + s.name + '</strong>',
        '    <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;align-items:flex-end">',

        /* Option 1: URL input */
        '      <div style="flex:1;min-width:200px">',
        '        <label style="font-size:0.78rem;font-weight:700;color:var(--maroon);display:block;margin-bottom:4px">Paste Image URL</label>',
        '        <input type="url" id="imgUrl-' + s.id + '" value="' + s.img + '"',
        '               style="width:100%;padding:9px 12px;border:2px solid var(--cream-dark);border-radius:6px;font-size:0.88rem"',
        '               placeholder="https://example.com/saree.jpg"',
        '               oninput="previewNewImg(' + s.id + ', this.value)">',
        '      </div>',

        /* Option 2: File upload */
        '      <div>',
        '        <label style="font-size:0.78rem;font-weight:700;color:var(--maroon);display:block;margin-bottom:4px">Or Upload File</label>',
        '        <input type="file" accept="image/*" id="imgFile-' + s.id + '"',
        '               onchange="handleFileUpload(' + s.id + ', this)">',
        '      </div>',

        /* Preview */
        '      <img id="imgPreviewInline-' + s.id + '" src="' + s.img + '"',
        '           style="width:60px;height:70px;object-fit:cover;border-radius:6px;border:2px solid var(--maroon)"',
        '           onerror="this.src=\'' + FALLBACK_IMG + '\'">',

        '      <div style="display:flex;gap:8px">',
        '        <button class="tbl-btn edit-btn" onclick="applyImageUpdate(' + s.id + ')">✓ Save Image</button>',
        '        <button class="tbl-btn toggle-btn" onclick="hidePopup(\'imgPopup-' + s.id + '\')">✕ Cancel</button>',
        '      </div>',
        '    </div>',
        '  </td>',
        '</tr>',

        /* Price/discount popup row */
        '<tr id="pricePopup-' + s.id + '" style="display:none;background:var(--gold-pale)">',
        '  <td colspan="6" style="padding:16px">',
        '    <strong style="color:var(--maroon)">💰 Update Price for: ' + s.name + '</strong>',
        '    <div style="display:flex;gap:14px;margin-top:10px;flex-wrap:wrap;align-items:flex-end">',

        '      <div>',
        '        <label style="font-size:0.78rem;font-weight:700;color:var(--maroon);display:block;margin-bottom:4px">Original Price (₹)</label>',
        '        <input type="number" id="origPrice-' + s.id + '" value="' + s.originalPrice + '" min="1"',
        '               style="width:130px;padding:9px 12px;border:2px solid var(--cream-dark);border-radius:6px;font-size:0.88rem"',
        '               oninput="previewDiscount(' + s.id + ')">',
        '      </div>',

        '      <div>',
        '        <label style="font-size:0.78rem;font-weight:700;color:var(--maroon);display:block;margin-bottom:4px">Discount (%)</label>',
        '        <input type="number" id="discPct-' + s.id + '" value="' + s.discount + '" min="0" max="90"',
        '               style="width:100px;padding:9px 12px;border:2px solid var(--cream-dark);border-radius:6px;font-size:0.88rem"',
        '               oninput="previewDiscount(' + s.id + ')">',
        '      </div>',

        '      <div>',
        '        <span style="font-size:0.78rem;font-weight:700;color:var(--maroon);display:block;margin-bottom:4px">Sale Price Preview</span>',
        '        <span id="pricePreview-' + s.id + '" style="font-size:1.1rem;font-weight:800;color:var(--maroon)">',
        '          ' + formatPrice(s.price),
        '        </span>',
        '      </div>',

        '      <div style="display:flex;gap:8px">',
        '        <button class="tbl-btn edit-btn" onclick="applyPriceUpdate(' + s.id + ')">✓ Save Price</button>',
        '        <button class="tbl-btn toggle-btn" onclick="hidePopup(\'pricePopup-' + s.id + '\')">✕ Cancel</button>',
        '      </div>',
        '    </div>',
        '  </td>',
        '</tr>',
      );
    });
  }

  html.push('</tbody></table></div>');
  content.innerHTML = html.join('\n');
}


/* ═══════════════════════════════════════════════════════════════
   QUICK INLINE UPDATE ACTIONS
   These are called from the inventory table buttons.
   They use the three update functions from data.js.
   ═══════════════════════════════════════════════════════════════ */

/* ── Popup helpers ── */

/** Show one of the inline popup rows and hide all others. */
function showImagePopup(sareeId) {
  hideAllPopups();
  var row = document.getElementById("imgPopup-" + sareeId);
  if (row) row.style.display = "table-row";
}

function showPricePopup(sareeId) {
  hideAllPopups();
  var row = document.getElementById("pricePopup-" + sareeId);
  if (row) row.style.display = "table-row";
}

function hidePopup(rowId) {
  var row = document.getElementById(rowId);
  if (row) row.style.display = "none";
}

function hideAllPopups() {
  document.querySelectorAll('[id^="imgPopup-"], [id^="pricePopup-"]').forEach(function(r) {
    r.style.display = "none";
  });
}


/* ── Image update ── */

/**
 * previewNewImg(sareeId, url)
 * Update the small preview thumbnail in the image popup as the admin types.
 */
function previewNewImg(sareeId, url) {
  var preview = document.getElementById("imgPreviewInline-" + sareeId);
  if (preview && url) preview.src = url;
}

/**
 * handleFileUpload(sareeId, inputEl)
 * When admin picks a file from disk, read it as base64 and preview it.
 * The base64 string is what gets saved (works without a server).
 */
function handleFileUpload(sareeId, inputEl) {
  var file = inputEl.files[0];
  if (!file) return;

  /* FileReader converts the image file to a base64 data URL */
  var reader = new FileReader();
  reader.onload = function(e) {
    var dataUrl = e.target.result; /* "data:image/jpeg;base64,..." */

    /* Put the base64 URL into the URL input so applyImageUpdate() can read it */
    var urlInput = document.getElementById("imgUrl-" + sareeId);
    if (urlInput) urlInput.value = dataUrl;

    /* Also update the preview thumbnail */
    previewNewImg(sareeId, dataUrl);
  };
  reader.readAsDataURL(file);
}

/**
 * applyImageUpdate(sareeId)
 * Read the URL from the popup input and call updateImage() from data.js.
 *
 * updateImage() updates the SAREES array AND saves to localStorage.
 * Then we re-render the panel so the table thumb updates immediately.
 */
function applyImageUpdate(sareeId) {
  var urlInput = document.getElementById("imgUrl-" + sareeId);
  if (!urlInput) return;

  var newUrl = urlInput.value.trim();
  if (!newUrl) {
    showToast("Please enter an image URL or upload a file.", "error");
    return;
  }

  /* ── CALL THE PERSISTENCE FUNCTION ── */
  var ok = updateImage(sareeId, newUrl);

  if (ok) {
    showToast("Image updated and saved ✓");
    renderAdminPanel(); /* Rebuild table so new thumb shows immediately */
  } else {
    showToast("Saree not found.", "error");
  }
}


/* ── Price / discount update ── */

/**
 * previewDiscount(sareeId)
 * Show the calculated sale price live as the admin types.
 */
function previewDiscount(sareeId) {
  var origInput = document.getElementById("origPrice-" + sareeId);
  var discInput = document.getElementById("discPct-"   + sareeId);
  var preview   = document.getElementById("pricePreview-" + sareeId);
  if (!origInput || !preview) return;

  var orig = parseInt(origInput.value) || 0;
  var disc = parseInt(discInput ? discInput.value : 0) || 0;
  var sale = disc > 0 ? Math.round(orig - (orig * disc / 100)) : orig;

  preview.textContent = orig > 0 ? formatPrice(sale) : "—";
}

/**
 * applyPriceUpdate(sareeId)
 * Read original price and discount from the popup, then call
 * updateDiscount() from data.js to persist the change.
 */
function applyPriceUpdate(sareeId) {
  var origInput = document.getElementById("origPrice-" + sareeId);
  var discInput = document.getElementById("discPct-"   + sareeId);
  if (!origInput) return;

  var orig = parseInt(origInput.value) || 0;
  var disc = parseInt(discInput ? discInput.value : 0) || 0;

  if (orig < 1) {
    showToast("Please enter a valid price.", "error");
    return;
  }

  /* ── CALL THE PERSISTENCE FUNCTION ── */
  var ok = updateDiscount(sareeId, disc, orig);

  if (ok) {
    var saree = SAREES.find(function(s) { return s.id === sareeId; });
    showToast('"' + (saree ? saree.name : "Saree") + '" price updated and saved ✓');
    renderAdminPanel();
  } else {
    showToast("Saree not found.", "error");
  }
}


/* ── Stock toggle ── */

/**
 * quickToggleStock(sareeId)
 * One-click toggle from the inventory table.
 * Calls updateStock() from data.js to persist the change.
 */
function quickToggleStock(sareeId) {
  var id    = Number(sareeId); /* coerce for safe === comparison */
  var saree = SAREES.find(function(s) { return s.id === id; });
  if (!saree) return;

  var newStatus = !saree.available;

  /* ── CALL THE PERSISTENCE FUNCTION ── */
  updateStock(id, newStatus);

  showToast('"' + saree.name + '" marked ' + (newStatus ? 'In Stock ✓' : 'Out of Stock'));
  renderAdminPanel(); /* Re-render so status pill and button label update */
}


/* ═══════════════════════════════════════════════════════════════
   SECTION 2: ADD / EDIT SAREE FORM
   (Full form for all fields at once)
   ═══════════════════════════════════════════════════════════════ */

/**
 * renderAddForm(session)
 * ───────────────────────
 * Shows the full add/edit form.
 * When editingSareeId is set, pre-fills with that saree's data.
 */
function renderAddForm(session) {
  var content = document.getElementById("adminContent");
  if (!content) return;

  var isEditing = editingSareeId !== null;
  var saree     = isEditing
    ? SAREES.find(function(s) { return s.id === editingSareeId; })
    : null;

  var catOptions = ["Fancy","Wedding","Traditional","Daily Wear","Comfortable"].map(function(cat) {
    return '<option value="' + cat + '" ' + (saree && saree.category === cat ? 'selected' : '') + '>' + cat + '</option>';
  }).join('');

  content.innerHTML = [
    '<div class="admin-section-header">',
    '  <h2>' + (isEditing ? '✏ Edit Saree' : '➕ Add New Saree') + '</h2>',
    '  <p>' + (isEditing ? 'Update all fields below — changes are saved to browser storage on submit.' : 'Add a new saree to ' + session.store + '.') + '</p>',
    '</div>',

    '<form class="admin-form" onsubmit="saveSaree(event)">',

    '<div class="form-row">',
    '  <div class="form-group"><label>Saree Name *</label>',
    '    <input type="text" id="fName" value="' + (saree ? saree.name : '') + '" placeholder="e.g. Kanchipuram Silk" required>',
    '  </div>',
    '  <div class="form-group"><label>Category *</label>',
    '    <select id="fCat">' + catOptions + '</select>',
    '  </div>',
    '</div>',

    '<div class="form-row">',
    '  <div class="form-group"><label>Original Price (₹) *</label>',
    '    <input type="number" id="fOriginalPrice" value="' + (saree ? saree.originalPrice : '') + '" min="1" required oninput="calcDiscountedPrice()">',
    '  </div>',
    '  <div class="form-group"><label>Discount (%) — 0 for none</label>',
    '    <input type="number" id="fDiscount" value="' + (saree ? saree.discount : '0') + '" min="0" max="90" oninput="calcDiscountedPrice()">',
    '  </div>',
    '</div>',

    '<p id="discountPreview" style="font-size:0.85rem;color:var(--maroon);margin-bottom:14px;min-height:18px"></p>',

    '<div class="form-row">',
    '  <div class="form-group"><label>Store Location *</label>',
    '    <input type="text" id="fLocation" value="' + (saree ? saree.location : session.location) + '" required>',
    '  </div>',
    '  <div class="form-group"><label>Availability</label>',
    '    <select id="fAvailable">',
    '      <option value="true"  ' + (saree && saree.available  ? 'selected' : '') + '>In Stock</option>',
    '      <option value="false" ' + (saree && !saree.available ? 'selected' : '') + '>Out of Stock</option>',
    '    </select>',
    '  </div>',
    '</div>',

    /* Image: URL field + file upload + preview */
    '<div class="form-group"><label>Image — paste URL or upload file</label>',
    '  <input type="url" id="fImg" value="' + (saree ? saree.img : '') + '"',
    '         placeholder="https://example.com/saree.jpg"',
    '         oninput="updateFormPreview()">',
    '  <div style="margin-top:8px;display:flex;align-items:center;gap:12px">',
    '    <input type="file" accept="image/*" id="fFile" onchange="handleFormFileUpload(this)">',
    '    <img id="fImgPreview" src="' + (saree ? saree.img : '') + '"',
    '         style="width:60px;height:70px;object-fit:cover;border-radius:6px;border:2px solid var(--cream-dark);' + (saree ? '' : 'display:none') + '"',
    '         onerror="this.style.display=\'none\'">',
    '  </div>',
    '</div>',

    '<div class="form-group"><label>Description</label>',
    '  <textarea id="fDesc" rows="3">' + (saree ? saree.desc : '') + '</textarea>',
    '</div>',

    '<p id="formError" class="form-error" style="display:none"></p>',

    '<div class="form-btns">',
    '  <button type="submit" class="btn-primary">' + (isEditing ? 'Update Saree' : 'Add Saree') + '</button>',
    isEditing ? '<button type="button" class="btn-cancel" onclick="goToSection(\'inventory\')">Cancel</button>' : '',
    '</div>',

    '</form>',
  ].join('\n');

  calcDiscountedPrice();
}

/* Live price preview inside the form */
function calcDiscountedPrice() {
  var orig = parseInt((document.getElementById("fOriginalPrice") || {}).value) || 0;
  var disc = parseInt((document.getElementById("fDiscount")      || {}).value) || 0;
  var el   = document.getElementById("discountPreview");
  if (!el) return;
  if (orig > 0 && disc > 0) {
    var sale = Math.round(orig - orig * disc / 100);
    el.textContent = "Sale price: " + formatPrice(sale) + " (saving " + formatPrice(orig - sale) + ")";
  } else if (orig > 0) {
    el.textContent = "Price: " + formatPrice(orig);
  } else {
    el.textContent = "";
  }
}

/* Image preview inside the full form */
function updateFormPreview() {
  var url     = (document.getElementById("fImg") || {}).value || "";
  var preview = document.getElementById("fImgPreview");
  if (preview && url) { preview.src = url; preview.style.display = "block"; }
}

/* File upload for the full edit form (converts to base64) */
function handleFormFileUpload(inputEl) {
  var file = inputEl.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var urlInput = document.getElementById("fImg");
    if (urlInput) urlInput.value = e.target.result;
    updateFormPreview();
  };
  reader.readAsDataURL(file);
}

/**
 * saveSaree(event)
 * ─────────────────
 * Handles form submit for both Add and Edit modes.
 * After writing to SAREES it calls saveSareesToStorage() via
 * the updateImage / updateDiscount / updateStock helpers, OR
 * directly for a new saree.
 */
function saveSaree(event) {
  event.preventDefault();

  var session = getSession();
  if (!session || session.role !== "admin") return;

  var name          = document.getElementById("fName").value.trim();
  var category      = document.getElementById("fCat").value;
  var originalPrice = parseInt(document.getElementById("fOriginalPrice").value);
  var discount      = parseInt(document.getElementById("fDiscount").value) || 0;
  var location      = document.getElementById("fLocation").value.trim();
  var available     = document.getElementById("fAvailable").value === "true";
  var img           = document.getElementById("fImg").value.trim() || SAREE_IMAGES[0];
  var desc          = document.getElementById("fDesc").value.trim();
  var price         = discount > 0
    ? Math.round(originalPrice - originalPrice * discount / 100)
    : originalPrice;

  if (!name || !originalPrice || !location) {
    showFormError("formError", "Please fill in all required fields.");
    return;
  }

  if (editingSareeId !== null) {
    /* ── UPDATE EXISTING: modify SAREES in place then persist ── */
    var targetId = Number(editingSareeId); /* coerce — same safety as update functions */
    var saree = SAREES.find(function(s) { return s.id === targetId; });
    if (saree) {
      saree.name          = name;
      saree.category      = category;
      saree.originalPrice = originalPrice;
      saree.discount      = discount;
      saree.price         = price;
      saree.location      = location;
      saree.available     = available;
      saree.img           = img;
      saree.desc          = desc;
    }
    saveSareesToStorage(); /* ← Persist the full update to localStorage */
    showToast('"' + name + '" updated and saved ✓');
  } else {
    /* ── ADD NEW: push to SAREES array then persist ── */
    SAREES.push({
      id:            Date.now(),
      name:          name,
      category:      category,
      store:         session.store,
      location:      location,
      originalPrice: originalPrice,
      discount:      discount,
      price:         price,
      available:     available,
      img:           img,
      desc:          desc,
    });
    saveSareesToStorage(); /* ← Persist the new entry to localStorage */
    showToast('"' + name + '" added and saved ✓');
  }

  editingSareeId      = null;
  currentAdminSection = "inventory";
  renderAdminPanel();
}


/* ═══════════════════════════════════════════════════════════════
   EDIT / DELETE FROM TABLE
   ═══════════════════════════════════════════════════════════════ */

/** Open the full edit form for a saree. */
function editSaree(sareeId) {
  editingSareeId      = sareeId;
  currentAdminSection = "add-saree";
  document.querySelectorAll(".sidebar-item").forEach(function(b) { b.classList.remove("active"); });
  var btn = document.getElementById("sidebar-add-saree");
  if (btn) btn.classList.add("active");
  renderAdminPanel();
}

/**
 * deleteSaree(sareeId)
 * Removes the saree from SAREES, persists with saveSareesToStorage(),
 * and re-renders the table.
 */
function deleteSaree(sareeId) {
  var id    = Number(sareeId); /* coerce for safe === comparison */
  var saree = SAREES.find(function(s) { return s.id === id; });
  if (!saree) return;

  if (!confirm('Delete "' + saree.name + '"?\n\nThis cannot be undone.')) return;

  SAREES.splice(SAREES.findIndex(function(s) { return s.id === id; }), 1);
  saveSareesToStorage(); /* ← Persist the deletion */

  showToast('"' + saree.name + '" deleted.');
  renderAdminPanel();
}

/** Wipe all data and restore defaults. */
function confirmReset() {
  if (confirm("Reset ALL saree data to factory defaults?\n\nAll admin changes will be lost.")) {
    resetDataStore(); /* defined in data.js */
    renderAdminPanel();
  }
}


/* ═══════════════════════════════════════════════════════════════
   SECTION 3: STORE INFO
   ═══════════════════════════════════════════════════════════════ */
function renderStoreInfo(session) {
  var content = document.getElementById("adminContent");
  if (!content) return;

  content.innerHTML = [
    '<div class="admin-section-header">',
    '  <h2>🏪 Store Information</h2>',
    '  <p>View and update your store details.</p>',
    '</div>',
    '<div class="store-info-card">',
    '  <div class="form-group"><label>Store Name</label>',
    '    <input value="' + session.store + '" readonly style="opacity:.7"></div>',
    '  <div class="form-group"><label>Store Location</label>',
    '    <input id="siLocation" value="' + session.location + '"></div>',
    '  <div class="form-group"><label>Admin Name</label>',
    '    <input value="' + session.name + '" readonly style="opacity:.7"></div>',
    '  <div class="form-group"><label>Contact Email</label>',
    '    <input type="email" id="siEmail" value="' + session.email + '"></div>',
    '  <div class="form-group"><label>Contact Phone</label>',
    '    <input type="tel" id="siPhone" placeholder="+91 99999 99999"></div>',
    '  <div class="form-group"><label>Store Hours</label>',
    '    <input id="siHours" value="Mon–Sat: 10AM–8PM, Sun: 11AM–6PM"></div>',
    '  <button class="btn-primary" style="max-width:200px"',
    '          onclick="showToast(\'Store info saved ✓\')">Save Changes</button>',
    '</div>',
  ].join('\n');
}


/* ─────────────────────────────────────────────────────────────
   FORM ERROR HELPER (used in auth.js too)
   ───────────────────────────────────────────────────────────── */
function showFormError(id, msg) {
  var el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = "block"; }
}

/* Alias so auth.js works without changes */
function clearFormError(id) {
  var el = document.getElementById(id);
  if (el) { el.textContent = ""; el.style.display = "none"; }
}
