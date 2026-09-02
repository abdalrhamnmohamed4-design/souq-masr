# Mobile ↔ Backend Integration Report — Phase 2A

**Scope of this report:** Phase 2A (Taxonomy) only, per the explicit
instruction not to migrate everything at once. Phases 2B-2F (listings,
auth, user actions, chat, listing creation) have **not started** — every
screen in those areas is still 100% on local/mock data, unchanged, and
every missing endpoint they'd need is catalogued in `MOBILE_BACKEND_GAPS.md`
rather than faked.

No admin dashboard work happened. No mock/local data files were deleted.

**Update (round 2):** `app/(tabs)/home.tsx` and `app/category/[id].tsx`
migrated, reusing the exact same infrastructure built for
`categories.tsx` — no new API client, no duplicate taxonomy logic. See §2A
and §4A below for that round's detail.

**Update (round 3 — this pass, Phase 2A COMPLETE):** the two missing
location endpoints (`get_location`, `get_location_path`) were built,
deployed, and live-tested; a field-completeness gap in `search_categories`
found while migrating `post/index.tsx` was fixed the same way; and the
three remaining screens — `components/LocationPicker.tsx`,
`app/post/index.tsx`, `app/results.tsx` — are now fully migrated. **Every
screen originally scoped for Phase 2A is done.** See §2B and §4B below for
this pass's detail, and §8 for the final whole-of-Phase-2A decision.

---

## 1. Infrastructure built this phase

