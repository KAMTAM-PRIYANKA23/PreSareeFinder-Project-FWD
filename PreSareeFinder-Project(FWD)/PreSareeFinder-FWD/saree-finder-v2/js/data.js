/* ============================================================
   js/data.js — Central Data Store with localStorage Persistence
   Hyderabad Saree Finder
   ============================================================

   ★ ROOT CAUSE OF THE "OTHER STORES DON'T UPDATE" BUG ★
   ───────────────────────────────────────────────────────
   The system was broken for all non-Kalaniketan stores because
   of a STORE NAME MISMATCH — the single most common bug in
   role-based filtering systems:

   PROBLEM 1 — Store names in ADMINS ≠ store names in SAREES
   ──────────────────────────────────────────────────────────
   Every update function works like this:
     1. Admin logs in → session.store = "Chennai Shopping Mall"
     2. renderInventory() filters: SAREES where s.store === session.store
     3. If no saree has store:"Chennai Shopping Mall", the list is EMPTY
     4. No rows → no buttons → no updates possible

   The only store that worked was "Kalaniketan" because it happened
   to be spelled identically in both ADMINS and DEFAULT_SAREES.
   All other stores were either named differently or missing entirely
   from the sarees catalogue.

   PROBLEM 2 — Stale localStorage blocks the fix
   ───────────────────────────────────────────────
   Even after fixing the store names in the JS file, old data
   already saved in localStorage keeps the wrong store names.
   The fix: bump STORAGE_VERSION so the app detects a version
   mismatch, clears stale data, and seeds fresh correct data.

   PROBLEM 3 — ID type safety
   ───────────────────────────
   All update functions now coerce IDs with Number() before
   comparing, so === never fails due to number/string mismatch
   that can happen when IDs pass through form values or URL params.

   ★ THE FIX ★
   ────────────
   1. Store names in ADMINS and DEFAULT_SAREES are now identical
      for every single store — guaranteed by using shared constants.
   2. Version-stamped localStorage so stale data auto-clears.
   3. All find() calls use Number(id) coercion.
   4. 6 stores with 4 sarees each = 24 sarees total.

   ★ HOW PERSISTENCE WORKS ★
   ─────────────────────────
   localStorage["hsf_sarees_v2"] = JSON string of the SAREES array
   - Written by saveSareesToStorage() after every admin change
   - Read by loadSareesFromStorage() on every single page load
   - Same key is read by both admin and customer pages
   - Survives page refresh, logout, and browser restart

   ============================================================ */


/* ─────────────────────────────────────────────────────────────
   STORAGE KEY — includes version number.
   If you change the data structure, bump "v2" to "v3" and
   all browsers will auto-clear old stale data and re-seed.
   ───────────────────────────────────────────────────────────── */
var STORAGE_KEY = "hsf_sarees_v2";


/* ─────────────────────────────────────────────────────────────
   STORE NAME CONSTANTS
   ════════════════════
   ★ THIS IS THE FIX FOR THE MAIN BUG ★

   We define each store name ONCE as a constant.
   Both the ADMINS array and the DEFAULT_SAREES array use these
   same constants — so they are ALWAYS guaranteed to match.

   Before this fix, store names were typed as plain strings in
   both places. A single spelling difference (e.g. "Nalli Silks"
   vs "Nalli Silk") was enough to break all updates for that store.

   Now it's impossible to have a mismatch — they share one source.
   ───────────────────────────────────────────────────────────── */
var STORE = {
  KALANIKETAN:   "Kalaniketan",
  CHENNAI:       "Chennai Shopping Mall",
  SOUTH_INDIA:   "South India Shopping Mall",
  SHE_NEEDS:     "She Needs",
  MANYAVAR:      "Manyavar",
  MANGALYA:      "Mangalya",
};

/*
 * Matching store locations — used consistently in both ADMINS
 * and DEFAULT_SAREES so filtering never breaks.
 */
var STORE_LOCATION = {
  KALANIKETAN:   "Abids, Hyderabad",
  CHENNAI:       "Ameerpet, Hyderabad",
  SOUTH_INDIA:   "Dilsukhnagar, Hyderabad",
  SHE_NEEDS:     "Banjara Hills, Hyderabad",
  MANYAVAR:      "Kukatpally, Hyderabad",
  MANGALYA:      "LB Nagar, Hyderabad",
};


