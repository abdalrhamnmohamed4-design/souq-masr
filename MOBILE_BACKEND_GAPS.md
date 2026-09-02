# Mobile ↔ Backend Gaps

Every feature listed here has **no real Frappe endpoint yet** — confirmed by
listing the actual files under `souq-masr-app/souq-masr/souq_masr/api/`,
which currently contains exactly two API modules:

```
souq_masr/api/v1/app_config.py   — app version/force-update check (integrated, StartupGate)
souq_masr/api/v1/taxonomy.py     — 12 endpoints (integrated, Phase 2A COMPLETE)
souq_masr/api/v1/auth.py         — 1 endpoint: signin (integrated, Phase 2B — see MOBILE_BACKEND_INTEGRATION_REPORT.md)
souq_masr/api/v1/listings.py     — 12 endpoints (built + live-tested, Phase 2B — only create_listing/get_listing are wired into a mobile screen so far; see MOBILE_BACKEND_INTEGRATION_REPORT.md's Phase 2B section for exactly which ones)
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

**Update:** listing search/discovery/detail endpoints are now **built and
live-tested** (`souq_masr.api.v1.listings.*` — see
`MOBILE_BACKEND_INTEGRATION_REPORT.md`'s Phase 2B section). What's left
below is genuinely not built yet, or built-but-not-wired-to-a-screen
(marked explicitly which is which).

| Feature | Status | Auth | Priority |
|---|---|---|---|
| List/search listings (`app/results.tsx`) | ✅ Backend built+tested (`search_listings` — `q, category_key, condition, field_filters, city_governorate, page, limit`). ⏳ **Not wired into `results.tsx`** — still 100% local `useDiscoverableListings`. | Guest | High |
| Listing detail (`app/detail/[id].tsx`) | ✅ Backend built+tested (`get_listing`). ✅ **Wired** — real listings (`LST-#####` ids) fetch from the backend; local ids unchanged. | Guest | Done for real listings |
| Listing discovery by category/location (`app/(tabs)/home.tsx`) | ✅ Backend built+tested (`get_listings_by_category`, `get_listings_by_location`). ⏳ Not wired — `home.tsx`'s listing sections still local. | Guest | High |
| Seller public profile (`app/seller/[id].tsx`) | ⏳ **Not built.** `get_listing`/`get_public_listings` embed minimal seller display fields (name/phone/member-since/ads-count) directly in the listing response as a pragmatic substitute for this slice, but there's still no standalone seller-profile endpoint (reviews, full ad history, etc.) | Guest | High |
| Increment view count | ✅ Backend built+tested+wired (`increment_listing_views`, called from `app/detail/[id].tsx` for real listings) | Guest | Done |
| Saved searches sync (`store`'s `savedSearches`) | ⏳ Not built | **Auth** | Medium |

## Phase 2C — Authentication / profile

**Update:** the "Critical, blocks everything else" item below is now
**built and live-tested** — see `MOBILE_BACKEND_INTEGRATION_REPORT.md`'s
Phase 2B "Ownership / Authentication Architecture" section for the full
design (Frappe's own token auth, not a new scheme). It exists **only**
because real listing ownership needed it; it was not itself the goal of
Phase 2B. `users.me`/`users.update`/social sign-in remain unbuilt.

| Feature | Status | Auth | Priority |
|---|---|---|---|
| Create/find user by phone (no OTP, per the app's own product decision — see `app/signin.tsx`'s header comment) | ✅ **Built, deployed, live-tested, wired.** `souq_masr.api.v1.auth.signin(name, phone, country_iso)` → real Frappe `User` (Website User) + `api_key`/`api_secret` (Frappe's own token-auth mechanism, not a session cookie). Idempotent by phone — confirmed live. Called from `app/signin.tsx`'s existing submit flow (`services/authService.ts`). | Public (this IS the login call) | Done |
| Get current user profile | ⏳ Not built | Auth | High |
| Update profile | ⏳ Not built | Auth | High |
| Social sign-in (Google/Apple/Facebook — buttons already exist in `app/welcome.tsx`, deliberately non-functional, see `lib/socialAuth.ts`) | ⏳ Not built | Public | Low (buttons already honestly disabled client-side) |

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

**Update:** all 5 rows below are now **built and live-tested** backend-side
(`souq_masr.api.v1.listings.*` — see `MOBILE_BACKEND_INTEGRATION_REPORT.md`'s
Phase 2B section, including full ownership/security test results). Only
`create_listing` is wired into a mobile screen this pass — the rest are
ready for the next Phase 2B step (wiring `myads.tsx`'s edit/delete/pause/
activate/mark-sold actions to the real endpoints instead of local-only
`updateListing`/`removeMyAd`).

| Feature | Status | Auth | Priority |
|---|---|---|---|
| Create listing | ✅ Built, tested, **wired** — `app/post/index.tsx`'s `publish()` (new, variant-free listings only; edits and listings-with-variants still local, disclosed in the integration report) | Auth | Done for this slice |
| Edit listing | ✅ Backend built+tested (`update_listing`, partial-patch). ⏳ Not wired — `post/index.tsx`'s edit path still local-only | Auth (owner only) | High |
| Delete listing | ✅ Backend built+tested (`delete_listing`). ⏳ Not wired to `myads.tsx` | Auth (owner only) | High |
| Pause / activate listing | ✅ Backend built+tested (`pause_listing`/`activate_listing`, with status-transition validation). ⏳ Not wired to any screen (no UI for this exists in `myads.tsx` yet either — new UI, not just new wiring) | Auth (owner only) | Medium |
| Upload image(s) | ✅ Wired — Frappe's standard `/api/method/upload_file`, called from `app/post/index.tsx`'s publish flow (`services/listingService.ts`'s `uploadListingImage`), `is_private=0`, ownership-checked on attach | Auth | Done |
| Mark as sold | ✅ Backend built+tested (`mark_listing_sold`). ⏳ Not wired — the mobile app's existing chat-based `confirmListingSold()` flow (`store/useAppStore.ts`) still only updates the local mock store; connecting it to the real endpoint needs Chat itself to be real first (Phase 2E), since the trigger lives inside a chat message today | Auth (owner only) | Medium |

---

## Real gap (not yet catalogued as its own phase) — Listing variants

`ProductVariant[]`/`sku` (the "Business/Product Listing" size/color/stock
feature, business accounts only) is **not modeled** in `Souq Masr Listing`
at all — deliberately deferred out of Phase 2B's first slice (see
`MOBILE_BACKEND_INTEGRATION_REPORT.md`'s Phase 2B section). A listing with
variants still publishes through the local/mock path only, so no user data
is silently dropped, but it also never reaches the real backend. Needs its
own child-table design (`Souq Masr Listing Variant`: size/color/stock) —
a small, contained follow-up once basic Listings usage patterns are clear.

## Not a gap — explicitly out of scope this phase

- **Admin dashboard** (`admin/`) — untouched per this phase's explicit instruction, not evaluated here.
- **Domain + SSL** for the backend — tracked in `BACKEND_PRODUCTION_READINESS.md` §12, not a mobile-integration gap.
- **Chat, Reviews, Favorites (server-side), Jobs, Services, Notifications, Payments** — explicitly excluded from Phase 2B by this phase's own instruction, not evaluated here.
