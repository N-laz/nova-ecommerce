# NOVA — premium technology e-commerce

NOVA is a full-stack store for smartphones, laptops, audio, wearables, gaming and desk-setup gear. It is a working application, not a prototype. Products, carts, wishlists, orders, payments, inventory, reviews, coupons, rewards, notifications and analytics all live in PostgreSQL. Every price, discount, stock check and permission is decided on the server.

---

## Features

**Storefront**
- Home page with these sections, all loaded from the database: hero, trending, shop by category, a flash drop with a live countdown, best sellers, new arrivals, featured brands, customer reviews and a newsletter signup
- Shop page with server-side filters (search, category, brand, price, rating, availability, discount, filterable specs), six sort orders and pagination
- Search overlay (⌘K) with popular searches and live suggestions from the database (`/api/search`), grouped into products, categories and brands
- Product page: gallery with thumbnails and zoom, colour and quantity pickers, stock status, estimated delivery, add to cart, buy now, wishlist, specs from the database, shipping and warranty info, review summary and list, related products, recently viewed, JSON-LD markup and dynamic metadata
- Compare up to 4 products side by side, built from each product's specs in the database
- Wishlist saved to the database, with move to cart, remove, stock and price display, a price-drop badge, and "Notify me" alerts for out-of-stock items
- Cart saved to the database. Guest carts use a cookie and merge into your account when you log in. Available as a drawer and a full page, with stock checks, coupons, shipping, GST (included in prices) and totals
- 3-step checkout (address → delivery → payment). Supports multiple saved addresses, Standard (free) or Express (₹99) delivery, UPI, card, net banking, COD and test payment, plus paying part of the order with reward points