/* ─────────────────────────────────────────────────────────────
   SAREE IMAGES — public Unsplash photos
   ───────────────────────────────────────────────────────────── */
var SAREE_IMAGES = [
  "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1617627143233-5df7dc1d19f5?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1594938298603-c8148c4b4c0b?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1602526432604-029a709e131b?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1638261681700-bd64b200ee72?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1641332942404-b5459e8f2cce?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1629217014219-2f22f8a1a5ac?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1609042522340-9a4c8736b34f?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1573407439167-d7f5b4d0498f?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1547030705-b50a5e42a31b?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1608042314453-ae338d5c8bbd?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1576649942629-5ca66e10e99e?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1617112848923-cc2234396a8d?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1583391733981-8498408ee4b6?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1624213111452-35e8d3d5cc18?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1600854964509-e4a5e4e0c0f0?w=500&h=600&fit=crop",
  "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&h=600&fit=crop&sat=-50",
  "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=500&h=600&fit=crop&sat=-50",
  "https://images.unsplash.com/photo-1617627143233-5df7dc1d19f5?w=500&h=600&fit=crop&sat=50",
  "https://images.unsplash.com/photo-1594938298603-c8148c4b4c0b?w=500&h=600&fit=crop&sat=50",
];

var FALLBACK_IMG = SAREE_IMAGES[0];


/* ─────────────────────────────────────────────────────────────
   DEFAULT SAREES — 24 sarees, 4 per store, 6 stores
   ════════════════════════════════════════════════════════════

   ★ KEY FIX: store field uses STORE.XXX constants, NOT raw strings.
   This guarantees saree.store === session.store for every admin.
   ───────────────────────────────────────────────────────────── */
