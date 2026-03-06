/* ============================================================
   js/user.js — Customer-Side Logic
   Hyderabad Saree Finder
   ============================================================
   Loaded ONLY on customer pages (never on admin pages).

   ★ HOW THIS FILE USES PERSISTENT DATA ★
   ────────────────────────────────────────
   This file never maintains its own copy of saree data.
   Every function that needs saree information reads directly
   from the global SAREES array, which is defined and kept
   up-to-date by data.js via localStorage.

   Loading sequence on every customer page:
     1. <script src="../js/data.js"> runs first
     2. data.js calls loadSareesFromStorage() immediately
     3. SAREES[] is populated from localStorage (admin changes included)
     4. <script src="../js/user.js"> runs next
     5. Page-specific code calls renderSareeGrid(), etc.
     6. Those functions read from SAREES[] — always the latest version

   Result: Customers always see admin's latest changes automatically,
   even after a page refresh or new login.

   ★ WISHLIST & CART STORAGE ★
   ────────────────────────────
   Wishlist and cart store only saree IDs (not full objects).
   They live in localStorage so they persist across sessions.
   Keys: "hsf_wishlist"  and  "hsf_cart"
   ============================================================ */


/* ═══════════════════════════════════════════════════════════════
   WISHLIST — stored in localStorage (persists between sessions)
   ═══════════════════════════════════════════════════════════════ */

/**
 * getWishlist()
 * Returns the wishlist as an array of saree IDs (integers).
 * Reads from localStorage so it survives page refreshes.
 */