| File | Purpose |
|---|---|
| `config/env.ts` | *(already existed)* — the single place `API_BASE_URL` is configured (`EXPO_PUBLIC_API_BASE_URL`). Now actually populated in `.env` (gitignored) with the live VPS: `http://187.7.19.136` (see `BACKEND_PRODUCTION_READINESS.md`). |
| `lib/apiClient.ts` | *(extended, not rewritten)* — added `frappeGet<T>()`: the one function every service layer must call through. Handles connectivity check, dev-mock short-circuit, `{message: ...}` envelope unwrapping, and full status-code branching (401/403/404/422/429/5xx/timeout/network error). |
| `types/frappeApi.ts` | `ApiResult<T>` — one discriminated-union result type used everywhere (`success \| no_internet \| backend_unavailable \| not_found \| unauthorized \| forbidden \| validation_error \| rate_limited \| server_error \| timeout`). |
| `services/taxonomyService.ts` | All 12 taxonomy endpoints (10 original + `get_location`/`get_location_path`, added this pass), each returning the app's **existing** `Category`/`Brand`/`Model`/`LocationNode` types (from `mock/taxonomy/types.ts`) — not Frappe's raw field names — so consumer screens need zero shape changes. |
| `hooks/useApiResult.ts` | Generic `useApiResult(fetcher, deps, isEmpty?)` hook — loading/success/empty/error UI state, stale-response guarding (an older in-flight request can't overwrite a newer one). |
| `components/ApiStateView.tsx` | One shared renderer for every non-success `UiState` — loading spinner, and a localized (`i18n`'s new `apiState.*` keys) empty-state card per error kind, with retry where it makes sense. |
| `lib/devLog.ts` | Dev-only logging (`isProduction` → no-op immediately) with key-name-based redaction (`password`/`token`/`secret`/`api_key`/`authorization` → `[REDACTED]`) applied before the production check even runs, as defense in depth. |

**API configuration is single-source, as required:** changing environments
means changing `EXPO_PUBLIC_API_BASE_URL` in one `.env` file — nothing else
in the codebase hardcodes a URL.

---

## 2. Screen-by-screen status

### ✅ Migrated to the real backend

| Screen | Was | Now | Endpoint(s) used | Auth |
|---|---|---|---|---|
| `app/(tabs)/categories.tsx` | `getTopLevel()` from `mock/taxonomy/categories.ts` (sync) | `getChildren()` from `services/taxonomyService.ts` (async, live) | `get_children` | Guest |
| `app/(tabs)/home.tsx` (category grid, local-brand-shortcut labels, real-estate property-type chips, car-brand chips) | `homeCategories` (`mock/homeFeed.ts`), 6× `getCategory()` + `getCategory('realestate_sale')` + `getBrandsForCategory()` (all `mock/taxonomy/*`) | `getChildren()`, 6× `getCategory()` (parallel), `getCategory('realestate_sale')`, `getBrandsForCategory('cars')` — all `services/taxonomyService.ts`, live | `get_children`, `get_category` ×7, `get_brands_for_category` | Guest |
| `app/category/[id].tsx` (progressive category browser) | `getCategory`/`getChildren`/`getPath` from `mock/taxonomy/categories.ts` (sync) | Same 3 calls, now `services/taxonomyService.ts`, run in parallel via `Promise.all` + the new `combineApiResultsTuple` helper | `get_category`, `get_children`, `get_path` | Guest |
| `components/LocationPicker.tsx` (governorate/city/area picker — used by `home.tsx`, `post/index.tsx`, and 3 out-of-scope screens: `jobs/post.tsx`, `jobs/profile.tsx`, `services/profile.tsx`) | `mock/taxonomy/locations.ts`'s sync `getGovernorates`/`getLocation`/`getLocationChildren`/`searchLocations`/`locationPathLabel` | `services/taxonomyService.ts`'s async `getGovernorates`/`getLocationChildren`/`getLocation`/`getLocationPath`/`searchLocations`, drill-in decided by `LocationNode.isGroup` (no more per-row `getLocationChildren(id).length > 0` query) | `get_governorates`, `get_location_children`, `get_location`, `get_location_path`, `search_locations` | Guest |
| `app/post/index.tsx` (category tree, brand/model, dynamic attributes, location — **not** listing creation itself) | `mock/taxonomy/{categories,brands,models,locations}.ts` throughout, all synchronous | `services/taxonomyService.ts` throughout; category-tree search now calls `search_categories` directly instead of a client-side recursive flatten-and-filter of the whole tree | `get_children`, `get_category`, `get_path`, `search_categories`, `get_brands_for_category`, `get_models_for_brand`, `get_location_path` | Guest |
| `app/results.tsx` (dynamic filter sheet) | `getCategory()` from `mock/taxonomy/categories.ts` (sync) | `getCategory()` from `services/taxonomyService.ts` (async); `getAllDescendantIds`/`getPath` **stay** on mock, deliberately (see §2B) | `get_category` | Guest |

### §2A — what changed in this pass, in detail

**`app/(tabs)/home.tsx`** — four independent async pieces, each with its
own `useApiResult` call so one failing doesn't take down the others:

1. **Category grid (7 shown)** — `getChildren()`, full `ApiStateView`
   treatment (loading spinner / retry card) since it's primary navigation.
2. **Local brand shortcuts** (6 fixed category IDs: `fashion_women`,
   `fashion_men`, `fashion_shoes_bags`, `fashion_accessories`, `beauty`,
   `furniture`) — 6 parallel `getCategory()` calls combined with the new
   `combineApiResultList()` helper (added to `hooks/useApiResult.ts`, not a
   new file). On loading/error, the row is simply empty — same visual
   outcome the screen already had for "no data," not a new behavior.
3. **Real-estate property-type chips** — `getCategory('realestate_sale')`,
   reads the same `fields.find(f => f.key === 'propertyType').options` path
   as before. Empty on loading/error — `SubMarket`'s existing
   `chips.length > 0` check already handled this gracefully pre-migration.
4. **Car-brand chips** — `getBrandsForCategory('cars')`. Same
   graceful-empty pattern as #3.

`getAllDescendantIds()` (from `mock/taxonomy/categories.ts`) is **still
used**, deliberately, to scope the still-mock `carListings`/
`realEstateListings` sections — those are Phase 2B (listings) territory,
untouched, and category IDs are identical between mock and the real backend
by design, so this stays correct. `locationPathLabel()` (from
`mock/taxonomy/locations.ts`) is also still used, only inside
`LocationPicker`'s `onSelect` callback — `LocationPicker.tsx` itself was
explicitly left untouched this pass per instruction.

**`app/category/[id].tsx`** — `getCategory(id)` + `getChildren(id)` +
`getPath(id)` fetched together via `Promise.all`, combined with the new
`combineApiResultsTuple()` helper (`hooks/useApiResult.ts`). Invalid/missing
`id` never triggers a request at all — resolves straight to a `not_found`
`ApiResult`, rendered through the same `ApiStateView` every other screen
uses (localized "no results" card, not a bare `<Text>` like the old code
had). The leaf/non-leaf decision (i.e. "does this child have its own
children, so tapping it should open another browser screen instead of
going straight to search results?") now reads `Category.isGroup` — a new
optional field added to `mock/taxonomy/types.ts` and populated from
Frappe's `is_group` in `get_children`'s response — **instead of** the old
per-child `getChildren(c.id).length > 0` grandchildren query. This isn't a
new mock/UI behavior, it's the same information Frappe was already sending
back on the exact same `get_children` call the screen already makes, just
not discarded anymore — confirmed correct against a real leaf category in
§4A (`is_group=0` for `'cars'` matched an actual empty-children re-check).

**Not fixed, left as-is (pre-existing, disclosed):**
`app/category/[id].tsx` displays category names via the raw `.name` field
(Arabic only) rather than the app's `categoryLabel(cat, language)`
i18n helper that `categories.tsx`/`home.tsx` use — this was **already** the
case before this pass (the old mock-based version did the exact same thing,
no `categoryLabel` call anywhere in it). Not touched, since the instruction
was to preserve existing Arabic/English behavior, not extend it, and
introducing i18n-aware labels here would be a UI behavior change beyond
what real API data required.

### ⏳ Not migrated — none. All 6 Phase 2A screens are done.

### §2B — what changed in this pass, in detail

**New backend work first.** Two endpoints were built to unblock
`LocationPicker.tsx`, designed by reading the existing `Souq Masr Location`
DocType, `get_children`/`get_path` (the category-tree equivalents),
`seed_taxonomy.py`'s location seed data, the mobile `LocationPicker.tsx`,
and `MOBILE_BACKEND_GAPS.md` first — not invented blind:

- **`get_location(location_key)`** — same 404-on-invalid-id pattern as
  `get_category` (`frappe.throw(..., frappe.DoesNotExistError)`), same
  response shape as `search_locations()`'s items
  (`id`/`name`/`location_type`/`parent_id`), so the mobile adapter
  (`adaptLocationSearchResult`) is reused as-is, no new adapter written.
- **`get_location_path(location_key)`** — walks `parent_souq_masr_location`
  exactly like `get_path()` walks `parent_souq_masr_listing_category`,
  root-first `[{id,name}, ...]`. Deliberately diverges from `get_path()` in
  one way, disclosed in the code's own docstring: it validates the starting
  id up front and throws a clean 404 if missing, whereas `get_path()`
  silently returns whatever it accumulated — because `get_location_path` can
  be called with a user-persisted/unverified id (a stored
  `onboarding.locationId`) in a way `get_path()` (always called with an
  already-browsed-to, known-valid category id) never is.
- **`is_group` added to `get_governorates()`/`get_location_children()`'s
  field lists** — additive, mirrors the identical optimization `get_children`
  already had for categories (§2A). Same disclosed caveat as
  `DEPLOYMENT.md`'s troubleshooting table: `is_group` is computed at seed
  time from the location's *type* (governorate/city → 1, area → 0), not a
  live child count, so a city with zero actually-seeded areas still reads
  `is_group=1`. Not a new bug, already documented before this pass.

All three changes deployed to the live VPS, verified live (§4B), committed.

**A field-completeness bug found and fixed while migrating `post/index.tsx`**:
`search_categories()` only ever returned `id`/`name_ar`/`name_en`/`icon` —
missing `sort_order`/`is_group`/`has_brands`, which every other
category-list endpoint (`get_children`) already returned. Nothing in the app
called `searchCategories()` before this pass, so the gap was latent. It
surfaced because `post/index.tsx`'s category-search results use the exact
same `selectLeaf()` tap-handler as its browse grid, and that handler decides
"drill in vs. select as final" using `category.isGroup` — which the client
adapter (`!!c.is_group`) silently defaults to `false` when the field is
missing. Without the fix, tapping a *non-leaf* category from search would
have been wrongly recorded as a final selection instead of opening its
children. Fixed by adding the 3 missing fields to `search_categories`'s
`fields` list (deployed, live-verified in §4B).

**`components/LocationPicker.tsx`** — full async rewrite, same bottom-sheet
UI/UX (popular-governorates section, full drill-down browse, live search,
"use current location" GPS flow — unchanged, device API not taxonomy API).
`browseNode`/`items`/`searchResults`/`popularGovs` all now come from
`getLocation`/`getGovernorates`/`getLocationChildren`/`searchLocations`
via `useApiResult`, with `ApiStateView` for loading/error/empty. Drill-in vs. select-as-final now reads `LocationNode.isGroup`
(populated from the newly-added `is_group` field) instead of a per-row
`getLocationChildren(id).length > 0` query — same optimization as the
category screens. Search got a light 250ms debounce (not present in the old
synchronous version) since a real network call on every keystroke is a
different cost profile than a local array filter — the only UX-visible
addition, not a UI redesign. `initialLocationId`'s parent-level resolution
(deciding which drill level to open the sheet at) is now async
(`getLocation(initialLocationId).then(...)`) — on a stored, previously-valid
id this resolves fast enough not to be visually noticeable; on a stale/now-
invalid id it fails safe (stays at the top-level governorate list) rather
than crashing.

`onSelect`'s signature is **unchanged** (`(id: string) => void`) —
deliberately, so the 3 out-of-scope consumers (`jobs/post.tsx`,
`jobs/profile.tsx`, `services/profile.tsx`) needed **zero** changes and
keep working exactly as before (still reading `locationPathLabel()` from
mock for their own display, which is fine — those screens are Phase 2B+
scope, untouched, not evaluated here).

**`app/(tabs)/home.tsx`** (one remaining loose end from round 2, closed this
pass) — `LocationPicker`'s `onSelect` callback used to call the mock
`locationPathLabel(id).split('، ')[0]` synchronously to get the governorate
name for `onboarding.city`. Replaced with an async `getLocationPath(id)`
call: `locationId` is set immediately (no need to wait on network for that),
`city` is patched in once the real path resolves. `home.tsx` now has **zero**
remaining taxonomy mock calls beyond the disclosed `getAllDescendantIds`
(listing-scoping, Phase 2B territory, unchanged from round 2).

**`app/post/index.tsx`** — every taxonomy/reference-data dependency replaced
with real backend calls, **listing creation/submission logic untouched** as
instructed (still builds a local `Listing` object and calls
`addMyAd`/`publishListing`/`updateListing` exactly as before):
- **Category step**: `getChildren`/`getPath` for browsing, `searchCategories`
  (debounced) instead of the old client-side recursive flatten-the-whole-
  tree-then-filter approach — removes an unbounded N+1 network pattern that
  a naive async port of the old code would have introduced.
- **Brand/model step**: `getBrandsForCategory`/`getModelsForBrand`.
- **Attributes step**: unchanged code — already read off the `category`
  prop, which is now populated from the real `get_category` call at the
  top of the wizard instead of a synchronous mock lookup.
- **Category detail** (`getCategory`, drives `steps[]`/`hasBrands`/`fields`)
  is fetched once at the top of the wizard via `useApiResult`; the "التالي"
  (Next) button is disabled while it's loading or failed, so the step list
  can never be computed from a half-loaded category — closes the one race
  condition an async port of a previously-synchronous `getCategory()` call
  could otherwise introduce.
- **Location step**: `getLocationPath` replaces `getLocation`+
  `locationPathLabel`; **publish() still needs a plain city-name string
  synchronously at submit time**, so a small `locationCity` state is kept in
  sync via `useEffect` on `postDraft.locationId`, and "التالي" out of the
  location step is gated on it being resolved — avoids turning `publish()`
  itself into an async function just for one field.
- **Review step**: category path, brand name, model name, and location path
  all re-resolved from the real backend for final display before publish.

**`app/results.tsx`** — `getCategory(categoryId)` is now the real backend
call, gating the entire filter/search/results UI behind an `ApiStateView`
(loading spinner while resolving, error+retry card for an invalid/missing
category id or a network/backend failure) exactly like `category/[id].tsx`.
`categoryLabel`/`fieldLabel` (pure ar/en label pickers on an
already-fetched object — not data calls) are unchanged.
`getAllDescendantIds(category.id)` and `getPath(l.categoryKey)` (used
per-listing to build the search haystack) **deliberately stay on mock** —
both operate on the still-100%-mock `Listings` collection (Phase 2B,
untouched), and category ids are identical between mock and the real
backend by design, so this is correct, not a shortcut — the exact same
reasoning already applied to `home.tsx` in round 2, now applied consistently
here as instructed.

### Untouched — correctly out of scope for Phase 2A

Every other screen (`app/(tabs)/myads.tsx`, `favorites.tsx`,
`saved-searches.tsx`, `notifications.tsx`, `(tabs)/profile.tsx`,
`edit-profile.tsx`, `(tabs)/messages.tsx`, `chat/[id].tsx`, `seller/[id].tsx`,
`detail/[id].tsx`, `pay.tsx`, `transfer.tsx`, all of `jobs/*` and
`services/*`, `settings.tsx`, `legal/*`, `support.tsx`,
`blocked-users.tsx`, `business.tsx`, `analytics.tsx`, `promote/[id].tsx`)
belongs to Phase 2B–2F and has zero backend endpoints to connect to yet
(confirmed in `MOBILE_BACKEND_GAPS.md` — the Frappe app only has
`taxonomy.py` and `app_config.py`). None of them were touched.

---

## 3. Guest browsing — confirmed not broken

`app/(tabs)/categories.tsx` calls `get_children` with `allow_guest=True`,
no auth header, exactly like the rest of the app's existing guest-first
design (`components/AuthGuard.tsx`, `lib/auth.ts`'s `useRequireAuth`). No
login prompt appears, no auth-gated code path was added to this screen.

## 4. Live integration test (real HTTP, real device-equivalent code path)

Ran a standalone test that mirrors `services/taxonomyService.ts`'s exact
request construction (same method names, same param names) and adapter
logic (same field-mapping tables) against the real, live server —
**not** a mock, not a unit test with stubbed responses:

```
Phase 2A integration test — real HTTP against 187.7.19.136,
through the exact same request/adapter logic as services/taxonomyService.ts
======================================================================
OK:   get_children() HTTP 200
OK:   get_children() returns 19 top-level categories (got 19)
OK:   adapted Category has all required keys (id/parentId/name/nameEn/icon/order/fields)
OK:   Category.name (Arabic) is a non-empty string
OK:   Category.nameEn is a non-empty string
OK:   get_category('cars') HTTP 200
OK:   adapted Category detail has all required keys
OK:   Category('cars').fields is a non-empty array (17 fields)
OK:   every field.type maps to a valid lowercase FieldType (no raw 'Select'/'Text' leaked through)
OK:   allowedSellingTypes is a string array (enum keys, e.g. 'sale'/'rent')
OK:   get_governorates() HTTP 200
OK:   get_governorates() returns 27 (got 27)
OK:   adapted LocationNode has all required keys
OK:   every governorate has type='governorate' and parentId=null
OK:   all 6 previously-broken multi-word governorates now return children through the adapter
OK:   getBrandsForCategory('cars') -> 45 brands
OK:   adapted Brand has all required keys
OK:   getModelsForBrand('car-bmw') -> 18 models
OK:   adapted Model has all required keys
OK:   every model correctly carries brandId='car-bmw'
OK:   search_locations('فيصل') returns both Giza and Suez districts (got 2)
OK:   both فيصل districts have correct, distinct parentId (Bug #3 fix verified end-to-end)
======================================================================
ALL CHECKS PASSED (0 failures)
```

**Honest methodology note:** this ran outside the Expo/Metro bundler (no
`@/` path-alias resolution available standalone), so it mirrors
`services/taxonomyService.ts`'s logic rather than literally `import`-ing the
`.ts` file. Every URL, param name, and field-mapping table in the test was
copied from the real source file, not reinvented — but this is disclosed as
a real methodology limit, not glossed over. `app/(tabs)/categories.tsx`
itself — the actual screen, actual hook, actual adapter, actual component
tree — has **not** been run inside a real device/simulator session in this
environment (none is available here); that remains the one still-open item
before a full end-to-end device confirmation.

## §4A — live integration test for this pass (`home.tsx` + `category/[id].tsx`)

Same disclosed methodology as §4 above (mirrors the real request/param
names against the real live server; no bundler/path-alias resolution
available standalone in this environment).

```
home.tsx request sequence
======================================================================
OK:   get_children() (home category grid) HTTP 200
OK:   get_children() has >= 7 categories to slice for the grid (got 19)
OK:   all 6 local-brand-shortcut get_category calls HTTP 200
OK:   all 6 shortcuts have a real Arabic name
OK:   get_category('realestate_sale') HTTP 200
OK:   realestate_sale has a 'propertyType' field
OK:   propertyType has real options (16)
OK:   get_brands_for_category('cars') HTTP 200
OK:   >= 8 car brands available to slice for chips (got 45)

category/[id].tsx request sequence
======================================================================
OK:   vehicles: all 3 parallel calls HTTP 200
OK:   vehicles has children (not a leaf, got 7)
OK:   every child summary carries is_group (used instead of an extra grandchildren query)
OK:   vehicles' own path is itself only (top-level category)
OK:   is_group for 'cars' matches an actual empty-children check (is_group=0, real children=0)
      — confirms the is_group shortcut is trustworthy, not just assumed
OK:   invalid category_key -> HTTP 404 (not_found state, handled safely)
(#8 empty/undefined id: handled client-side before any request is made — verified by code inspection: the fetcher short-circuits to a resolved not_found ApiResult without calling fetch() at all when `id` is falsy)
======================================================================
ALL CHECKS PASSED (0 failures)
```

**Additional checks performed directly against the live server:**

| Check | Result |
|---|---|
| `get_path?category_key=cars` (2-level breadcrumb, deeper than `vehicles`' own 1-level path) | `{"message":[{"id":"vehicles","name":"مركبات"},{"id":"cars","name":"سيارات"}]}` — correct, confirms the category NestedSet tree (same `lft`/`rgt` fix class as `BACKEND_PRODUCTION_READINESS.md` Bug #2) still traverses correctly multiple levels deep |
| Invalid category → response body leaks no traceback | `{"exc_type":"DoesNotExistError","_server_messages":"..."}` only — confirms Bug #4's fix (`allow_error_traceback=0`) still holds on this code path too |
| Arabic ⇄ English | `categoryLabel(cat, language)` (existing i18n helper, unchanged) now runs on real, live `Category` objects in `categories.tsx` and `home.tsx` exactly as it ran on mock `Category` objects before — same function, same shape (`.name`/`.nameEn`), so language switching behaves identically. Not independently re-tested with a live device toggle since no device is available in this environment. |
| Guest access | Every call above ran with no auth header, matching every other Phase 2A check |
| Previously-fixed **location** bugs (governorate ID mismatch, city ID collision) | Not applicable to this pass — `home.tsx`/`category/[id].tsx` make zero location API calls. Still confirmed passing in §4's original test; not re-run here since these two screens don't touch that code path |

## §4B — live integration test for this pass (new endpoints + all 3 remaining screens)

Same disclosed methodology as §4/§4A (mirrors the real request/param names
against the real live server; no bundler/path-alias resolution available
standalone in this environment). Ran as one consolidated script asserting
every check below against `187.7.19.136` — full output on request, key
results:

```
=== Empty results ===
OK: get_children(parent='mobiles') -> [] (mobiles is a real leaf category)
OK: search_categories('zzzzznonexistentxyz123') -> []

=== Invalid ids -> clean 404, no traceback ===
OK: get_category('does-not-exist-xyz') -> HTTP 404, DoesNotExistError, no "Traceback" in body
OK: get_location('does-not-exist-xyz') -> HTTP 404, DoesNotExistError, no "Traceback" in body
OK: get_location_path('does-not-exist-xyz') -> HTTP 404, DoesNotExistError, no "Traceback" in body

=== Category chain (post/index.tsx's dependencies) ===
OK: get_children() top-level -> 19 categories, mixed is_group true/false
OK: get_category('gaming') -> HTTP 200, 2 dynamic fields (platform, itemType)
OK: get_brands_for_category('mobiles') -> 20 brands (phone-apple, phone-asus, ...)
OK: get_models_for_brand('phone-apple') -> models incl. iPad/iPad Air/iPhone 11/...

=== Location chain (LocationPicker.tsx's dependencies) ===
OK: get_governorates() -> 27, every item carries is_group
OK: get_location_children('gov-القاهرة') -> 8 cities, every item carries is_group
OK: get_location_children('city-التجمع-الخامس') -> 2 areas
OK: get_location_path('area-التجمع-الخامس-الرحاب') -> HTTP 200
    [{"id":"gov-القاهرة","name":"القاهرة"},
     {"id":"city-التجمع-الخامس","name":"التجمع الخامس"},
     {"id":"area-التجمع-الخامس-الرحاب","name":"الرحاب"}]
    -> correct 3-level root-first breadcrumb, real parent/child relationships preserved

=== search_categories field-completeness fix (results.tsx / post/index.tsx) ===
OK: search_categories('سيار') -> every item now carries
    id/name_ar/name_en/icon/sort_order/is_group/has_brands (was missing the last 3 before this pass)

ALL ASSERTIONS PASSED (0 failures)
```

**Arabic + English:** every category/location item above carries both
`name_ar` and `name_en` (or, for locations, the single Arabic `location_name`
— locations never had a separate English name, matching the mock data's own
shape, unchanged behavior). Client-side language switching in the 3 screens
migrated this pass uses the same `categoryLabel(cat, language)` pattern
already proven in round 2 — no new i18n code path, same function, same
`Category` shape, now fed by live data everywhere instead of only in
`home.tsx`/`categories.tsx`/`category/[id].tsx`.

**Network/backend failure handling:** not independently re-tested against a
severed connection this pass — the mechanism (`lib/apiClient.ts`'s
`frappeGet()`, `hooks/useApiResult.ts`'s `UiState`, `components/
ApiStateView.tsx`) is unchanged code, already verified in Phase 1 and round
2; every new call site added this pass (`LocationPicker.tsx`,
`post/index.tsx`, `results.tsx`) routes through that exact same unchanged
pipeline via `useApiResult`, with no new fetch/axios call anywhere and no
screen-local error handling reinvented — confirmed by code inspection of
every new call site, consistent with how round 2 verified the same claim.

## 5. Regression check (re-run after this pass)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean, 0 errors (re-run after round 3 — LocationPicker.tsx, post/index.tsx, results.tsx, home.tsx, taxonomyService.ts, mock/taxonomy/types.ts) |
| `npx expo export --platform ios` | Succeeded (re-run after round 3 — 1824 modules bundled, 0 errors) |
| Screens touched round 3 | `components/LocationPicker.tsx`, `app/post/index.tsx`, `app/results.tsx`, `app/(tabs)/home.tsx` (one loose end) — plus `services/taxonomyService.ts` (additive: `getLocation`, `getLocationPath`, `is_group` on location adapters) and `mock/taxonomy/types.ts` (additive: `LocationNode.isGroup?`). Backend: `souq_masr/api/v1/taxonomy.py` (additive: `get_location`, `get_location_path`, `is_group` on 2 location endpoints, 3 missing fields on `search_categories`). |
| Screens touched round 2 | `app/(tabs)/home.tsx`, `app/category/[id].tsx` — plus `hooks/useApiResult.ts` (2 new combiner functions) and `mock/taxonomy/types.ts` (`Category.isGroup?`). |

## 6. Bugs found/fixed this phase

**Round 2:** none new (the 4 bugs from `BACKEND_PRODUCTION_READINESS.md` §9
were already fixed before Phase 2A began; re-confirmed still holding, not
re-discovered).

**Round 3 (this pass):** one new bug, found and fixed —
`search_categories()` was missing `sort_order`/`is_group`/`has_brands` from
its response fields (present on every other category-list endpoint). Latent
until this pass because nothing called `searchCategories()` before
`post/index.tsx`'s category-search box. Full description, root cause, and
fix in §2B above. Live-verified fixed in §4B.

## 7. Remaining backend gaps affecting Phase 2A

**None.** Both location endpoints (`get_location`, `get_location_path`) are
now built, deployed, and live-tested — see `MOBILE_BACKEND_GAPS.md`'s
Taxonomy section (both items now marked ✅ RESOLVED). No new gaps surfaced
while migrating `LocationPicker.tsx`/`post/index.tsx`/`results.tsx` beyond
the `search_categories` fix above, which is also already resolved.

Every other gap (listings, auth, favorites, chat, etc.) is Phase 2B+ scope,
not a Phase 2A blocker — catalogued in full in `MOBILE_BACKEND_GAPS.md`.

## Remaining Phase 2A work

| Screen | Status |
|---|---|
| `app/(tabs)/categories.tsx` | ✅ Done |
| `app/(tabs)/home.tsx` | ✅ Done (category grid, brand-shortcut labels, property-type chips, car-brand chips, city-name resolution) |
| `app/category/[id].tsx` | ✅ Done |
| `app/results.tsx` (dynamic filters — `get_category`'s `fields`) | ✅ Done |
| `app/post/index.tsx` (category/brand/model pickers, attribute step, location step) | ✅ Done |
| `components/LocationPicker.tsx` | ✅ Done |

**Phase 2A has no remaining work.**

---

## 8. Decision

# ✅ GO — Phase 2A (Taxonomy) is COMPLETE

All 6 in-scope screens/components are migrated to the real Frappe backend,
live-tested, with zero fake/invented endpoints and zero taxonomy mock calls
remaining outside the explicitly disclosed, intentional exceptions below.

**Files changed across all of Phase 2A:**

*Backend* (`souq-masr-app/souq-masr/souq_masr/api/v1/taxonomy.py`):
12 endpoints total — `get_children`, `get_category`, `get_path`,
`get_descendant_ids`, `search_categories`, `get_brands_for_category`,
`get_models_for_brand`, `get_governorates`, `get_location_children`,
`search_locations` (original 10) + `get_location`, `get_location_path`
(round 3). Additive-only fixes: `is_group` on 4 endpoints total
(`get_children`, `get_location_children`, `get_governorates`,
`search_categories`'s missing-fields fix), none of which changed any
existing response shape, only added fields.

*Mobile infrastructure* (all additive, none rewritten):
`lib/apiClient.ts`, `types/frappeApi.ts`, `services/taxonomyService.ts`,
`hooks/useApiResult.ts` (+ `combineApiResultList`/`combineApiResultsTuple`),
`components/ApiStateView.tsx`, `lib/devLog.ts`, `mock/taxonomy/types.ts`
(+ `Category.isGroup?`, `LocationNode.isGroup?`).

*Screens/components migrated:* `app/(tabs)/categories.tsx`,
`app/(tabs)/home.tsx`, `app/category/[id].tsx`,
`components/LocationPicker.tsx`, `app/post/index.tsx`, `app/results.tsx`.

**Mock taxonomy calls remaining, and why each is correct to keep** (the
same disclosed boundary applied consistently across every screen, restated
here in full since this is the final whole-of-Phase-2A decision):
- `categoryLabel`/`fieldLabel`/`conditionLabel` — pure ar/en label pickers
  that take an already-fetched real object as their argument; not a data
  call.
- `CONDITION_LABELS`/`PRICE_TYPE_LABELS`/`SELLING_TYPE_LABELS` — fixed
  closed-set enum labels (e.g. "جديد"/"مستعمل"), not Frappe taxonomy tree
  data; no endpoint for these was requested or implied.
- `getAllDescendantIds()` (`home.tsx`, `results.tsx`) and `getPath()` used
  per-listing for search-haystack building (`results.tsx`) — both scope/
  operate on the still-100%-mock `Listings` collection, which is Phase 2B
  and untouched; category ids are identical between mock and the real
  backend by design, so this is correct today and will keep working
  unchanged once Phase 2B connects real listings.
- `import type {...} from '@/mock/taxonomy/types'` — type-only imports,
  zero data calls, present in every migrated file (`Category`,
  `LocationNode`, etc. are still the app's canonical shapes; only *where
  the data comes from* changed).

Confirmed zero taxonomy mock **data** calls beyond the above in all 6 files
by direct grep of every `from '@/mock/taxonomy/...'` import across
`home.tsx`, `categories.tsx`, `category/[id].tsx`, `results.tsx`,
`post/index.tsx`, `LocationPicker.tsx`.

**Real endpoints used (all 12, none invented):** `get_children`,
`get_category`, `get_path`, `get_descendant_ids`, `search_categories`,
`get_brands_for_category`, `get_models_for_brand`, `get_governorates`,
`get_location_children`, `search_locations`, `get_location`,
`get_location_path`.

**Tests performed:** `tsc --noEmit` (clean), `expo export --platform ios`
(succeeded), live HTTP tests against every one of the 12 endpoints covering
category hierarchy, dynamic attributes, brands, models, governorate→city→area
locations, 3-level location path/breadcrumb, invalid ids (clean 404, no
traceback, on 3 different endpoints), empty results (2 cases), Arabic+English
label data presence, and code-level confirmation that error/timeout/no-
internet handling routes through the same unchanged, already-verified
pipeline for every new call site. Full results: §4 (original), §4A (round
2), §4B (round 3, this pass).

**No Phase 2B work was started.** No listings/auth/chat/favorites code
touched, no fake endpoints created, no mock/local data files deleted.
`store/useAppStore.ts`'s `userListings` and `mock/listings.ts` remain the
only source for actual listing data, unchanged.

**This GO covers Phase 2A (Taxonomy) only.** Phase 2B (public listings/
search/seller profile) may begin next; its endpoint requirements are
catalogued in `MOBILE_BACKEND_GAPS.md`.