var DEFAULT_SAREES = [

  /* ── KALANIKETAN (Abids) ── */
  { id:1,  name:"Bridal Kanjivaram",         price:22000, originalPrice:25000, discount:12, category:"Wedding",    store:STORE.KALANIKETAN, location:STORE_LOCATION.KALANIKETAN, img:SAREE_IMAGES[0],  available:true,  desc:"Premium bridal Kanjivaram with temple border and rich pallu." },
  { id:2,  name:"Kanchipuram Silk Saree",    price:8500,  originalPrice:8500,  discount:0,  category:"Wedding",    store:STORE.KALANIKETAN, location:STORE_LOCATION.KALANIKETAN, img:SAREE_IMAGES[1],  available:true,  desc:"Pure Kanchipuram silk with zari border, perfect for weddings." },
  { id:3,  name:"Cotton Printed Daily Wear", price:850,   originalPrice:1000,  discount:15, category:"Daily Wear", store:STORE.KALANIKETAN, location:STORE_LOCATION.KALANIKETAN, img:SAREE_IMAGES[2],  available:true,  desc:"Lightweight cotton saree with floral prints for everyday use." },
  { id:4,  name:"Net Embroidered Fancy",     price:4200,  originalPrice:5000,  discount:16, category:"Fancy",      store:STORE.KALANIKETAN, location:STORE_LOCATION.KALANIKETAN, img:SAREE_IMAGES[3],  available:true,  desc:"Stunning net saree with heavy embroidery on pallu and border." },

  /* ── CHENNAI SHOPPING MALL (Ameerpet) ── */
  { id:5,  name:"Banarasi Silk Weave",       price:12000, originalPrice:12000, discount:0,  category:"Wedding",    store:STORE.CHENNAI,     location:STORE_LOCATION.CHENNAI,     img:SAREE_IMAGES[4],  available:true,  desc:"Exquisite Banarasi silk with intricate golden brocade work." },
  { id:6,  name:"Soft Silk Pattu",           price:5200,  originalPrice:6500,  discount:20, category:"Wedding",    store:STORE.CHENNAI,     location:STORE_LOCATION.CHENNAI,     img:SAREE_IMAGES[5],  available:true,  desc:"Soft silk saree in rich jewel tones with contrast zari border." },
  { id:7,  name:"Pure Linen Comfortable",    price:2200,  originalPrice:2200,  discount:0,  category:"Comfortable",store:STORE.CHENNAI,     location:STORE_LOCATION.CHENNAI,     img:SAREE_IMAGES[6],  available:true,  desc:"Breathable pure linen saree, ideal for summer and long events." },
  { id:8,  name:"Paithani Silk Saree",       price:15000, originalPrice:15000, discount:0,  category:"Wedding",    store:STORE.CHENNAI,     location:STORE_LOCATION.CHENNAI,     img:SAREE_IMAGES[7],  available:false, desc:"Authentic Paithani silk with peacock motifs and oblique design." },

  /* ── SOUTH INDIA SHOPPING MALL (Dilsukhnagar) ── */
  { id:9,  name:"Pochampally Ikat Saree",    price:3200,  originalPrice:4000,  discount:20, category:"Traditional",store:STORE.SOUTH_INDIA, location:STORE_LOCATION.SOUTH_INDIA, img:SAREE_IMAGES[8],  available:true,  desc:"Authentic Pochampally ikat weave with geometric patterns." },
  { id:10, name:"Uppada Silk Pattu",         price:9800,  originalPrice:11000, discount:11, category:"Wedding",    store:STORE.SOUTH_INDIA, location:STORE_LOCATION.SOUTH_INDIA, img:SAREE_IMAGES[9],  available:true,  desc:"Traditional Uppada silk with fine golden zari, lightweight and luxurious." },
  { id:11, name:"Mangalagiri Cotton Saree",  price:1100,  originalPrice:1100,  discount:0,  category:"Daily Wear", store:STORE.SOUTH_INDIA, location:STORE_LOCATION.SOUTH_INDIA, img:SAREE_IMAGES[10], available:true,  desc:"Crisp Mangalagiri cotton saree with classic border." },
  { id:12, name:"Ikkat Double Weave",        price:2800,  originalPrice:3500,  discount:20, category:"Traditional",store:STORE.SOUTH_INDIA, location:STORE_LOCATION.SOUTH_INDIA, img:SAREE_IMAGES[11], available:true,  desc:"Unique double-weave Ikkat with mirror patterns on both sides." },

  /* ── SHE NEEDS (Banjara Hills) ── */
  { id:13, name:"Designer Georgette Fancy",  price:4500,  originalPrice:4500,  discount:0,  category:"Fancy",      store:STORE.SHE_NEEDS,   location:STORE_LOCATION.SHE_NEEDS,   img:SAREE_IMAGES[12], available:true,  desc:"Trendy georgette saree with embroidery and sequin work." },
  { id:14, name:"Chiffon Floral Fancy",      price:1800,  originalPrice:1800,  discount:0,  category:"Fancy",      store:STORE.SHE_NEEDS,   location:STORE_LOCATION.SHE_NEEDS,   img:SAREE_IMAGES[13], available:true,  desc:"Elegant chiffon saree with floral digital print for parties." },
  { id:15, name:"Chanderi Silk Cotton",      price:3800,  originalPrice:3800,  discount:0,  category:"Comfortable",store:STORE.SHE_NEEDS,   location:STORE_LOCATION.SHE_NEEDS,   img:SAREE_IMAGES[14], available:true,  desc:"Delicate Chanderi saree with zari motifs, light enough for festivals." },
  { id:16, name:"Organza Silk Fancy",        price:6200,  originalPrice:6200,  discount:0,  category:"Fancy",      store:STORE.SHE_NEEDS,   location:STORE_LOCATION.SHE_NEEDS,   img:SAREE_IMAGES[15], available:false, desc:"Sheer organza silk with heavy stonework border and embroidered pallu." },

  /* ── MANYAVAR (Kukatpally) ── */
  { id:17, name:"Gadwal Silk Saree",         price:6500,  originalPrice:6500,  discount:0,  category:"Traditional",store:STORE.MANYAVAR,    location:STORE_LOCATION.MANYAVAR,    img:SAREE_IMAGES[16], available:true,  desc:"Traditional Gadwal silk with cotton body and silk pallu." },
  { id:18, name:"Tussar Silk Natural",       price:4800,  originalPrice:4800,  discount:0,  category:"Traditional",store:STORE.MANYAVAR,    location:STORE_LOCATION.MANYAVAR,    img:SAREE_IMAGES[17], available:true,  desc:"Natural Tussar silk with earthy tones, hand-block printed motifs." },
  { id:19, name:"Handloom Khadi Saree",      price:950,   originalPrice:950,   discount:0,  category:"Daily Wear", store:STORE.MANYAVAR,    location:STORE_LOCATION.MANYAVAR,    img:SAREE_IMAGES[18], available:true,  desc:"Handspun khadi saree in solid colors with minimal border." },
  { id:20, name:"Modal Silk Comfortable",    price:1650,  originalPrice:1650,  discount:0,  category:"Comfortable",store:STORE.MANYAVAR,    location:STORE_LOCATION.MANYAVAR,    img:SAREE_IMAGES[19], available:true,  desc:"Ultra-soft modal silk blend, wrinkle-free and easy to drape." },

  /* ── MANGALYA (LB Nagar) ── */
  { id:21, name:"Bridal Silk Lehenga",       price:18000, originalPrice:20000, discount:10, category:"Wedding",    store:STORE.MANGALYA,    location:STORE_LOCATION.MANGALYA,    img:SAREE_IMAGES[20], available:true,  desc:"Richly embroidered bridal silk for grand wedding occasions." },
  { id:22, name:"Zari Border Cotton",        price:1400,  originalPrice:1400,  discount:0,  category:"Daily Wear", store:STORE.MANGALYA,    location:STORE_LOCATION.MANGALYA,    img:SAREE_IMAGES[21], available:true,  desc:"Fine cotton saree with traditional zari border, light and comfortable." },
  { id:23, name:"Kalamkari Printed Saree",   price:2600,  originalPrice:3000,  discount:13, category:"Traditional",store:STORE.MANGALYA,    location:STORE_LOCATION.MANGALYA,    img:SAREE_IMAGES[22], available:true,  desc:"Authentic Kalamkari hand-printed design on soft cotton base." },
  { id:24, name:"Silk Blend Party Saree",    price:5500,  originalPrice:5500,  discount:0,  category:"Fancy",      store:STORE.MANGALYA,    location:STORE_LOCATION.MANGALYA,    img:SAREE_IMAGES[23], available:true,  desc:"Lustrous silk blend saree perfect for parties and celebrations." },
];


