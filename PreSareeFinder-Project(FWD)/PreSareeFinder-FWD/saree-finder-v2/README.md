# 🪷 Hyderabad Saree Finder — v2

A multi-page, role-based web app for browsing and managing sarees across Hyderabad stores.

---

## 📁 Complete File Structure

```
saree-finder-v2/
│
├── login.html              ← 🔑 START HERE (default entry page)
├── signup.html             ← New customer registration
│
├── pages/
│   ├── user-dashboard.html ← Customer home after login
│   ├── sarees.html         ← Browse all sarees (search + filter)
│   ├── wishlist.html       ← Saved sarees
│   ├── cart.html           ← Cart + checkout
│   ├── checkout.html       ← Order confirmed page
│   └── admin-dashboard.html← Admin-only store management
│
├── css/
│   └── styles.css          ← All styles (26 labelled sections)
│
└── js/
    ├── data.js             ← Saree data, users, admins, helpers
    ├── auth.js             ← Login, signup, sessions, route protection
    ├── user.js             ← Cart, wishlist, saree cards, modal
    └── admin.js            ← Admin panel: add/edit/delete sarees
```

---

## 🚀 How to Run

1. Download and unzip the project
2. Open `login.html` in any modern browser
3. That's it — no server or build tools required!

---

## 🔐 Login Credentials

### Customer Accounts
| Email | Password |
|-------|----------|
| user@demo.com | demo123 |
| anita@demo.com | demo123 |

### Admin Accounts (one per store)
| Email | Password | Store |
|-------|----------|-------|
| admin@kalaniketan.com | admin123 | Kalaniketan (Abids) |
| admin@pochampally.com | admin123 | Pochampally Silks (Dilsukhnagar) |
| admin@nallisilks.com | admin123 | Nalli Silks (Ameerpet) |
| admin@grtsilks.com | admin123 | GRT Silks (Banjara Hills) |

---

## 🔒 Security & Role Separation

| Page | Who Can Access |
|------|---------------|
| login.html | Everyone (public) |
| signup.html | Everyone (public) |
| pages/user-dashboard.html | Customers only |
| pages/sarees.html | Customers only |
| pages/wishlist.html | Customers only |
| pages/cart.html | Customers only |
| pages/checkout.html | Customers only |
| pages/admin-dashboard.html | Admins only |

If a regular user tries to visit `admin-dashboard.html` directly by typing the URL, they are **immediately redirected** to `login.html` by `requireAdmin()` in `auth.js`.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🔑 Separate login | Customer vs Admin role toggle on login page |
| 🛍 20 sarees | With real images, discounts, availability |
| 🔍 Search & Filter | By name, price range, and category |
| 👁 Preview Modal | Enlarged view with full details |
| ♡ Wishlist | Saved across pages in the session |
| 🛒 Cart + Checkout | Add, remove, order summary, place order |
| ⚙ Admin per store | Each admin sees only their own store's sarees |
| ➕ Add sarees | With image URL, discount, availability |
| ✏ Edit sarees | Update price, image, discount, category |
| 🗑 Delete sarees | With confirmation dialog |
| 📱 Responsive | Mobile-friendly on all pages |

---

## 🎨 Customising

### Add a new saree (via code)
Open `js/data.js` and add to the `SAREES` array:
```js
{ id: 21, name: "My Saree", price: 3000, originalPrice: 3500, discount: 14,
  category: "Fancy", store: "Kalaniketan", location: "Abids, Hyderabad",
  img: "https://your-image-url.jpg", available: true,
  desc: "Description here." }
```

### Add a new admin store
Open `js/data.js` and add to `ADMINS`:
```js
{ id: "a5", role: "admin", email: "admin@newstore.com", password: "pass123",
  name: "Store Manager", store: "New Store Name", location: "Area, Hyderabad" }
```

### Change the brand colors
Open `css/styles.css` and edit the `:root` block at the top of the file.

---

## ⚠️ Disclaimer

Product availability shown online may not always match real-time store availability.
Customers are advised to contact the store directly before visiting to confirm stock.