function getWishlist() {
  try {
    var raw = localStorage.getItem("hsf_wishlist");
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

/**
 * saveWishlist(list)
 * Writes the wishlist array to localStorage.
 * @param {number[]} list - Array of saree IDs
 */
function saveWishlist(list) {
  try { localStorage.setItem("hsf_wishlist", JSON.stringify(list)); }
  catch (e) { console.warn("Could not save wishlist:", e); }
}


/* ═══════════════════════════════════════════════════════════════
   CART — stored in localStorage (persists between sessions)
   ═══════════════════════════════════════════════════════════════ */

/**
 * getCart()
 * Returns the cart as an array of saree IDs.
 */
function getCart() {
  try {
    var raw = localStorage.getItem("hsf_cart");
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

/**
 * saveCart(list)
 * @param {number[]} list - Array of saree IDs
 */
function saveCart(list) {
  try { localStorage.setItem("hsf_cart", JSON.stringify(list)); }
  catch (e) { console.warn("Could not save cart:", e); }
}


/* ═══════════════════════════════════════════════════════════════
   SAREE CARD — build one card's HTML
   ═══════════════════════════════════════════════════════════════ */

/**
 * buildSareeCard(saree)
 * ─────────────────────
 * Creates the HTML markup for one saree card in the grid.
 * Reads availability, price, discount, and image from the saree
 * object — which came from SAREES[] — which came from localStorage.
 * So if the admin updated the price yesterday, the card shows
 * today's price automatically.
 *
 * @param {Object} saree - One entry from the SAREES array
 * @returns {string} HTML string
 */
function buildSareeCard(saree) {
  var wishlist   = getWishlist();
  var cart       = getCart();
  var inWishlist = wishlist.indexOf(saree.id) > -1;
  var inCart     = cart.indexOf(saree.id) > -1;

  /* Discount badge — only rendered when admin has set a discount */
  var discountBadge = saree.discount > 0
    ? '<span class="discount-badge">-' + saree.discount + '%</span>'
    : '';

  /* Price row — shows sale price with strikethrough original when discounted */
  var priceHtml = saree.discount > 0
    ? '<span class="price-now">' + formatPrice(saree.price) + '</span>'
    + ' <span class="price-was">' + formatPrice(saree.originalPrice) + '</span>'
    : '<span class="price-now">' + formatPrice(saree.price) + '</span>';

  /* Overlay shown when admin has marked this saree Out of Stock */
  var stockOverlay = !saree.available
    ? '<div class="out-of-stock-overlay">Out of Stock</div>'
    : '';

  return [
    '<div class="saree-card" id="card-' + saree.id + '">',
    '  <div class="card-img-wrap">',

    /* Image — src comes from saree.img which is persisted in localStorage */
    '    <img src="' + saree.img + '" alt="' + saree.name + '" loading="lazy"',
    '         onerror="this.src=\'' + FALLBACK_IMG + '\'">',

    '    <span class="cat-badge">' + saree.category + '</span>',
    '    ' + discountBadge,

    /* Heart button — toggles wishlist */
    '    <button class="wish-btn ' + (inWishlist ? 'wished' : '') + '"',
    '            onclick="toggleWishlist(' + saree.id + ')"',
    '            title="' + (inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist') + '">',
    '      ' + (inWishlist ? '♥' : '♡'),
    '    </button>',

    /* Stock overlay — shown/hidden based on admin's updateStock() call */
    '    ' + stockOverlay,
    '  </div>',

    '  <div class="card-body">',
    '    <h3 class="card-name">' + saree.name + '</h3>',
    '    <p class="card-store">🏪 ' + saree.store + ' &nbsp;·&nbsp; 📍 ' + saree.location.split(',')[0] + '</p>',

    /* Price — reflects updateDiscount() changes from admin */
    '    <div class="card-price">' + priceHtml + '</div>',

    '    <div class="card-actions">',
    '      <button class="btn-outline" onclick="openSareeModal(' + saree.id + ')">👁 Preview</button>',

    /* Add to Cart — disabled when admin marks Out of Stock */
    '      <button class="btn-cart ' + (inCart ? 'in-cart' : '') + '"',
    '              onclick="toggleCart(' + saree.id + ')"',
    '              ' + (!saree.available ? 'disabled' : '') + '>',
    '        ' + (inCart ? '✓ In Cart' : '🛍 Add'),
    '      </button>',
    '    </div>',
    '  </div>',
    '</div>',
  ].join('\n');
}


/* ═══════════════════════════════════════════════════════════════
   SAREE GRID — render the filtered listing
   ═══════════════════════════════════════════════════════════════ */

/**
 * renderSareeGrid(gridId, countId, searchVal, catVal, priceVal)
 * ──────────────────────────────────────────────────────────────
 * Filters the global SAREES array and injects cards into the DOM.
 *
 * Called on:
 *   - Initial page load (shows all sarees)
 *   - Every filter/search change
 *   - After toggleWishlist / toggleCart (to refresh button states)
 *
 * SAREES is always the localStorage version, so any admin updates
 * (price, image, stock) will appear here after next page load.
 *
 * @param {string} gridId    - id of the <div> to fill with cards
 * @param {string} countId   - id of a <span> to show "X sarees found"
 * @param {string} searchVal - text search string (or "")
 * @param {string} catVal    - category name or "All"
 * @param {string} priceVal  - "all" | "0-2000" | "2000-5000" etc.
 */
function renderSareeGrid(gridId, countId, searchVal, catVal, priceVal) {
  var grid = document.getElementById(gridId);
  if (!grid) return;

  /* Normalise inputs */
  searchVal = (searchVal || '').toLowerCase().trim();
  catVal    = catVal  || 'All';
  priceVal  = priceVal || 'all';

  /* ── Filter SAREES[] based on active filters ── */
  var filtered = SAREES.filter(function(s) {

    /* Text search across name, store, category, location */
    var matchSearch = !searchVal
      || s.name.toLowerCase().indexOf(searchVal)     > -1
      || s.store.toLowerCase().indexOf(searchVal)    > -1
      || s.category.toLowerCase().indexOf(searchVal) > -1
      || s.location.toLowerCase().indexOf(searchVal) > -1;

    /* Category pill filter */
    var matchCat = (catVal === 'All') || (s.category === catVal);

    /* Price range filter — "min-max" format */
    var matchPrice = true;
    if (priceVal !== 'all') {
      var parts    = priceVal.split('-');
      var minPrice = parseInt(parts[0]);
      var maxPrice = parseInt(parts[1]);
      matchPrice   = s.price >= minPrice && s.price <= maxPrice;
    }

    return matchSearch && matchCat && matchPrice;
  });

  /* Update result count label */
  if (countId) {
    var countEl = document.getElementById(countId);
    if (countEl) countEl.textContent = filtered.length + ' sarees found';
  }

  /* Render cards or empty-state message */
  if (filtered.length === 0) {
    grid.innerHTML = [
      '<div class="empty-state">',
      '  <span class="empty-icon">🔍</span>',
      '  <p>No sarees match your filters.</p>',
      '  <small>Try different keywords or clear the filters.</small>',
      '</div>',
    ].join('');
  } else {
    grid.innerHTML = filtered.map(buildSareeCard).join('');
  }
}


/* ═══════════════════════════════════════════════════════════════
   WISHLIST ACTIONS
   ═══════════════════════════════════════════════════════════════ */

/**
 * toggleWishlist(sareeId)
 * ────────────────────────
 * Add or remove a saree from the wishlist.
 * Saves to localStorage and refreshes the current view.
 */
function toggleWishlist(sareeId) {
  var list  = getWishlist();
  var index = list.indexOf(sareeId);

  if (index > -1) {
    list.splice(index, 1);
    showToast('Removed from wishlist.');
  } else {
    list.push(sareeId);
    showToast('Added to wishlist ♡');
  }

  saveWishlist(list);
  updateBadgeCounts();

  /* Re-render whichever grid is currently visible */
  if (typeof currentFilters !== 'undefined') {
    renderSareeGrid('sareeGrid', 'sareeCount',
      currentFilters.search, currentFilters.cat, currentFilters.price);
  }
  if (document.getElementById('wishlistGrid')) {
    renderWishlistPage();
  }
}


/* ═══════════════════════════════════════════════════════════════
   CART ACTIONS
   ═══════════════════════════════════════════════════════════════ */

/**
 * toggleCart(sareeId)
 * ────────────────────
 * Add or remove a saree from the cart.
 *
 * Reads saree.available from SAREES[] — so if the admin marked
 * it Out of Stock, this function will block adding it to cart
 * even if the customer somehow calls it directly.
 */
function toggleCart(sareeId) {
  /*
   * Re-read from SAREES[] (which is from localStorage) to get
   * the CURRENT availability — not a stale cached value.
   */
  var saree = SAREES.find(function(s) { return s.id === sareeId; });
  if (!saree) return;

  if (!saree.available) {
    showToast('This saree is currently out of stock.', 'error');
    return;
  }

  var list  = getCart();
  var index = list.indexOf(sareeId);

  if (index > -1) {
    list.splice(index, 1);
    showToast('Removed from cart.');
  } else {
    list.push(sareeId);
    showToast('Added to cart 🛍');
  }

  saveCart(list);
  updateBadgeCounts();

  /* Re-render whichever view is active */
  if (typeof currentFilters !== 'undefined') {
    renderSareeGrid('sareeGrid', 'sareeCount',
      currentFilters.search, currentFilters.cat, currentFilters.price);
  }
  if (document.getElementById('cartItems')) {
    renderCartPage();
  }
}


/* ═══════════════════════════════════════════════════════════════
   NAV BADGE COUNTS
   ═══════════════════════════════════════════════════════════════ */

/**
 * updateBadgeCounts()
 * Updates the little number bubbles on Wishlist and Cart nav links.
 */
function updateBadgeCounts() {
  var wBadge = document.getElementById('wishlistBadge');
  var cBadge = document.getElementById('cartBadge');
  if (wBadge) wBadge.textContent = getWishlist().length;
  if (cBadge) cBadge.textContent = getCart().length;
}


/* ═══════════════════════════════════════════════════════════════
   WISHLIST PAGE
   ═══════════════════════════════════════════════════════════════ */

/**
 * renderWishlistPage()
 * ─────────────────────
 * Renders wishlist.html content.
 *
 * Gets wishlist IDs from localStorage, then looks up each saree
 * from SAREES[] (which reflects the latest admin changes).
 * So if the admin updated a price and the customer refreshes
 * the wishlist page, they'll see the new price automatically.
 */
function renderWishlistPage() {
  var grid    = document.getElementById('wishlistGrid');
  var countEl = document.getElementById('wishlistCount');
  if (!grid) return;

  var ids   = getWishlist();
  /* Look up full saree data from SAREES[] (localStorage version) */
  var items = SAREES.filter(function(s) { return ids.indexOf(s.id) > -1; });

  if (countEl) {
    countEl.textContent = ids.length + ' saved item' + (ids.length !== 1 ? 's' : '');
  }

  if (items.length === 0) {
    grid.innerHTML = [
      '<div class="empty-state">',
      '  <span class="empty-icon">♡</span>',
      '  <p>Your wishlist is empty.</p>',
      '  <a href="sarees.html" class="btn-primary"',
      '     style="display:inline-block;margin-top:14px;text-decoration:none;padding:10px 24px;border-radius:8px">',
      '    Browse Sarees',
      '  </a>',
      '</div>',
    ].join('');
  } else {
    grid.innerHTML = items.map(buildSareeCard).join('');
  }
}


/* ═══════════════════════════════════════════════════════════════
   CART PAGE
   ═══════════════════════════════════════════════════════════════ */

/**
 * renderCartPage()
 * ─────────────────
 * Renders cart.html — item list on the left, order summary on the right.
 *
 * Like renderWishlistPage, this reads saree details (price, image)
 * from SAREES[] which is always the localStorage version.
 * If the admin changed a price between the customer adding to cart
 * and visiting the cart page, the customer sees the updated price.
 */
function renderCartPage() {
  var container = document.getElementById('cartItems');
  var summary   = document.getElementById('orderSummary');
  if (!container) return;

  var ids   = getCart();
  var items = SAREES.filter(function(s) { return ids.indexOf(s.id) > -1; });

  if (items.length === 0) {
    container.innerHTML = [
      '<div class="empty-state">',
      '  <span class="empty-icon">🛍</span>',
      '  <p>Your cart is empty.</p>',
      '  <a href="sarees.html" class="btn-primary"',
      '     style="display:inline-block;margin-top:14px;text-decoration:none;padding:10px 24px;border-radius:8px">',
      '    Shop Now',
      '  </a>',
      '</div>',
    ].join('');
    if (summary) summary.style.display = 'none';
    return;
  }

  /* Build cart item rows */
  container.innerHTML = items.map(function(s) {
    return [
      '<div class="cart-row">',
      '  <img src="' + s.img + '" alt="' + s.name + '"',
      '       onerror="this.src=\'' + FALLBACK_IMG + '\'">',
      '  <div class="cart-row-info">',
      '    <div class="cart-row-name">' + s.name + '</div>',
      '    <div class="cart-row-meta">🏪 ' + s.store + ' &nbsp;·&nbsp; 📍 ' + s.location + '</div>',
      /* Price shown here is the current sale price from localStorage */
      '    <div class="cart-row-price">' + formatPrice(s.price) + '</div>',
      '  </div>',
      '  <button class="cart-remove-btn" onclick="toggleCart(' + s.id + ')" title="Remove">🗑</button>',
      '</div>',
    ].join('');
  }).join('');

  /* Build order summary panel */
  if (summary) {
    summary.style.display = 'block';

    var subtotal = items.reduce(function(total, s) { return total + s.price; }, 0);
    var shipping = 150;
    var total    = subtotal + shipping;

    /* Collect unique store names for pickup info */
    var storeNames = [];
    items.forEach(function(s) {
      if (storeNames.indexOf(s.store) === -1) storeNames.push(s.store);
    });

    var storeLines = storeNames.map(function(name) {
      var item = items.find(function(s) { return s.store === name; });
      return '📍 <strong>' + name + '</strong> — ' + item.location;
    }).join('<br>');

    /* Fill in the summary elements */
    document.getElementById('summaryItems').innerHTML = items.map(function(s) {
      var label = s.name.length > 24 ? s.name.slice(0, 24) + '…' : s.name;
      return '<div class="summary-row"><span>' + label + '</span><span>' + formatPrice(s.price) + '</span></div>';
    }).join('');

    document.getElementById('summarySubtotal').textContent = formatPrice(subtotal);
    document.getElementById('summaryShipping').textContent = formatPrice(shipping);
    document.getElementById('summaryTotal').textContent    = formatPrice(total);
    document.getElementById('summaryStores').innerHTML     = storeLines;
  }
}


/* ═══════════════════════════════════════════════════════════════
   CHECKOUT
   ═══════════════════════════════════════════════════════════════ */

/**
 * placeOrder()
 * Clears the cart from localStorage and goes to checkout.html.
 */
function placeOrder() {
  saveCart([]);           /* Wipe cart from localStorage */
  updateBadgeCounts();
  window.location.href = 'checkout.html';
}


/* ═══════════════════════════════════════════════════════════════
   SAREE PREVIEW MODAL
   ═══════════════════════════════════════════════════════════════ */

/**
 * openSareeModal(sareeId)
 * ────────────────────────
 * Opens the preview popup for a saree.
 *
 * Reads data from SAREES[] (localStorage version), so the modal
 * always shows the admin's latest image, price, and stock status.
 *
 * @param {number} sareeId
 */
function openSareeModal(sareeId) {
  /* Always fetch from SAREES[] to get latest admin data */
  var saree = SAREES.find(function(s) { return s.id === sareeId; });
  if (!saree) return;

  var modal = document.getElementById('sareeModal');
  if (!modal) return;

  var wishlist   = getWishlist();
  var cart       = getCart();
  var inWishlist = wishlist.indexOf(saree.id) > -1;
  var inCart     = cart.indexOf(saree.id) > -1;

  /* Fill modal fields — image, title, meta, description */
  document.getElementById('modalImg').src                = saree.img;
  document.getElementById('modalTitle').textContent      = saree.name;
  document.getElementById('modalCategory').textContent   = saree.category;
  document.getElementById('modalStore').textContent      = saree.store;
  document.getElementById('modalLocation').textContent   = saree.location;
  document.getElementById('modalDesc').textContent       = saree.desc;
  document.getElementById('modalStatus').textContent     = saree.available ? '✓ In Stock' : '✗ Out of Stock';
  document.getElementById('modalStatus').className       = saree.available ? 'in-stock' : 'out-of-stock';

  /* Price — shows discount badge when applicable */
  var priceEl = document.getElementById('modalPrice');
  if (saree.discount > 0) {
    priceEl.innerHTML = formatPrice(saree.price)
      + ' <span class="price-was">' + formatPrice(saree.originalPrice) + '</span>'
      + ' <span class="discount-badge">-' + saree.discount + '%</span>';
  } else {
    priceEl.textContent = formatPrice(saree.price);
  }

  /* Wishlist button */
  var wishBtn = document.getElementById('modalWishBtn');
  wishBtn.textContent = inWishlist ? '♥ In Wishlist' : '♡ Add to Wishlist';
  wishBtn.onclick = function() {
    toggleWishlist(saree.id);
    openSareeModal(saree.id); /* Re-open to refresh button state */
  };

  /* Cart button — disabled if Out of Stock */
  var cartBtn = document.getElementById('modalCartBtn');
  cartBtn.textContent = inCart ? '✓ In Cart' : '🛍 Add to Cart';
  cartBtn.disabled    = !saree.available;
  cartBtn.className   = 'btn-primary' + (inCart ? ' in-cart' : '');
  cartBtn.onclick     = function() {
    toggleCart(saree.id);
    openSareeModal(saree.id); /* Re-open to refresh button state */
  };

  modal.style.display      = 'flex';
  document.body.style.overflow = 'hidden';
}

/**
 * closeSareeModal(event)
 * Close when clicking the dark backdrop (not the white box).
 */
function closeSareeModal(event) {
  if (event && event.target.id !== 'sareeModal') return;
  document.getElementById('sareeModal').style.display = 'none';
  document.body.style.overflow = '';
}

/* Close on Escape key */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var modal = document.getElementById('sareeModal');
    if (modal) {
      modal.style.display      = 'none';
      document.body.style.overflow = '';
    }
  }
});