/* ─────────────────────────────────────────────────────────────
   ADMIN ACCOUNTS
   ══════════════
   ★ USES THE SAME STORE.XXX CONSTANTS as DEFAULT_SAREES ★

   Before this fix, if an admin's session.store was "Nalli Silks"
   but sarees were labelled "Nalli Silk" (missing 's'), the filter
   `s.store === session.store` returned zero results.

   Now both sides use the same constant — mismatch is impossible.
   ───────────────────────────────────────────────────────────── */
var ADMINS = [
  {
    id:"a1", role:"admin",
    email:"admin@kalaniketan.com",    password:"admin123",
    name:"Ravi Kumar",
    store:    STORE.KALANIKETAN,      /* ← same constant used in sarees */
    location: STORE_LOCATION.KALANIKETAN,
  },
  {
    id:"a2", role:"admin",
    email:"admin@chennaimall.com",    password:"admin123",
    name:"Meena Iyer",
    store:    STORE.CHENNAI,          /* ← same constant used in sarees */
    location: STORE_LOCATION.CHENNAI,
  },
  {
    id:"a3", role:"admin",
    email:"admin@southindia.com",     password:"admin123",
    name:"Suresh Varma",
    store:    STORE.SOUTH_INDIA,      /* ← same constant used in sarees */
    location: STORE_LOCATION.SOUTH_INDIA,
  },
  {
    id:"a4", role:"admin",
    email:"admin@sheneeds.com",       password:"admin123",
    name:"Deepa Nair",
    store:    STORE.SHE_NEEDS,        /* ← same constant used in sarees */
    location: STORE_LOCATION.SHE_NEEDS,
  },
  {
    id:"a5", role:"admin",
    email:"admin@manyavar.com",       password:"admin123",
    name:"Arjun Reddy",
    store:    STORE.MANYAVAR,         /* ← same constant used in sarees */
    location: STORE_LOCATION.MANYAVAR,
  },
  {
    id:"a6", role:"admin",
    email:"admin@mangalya.com",       password:"admin123",
    name:"Preethi Singh",
    store:    STORE.MANGALYA,         /* ← same constant used in sarees */
    location: STORE_LOCATION.MANGALYA,
  },
];


/* ─────────────────────────────────────────────────────────────
   DEMO CUSTOMER ACCOUNTS
   ───────────────────────────────────────────────────────────── */
