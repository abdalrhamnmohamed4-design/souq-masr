# Mobile ↔ Backend Gaps

Every feature listed here has **no real Frappe endpoint yet** — confirmed by
listing the actual files under `souq-masr-app/souq-masr/souq_masr/api/`,
which currently contains exactly two API modules:

```
souq_masr/api/v1/app_config.py   — app version/force-update check (integrated, StartupGate)
souq_masr/api/v1/taxonomy.py     — 12 endpoints (integrated, Phase 2A COMPLETE — see MOBILE_BACKEND_INTEGRATION_REPORT.md)
```

Nothing else exists server-side. Per the explicit instruction for this
phase, **none of the features below have been given a fake/mock API to
paper over the gap** — the mobile app continues reading these from
`store/useAppStore.ts` / `mock/*` exactly as before, unchanged, until a real
endpoint exists.

---

## Taxonomy — 0 open gaps (both resolved during Phase 2A)

Both gaps below were found while wiring `components/LocationPicker.tsx` and
are now **built, deployed, and live-tested** — see
`MOBILE_BACKEND_INTEGRATION_REPORT.md`'s Phase 2A section for the live HTTP
test results. Kept here as a record of what was actually missing and how it
was closed, per this doc's own "don't fake it, document it" convention.

### 1. ~~`get_location(location_key)` — single location lookup by ID~~ ✅ RESOLVED
- **Was blocking:** `components/LocationPicker.tsx`'s drill-down header and
  resolving `initialLocationId`'s parent when the picker reopens with a
  pre-selected location.
- **Shipped as:** `souq_masr.api.v1.taxonomy.get_location(location_key)` —
  same 404-on-invalid-id pattern as `get_category`, same response shape as
  `search_locations()`'s items. Live-tested for a governorate, a 3-level-deep
  area, and an invalid id (clean 404, no traceback).
- **Consumed by:** `services/taxonomyService.ts`'s `getLocation()`, used in
  `components/LocationPicker.tsx` (`initialLocationId` resolution, popular-
  governorates section) and indirectly by `app/post/index.tsx` (via
  `LocationPicker`).

### 2. ~~`get_location_path(location_key)` — breadcrumb for a location~~ ✅ RESOLVED
- **Was blocking:** `locationPathLabel(id)`'s server-side equivalent (e.g.
  "القاهرة، مدينة نصر، الرحاب") — used for the selected-location display
  text in `app/post/index.tsx`'s Location step and Review step, and for
  `app/(tabs)/home.tsx`'s "اختار مدينتك" city-name resolution.
- **Shipped as:** `souq_masr.api.v1.taxonomy.get_location_path(location_key)`
  — walks up `parent_souq_masr_location` exactly like `get_path()` does for
  categories, root-first `[{id,name}, ...]`. Unlike `get_path()`, validates
  the id up front (clean 404) since this endpoint is reachable with a
  user-persisted/unverified id (a stored `onboarding.locationId`), not only
  an already-known-valid one from browsing.
