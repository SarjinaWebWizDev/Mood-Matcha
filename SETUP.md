# Mood Matcha – ordering website (React + Node)

A React storefront (`src/`, bundled with esbuild) and a dependency-free Node server (`server.js`) that validates prices, checks delivery zones, stores orders and verifies payments.

## Modes: portfolio (default) and production
`mode` in `config.default.json` is `"portfolio"`. In portfolio mode the site runs a complete ordering journey with no real-world integrations: pickup and delivery can be chosen, any valid 6-digit PIN code is accepted for delivery, and payment is **pay at pickup / pay on delivery**. Orders are validated, priced and stored by the server, get a unique order number and a confirmation page. **No card details are collected, no money is charged, and an order's payment status stays "due at pickup/delivery" (never "paid") unless a real Razorpay payment is verified.**
Set `"mode": "production"` (in `data/config.json`) when you run a real shop. Production mode enforces the launch checks: confirmed prices, a pickup address, real delivery zones (the open portfolio zone is ignored), and a payment method. If any is missing, ordering stays off, customers see only "temporarily unavailable", and the reasons are printed in the server console and shown on `/admin.html`.

## Run it
```
npm install            # installs react, react-dom, esbuild
copy .env.example .env # Windows (use cp on Mac/Linux), then fill in values. Never commit .env
npm run dev            # builds, rebuilds on every change, and starts the server
npm run build          # one-off production build (a prebuilt bundle is already included)
npm start              # production: run the server (reads .env automatically)
npm test               # hours + backend tests
```
Open http://localhost:3000 . Admin: http://localhost:3000/admin.html (needs `ADMIN_TOKEN`, 24+ random characters).
`npm warn install-scripts ... esbuild` is only a warning from newer npm versions; the build works without approving it. To silence it, run `npm install-scripts approve esbuild`.

## What exists
| Part | Where |
|---|---|
| Storefront (React) | `src/App.jsx`, `src/lib.js`, `src/styles.css` |
| Server API, orders, payments, admin | `server.js` |
| Order status page (reads real backend status) | `public/order.html` |
| Admin: orders + configuration editor | `public/admin.html` |
| Owner configuration | `data/config.json` (created from `config.default.json` on first start) |
| Orders database | `data/orders.json` (file store, mode 0600, never served) |

## Configuration
`config.default.json` holds the shipped defaults (menu, prices, hours, offers). `data/config.json` holds **only your overrides** and is merged on top, so you only write what you change, e.g. `{"schemaVersion":2,"mode":"production","pickup":{"address":"…"}}`. Arrays (products, zones) replace the default array. The admin page saves a full copy.
Opening hours are defined once (`hours`, with `"24:00"` meaning midnight) and read by both the server and the site (`shared/hours.js`).
- `pricesConfirmed` – **must be set to true by you** after checking every price. The shipped prices are placeholders.
- `business` – name, phone, email shown to customers.
- `timezone` – default `Asia/Kolkata`.
- `hours` – per day `["09:00","22:00"]` or `null` (closed). Ordering is refused when closed, and near closing time if prep + delivery time would pass closing.
- `pickup` – `enabled`, `address`, `note`, `prepMinutes`.
- `pickup.allowCollector` – lets the customer name someone else to collect (name required, mobile optional). The collector is stored on the order and shown on the order page and in admin.
- **Delivery charge (courier travel):** each zone's `fee` is the charge added to the customer's total, intended to cover a bike courier or your own travel. Set it per zone (PIN codes) from your usual courier fares; `minOrder` and `freeAbove` still apply. `delivery.chargeNote` is the sentence customers see. The site never names a courier brand. The shipped ₹50 is a placeholder.
- `delivery` – `enabled`, `prepMinutes`, `zones`. Each zone:
  `{"name":"Your area","pins":["4xxxxx","4xxxxx"],"fee":40,"minOrder":300,"freeAbove":900,"etaMin":20,"etaMax":35}`
  A customer is served only if their PIN code is in a zone's `pins`. Leave `freeAbove`/`etaMin`/`etaMax` as `null` if you do not want them; no delivery window is shown without them.
- `payment.allowPayOnReceipt` – true to allow pay on delivery / pay at pickup.
- `taxPercent` – applied to items after discounts. Set it only if you are registered and sure of the rate.
- `options`, `offers`, `products` – sizes/milks (with surcharges), offers, menu items. Product `available:false` hides an item.
**Delivery zones are by PIN code only.** Matching a free-text address or a radius needs a geocoding provider (e.g. Google Maps API with your key), which is not included.