var USERS = [
  { id:"u1", role:"user", email:"user@demo.com",  password:"demo123", name:"Priya Sharma", phone:"+91 98765 43210" },
  { id:"u2", role:"user", email:"anita@demo.com", password:"demo123", name:"Anita Reddy",  phone:"+91 91234 56789" },
];


/* ─────────────────────────────────────────────────────────────
   LIVE SAREES ARRAY
   Starts empty — filled by loadSareesFromStorage() below.
   ALL reads and writes go through this array.
   ───────────────────────────────────────────────────────────── */
var SAREES = [];


/* ═══════════════════════════════════════════════════════════════
   PERSISTENCE — SAVE
   ═══════════════════════════════════════════════════════════════ */

/**
 * saveSareesToStorage()
 * ─────────────────────
 * Write the entire SAREES array to localStorage as a JSON string.
 * Called after every admin update (add/edit/delete/image/price/stock).
 *
 * After this call:
 *   → localStorage["hsf_sarees_v2"] contains the updated data
 *   → Any page load (admin or customer) will read the new data
 *   → Survives page refresh, logout, and browser restart
 */
function saveSareesToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAREES));
  } catch (err) {
    console.warn("[DataStore] Could not write to localStorage:", err);
    showToast("Warning: data may not save in private/incognito mode.", "error");
  }
}


/* ═══════════════════════════════════════════════════════════════
   PERSISTENCE — LOAD
   ═══════════════════════════════════════════════════════════════ */

/**
 * loadSareesFromStorage()
 * ───────────────────────
 * Read saved sarees from localStorage into the SAREES array.
 * Runs ONCE at the bottom of this file, before any other script.
 *
 * Scenario A — Data found in localStorage:
 *   Parse JSON → fill SAREES → done.
 *   (This is what happens 99% of the time after first visit)
 *
 * Scenario B — Nothing in localStorage (first visit / version bump):
 *   Deep-copy DEFAULT_SAREES → fill SAREES → save to localStorage.
 *   (First visit, or after STORAGE_KEY was changed to clear old data)
 *
 * Why both admin and customer see the same data:
 *   Both pages include data.js. Both call loadSareesFromStorage().
 *   Both read from the same localStorage key. Same data, always.
 */
function loadSareesFromStorage() {
  try {
    var stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      var parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        SAREES = parsed;
        return; /* ← Use persisted data — admin changes are preserved */
      }
    }

    /* First visit or stale key → seed with corrected defaults */
    SAREES = JSON.parse(JSON.stringify(DEFAULT_SAREES));
    saveSareesToStorage();

  } catch (err) {
    console.warn("[DataStore] Load error, using defaults:", err);
    SAREES = JSON.parse(JSON.stringify(DEFAULT_SAREES));
  }
}


/**
 * resetDataStore()
 * ─────────────────
 * Wipe localStorage and restore the DEFAULT_SAREES catalogue.
 * Useful after fixing store names — run from browser console or
 * from the "Reset" button in the admin panel.
 *
 * Usage: type resetDataStore() in browser DevTools > Console
 */
function resetDataStore() {
  localStorage.removeItem(STORAGE_KEY);
  SAREES = JSON.parse(JSON.stringify(DEFAULT_SAREES));
  saveSareesToStorage();
  showToast("Catalogue reset to defaults — all stores refreshed ✓");
}


/* ═══════════════════════════════════════════════════════════════
   UPDATE FUNCTIONS — called by admin.js after every change
   ═══════════════════════════════════════════════════════════════

   Each function:
     1. Finds the saree by ID (using Number() coercion for safety)
     2. Updates the field in the live SAREES array
     3. Calls saveSareesToStorage() to write to localStorage
     4. Returns true on success, false if saree not found

   After these calls, the next customer page load will automatically
   read the updated localStorage data and show the changes.
   ═══════════════════════════════════════════════════════════════ */

/**
 * updateImage(sareeId, newUrl)
 * ─────────────────────────────
 * Change the photo URL for a saree. Accepts:
 *   - A web URL: "https://example.com/photo.jpg"
 *   - A base64 data URI from FileReader (local file upload)
 *
 * @param {number|string} sareeId - saree id
 * @param {string}        newUrl  - new image URL or base64 string
 * @returns {boolean}
 */