- **Consumed by:** `services/taxonomyService.ts`'s `getLocationPath()`, used
  in `app/(tabs)/home.tsx`, `app/post/index.tsx` (`LocationStep`,
  `ReviewStep`, and `publish()`'s `city` field).

---

## Phase 2B — Public listings / search / filters / seller profile

None of these have a backend DocType or endpoint yet — `store/useAppStore.ts`'s `userListings` + `mock/listings.ts`'s seed data remain the only source.

| Feature | Required endpoint (proposed) | Auth | Priority |
|---|---|---|---|
| List/search listings (`app/results.tsx`) | `souq_masr.api.v1.listings.search` — params: `q, category_key, condition, field_filters, sort, city, page, limit` → paginated `{items, total, page}` | Guest | High |
| Listing detail (`app/detail/[id].tsx`) | `souq_masr.api.v1.listings.get(listing_id)` | Guest | High |
| Seller public profile (`app/seller/[id].tsx`) | `souq_masr.api.v1.sellers.get_public_profile(seller_id)` | Guest | High |
| Increment view count | `souq_masr.api.v1.listings.increment_views(listing_id)` | Guest | Medium |
| Saved searches sync (`store`'s `savedSearches`) | `souq_masr.api.v1.saved_searches.*` | **Auth** | Medium |

## Phase 2C — Authentication / profile

The mobile app's entire auth model today (`app/signin.tsx`, name+phone,
`onboarding.joinedAt`) is **100% local** — no session, no token, nothing
sent to any server. This is the single biggest gap in the whole app.

| Feature | Required endpoint (proposed) | Auth | Priority |
|---|---|---|---|
| Create/find user by phone (no OTP, per the app's own product decision — see `app/signin.tsx`'s header comment) | `souq_masr.api.v1.auth.signin(name, phone, country_iso)` → session/API key | Public (this IS the login call) | **Critical** — blocks everything else in 2C-2F |
| Get current user profile | `souq_masr.api.v1.users.me` | Auth | High |
| Update profile | `souq_masr.api.v1.users.update` | Auth | High |
| Social sign-in (Google/Apple/Facebook — buttons already exist in `app/welcome.tsx`, deliberately non-functional, see `lib/socialAuth.ts`) | `souq_masr.api.v1.auth.social_login(provider, id_token)` | Public | Low (buttons already honestly disabled client-side) |

## Phase 2D — User actions

| Feature | Required endpoint (proposed) | Auth | Priority |
|---|---|---|---|
| Favorites (toggle/list) | `souq_masr.api.v1.favorites.toggle`, `.list` | Auth | High |
| Reviews (add/list for a seller) | `souq_masr.api.v1.reviews.create`, `.list_for_seller` | Auth (create) / Guest (list) | Medium |
| Reports (report a listing) | `souq_masr.api.v1.reports.create` | Auth | Medium |
| Block/unblock seller | `souq_masr.api.v1.users.block`, `.unblock` | Auth | Low |
| Notifications | `souq_masr.api.v1.notifications.list`, `.mark_read` | Auth | Medium |
| Wallet (top-up, transfer, promote balance) | `souq_masr.api.v1.wallet.*` | Auth | Low (needs a real payment gateway decision first, not just an endpoint) |

## Phase 2E — Chat

| Feature | Required endpoint (proposed) | Auth | Priority |
|---|---|---|---|
| List conversations | `souq_masr.api.v1.chat.list_conversations` | Auth | High |
| Send/receive messages | `souq_masr.api.v1.chat.send_message`, real-time delivery (Frappe's `realtime`/socketio — already running on the VPS, confirmed in `BACKEND_PRODUCTION_READINESS.md` §10, unused so far) | Auth | High |
| Sold-confirmation flow (`types/sale.ts`, already fully designed client-side) | `souq_masr.api.v1.sales.confirm` | Auth | Medium |

## Phase 2F — Listing creation / edit / images

| Feature | Required endpoint (proposed) | Auth | Priority |
|---|---|---|---|
| Create listing | `souq_masr.api.v1.listings.create` | Auth | **Critical** for the app's core purpose |
| Edit listing | `souq_masr.api.v1.listings.update` | Auth (owner only) | High |
| Delete listing | `souq_masr.api.v1.listings.delete` | Auth (owner only) | High |
| Upload image(s) | Frappe's standard `/api/method/upload_file` (already exists in core Frappe — no custom endpoint needed, just needs to be wired up and given a private/public file policy decision) | Auth | High |
| Mark as sold | `souq_masr.api.v1.listings.mark_sold` (backs the already-built `confirmListingSold()` client flow in `store/useAppStore.ts`) | Auth (owner only) | Medium |

---

## Not a gap — explicitly out of scope this phase

- **Admin dashboard** (`admin/`) — untouched per this phase's explicit instruction, not evaluated here.
- **Domain + SSL** for the backend — tracked in `BACKEND_PRODUCTION_READINESS.md` §12, not a mobile-integration gap.