**Sign-in and account security**
- Email + password, or **Continue with Google** (OpenID Connect with PKCE, state and nonce; the ID token signature is verified against Google's keys)
- A Google account with the same verified email links to an existing NOVA account; an unverified Google email can never take over an account
- Email verification after sign-up (a banner in the account area until confirmed, with resend)
- Forgot password → emailed single-use link (expires in 30 minutes) → new password. All sessions are signed out after a reset. The form gives the same answer whether or not an account exists, so emails can't be enumerated
- Security page: connect or disconnect Google, add a password to a Google-only account, change password, manage sessions. You can't remove your last sign-in method
- Reset and verification tokens are stored only as SHA-256 hashes

**Transactional email** (console, SMTP or Resend)
- Order confirmed, shipped, out for delivery, delivered and cancelled (with refund note), with item images, totals and address
- Verify email, welcome (Google), password reset, password changed/added, Google linked
- Back in stock, price drop and promotional broadcasts (admin can tick "Also send by email")
- Customers control shipping-update and offer emails on the Notifications page; security and order confirmation/cancellation emails always send
- Every email is written to an `EmailLog` table first, then sent with up to 3 attempts after the response is returned, so a slow mail server never delays checkout

**Customer account:** overview, orders, order detail with a tracking timeline, invoices you can print, cancellation (only while PENDING or CONFIRMED, enforced on the server), addresses, reviews, NOVA Rewards, notifications, profile, and security (change password, see and sign out other sessions).

**Admin** (`/admin`, ADMIN role only)
- Dashboard: revenue, orders, customers, products and average order value, each compared with the previous period. Charts show revenue over time, order volume, customer growth, top products, top categories and order status. You can filter by Today, 7 days, 30 days or 12 months. All numbers come from live SQL aggregates.
- Products: full create/edit/delete, publish and unpublish, featured, trending, flash drop, upload multiple images (reorder, alt text), specs editor, price and compare-at price, stock, SKU, brand, category, tags and colours
- Inventory: total units, low stock, out of stock and stock value. You can add, remove or set stock. Every change writes an `InventoryTransaction` (e.g. `+50 Purchase`, `-2 Order NVA-10482`), and stock can never go below zero.
- Orders: search and filter, move an order forward through fulfilment, cancel with a reason (stock is restored, coupon and points are reversed, prepaid payments are refunded), and view the payment and ledger history
- Coupons: percentage or fixed amount, minimum order, maximum discount, total usage limit, per-customer limit, start and expiry dates, active toggle
- Reviews moderation (approve, hide, delete). Ratings are recalculated automatically.
- Customers: lifetime spend, points and role management
- Broadcast: send promotional in-app notifications to all customers, optionally by email too
- Emails: every email sent with status (sent, failed, skipped), search and filters, an HTML preview in a sandboxed frame, retry for failed messages, and a "Send test email" button. Shows which email provider is active and whether Google sign-in is configured

**Automatic notifications:** order confirmed, shipped, out for delivery, delivered and cancelled, plus price drop (for wishlisted items), back in stock, and promotional messages. They appear in a navbar dropdown with an unread count.

**NOVA Rewards:** you earn 1 point for every ₹100 spent (on the amount after discounts, excluding shipping). 1 point = ₹1, and points can cover up to 10% of an order. Earning and spending are recorded in a ledger and reversed if the order is cancelled.

---

## Architecture

```
Browser ──► Next.js App Router (RSC + Client Components)
              │  Server Components read via lib/services/*  (cached with tags where public)
              │  Mutations go through Server Actions in lib/actions/*  (+ /api routes)
              ▼
         lib/actions  →  Zod validation (lib/validation) → auth guards (lib/auth/guards)
              ▼
         lib/services  (business rules: pricing, coupon, cart, order, inventory, rewards…)
              ▼
         Prisma ORM  →  PostgreSQL
```

- **UI, business logic, database, validation and auth are kept separate.** Components never import Prisma. Actions contain no business logic; they validate input, check authorization and call services.
- **Money:** stored as `Decimal(12,2)`. Calculations use integer paise (`lib/money.ts`), so there is no floating-point currency math.
- **Checkout is one database transaction.** Stock is decremented with a conditional `UPDATE … WHERE stock >= qty`, which blocks overselling and negative stock. The coupon is validated again, and the order, order items, payment, inventory transactions, coupon usage and rewards are all written together.
- **Payments** go through a provider interface (`lib/payments`). `mock` is the default for development and tests. `razorpay` is included: it creates the gateway order and verifies the HMAC signature on the server. To add Stripe, implement the same interface.
- **Storage** goes through a provider interface (`lib/storage`). `local` writes to `./storage/uploads`, served by `app/media/[...key]`. `ProductImage` already stores `provider` and `storageKey`, ready for Cloudinary or S3.
- **Auth:** email and password (bcrypt, cost 12). Sessions are random tokens; only their SHA-256 hash is stored in the `Session` table. The cookie is httpOnly, SameSite=Lax, and Secure in production. Middleware quickly redirects visitors without a session, but every page, layout and action checks the session and role again. `Account` and `lib/auth/providers.ts` are in place for Google OAuth.
- **Errors:** actions return `{ ok, data } | { ok: false, error, fieldErrors }`, so the UI always shows a friendly message. Unexpected errors are logged on the server with context (`lib/logger.ts`).

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui-style Radix primitives · Lucide · Framer Motion · Recharts · PostgreSQL · Prisma 6 · Zod 4 · bcryptjs · Sonner · Playwright (end-to-end tests)

---

## Getting started

### 1. Requirements
- Node.js 20+
- PostgreSQL 14+ (tested on 18)

### 2. Database setup
```bash
# Example local setup
createuser nova --pwprompt           # e.g. password: nova_dev_pw
createdb nova --owner nova
```

### 3. Environment variables
```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `AUTH_SECRET` | yes | 32+ random characters (`openssl rand -hex 32`) |
| `PAYMENT_PROVIDER` | yes | `mock` (default), `razorpay` or `stripe` |
| `PAYMENT_SECRET` | yes | Server secret for signing mock payment references |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | for Razorpay | Test or live keys |
| `STORAGE_PROVIDER` | yes | `local` (default), `cloudinary` or `s3` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Turns on Google sign-in (see below) |
| `EMAIL_PROVIDER` | yes | `console` (default, prints to the server log), `smtp` or `resend` |
| `EMAIL_FROM` / `EMAIL_REPLY_TO` | recommended | Sender, e.g. `NOVA <orders@yourdomain.com>` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | for SMTP | Any SMTP server |
| `RESEND_API_KEY` | for Resend | API key; verify your sending domain in Resend |
| `NEXT_PUBLIC_APP_URL` | yes | Public base URL, used for SEO, the sitemap and OG images |

`DATABASE_URL`, `AUTH_SECRET`, `PAYMENT_SECRET` and the provider keys are only read in server code and are never sent to the browser.

#### Setting up Google sign-in
1. Google Cloud Console → APIs & Services → OAuth consent screen: create it (External), add scopes `openid`, `email`, `profile`.
2. Credentials → Create credentials → OAuth client ID → Web application.
3. Authorized redirect URI: `<NEXT_PUBLIC_APP_URL>/api/auth/google/callback` (e.g. `http://localhost:3000/api/auth/google/callback`, plus your production URL).
4. Put the client ID and secret in `.env` and restart. Until then the Google button is shown as unavailable with an explanation.

#### Setting up email
- Development: leave `EMAIL_PROVIDER=console`. Emails print to the server log and appear under Admin → Emails.
- SMTP: set `EMAIL_PROVIDER=smtp` and the `SMTP_*` values (Gmail needs an app password; port 465 → `SMTP_SECURE=true`).
- Resend: set `EMAIL_PROVIDER=resend` and `RESEND_API_KEY`.
- Use Admin → Emails → **Send test email** to check the setup.

### 4. Install, migrate, seed
```bash
npm install            # also runs prisma generate
npm run db:migrate     # prisma migrate deploy
npm run db:seed        # realistic demo data
# or: npm run db:reset  (drops, re-migrates and re-seeds)
```

### 5. Run
```bash
npm run dev            # http://localhost:3000
npm run build && npm start   # production
```

### 6. Tests
```bash
npx playwright install chromium    # first time only
npm run build && npm start &       # the suite runs against a live server
npm run test:e2e                   # needs psql on PATH; reads DATABASE_URL
```
The suite runs 30+ real user flows. After each one it queries PostgreSQL directly to confirm the data was saved. Flows covered: registration, login and logout, protected routes, admin access control, search, filters, wishlist, cart, quantity changes, stock limits, coupons, a declined and then successful checkout, order creation, cancellation, COD, the review rules, admin order fulfilment, review moderation, product create/edit/unpublish/delete with image upload, inventory changes, coupons, broadcasts and dashboard analytics.

**Google sign-in and email suite** (21 checks) uses a local SMTP catcher and a mock Google OpenID provider, so it needs no real credentials:
```bash
npm run test:mail &      # SMTP on :2525, inbox JSON on :2580
npm run test:google &    # mock Google OIDC on :4455
EMAIL_PROVIDER=smtp SMTP_HOST=localhost SMTP_PORT=2525 \
GOOGLE_CLIENT_ID=nova-test-client GOOGLE_CLIENT_SECRET=nova-test-secret \
GOOGLE_AUTH_URL=http://localhost:4455/auth GOOGLE_TOKEN_URL=http://localhost:4455/token \
GOOGLE_JWKS_URL=http://localhost:4455/jwks GOOGLE_ISSUER=http://localhost:4455 npm start &
npm run test:auth
```
It covers: verification email and single-use link, forgot password (including no enumeration), reset with session revocation, old/tampered links rejected, Google sign-up, repeat sign-in, cancel, forged state, unverified-email takeover blocked, linking an existing account, connect/disconnect from Security, one Google account per user, adding a password to a Google-only account, order shipping email, opt-out producing a SKIPPED log, and the admin email log, preview access control and test email.

---

## Demo credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@nova.dev` | `Admin@12345` |
| Customer (Riya Shah) | `customer@nova.dev` | `Customer@123` |
| Other customers | e.g. `aarav.mehta@example.in` | `Customer@123` |

Riya's account already has delivered, shipped and confirmed (cancellable) orders, two saved addresses, a wishlist with a price drop, a back-in-stock alert, reward points and notifications.

## Coupons in the seed

| Code | Rule |
|---|---|
| `NOVA10` | 10% off, minimum order ₹5,000, maximum discount ₹2,000 |
| `WELCOME500` | ₹500 off orders above ₹10,000, once per customer |
| `FLASH15` | 15% off above ₹20,000 (max ₹5,000), 200 uses total |
| `AUDIO2K` | ₹2,000 off above ₹25,000 (twice per customer) |
| `DIWALI25` | expired, so you can see the error message |

## Payment test information (`PAYMENT_PROVIDER=mock`)

| Method | Succeeds | Fails |
|---|---|---|
| Card | `4111 1111 1111 1111`, any future expiry, any CVV | `4000 0000 0000 0002` (declined) |
| UPI | any valid ID, e.g. `riya@okaxis` | an ID ending in `@fail` |
| Net banking | any bank | none |
| Test Payment | choose "Payment succeeds" | choose "Payment fails" |
| COD | confirmed right away; payment is marked captured on delivery | none |

If a payment fails, the order stays PENDING and its stock is released, and your cart is kept so you can retry. With `PAYMENT_PROVIDER=razorpay`, checkout opens Razorpay Checkout and the signature is verified on the server before the order is confirmed.

---

## Folder structure

```
app/
  (store)/            storefront: home, shop, product/[slug], cart, wishlist, compare, checkout, account/*, help
  (auth)/             login, register
  admin/              dashboard, products, inventory, orders, coupons, reviews, customers, notifications
  api/                search (live suggestions), health
  invoice/[orderNumber]  printable invoice
  media/[...key]      serves uploaded images
  sitemap.ts, robots.ts, not-found.tsx, error.tsx
components/
  ui/                 design-system primitives (button, input, dialog, tabs…)
  shared/             logo, price, rating, stock status
  store/ product/ cart/ checkout/ account/ auth/ admin/
lib/
  actions/            server actions (auth, cart, wishlist, checkout, engagement, admin)
  services/           business logic (catalog, pricing, coupon, cart, order, inventory, rewards, review, analytics…)
  validation/         Zod schemas
  auth/               sessions, password hashing, guards, OAuth-ready providers
  payments/           provider interface + mock + razorpay
  storage/            storage provider interface + local
  db.ts money.ts format.ts errors.ts logger.ts rate-limit.ts
prisma/               schema.prisma, migrations/, seed.ts
public/               product/category imagery, hero, OG image
tests/                Playwright end-to-end suite
types/ hooks/
```

## Data model

User, Account, Session, AuthToken, EmailLog, Product, Category, Brand, ProductImage, ProductSpecification, Cart, CartItem, Wishlist, WishlistItem, Address, Order, OrderItem, Payment, Review, Coupon, CouponUsage, InventoryTransaction, Notification, RewardAccount, RewardTransaction, StockAlert, NewsletterSubscriber, and more. The schema includes unique constraints (e.g. one review per user per product, one cart item per product and colour), indexes on common queries, timestamps and deliberate cascade rules. For example, orders use `Restrict` on users, and order items keep a snapshot of the product.

## Security notes
- Passwords are hashed with bcrypt, and session tokens are stored only as hashes
- Role checks run on the server for every admin page and action
- Zod validates every input on the server
- The client never supplies prices, discounts, stock, roles or payment status; the server recalculates them
- Google sign-in uses PKCE, state and nonce in an httpOnly cookie, compared in constant time
- Reset/verify tokens are hashed, single-use (consumed atomically) and short-lived; secret links are redacted in the email log
- Rate limits on login, registration, password reset requests, Google sign-in, password change, reviews and order placement (in-memory; swap in Redis via `lib/rate-limit.ts` if you run multiple instances)
- Uploads are checked for allowed type, size and file signature (magic bytes), and served with `nosniff`
- Security headers are set in middleware

## Deploying
Works on any Node host (Vercel, Railway, Render, Fly) with managed PostgreSQL (Neon, Supabase, RDS). Set the environment variables, run `npm run db:migrate` (and `db:seed` if you want demo data), then `npm run build && npm start`. On serverless hosts, set `STORAGE_PROVIDER` to Cloudinary or S3, because local disk is temporary.