function updateImage(sareeId, newUrl) {
  /*
   * Number() coercion — fixes potential type mismatch.
   * When an ID comes from a form input or URL param it may be a
   * string like "3". The saree stored via JSON.parse has id as
   * a number 3. Without coercion, "3" === 3 is false in JavaScript.
   */
  var id    = Number(sareeId);
  var saree = SAREES.find(function(s) { return s.id === id; });
  if (!saree) {
    console.warn("[updateImage] Saree not found. id=" + id +
      " Available IDs:", SAREES.map(function(s){ return s.id; }));
    return false;
  }

  saree.img = (newUrl && newUrl.trim()) ? newUrl.trim() : FALLBACK_IMG;

  saveSareesToStorage();
  return true;
}


/**
 * updateDiscount(sareeId, newDiscount, newOriginalPrice)
 * ───────────────────────────────────────────────────────
 * Update the discount % and recalculate the sale price.
 * Optionally update the original price at the same time.
 *
 * Formula: price = originalPrice × (1 - discount/100)
 * Example: originalPrice=5000, discount=20 → price=4000
 *
 * @param {number|string} sareeId           - saree id
 * @param {number}        newDiscount       - 0–90 (%)
 * @param {number}        [newOriginalPrice] - optional new full price
 * @returns {boolean}
 */
function updateDiscount(sareeId, newDiscount, newOriginalPrice) {
  var id    = Number(sareeId);
  var saree = SAREES.find(function(s) { return s.id === id; });
  if (!saree) {
    console.warn("[updateDiscount] Saree not found. id=" + id);
    return false;
  }

  var disc = Math.max(0, Math.min(90, parseInt(newDiscount) || 0));

  if (newOriginalPrice && parseInt(newOriginalPrice) > 0) {
    saree.originalPrice = parseInt(newOriginalPrice);
  }

  saree.discount = disc;
  saree.price    = disc > 0
    ? Math.round(saree.originalPrice * (1 - disc / 100))
    : saree.originalPrice;

  saveSareesToStorage();
  return true;
}


/**
 * updateStock(sareeId, isAvailable)
 * ───────────────────────────────────
 * Mark a saree as In Stock (true) or Out of Stock (false).
 * Customer cart button is disabled when available=false.
 *
 * @param {number|string} sareeId     - saree id
 * @param {boolean}       isAvailable - true=In Stock, false=Out of Stock
 * @returns {boolean}
 */
function updateStock(sareeId, isAvailable) {
  var id    = Number(sareeId);
  var saree = SAREES.find(function(s) { return s.id === id; });
  if (!saree) {
    console.warn("[updateStock] Saree not found. id=" + id);
    return false;
  }

  saree.available = Boolean(isAvailable);

  saveSareesToStorage();
  return true;
}


/* ─────────────────────────────────────────────────────────────
   INITIALISE — runs as soon as this file is parsed.
   Fills SAREES[] from localStorage before any other script runs.
   ───────────────────────────────────────────────────────────── */
loadSareesFromStorage();


/* ─────────────────────────────────────────────────────────────
   CATEGORIES (static)
   ───────────────────────────────────────────────────────────── */
var CATEGORIES = ["All", "Fancy", "Wedding", "Traditional", "Daily Wear", "Comfortable"];

var CATEGORY_IMAGES = {
  "Fancy":       SAREE_IMAGES[4],
  "Wedding":     SAREE_IMAGES[0],
  "Traditional": SAREE_IMAGES[8],
  "Daily Wear":  SAREE_IMAGES[2],
  "Comfortable": SAREE_IMAGES[6],
};


/* ─────────────────────────────────────────────────────────────
   SHARED UTILITY FUNCTIONS
   ───────────────────────────────────────────────────────────── */

/** Format a rupee amount. 8500 → "₹8,500" */
function formatPrice(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN");
}

/**
 * showToast(message, type)
 * Pop-up notification at bottom-right. type = "success" or "error".
 */
function showToast(message, type) {
  type = type || "success";
  var container = document.getElementById("toastContainer");
  if (!container) return;
  var t = document.createElement("div");
  t.className   = "toast toast-" + type;
  t.textContent = message;
  container.appendChild(t);
  setTimeout(function() { t.remove(); }, 3500);
}

/** Read a URL query parameter. getParam("cat") on "?cat=Wedding" → "Wedding" */
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
