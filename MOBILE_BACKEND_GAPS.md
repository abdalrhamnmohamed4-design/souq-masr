# Mobile ↔ Backend Gaps

Every feature listed here has **no real Frappe endpoint yet** — confirmed by
listing the actual files under `souq-masr-app/souq-masr/souq_masr/api/`,
which currently contains exactly two API modules:

```
souq_masr/api/v1/app_config.py   — app version/force-update check (integrated, StartupGate)
souq_masr/api/v1/taxonomy.py     — 12 endpoints (integrated, Phase 2A COMPLETE)
souq_masr/api/v1/auth.py         — 1 endpoint: signin (integrated, Phase 2B — see MOBILE_BACKEND_INTEGRATION_REPORT.md)
souq_masr/api/v1/listings.py     — 12 endpoints (built + live-tested, Phase 2B Slice 1+2 — 11 of 12 now wired into a mobile screen; see MOBILE_BACKEND_INTEGRATION_REPORT.md's Phase 2B sections for exactly which ones)
souq_masr/api/v1/favorites.py    — 4 endpoints (integrated, Phase 2B Slice 3 — Listings only, Services untouched)
souq_masr/api/v1/saved_searches.py — 3 endpoints (integrated, Phase 2B Slice 3)
souq_masr/api/v1/reports.py      — 2 endpoints (integrated, Phase 2B Slice 3 — Listings only)
souq_masr/api/v1/chat.py         — 6 endpoints (integrated, Phase 2B Slice 4 — real conversations/messages, server timestamps)
souq_masr/api/v1/calls.py        — 7 endpoints (integrated, Phase 2B Slice 4/4B — real call signaling/state/security + get_rtc_token; audio infra built, two-device test still NO-GO)
souq_masr/api/v1/reviews.py      — 5 endpoints (integrated, Phase 2B Reviews — seller reviews only)
souq_masr/api/v1/sellers.py      — 1 endpoint (integrated, Phase 2B Reviews — get_seller_profile)
souq_masr/api/v1/companies.py    — 3 endpoints (integrated, Phase 2B Jobs)
souq_masr/api/v1/jobs.py         — 10 endpoints (integrated, Phase 2B Jobs — core loop wired; my-jobs/results/discovery mobile screens not yet migrated, see below)
souq_masr/api/v1/job_applications.py — 7 endpoints (integrated, Phase 2B Jobs — includes private CV handling)
souq_masr/api/v1/job_interviews.py — 3 endpoints (integrated, Phase 2B Jobs)
souq_masr/api/v1/saved_jobs.py   — 4 endpoints (integrated, Phase 2B Jobs)
souq_masr/api/v1/career_profile.py — 3 endpoints (integrated, Phase 2B Jobs — scalar fields + resume only, see below)
souq_masr/api/v1/content_reports.py — 2 endpoints (integrated, Phase 2B Jobs — shared with Services once built)
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

**Update (Slice 2):** search/discovery is now **built, live-tested, AND
wired** into both `results.tsx` and `home.tsx` — see
`MOBILE_BACKEND_INTEGRATION_REPORT.md`'s Phase 2B Slice 2 section. Also
added this slice: server-side `sort` (newest/cheapest/priciest/mostViewed)
and category-descendant expansion for `search_listings`/
`get_listings_by_category` (previously exact-match only). What's left
below is genuinely not built yet.

| Feature | Status | Auth | Priority |
|---|---|---|---|
| List/search listings (`app/results.tsx`) | ✅ Backend built+tested (`search_listings` — `q, category_key, condition, field_filters, city_governorate, sort, page, limit`). ✅ **Wired**, incl. debounced search + "load more" pagination. `nearest`/`favoritesFirst` sort remain client-side-only (need device geo / real Favorites, both out of scope). | Guest | Done for this slice |
| Listing detail (`app/detail/[id].tsx`) | ✅ Backend built+tested (`get_listing`). ✅ **Wired** — real listings (`LST-#####` ids) fetch from the backend; local ids unchanged. | Guest | Done |
| Listing discovery by category/location (`app/(tabs)/home.tsx`) | ✅ Backend built+tested (`get_listings_by_category`, `get_listings_by_location`). ✅ **Wired** — every home listing section (latest/cheapest/nearby/cars/real-estate) is real now; "featured" stays honestly empty (no promotion system). | Guest | Done for this slice |
| Seller public profile (`app/seller/[id].tsx`) | ✅ **Built, live-tested, wired** (Reviews slice) — `souq_masr.api.v1.sellers.get_seller_profile`, `souq_masr.api.v1.listings.get_seller_listings`, `souq_masr.api.v1.reviews.get_seller_reviews`. Previously a real dead end for every real listing (see integration report's Reviews section §1). | Guest | Done |
| Increment view count | ✅ Backend built+tested+wired (`increment_listing_views`, called from `app/detail/[id].tsx` for real listings) | Guest | Done |
| Favorites (toggle/list) | ✅ Built, live-tested, wired — see Phase 2D table below (moved there, this row kept only as a pointer) | Guest reads `false` / Auth mutations | Done |
| Saved searches sync | ✅ Built, live-tested, wired — see Phase 2D table below | **Auth** | Done |

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

**Update (Slice 3):** Favorites (Listings) and Reports (Listings) are now
**built, live-tested, and wired** — see
`MOBILE_BACKEND_INTEGRATION_REPORT.md`'s Phase 2B Slice 3 section.
Reviews, Favorites for Services/Jobs, seller-block, notifications, and
wallet remain unbuilt — none of those domains were touched this slice.

| Feature | Status | Auth | Priority |
|---|---|---|---|
| Favorites — Listings (toggle/list) | ✅ **Built, live-tested, wired.** `souq_masr.api.v1.favorites.{add_favorite,remove_favorite,is_favorite,get_my_favorites}` — normalized `Souq Masr Listing Favorite` DocType, `is_favorite` embedded in every listing response. `app/favorites.tsx`, `app/detail/[id].tsx`, `RowCard`, home.tsx's `MiniCard` all real-backend-aware for real listings (local store made real-aware internally — see integration report). | Auth (mutations); Guest reads `false` | Done for Listings |
| Favorites — Services/Jobs | ⏳ Not built — the shared local `favorites` Record still fully backs these, untouched, by design (out of scope this phase) | Auth | Medium |
| Reviews — Sellers (add/edit/delete/list + aggregate rating) | ✅ **Built, live-tested, wired.** `souq_masr.api.v1.reviews.*` + `souq_masr.api.v1.sellers.get_seller_profile` — `Souq Masr Review` DocType (no blanket read, prevents a phone-number leak via generic REST), eligibility gated on a real conversation with the seller, upsert-on-resubmit. `app/seller/[id].tsx` now works for real sellers for the first time (previously a dead end — see integration report §1). | Auth (create/edit/delete) / Guest (list, summary) | Done for Sellers |
| Reviews — Professionals/Companies (Jobs/Services) | ⏳ Not built — deferred to the Jobs/Services slices themselves (needs a real Company/Professional model first) | Auth (create) / Guest (list) | Medium |
| Reports — Listings | ✅ **Built, live-tested, wired.** `souq_masr.api.v1.reports.{report_listing,has_reported}` — `Souq Masr Listing Report` DocType, create-only permissions (no read path for any non-admin role, by design). `app/detail/[id].tsx`'s report flow no longer fakes success for real listings. | Auth | Done for Listings |
| Saved searches sync (`store`'s `savedSearches`) | ✅ **Built, live-tested, wired.** `souq_masr.api.v1.saved_searches.{create_saved_search,get_my_saved_searches,delete_saved_search}` — `Souq Masr Saved Search` DocType, schema-ready `location`/`min_price`/`max_price`/`sort` fields not yet populated (no UI collects them). `app/results.tsx`/`app/saved-searches.tsx` wired; a pre-existing filter-restoration bug fixed alongside. | **Auth** | Done |
| Block/unblock seller | ⏳ Not built | Auth | Low |
| Notifications | ⏳ Not built | Auth | Medium |
| Wallet (top-up, transfer, promote balance) | ⏳ Not built | Auth | Low (needs a real payment gateway decision first, not just an endpoint) |

## Phase 2E — Chat

**Update (Slice 4):** real conversations, messages (with server
timestamps), and call signaling/state are **built, live-tested, and
wired** — see `MOBILE_BACKEND_INTEGRATION_REPORT.md`'s Phase 2B Slice 4
section for the full detail, live HTTP results, and two backend bugs
found and fixed (GET-requests-don't-commit; site-wide timezone
misconfiguration) plus a phone-privacy leak fixed.

**Update (Slice 4B):** actual voice audio infrastructure is now **built
and independently verified everywhere this environment can verify it** —
self-hosted LiveKit (systemd, no Docker, no Redis — single-node),
`get_rtc_token` (audio-only-scoped, room-authorized, live HTTP-tested
including decoding real JWT payloads), the full mobile RTC integration
(`app/call/[id].tsx` rewritten onto real `@livekit/react-native`), EAS
dev-build config, and one real pre-existing bug found and fixed (missing
iOS ATS / Android cleartext exception — would have blocked *every*
existing feature on a real device, not just calling). **Still NO-GO**:
the actual two-device audio test itself has not run yet — it needs a
physical-device `eas build` only the requester can perform. See
`MOBILE_BACKEND_INTEGRATION_REPORT.md`'s Phase 2B Slice 4B section §13-15
for the exact test steps and the explicit NO-GO reasoning.

| Feature | Status | Auth | Priority |
|---|---|---|---|
| Start/list/read conversations | ✅ **Built, live-tested, wired.** `souq_masr.api.v1.chat.{start_conversation,get_my_conversations,get_conversation}` — normalized `Souq Masr Conversation`/`Souq Masr Message` DocTypes, create-only permissions (two-participant membership enforced explicitly in Python, not via DocType perms). `app/(tabs)/messages.tsx`, `app/chat/[id].tsx`, `app/detail/[id].tsx` all real-backend-aware for real listings. | Auth | Done |
| Send/receive messages (text + image) | ✅ **Built, live-tested, wired.** `send_message`/`send_image_message`, real server `creation` timestamp on every message (see the timezone-fix note above), date-grouped display on mobile (اليوم/أمس/full date, Arabic or English per active language). | Auth | Done |
| Real-time delivery | ⏳ Not wired — polling (2.5-5s depending on screen; stops entirely once a voice call is actually connected, see Slice 4B) used instead. Frappe's `realtime`/socketio confirmed running on the VPS (`BACKEND_PRODUCTION_READINESS.md` §10) but not connected to the mobile client. | Auth | Medium |
| Call signaling (start/accept/decline/end, ring-timeout, duration, call-event timeline) | ✅ **Built, live-tested, wired.** `souq_masr.api.v1.calls.*` — `Souq Masr Call` DocType, caller/callee always server-derived from conversation membership (never client-supplied). | Auth | Done |
| Voice audio infrastructure (LiveKit server, token endpoint, mobile RTC integration, audio-only enforcement) | ✅ **Built and verified** — self-hosted LiveKit reachable from outside its own network (real STUN response, not just an open port), token endpoint live-tested end-to-end (JWT payload decoded and asserted: room, identity, `canPublishSources: ["microphone"]` only, TTL), room capped at `max_participants=2` verified directly on the running server, `tsc`/`expo export`/a real `expo prebuild` all clean. | Auth | Done (infra) |
| Actual two-device voice audio | ⛔ **Not yet tested — NO-GO.** Everything up to this point is complete; only a physical-device `eas build` + real call between two devices remains, and only the requester can run it (see integration report §13-14 for the exact steps and build command). | Auth | **Blocking — next action is the requester's** |
| Background/incoming-call support (CallKit/ConnectionService + push) | ⛔ **Not built.** Needs a VoIP push channel (APNs VoIP push + FCM) and a paid Apple Developer entitlement, neither present yet. Foreground-only incoming-call detection (polling while the chat screen is open) is built as a disclosed partial substitute — unchanged since Slice 4. | Auth | Medium (after the two-device test) |
| TLS/domain for the public LiveKit endpoint | ⏳ Still pending — DuckDNS subdomain + token requested from the requester, not yet received. Does not block the two-device test (media is DTLS-SRTP-encrypted regardless); does mean a temporary, explicitly-flagged `NSAllowsArbitraryLoads`/`usesCleartextTraffic` exception is in `app.json` and must be narrowed once TLS is live. | — | High (before any production release) |
| Sold-confirmation flow (`types/sale.ts`, already fully designed client-side) | ⏳ Not built — still fully mock, unextended to real conversations (a real listing's mark-sold path already works via My Ads directly, from Slice 2) | Auth | Medium |

## Phase 2F — Listing creation / edit / images

**Update (Slice 2):** every row below is now **built, live-tested, AND
wired** except marking a listing sold via the chat flow specifically —
see `MOBILE_BACKEND_INTEGRATION_REPORT.md`'s Phase 2B sections.

| Feature | Status | Auth | Priority |
|---|---|---|---|
| Create listing | ✅ Built, tested, **wired** — `app/post/index.tsx`'s `publish()` (new, variant-free listings only; edits and listings-with-variants still local, disclosed in the integration report) | Auth | Done |
| Edit listing | ✅ Built, tested, **wired** — `post/index.tsx`'s edit path (`update_listing`, partial-patch, ownership-enforced both client-side (`isOwner` check) and server-side) | Auth (owner only) | Done |
| Delete listing | ✅ Built, tested, **wired** — `app/(tabs)/myads.tsx`'s "احذف" action for real listings | Auth (owner only) | Done |
| Pause / activate listing | ✅ Built, tested, **wired** — `myads.tsx`'s "أوقف"/"فعّل" actions (new UI added to the existing action-row pattern, not a redesign) | Auth (owner only) | Done |
| Upload image(s) | ✅ Wired — Frappe's standard `/api/method/upload_file`, called from both create and edit flows (`services/listingService.ts`'s `uploadListingImage`), `is_private=0`, ownership-checked on attach, retain/remove/add all live-tested with no duplication | Auth | Done |
| Mark as sold | ✅ Backend built+tested (`mark_listing_sold`), **wired** in `myads.tsx` (a direct "مباع" button, confirmed via Alert). ⏳ The mobile app's **existing chat-based** `confirmListingSold()` flow (`store/useAppStore.ts`) still only updates the local mock store — connecting *that specific trigger* to the real endpoint needs Chat itself to be real first (Phase 2E), since it lives inside a chat message | Auth (owner only) | Chat-triggered path: Medium |

## Phase 2G — Jobs

**New this pass:** the full Jobs backend (Companies, Job postings,
Applications with private CV handling, Interviews, Saved Jobs, a
scoped Career Profile, a shared content-report system) is **built and
live-tested** — see `MOBILE_BACKEND_INTEGRATION_REPORT.md`'s Phase 2B
Jobs section for the scope decisions (deep CV builder / Job Alerts /
Company reviews deliberately deferred, documented there), the CV-privacy
design, and the full live HTTP test results. Mobile is migrated for the
core loop only.

| Feature | Status | Auth | Priority |
|---|---|---|---|
| Company profile (create/update/public view) | ✅ **Built, live-tested, wired.** `souq_masr.api.v1.companies.*` — one company per owner (upsert). `app/jobs/my-company.tsx` wired (a pre-existing local company keeps editing locally, unchanged). | Auth (create/edit) / Guest (view) | Done |
| Post/edit/pause/activate/close/delete a job | ✅ **Built, live-tested, wired.** `souq_masr.api.v1.jobs.*`. `app/jobs/post.tsx` wired for create and edit (real `JOB-#####` ids fetched and hydrated); `app/jobs/[id].tsx` wired for viewing. | Auth (owner only for mutations) / Guest (view) | Done for post/edit/view |
| Manage my jobs / applicants / interviews (`my-jobs.tsx`, `applicants.tsx`) | ⏳ **Backend built+tested** (`get_my_jobs`, `get_applications_for_job`, `set_application_status`, `schedule_interview`) — **mobile screens not yet migrated**, still reading local mock data | Auth (owner only) | High (natural next pass) |
| Apply to a job | ✅ **Built, live-tested, wired.** `souq_masr.api.v1.job_applications.apply_to_job` — idempotent, real uploaded CV (`is_private=1`) instead of the mock's "generated resume" option. `app/jobs/apply/[id].tsx` wired. | Auth | Done |
| My applications / saved jobs (`applications.tsx`, `saved.tsx`) | ⏳ **Backend built+tested** (`get_my_applications`, `get_my_saved_jobs`) — **mobile screens not yet migrated** | Auth | Medium |
| Company public profile + its jobs (`company/[id].tsx`) | ⏳ **Backend built+tested** (`get_company`, `get_jobs_by_company`) — **mobile screen not yet migrated**; company reviews specifically remain out of scope (deferred to Services) | Guest | Medium |
| Jobs home / search (`index.tsx`, `results.tsx`) | ⏳ **Backend built+tested** (`search_jobs`) — **mobile screens not yet migrated**, so real jobs posted via the now-real `post.tsx` are not yet discoverable through these two screens specifically (still reachable via a direct id, e.g. from a share link) | Guest | High (closes the discovery gap) |
| CV privacy (résumé access restricted to candidate/employer) | ✅ **Built, live-tested** — 8-group test suite including a real unauthorized-stranger-gets-403 case, see integration report §5 | Auth | Done |
| Career Profile | ✅ **Built, live-tested, wired at the API level** — scalar fields + one résumé file only (deep CV builder deferred, see integration report §1). Not yet wired into `app/jobs/profile.tsx` (that screen stays mock, by design, until/unless the deep builder itself is migrated) | Auth (owner-only, always) | Scoped Done |
| Job Alerts | ⏳ Not built — deferred, separable follow-up | Auth | Low |
| Company/Professional reviews | ⏳ Not built — deferred to Services (shared `content_reports.py` already ready for it) | Auth (create) / Guest (list) | Medium |

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
- **Services, Notifications, Payments** — not yet built (Jobs and Reviews now are — see the Phase 2B Reviews section and Phase 2G above; Favorites/Saved Searches/Reports for **Listings** are built — Phase 2B Slice 3; real Chat + call signaling are built — Phase 2B Slice 4 (VoIP audio itself excepted, see the Phase 2E table above); see `MOBILE_BACKEND_INTEGRATION_REPORT.md` for all of them). Favorites for Services specifically remain local-only, untouched.