## Payments (Razorpay)
No payment gateway existed in the old site. This server integrates Razorpay on the server side; it has been tested against a **mock** of Razorpay's API only, never against your real account.
1. Create a Razorpay account and complete KYC. Start in **Test mode**.
2. Settings → API Keys: generate keys. Put `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in the server environment only. The secret is never sent to the browser.
3. Settings → Webhooks: add `https://YOUR-DOMAIN/api/payments/webhook`, events `payment.captured` and `order.paid`, choose a secret, and set it as `RAZORPAY_WEBHOOK_SECRET`.
4. Place a test order with Razorpay's test UPI/card details. Confirm the order moves from "awaiting payment" to "received" in `/admin.html`.
5. Only then switch to live keys.
How it works: the server creates the Razorpay order for the server-computed amount; the browser pays; the server verifies the HMAC signature (and the webhook) before marking the order paid. An order is shown as confirmed only after that.

## Hosting
Needs a Node host with a **persistent disk** for `data/` (e.g. a VPS, Render/Railway with a disk). Serve over **HTTPS** (via the host or a reverse proxy; set `TRUST_PROXY=1` only behind a trusted proxy). The JSON file store suits a single instance and modest volume; move to PostgreSQL for multiple instances or high volume. Back up `data/`.
Do **not** host the static `preview/` or `public/` alone: checkout needs the server.

## Security notes
Prices, discounts, delivery fees and totals are recomputed on the server; client prices are ignored. Order status requires a random token. Admin requires `ADMIN_TOKEN`. Inputs are validated and size-limited; requests are rate-limited; static serving cannot leave `public/`; CSP and basic security headers are set. Not included: SMS/email notifications, refunds (do these in Razorpay), GST invoices, CAPTCHA, backups. Review your obligations for storing customer phone numbers and addresses (privacy policy).

## Launch checklist (needs you)
- [ ] Real prices, then `pricesConfirmed: true`
- [ ] Pickup address and/or real delivery zones (PIN codes, fees, minimums)
- [ ] Opening hours, preparation time and delivery time estimates
- [ ] Business phone/email; Privacy Policy, Terms, Refund/Cancellation policy (the site marks these "to be supplied")
- [ ] Razorpay account, test-mode end-to-end order, then live keys; or enable pay-on-receipt
- [ ] `ADMIN_TOKEN`, HTTPS domain, persistent disk, backups
- [ ] Decide the brand name: the logo reads MORI MATCHA, the site text says Mood Matcha
- [ ] Photos with third-party branding: `cookie-crumble-matcha.png` shows a Lotus biscuit; `signature-white-chocolate-matcha.png` shows a "MU Matcha Union" tin. Consider retakes.

## Theme and background
Pistachio and beige, with no brown fills. Colours are CSS variables at the top of `src/styles.css`, and the final "Pistachio + beige theme" block overrides them (`--pista #DCE9BE` light pistachio bands, `--bg` beige, `--gd #46613A` deep green buttons, `--ink #2C3A25` text). Where text sits on a colour, deeper tones of the same hue keep contrast at or above 4.5:1. The page background is a beige-to-pistachio gradient (the `body{background:...}` rule in that block). The four-colour artwork file `src/bg-palette.svg` is kept but switched off. Hero tile captions are bold, always visible and use no blur.

## Troubleshooting
- **Old colours or half-updated look after replacing files:** extract the new zip into a *fresh* folder (do not merge into the old one), run `npm install`, then `npm run dev`, and press Ctrl+F5 in the browser. CSS/JS files now have fingerprinted names (`app.<hash>.css`) and the page itself is never cached, so a stale file can no longer be served after an update.
- **Dark-mode browsers or extensions:** the page declares `color-scheme: only light`, so Chrome/Edge auto-dark-mode leaves it alone. A dark-mode extension (e.g. Dark Reader) can still recolour any site; switch it off for localhost.

## Deploying to Vercel (this is what makes ordering work on your .vercel.app site)
The project contains Vercel serverless functions (`api/[...path].js`, which runs the same code as `server.js`) and `vercel.json`. Upload/push the **whole project folder** (not just `public/`).
1. In Vercel: *Add New > Project*, import the repository. Framework Preset: **Other**. Build Command `npm run build`, Output Directory `public` (already set in `vercel.json`).
2. *Settings > Environment Variables*: add `ORDER_SECRET` = a random string of 32+ characters (e.g. from a password generator). Without it a built-in default is used.
3. Redeploy. Check `https://YOUR-SITE.vercel.app/api/config`: it should return JSON, not a 404.
**How orders work on Vercel (no database):** the server validates and prices the order, then returns an order number and a confirmation link whose token is the encrypted order itself (AES-256-GCM), so the confirmation page works with no database. Consequences: nothing is stored on a server, there is no admin page, order status stays "Order received", and online payment is off. That suits a portfolio. For a real café that must receive orders, host `server.js` somewhere with a persistent disk (Render, Railway, a VPS) or add a database.
