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

---
---

# Phase 2B — Listings Domain: Real Backend Foundation

**Scope of this section:** Phase 2B, first slice only — real backend foundation
for marketplace Listings, plus the minimum real authentication needed to
enforce ownership server-side. Chat, Favorites, Reviews, Jobs, Services,
Notifications, Payments, and full application migration are **explicitly
untouched**, per this phase's own instruction. Phase 2A (Taxonomy) is
unmodified — nothing in this section reopens it.

---

## Phase 2B — Listing Domain Audit

Before writing any backend code, the existing mobile listing model was
mapped from source, not assumed:

**`mock/listings.ts`'s `Listing` type** (the single listing shape used
everywhere in the app — home, results, category pages, listing detail, my
ads, edit, search, filters, favorites, sharing, reporting, sold flow):

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Locally generated (`store/useAppStore.ts`'s `addMyAd`: `my-new-${counter}`) — not a stable server id today |
| `title`, `description` | `string` | |
| `price` | `number` | |
| `priceSuffix` | `string?` | Unused by the post-ad wizard; legacy display field |
| `priceType` | `PriceType?` | `fixed\|negotiable\|free\|contact\|on_request\|per_day\|per_month\|per_hour\|per_unit` |
| `sellingType` | `SellingType?` | `sale\|rent\|wanted\|exchange\|free\|service\|job\|business_sale\|auction\|other` |
| `condition` | `string` | **Already-rendered Arabic label** (e.g. "ممتاز"), not the enum key — set at creation via `CONDITION_LABELS[key]`, not re-derived later |
| `categoryKey`, `brandId?`, `modelId?` | `string` | Taxonomy references, Phase 2A ids |
| `city`, `district?` | `string` | Plain display strings, derived from `locationId` at creation time via `locationPathLabel()`, not re-derived |
| `locationId?` | `string` | Phase 2A location id |
| `sellerId` | `string` | Always `'me'` today (`mock/users.ts`'s sentinel) or a seed listing's fixed id — **never a real user identity** |
| `thumb` | `ThumbVariant` | Decorative fallback illustration when no real photo exists |
| `images` | `number` | Photo **count**, not URLs |
| `photoUris?` | `string[]` | Real local device URIs (`expo-image-picker`) — this is what actually renders |
| `specs` | `{label,value}[]` | Pre-rendered attribute display rows, built once at creation from `category.fields` |
| `attributes?` | `Record<string,string>` | Raw `key→value`, same shape as `postDraft.attributes` |
| `views` | `number` | |
| `isFeatured`, `isVerifiedSeller` | `boolean` | No real promotion/verification system exists yet |
| `postedAt` | `string` | Pre-rendered relative-time string (e.g. `"الآن"`), not an ISO date |
| `sellerType?` | `'individual'\|'business'` | |
| `brandName?` | `string` | Free-text business brand name (distinct from the `Brand` taxonomy link) |
| `sku?`, `variants?` | `ProductVariant[]` | Size/color stock variants — business accounts only |
| `wholesalePrice?`, `minWholesaleQty?`, `discountPrice?`, `discountEndsAt?` | | Business pricing extras |
| `saleStatus?` | `'active'\|'sold'` | Set only by the chat-based Sold Confirmation Flow (`confirmListingSold`) |

**Zustand store/actions actually responsible for listings** (`store/useAppStore.ts`):
`userListings: Listing[]` (real, user-created — separate from `mock/listings.ts`'s
always-empty seed array) + `myAds: MyAd[]` (a **separate**, lighter-weight
parallel record used only by the My Ads list screen — title/price/thumb/
status/views/chats/favorites/expiresInDays, kept in sync by hand at every
mutation point). Actions: `publishListing`, `updateListing`, `addMyAd`,
`updateMyAd`, `removeMyAd`, `renewMyAd`, `promoteMyAd`,
`confirmListingSold` (the chat-driven sold flow), `incrementListingViews`,
`toggleFavorite`/`isFavorite`, `reportListing`/`hasReported`. Selectors:
`useAllListings()` (`userListings` + seed), `useDiscoverableListings()`
(same, minus `saleStatus==='sold'`), `useListingById(id)`, `useSeller(id)`
(returns `mock/users.ts`'s empty `sellers` record, or a synthesized "me"
seller built from `onboarding`).

**Consumers cross-checked**: `app/(tabs)/home.tsx`/`results.tsx` (discovery
+ filtering, `useDiscoverableListings`), `app/(tabs)/categories.tsx` →
`results.tsx` (category-scoped), `app/post/index.tsx` (creation/edit,
`postDraft` → `Listing` patch), `app/detail/[id].tsx` (`useListingById` +
`useSeller`, chat/favorite/report/view-increment actions), `app/(tabs)/
myads.tsx` (`myAds`, separate from `userListings`), `app/myads`'s edit
button (`?editId=`).

**What this made clear before any backend design started:** `condition`,
`city`/`district`, `postedAt`, and `specs` are all **pre-rendered display
strings**, not raw data — the real backend can't just mirror the mock
shape field-for-field; it has to store the *raw* values (enum keys, a
location link, ISO timestamps, attribute key→value pairs) and let the
mobile **service layer** do the same rendering step the old creation code
used to do inline. This is exactly the adapter pattern already established
in `services/taxonomyService.ts` (Phase 2A) — reused here, not reinvented.

---

## Real Frappe Listing Data Model

Three new DocTypes, following the existing taxonomy DocTypes' own
conventions exactly (compared field-by-field against `Souq Masr Listing
Category`/`Souq Masr Brand` before writing anything):

```
Souq Masr Listing                    (main, autoname "LST-{#####}")
├─ images        → Table  → Souq Masr Listing Image           (child, ordered by idx)
└─ attributes    → Table  → Souq Masr Listing Attribute Value  (child, key→value)
```

**`Souq Masr Listing`** — normalized, not a JSON blob: `category`/`brand`/
`model`/`location` are real `Link` fields into the **existing** Phase 2A
taxonomy DocTypes (no second taxonomy system — the explicit instruction).
`status` (`Draft\|Active\|Paused\|Sold\|Rejected`) models the full state
machine the mobile app's `MyAd.status`/`Listing.saleStatus` already implied;
new listings default straight to `Active` (no real review gate exists
anywhere in this product yet — matches `store/useAppStore.ts`'s own
`addMyAd` comment: `"'قيد المراجعة' كانت حالة وهمية"`). `city`/`district`
display strings are **not stored** — derived server-side from `location` on
every read (`_resolve_location_display()`, the same walk-up-the-tree logic
as `get_location_path`), so they can never drift from the location tree.
`Souq Masr Listing.validate()` enforces two cross-field rules a plain
`Link` field can't express by itself: a listing's category can't be a
`is_group` parent category, and if both `brand`/`model` are set they must
actually belong to the chosen `category`/`brand` (checked against `Souq
Masr Brand Category` and `Souq Masr Model.brand` — reusing Phase 2A's own
brand↔category linkage, not duplicating it).

**`Souq Masr Listing Image`** — one row per photo, `image` (Attach Image,
holds a `file_url` from a prior `upload_file` call). No separate sort
field — child-table row order (`idx`) *is* the display order, same pattern
already used for category attribute definitions.

**`Souq Masr Listing Attribute Value`** — one row per `attr_key`/`value`
pair. Deliberately a **different** doctype from the pre-existing `Souq Masr
Listing Attribute` (which is the category's field *schema*, not a listing's
actual values) — reusing that table by name would have silently conflated
"what fields exist for this category" with "what this one listing's field
values are."

**Deliberately NOT modeled this pass (disclosed, not silently dropped)**:
`ProductVariant[]` (size/color/stock — the niche "Business/Product
Listing" feature) and `sku`. `app/post/index.tsx`'s `publish()` routes a
listing that has variants through the **existing local/mock path**
unchanged, specifically *because* the real backend can't represent it yet —
see "Vertical slice" below.

---

## Ownership / Authentication Architecture

**The gap, found before writing any mutation endpoint:** `app/signin.tsx`
made **zero** network calls — `onboarding.joinedAt` (a local timestamp) was
the entire "authenticated" concept, and every listing's `sellerId` was the
hardcoded string `'me'`. Per this phase's explicit instruction, that
sentinel could not become backend authorization, and per the "stop before
an insecure workaround" instruction, a minimum real auth foundation was
built first — deliberately as small as the ownership requirement actually
needs, not a full account system.

**Mechanism: Frappe's own built-in API key/secret token auth**
(`Authorization: token <api_key>:<api_secret>`) — not a new scheme. This is
the exact mechanism Frappe core's own "Generate Keys" desk action uses
(`frappe/core/doctype/user/user.py`'s `generate_keys`, confirmed by reading
the live server's own framework source before building — System-Manager-
only there, so `souq_masr.api.v1.auth.signin` replicates its few lines for
a Guest-facing call instead). No session cookie is issued — the mobile app
is a stateless REST client, so a token header (no cookie jar to manage) is
the correct fit.

**`souq_masr.api.v1.auth.signin(name, phone, country_iso)`** — `allow_guest=True`
(this **is** the login call, matching `MOBILE_BACKEND_GAPS.md`'s own earlier
Phase 2C proposal almost verbatim). Find-or-create a real Frappe `User`
keyed by `mobile_no` (idempotent — same phone always resolves to the same
user, confirmed live: calling `signin` twice with the same phone never
creates a duplicate, `api_key` stays stable, `api_secret` is freshly
re-issued each call). `user_type = "Website User"` — confirmed against the
live server's actual `User Type` records (`Website User`/`System User`) after
an initial live-test failure with the guessed value `"Website"` (see Bugs
below), not assumed. Every new user gets Frappe's own auto-assigned `"All"`
role (confirmed live via `frappe.get_roles()`), which is what makes the
DocType's own permission rows below actually apply.

**`Souq Masr Listing`'s permission rows** (the framework-level enforcement
layer, independent of any Python `if` check):
```
Souq Masr Admin : read/write/create/delete/export/report = 1   (full admin)
All             : read=1, create=1                              (any signed-in user)
All (if_owner)  : write=1, delete=1                              (owner-only mutation)
Guest           : read=1                                         (matches every other Phase 2A doctype)
```
`if_owner` is Frappe's own, already-shipped row-owner permission primitive —
it compares the doc's standard `owner` field (who created it — set
automatically by `insert()`, not a custom field) against the session user.
Every mutation (`create_listing`/`update_listing`/`delete_listing`/
`pause_listing`/`activate_listing`/`mark_listing_sold`) calls `insert()`/
`save()`/`delete()` **without** `ignore_permissions=True`, so this layer is
real, not decorative — plus a second, explicit `_assert_owner()` check in
Python before ever touching the doc, matching the instruction's "enforced
server-side, not just hidden in the UI" literally twice over. Read
endpoints are `allow_guest=True`, but `get_listing`/`increment_listing_views`
explicitly re-check status: a Guest (or any non-owner) requesting a
`Draft`/`Rejected` listing gets the exact same clean 404 as a nonexistent
id — never a 403 that would leak "this id exists but you can't see it."

**What this does *not* cover (disclosed, not hidden):** no OTP/password/
real login verification — the underlying "anyone who knows a phone number
can claim that identity" limitation already disclosed in `lib/auth.ts`'s
own header comment for the local-only version is now real on the server
too, just moved from "purely cosmetic" to "actually issues a working API
credential." This matches the mobile app's own already-shipped product
decision (name + phone, no OTP — `app/signin.tsx`'s header comment), not a
new weakness introduced by this phase; closing it is a Phase 2C
(Authentication) concern, not this slice's.

---

## Listing API — inventory (12 endpoints, all live-tested)

| Endpoint | Auth | Purpose |
|---|---|---|
| `create_listing` | Required | New listing, `status='Active'` immediately |
| `get_listing` | Guest | Single listing; Draft/Rejected hidden from non-owners (clean 404) |
| `update_listing` | Owner | Partial patch — only fields present in the request change |
| `delete_listing` | Owner | Hard delete |
| `pause_listing` | Owner | `Active → Paused` |
| `activate_listing` | Owner | `Paused\|Draft → Active` |
| `mark_listing_sold` | Owner | `Active\|Paused → Sold` |
| `get_my_listings` | Required | All of the caller's own listings, any status, paginated |
| `get_public_listings` | Guest | `Active` only, paginated, newest first |
| `search_listings` | Guest | text (title+description) + category + condition + dynamic `field_filters` + governorate scope, all optional and combinable |
| `get_listings_by_category` | Guest | thin wrapper over `search_listings(category_key=...)` |
| `get_listings_by_location` | Guest | governorate/city/area + all descendants (mirrors `get_descendant_ids`'s recursion, for locations) |
| `increment_listing_views` | Guest | Any public listing's view counter — not an ownership boundary, matches the mobile app's own pre-existing view-count UX |

Every status transition is validated (`_transition_status()`'s
`allowed_from` set) — `pause_listing` on an already-Paused listing is
rejected with a clean `validation_error`, not silently accepted or crashed
on. Invalid `category`/`location`/`brand`/`model` references are checked
**before** `insert()`/`save()` runs (clean `validation_error`, the app's
own message, not a raw `LinkValidationError`). No Python traceback is ever
returned — confirmed live on every error path tested (System Settings'
`allow_error_traceback=0`, the same fix verified in
`BACKEND_PRODUCTION_READINESS.md` §9 Bug 4, still holding on this entirely
new code path too).

---

## Image Architecture

**No custom upload endpoint** — Frappe's own core `/api/method/upload_file`
(already `allow_guest=True` at the framework level, gated behind a real
session/token for non-guest uploads) is used exactly as
`MOBILE_BACKEND_GAPS.md`'s old Phase 2F note anticipated. The mobile app
uploads each photo (`is_private=0` — listing photos must be viewable by a
Guest browsing without a token) and gets back a `file_url`; `create_listing`/
`update_listing` accept `image_urls` (a list of those URLs) and create one
`Souq Masr Listing Image` row per URL, in array order (stable ordering via
child-table `idx`, no extra field needed).

**Ownership check on attach, confirmed live**: before attaching any
`file_url` to a listing, the server looks up the `File` doc and compares
its standard `owner` field (the uploader) against the requesting session
user — a different user's own previously-uploaded image cannot be attached
to someone else's listing by simply reusing its URL (live-tested: User B
attempting to attach User A's uploaded file gets a clean 403). A
nonexistent `file_url` is rejected with a clean validation error, not a
silent no-op or a crash.

**Edit/replace**: `update_listing`'s `image_urls`, when present, **replaces**
the listing's entire image set (old rows cleared, new ones appended) —
matches the mobile post-ad wizard's own "manage a list of up to 6 photos"
UX, where the final list, not a diff, is what the client already has in
hand. **Disclosed gap**: replaced/removed images' underlying `File` docs
are not deleted from disk on edit — an accepted simplification for this
pass (orphaned files, not orphaned *listing data*; a storage-cleanup
follow-up, not a correctness or security issue).

---

## Mobile Service Architecture

Two new service modules, reusing every existing pattern (`lib/apiClient.ts`,
`types/frappeApi.ts`, `hooks/useApiResult.ts`, `components/ApiStateView.tsx`)
— no HTTP logic duplicated inside any screen:

- **`lib/authCredentials.ts`** *(new)* — `expo-secure-store`-backed storage
  for `{userId, name, phone, apiKey, apiSecret}` (Keychain on iOS,
  Keystore-backed EncryptedSharedPreferences on Android — not plain
  `AsyncStorage`, since `api_secret` is a live credential, not a UI
  preference). A synchronous in-memory cache (`peekStoredCredentials()`)
  lets `lib/apiClient.ts` inject the `Authorization` header without turning
  every request function into a two-await chain; the cache is warmed once
  at app startup (`app/_layout.tsx`, fire-and-forget, not a startup gate).
- **`lib/apiClient.ts`** *(extended, not rewritten)* — `frappeGet`/
  `frappePost` now share one internal `frappeRequest()`; `frappePost` sends
  a JSON body instead of a query string and injects the auth header when
  credentials exist. New `frappeUploadFile()` for the one genuinely
  different case (`multipart/form-data`, not JSON).
- **`services/authService.ts`** *(new)* — `signin()` (the real network call)
  and `ensureCredentials()` (returns existing credentials instantly, or
  silently re-runs `signin()` with the already-known local
  `onboarding.name`/`phone` for a user who was locally authenticated before
  real credentials existed — safe because `signin` is idempotent by phone).
- **`services/listingService.ts`** *(new)* — all 12 endpoints, typed,
  `ApiResult<T>`-based, adapting Frappe's raw snake_case response into the
  app's **existing** `mock/listings.ts` `Listing` / `mock/users.ts` `Seller`
  shapes — including re-deriving the pre-rendered display fields the audit
  above identified (`condition` → `CONDITION_LABELS[key]`, `postedAt` → a
  small relative-time formatter over the real `created_at`, `specs` → built
  from the listing's raw `attributes` **and** a parallel `getCategory()`
  call via the already-existing `services/taxonomyService.ts`, so field
  labels come from the real taxonomy, not guessed). `isRealListingId(id)`
  (`/^LST-\d+$/`) is the one piece of new routing logic — real backend ids
  are structurally distinguishable from every local id shape
  (`my-new-N`, mock seed ids), so no new route or query param was needed to
  tell the two apart.

---

## Vertical Slice: POST AD → CREATE LISTING → SERVER → FETCH LISTING → LISTING DETAIL

Migrated exactly one slice, exactly as scoped — not the whole app:

1. **`app/signin.tsx`** — the submit button now also calls the real
   `signin()` before continuing the *existing* local flow unchanged. If the
   real call fails (no internet, backend down), the local session still
   proceeds exactly as it did before this phase — the enforcement point
   that actually matters (creating a real listing) is downstream, not here,
   so a Listings-specific backend hiccup doesn't regress every other
   still-local feature (chat, favorites, jobs) that also gates on
   `onboarding.joinedAt`.
2. **`app/post/index.tsx`**'s `publish()` — branches: an **edit**, or a
   **new listing with variants**, uses the exact same local/mock path as
   before, byte-for-byte unchanged (variants aren't modeled server-side
   yet — see "Real Frappe Listing Data Model" above). A **brand-new,
   variant-free** listing now: `ensureCredentials()` → uploads each photo
   via `uploadListingImage()` → `createListing()`. Any failure at any step
   (credentials, upload, or create) shows a real Arabic error message and
   **stops** — nothing is added to the local mock store as if it had
   succeeded. On real success, `resetPostDraft()` then
   `router.replace('/detail/LST-#####')` — the **real** id from the
   server's own response, not a locally-generated one. The wizard's UI
   itself is visually unchanged; only the submit button gained a `loading`
   state (`Button`'s existing `loading` prop, not a new component).
3. **`app/detail/[id].tsx`** — `isRealListingId(id)` branches the data
   source: a real id fetches via `listingService.getListing()` through
   `useApiResult`, with `ApiStateView` for loading/error (a genuine UX
   improvement over the old code's instant local lookup, since a real fetch
   can meaningfully be slow or fail); every other id keeps the exact old
   `useListingById`/`useSeller` local lookup, byte-for-byte. Once loaded,
   the **entire rest of the screen is unchanged** — gallery, price,
   specs, seller card, description, share/report/favorite/chat buttons all
   read the same `listing`/`seller` shape whichever source they came from.
   Favorites/report/chat/view-increment continue to operate through the
   existing **local, mock** `useAppStore` actions for both real and mock
   listings — those domains are explicitly out of scope this phase; the
   one exception is the view counter, which now calls the real
   `incrementListingViewsBackend()` for a real listing (matched to where
   the number is actually stored) instead of the local one.

**What this slice deliberately leaves mocked, and why** (Section 8 of the
request: "keep mock data where real backend is not ready"):
`app/(tabs)/myads.tsx` (still 100% local `myAds`/`userListings` — a newly
created real listing does **not** yet appear there; `get_my_listings` is
built and live-tested, just not wired into this screen), editing an
existing listing (`update_listing` built/tested, not wired into
`post/index.tsx`'s edit path), `app/results.tsx`/`app/(tabs)/home.tsx`'s
listing discovery (still local `useDiscoverableListings`;
`search_listings`/`get_public_listings`/`get_listings_by_category`/
`get_listings_by_location` are built/tested, not wired in), variants/`sku`
(not modeled server-side at all this pass).

---

## Live HTTP Test Results

Two rounds, both against the real, live server (`187.7.19.136`) — not unit
tests, not stubbed responses.

**Round 1 — full endpoint contract** (`auth.signin` + all 12 `listings.*`
endpoints, direct raw-payload calls):
```
auth.signin:
  OK  first signin (new user) -> 200, real api_key/api_secret issued
  OK  second signin, same phone -> same user (id unchanged), name updated,
      api_key stable, api_secret freshly re-issued
  OK  invalid phone (no +) -> clean validation_error, no traceback
  OK  missing name -> clean validation_error, no traceback

listings — security/ownership:
  OK  Guest cannot create_listing (403, "not whitelisted" — Frappe's own
      whitelist(allow_guest=False-by-default) dispatch, not custom code)
  OK  invalid category / invalid location on create -> clean validation_error
  OK  create_listing (User A) -> 200, id "LST-00001"-shaped, status Active,
      governorate resolved correctly, is_owner=true, seller name correct
  OK  Guest get_listing -> 200, is_owner=false (public read works)
  OK  invalid listing_id -> clean 404, no traceback
  OK  User B cannot update User A's listing -> 403
  OK  User B cannot delete/pause/mark_sold User A's listing -> 403 (all 3)
  OK  Owner (User A) CAN update -> 200, change reflected
  OK  GET after update -> reflects the change (no stale cache)
  OK  status transitions: pause -> activate -> mark_sold, all 200
  OK  invalid transition (pause while already Paused) -> clean validation_error
  OK  Sold listing still publicly readable via get_listing
  OK  get_my_listings (owner) -> 200, includes the listing
  OK  Guest cannot get_my_listings -> 403
  OK  image upload (upload_file, is_private=0) -> 200, real file_url
  OK  create_listing with that image -> 200, images=[file_url]
  OK  User B cannot attach User A's uploaded file to their own listing -> 403
  OK  nonexistent image_url on create -> clean validation_error
  OK  get_public_listings -> Sold listing excluded, Active listing included
  OK  search_listings by text/category/empty-query, all correct
  OK  search_listings by field_filters (dynamic attribute) -> correct set,
      Sold listings correctly excluded (Active-only search)
  OK  get_listings_by_category / get_listings_by_location -> correct
  OK  pagination (limit=1) respected
  OK  increment_listing_views (Guest, public listing) -> counter increments
  OK  delete (owner) -> 200; GET after delete -> 404
======================================================================
ALL 23 TEST GROUPS PASSED (0 failures) — all test listings cleaned up after
```

**Round 2 — exact mobile wire format** (mirrors `services/listingService.ts`'s
actual request construction, including its double-JSON-encoding of
`attributes`/`image_urls` inside the outer JSON body — a materially
different wire shape from Round 1's raw-object payloads, and specifically
what could have silently broken if the backend's `_parse_json_param()`
only handled one of the two shapes):
```
OK  create_listing with JSON.stringify()'d attributes/image_urls -> 200,
    attributes decoded correctly ({"platform": "PS4"})
OK  get_listing (GET, query string, exactly as listingService.ts calls it) -> 200
MIRROR TEST PASSED
```

**Honest methodology note** (same disclosed limitation as Phase 2A's §4):
both rounds ran outside the Expo/Metro bundler as standalone Python scripts
mirroring the real request/param construction — not a literal `import` of
the `.ts` service files (no `@/` path-alias resolution available
standalone). Every method name, param name, and the double-JSON-encoding
behavior were copied from the real source files, not reinvented. Neither
`app/post/index.tsx`'s real submit path nor `app/detail/[id].tsx`'s real
fetch path has been exercised inside an actual device/simulator session in
this environment (none is available here) — `tsc --noEmit` and
`expo export` (below) are the closest available proxy for "does the real
code as written actually compile and bundle," not a substitute for an
on-device run.

## Security / Ownership Test Results

All explicitly required in Section 10 of the request, all live-verified
above (cross-referenced): Guest cannot create/update/delete/pause/activate/
mark-sold ✅ · User A cannot be modified, deleted, or marked sold by User B
✅ · listing ids cannot be used to bypass ownership (tested directly, not
inferred) ✅ · a stolen image URL cannot be attached to another user's
listing ✅ · no Python traceback returned on any tested error path ✅.

## Mobile Build Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean, 0 errors |
| `npx expo export --platform ios` | Succeeded, 1830 modules bundled, 0 errors |
| New native dependency | `expo-secure-store` (`npx expo install`, config plugin auto-registered in `app.json`) — needed because `api_secret` is a live server credential, not a UI preference; plain `AsyncStorage` was judged insufficient for it |

---

## Bugs Found/Fixed This Pass

One real bug, found via live testing (not assumed): the first `auth.signin`
attempt guessed `user_type = "Website"`, which failed live with
`LinkValidationError: Could not find User Type: Website` — the actual
`User Type` records on this Frappe version are `"Website User"`/`"System
User"` (confirmed by reading the live server's `User Type` table directly,
not guessed a second time). Fixed, redeployed, re-tested, passing.

## What Remains Mocked (this pass)

`app/(tabs)/myads.tsx`, listing edit (UI side), `app/results.tsx`/
`app/(tabs)/home.tsx`'s discovery feeds, `ProductVariant`/`sku` (not
modeled server-side), Reviews/ratings feeding into `Seller.rating`
(`services/listingService.ts`'s adapted seller always returns `rating: 0`
— no real reviews system exists yet, Phase 2D scope), and everything
outside Listings (Chat, Favorites persistence server-side, Jobs, Services,
Notifications, Payments) — all explicitly out of scope, all unchanged.

## Gaps / Recommended Next Phase 2B Step

No blocking gaps for what this slice covers. Recommended next step, in
order: **(1)** wire `get_my_listings`/`update_listing`/`delete_listing`/
`pause_listing`/`activate_listing`/`mark_listing_sold` into
`app/(tabs)/myads.tsx` and `app/post/index.tsx`'s edit path — the backend
for all of it already exists and is live-tested, this is pure mobile
wiring, no new endpoints needed; **(2)** wire `search_listings`/
`get_public_listings`/`get_listings_by_category`/`get_listings_by_location`
into `app/results.tsx`/`app/(tabs)/home.tsx` (same situation — built,
tested, not connected); **(3)** only after both of those, consider modeling
`ProductVariant`/`sku` server-side, since by then real usage patterns from
(1)/(2) will say whether it's worth the schema complexity.

---

## Phase 2B (Slice 1) Decision

# ✅ GO — for this vertical slice specifically (Listing creation → fetch → detail)

Real backend built, deployed, and live-tested: 3 new DocTypes (normalized,
reusing Phase 2A taxonomy — no second taxonomy system), 1 new auth endpoint
(Frappe's own token mechanism, not invented), 12 new listing endpoints (all
live-tested including ownership/security), 2 new mobile services
(`authService.ts`, `listingService.ts`) reusing every existing
infrastructure pattern, one complete vertical slice wired end-to-end with
real error handling and zero fake success paths. `tsc`/`expo export` both
clean. No Phase 2A regression (untouched). No Chat/Favorites/Reviews/Jobs/
Services/Notifications/Payments code touched. No mock data deleted — every
screen not in this slice keeps working exactly as it did before this phase.

**This GO is scoped to the slice above only** — `myads.tsx`, listing edit,
and `results.tsx`/`home.tsx` discovery remain mock and need their own
migration pass (backend already built/tested for all of them) before a
whole-of-Phase-2B GO can be declared.

---
---

# Phase 2B Slice 2 — My Ads, Edit, Mutations, Discovery

**Scope of this section:** the second Listings vertical slice —
`MY ADS → EDIT LISTING → UPDATE BACKEND → DISCOVERY FEEDS`. Slice 1
(create → fetch → detail) is unmodified and still GO. Phase 2A (Taxonomy)
untouched. Chat, Favorites (server-side), Reviews, Jobs, Services,
Notifications, Payments, and `ProductVariant`/`sku` are **not** part of
this slice, per explicit instruction — none of that code was touched.

**This is NOT a whole-Phase-2B GO.** It covers exactly: My Ads (real
listings shown, real mutations), Edit (real update, ownership-enforced),
Home/Results discovery (real search/pagination/sort). Anything not listed
in this section's scope stays exactly as Slice 1 left it.

## 1. Audit performed before coding

Read (not assumed) before writing anything: `MOBILE_BACKEND_INTEGRATION_REPORT.md`
and `MOBILE_BACKEND_GAPS.md` (Slice 1 state), `services/listingService.ts`,
`services/authService.ts`, `lib/apiClient.ts` (all as Slice 1 left them —
unchanged since), `app/(tabs)/myads.tsx`, `app/post/index.tsx`'s edit
hydration, `app/(tabs)/home.tsx`, `app/results.tsx`, `app/detail/[id].tsx`,
`store/useAppStore.ts`'s listing-related state (`userListings`, `myAds`
— a **separate**, lighter parallel record kept in sync by hand at every
mutation point, not the same array as `userListings`), `mock/listings.ts`'s
`Listing` type.

**What the audit found that shaped the design:**
- `myads.tsx`'s `AdStatus` (`active|pending|expired|sold`) doesn't map onto
  the backend's `Draft|Active|Paused|Sold|Rejected`. `'pending'` was
  already dead code — `store/useAppStore.ts`'s own `addMyAd` comment
  confirms new ads always start `'active'`, no real review gate ever set
  it. Replaced `'pending'` with `'paused'` (a real, reachable backend
  status) rather than adding a 5th tab — a rename of an already-unreachable
  slot, not new UI surface.
- `myads.tsx` operates on `MyAd` (id/title/price/thumb/photoUri/status/
  views/chats/favorites/expiresInDays) — a **different, lighter** shape
  than `Listing`, with no server-side equivalent for `chats`/`favorites`
  (Chat/Favorites domains, out of scope) or `expiresInDays` (no expiry
  concept exists in `Souq Masr Listing` at all — listings don't auto-expire
  server-side).
- `app/post/index.tsx`'s edit hydration only ever looked up
  `userListings.find(l => l.id === editId)` — a real `LST-#####` id would
  never be found there, so editing a real listing would have silently
  opened a blank form instead of failing loudly or working correctly.
- `home.tsx`/`results.tsx` both derived every listing section from
  `useDiscoverableListings()` (local `userListings` + mock seed) — zero
  network calls for listing data.
- `results.tsx`'s search was a single client-side `matchesQuery()` pass
  over a haystack built from `title + description + category name (via
  mock getPath) + city + district` — no pagination existed at all (every
  match rendered in one unbounded `ScrollView`).

## 2. Backend endpoints used / added

**Used, unchanged (built + tested in Slice 1):** `create_listing`,
`get_listing`, `delete_listing`, `pause_listing`, `activate_listing`,
`mark_listing_sold`, `increment_listing_views`, `get_public_listings`.

**Used, extended this slice** (`souq_masr/api/v1/listings.py`):
- `update_listing` — no signature change, now actually called from a
  mobile screen for the first time (was built+tested but unwired in
  Slice 1).
- `get_my_listings` — no signature change, same reason.
- `search_listings` / `get_listings_by_category` / `get_listings_by_location`
  — **two real additions**, not just wiring:
  1. **`sort` param** (`newest|cheapest|priciest|mostViewed`, default
     `newest`) — a small, safe `order_by` lookup table
     (`_sort_order_by()`), added to all three read endpoints plus
     `get_public_listings`. `nearest`/`favoritesFirst` (two of
     `results.tsx`'s existing sort options) are **not** implemented
     server-side — the first needs device coordinates the app doesn't
     collect, the second needs the real Favorites domain (explicitly out
     of scope) — both still sort client-side over whatever page(s) are
     already loaded, disclosed below, not silently dropped from the UI.
  2. **Category descendant expansion** — `search_listings`'s
     `category_key` filter previously matched the exact category only;
     searching "vehicles" would miss listings filed under its child
     category "cars". Fixed by importing and calling
     `taxonomy.get_descendant_ids()` directly (`from souq_masr.api.v1
     import taxonomy` — a real Python import, reusing the exact same
     already-shipped recursion Phase 2A built for the category tree, not
     a second copy of it) and filtering `category IN (...)` instead of
     `category = ...`. This is what makes `results.tsx`'s "search within
     this category" behave like the old client-side `getAllDescendantIds`-
     based version did, but computed server-side now.

Both additions deployed, migrated (no schema change needed — additive
params only), restarted, and live-tested (§5 below) before any mobile code
was written against them.

## 3. Mobile screens migrated

- **`app/(tabs)/myads.tsx`** — real backend is now a first-class data
  source, not a replacement: `displayAds` merges `getMyListings()`'s real
  items with the still-existing local `myAds` array (Slice 1 never wrote
  real listings into `myAds`, so there's no double-counting — a real ad
  and a mock ad can never collide on the same id). Tabs: نشطة/متوقفة
  (was قيد المراجعة)/منتهية/مباع. Real ads get their own action row
  (عدّل/أوقف↔فعّل/مباع/احذف, calling `pauseListing`/`activateListing`/
  `markListingSold`/`deleteListing`, each followed by a `refetch()` of
  `get_my_listings` — **never** a locally-guessed status flip); mock ads
  keep their exact original row (ميّز/جدّد/عدّل/احذف, local store actions,
  byte-for-byte unchanged). A real Sold ad's card collapses to view-only,
  matching the pre-existing mock-Sold visual treatment exactly (no new
  pattern invented). `store/useAppStore.ts`'s `AdStatus` type itself
  changed (`'pending'` → `'paused'`) — the only other file referencing it
  was `myads.tsx` itself (checked by grep, not assumed).
- **`app/post/index.tsx`**'s edit path — `isRealListingId(editId)` branches
  hydration and save. Real edit: `getListing(editId)` (via `useApiResult`,
  loading/error states via `ApiStateView`) hydrates the exact same
  `postDraft` fields the mock path already hydrated (category, brand,
  model, attributes, title, price, priceType, condition, sellingType,
  description, location, photos, wholesale/discount fields) — same
  reverse `condition`-label-to-key lookup already used for mock edits, not
  a new mechanism. `is_owner` (now returned by `getListing()`) blocks the
  form entirely with a plain "مش معاك صلاحية تعدّل الإعلان ده" message if
  false — a client-side UX nicety; the real enforcement is `update_listing`'s
  own 403, tested independently (§5). Save calls `updateListingReal()`
  (aliased import — `updateListing` was already taken by the local Zustand
  action) with the current image set, then `router.replace('/myads')` —
  **same destination as the mock edit path**, no new navigation pattern.
  Editing a listing with variants, or any mock listing, still uses the
  exact original local `updateListing`/`updateMyAd` path, unchanged.
- **`app/(tabs)/home.tsx`** — every listing section (latest, cheapest,
  nearby, cars market, real-estate market) now fetches from
  `searchListings()`/`getListingsByLocation()`/`getListingsByCategory()`,
  each its own independent `useApiResult` call (one section failing
  doesn't take the others down, same pattern as Phase 2A's brand-shortcut
  rows). "Featured" stays an always-empty array with a one-line comment
  explaining why (no real promotion system — Phase 2D) — not deleted, not
  faked, degrades through the *existing* `featured.length > 0` gate
  exactly like it already did for an empty mock array.
- **`app/results.tsx`** — `searchListings()` replaces the local
  `scopedListings`/`matchesQuery` computation entirely. 300ms debounce on
  the search box (a real network call per keystroke would have been a
  regression the old client-side filter never had — same debounce pattern
  already used in `post/index.tsx`'s category search and
  `LocationPicker.tsx`). `condition`/dynamic `fieldFilters`/category
  scope/sort all pass straight through to the server. "Load more" (a
  `Pressable` + spinner under the list) replaces the old unbounded
  render-everything `ScrollView` — a real, disclosed UI addition, not a
  redesign: the filter sheet, chips, condition/attribute options, and
  overall screen layout are all pixel-identical to before.

## 4. Mock dependencies removed vs. remaining (Section 8/11)

**Removed this slice** (real backend now the *only* source, mock
dependency fully gone for these specific data flows):
- `home.tsx`: `mock/homeFeed.ts`'s `newestListings`/`featuredListings`/
  `cheapestListings`/`listingsInCity`/`listingsInCategoryIds`,
  `useDiscoverableListings()`, and the mock-scoped `getAllDescendantIds`
  usage for car/real-estate sections (superseded by server-side category
  expansion, §2).
- `results.tsx`: `useDiscoverableListings()`, `matchesQuery()`,
  `getAllDescendantIds()`/`getPath()` (both mock, previously used for
  local scoping and search-haystack building — both no longer needed at
  all, not replaced one-for-one, since the server now does full-text
  search and category expansion itself).

**Still mocked, explicitly, and why:**
- `myads.tsx`: local `myAds` array is **not** deleted — still the only
  source for pre-Slice-1 mock listings and any listing with variants
  (which still publish/edit locally, §Slice 1). "ميّز" (promote) stays
  local-only for every ad, real or mock — no real promotion backend
  exists (Phase 2D). `MyAd.chats`/`.favorites` are hardcoded `0` for real
  ads — genuinely unavailable, not guessed.
- `app/post/index.tsx`: listings with `ProductVariant[]` still publish and
  edit through the local/mock path entirely, unchanged from Slice 1 —
  `Souq Masr Listing` still has no variant child table.
- `app/results.tsx`: `savedSearches` (save/list a search criteria) is
  still 100% local `store/useAppStore.ts` state — not part of this
  slice's scope (no saved-search backend endpoint exists; catalogued
  separately in `MOBILE_BACKEND_GAPS.md`'s Phase 2B table, unresolved).
- `app/detail/[id].tsx`: unchanged from Slice 1 — favorites/chat/report
  still local `useAppStore` actions for both real and mock listings
  (Favorites/Chat/Reports domains, explicitly out of scope). Category
  breadcrumb still reads `mock/taxonomy/categories.ts` (harmless, ids
  match 1:1 by design, pre-existing condition not touched this pass
  either).
- Two `results.tsx` sort options (`nearest`, `favoritesFirst`) remain
  client-side-only re-sorts of already-loaded pages, not real server
  sorts — disclosed in §2 above, not silently degraded without
  explanation.

## 5. Live HTTP Tests

All against the real, live server (`187.7.19.136`), two rounds — a direct
raw-payload round and a second round mirroring the exact wire format
`services/listingService.ts` sends (double-JSON-encoded `attributes`/
`image_urls` inside the outer JSON body, `GET` with query-string params
exactly as `frappeGet` builds them, `undefined`-valued params omitted from
the request entirely rather than sent as `null` — the same disclosed
mirroring methodology as every prior round, still not a literal `import`
of the `.ts` files, for the same standalone-script reason as always).

```
=== 1. Backend additions (sort + category descendant expansion) ===
OK  search_listings(category_key='vehicles', sort='cheapest') finds all 3
    test listings filed under child category 'cars', ascending by price
OK  same with sort='priciest' — descending
OK  get_listings_by_category('vehicles') also expands to 'cars'

=== 2. Full-field update, no field loss ===
OK  create_listing (full field set)
OK  update_listing(title only) -> every OTHER field (description, price,
    price_type, condition, category_key, location_id, attributes,
    governorate) byte-identical to before the update
OK  User B cannot update User A's listing (403); GET after failed attempt
    confirms the listing is untouched, not partially mutated

=== 3. Image lifecycle (retain / remove / add / no duplication) ===
OK  upload 2 images, set image_urls=[url1,url2] -> images=[url1,url2] (order preserved)
OK  set image_urls=[url2] (remove url1, retain url2) -> images=[url2]
OK  set image_urls=[url2,url1] (re-add url1) -> images=[url2,url1], no duplicate of url2
OK  repeating the IDENTICAL update a second time -> still images=[url2,url1],
    no accidental duplication on resubmit

=== 4. get_my_listings real status ===
OK  Active listing appears with status='Active'
OK  after pause_listing -> get_my_listings shows status='Paused'
OK  Paused listing does NOT appear in get_public_listings
OK  Paused listing does NOT appear in search_listings
OK  User B forbidden (403) on activate/pause/mark_sold/delete of User A's
    Paused listing — all 4 mutations tested explicitly

=== 5. Search ===
OK  Arabic query ("لابتوب") matches
OK  English query ("Dell") matches
OK  partial query ("Dell XPS", substring) matches
OK  special characters ("%%%'; DROP TABLE--") -> HTTP 200, no traceback,
    no SQL error (Frappe's parameterized filters, not string-built SQL)
OK  no-results query -> [] cleanly
OK  category_key + q combined -> correct
OK  city_governorate + q combined -> correct (matches in the right
    governorate, excluded from the wrong one)

=== 6. Pagination ===
OK  5 items, limit=2 -> page 1: 2 items, page 2: 2 items, page 3: 1 item
OK  all 5 ids across all 3 pages are unique (no duplicate across pages)
OK  page 4 (past the end) -> [] cleanly, not an error

=== 7. Views ===
OK  two explicit increment_listing_views calls -> exactly +1 each
    (server-side correctness of the counter itself; the mobile
    render-vs-real-view distinction is enforced client-side by
    app/detail/[id].tsx's `useEffect(..., [listing?.id])` dependency
    array — verified by code review, not by a live device session, since
    none is available in this environment; the effect only re-fires when
    the *listing identity* changes, never on an unrelated re-render)

======================================================================
ALL SLICE 2 ASSERTIONS PASSED (round 1: 11 groups; round 2 mirror: 2 groups)
```

**Honest methodology note** (same disclosure as every prior round):
`app/(tabs)/myads.tsx`'s merge-and-render logic, `app/post/index.tsx`'s
real-edit hydration/save, and `app/results.tsx`'s debounced search +
load-more have **not** been exercised inside an actual device/simulator
session in this environment (none is available here). `tsc --noEmit` and
`expo export` (§6) confirm the code as written compiles and bundles
correctly; the backend contract those screens call has been independently,
thoroughly live-tested above.

## 6. Mobile Build Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean, 0 errors |
| `npx expo export --platform ios` | Succeeded, 1830 modules bundled, 0 errors |

## 7. Bugs Found / Fixed This Slice

None new in the backend logic itself. One pre-existing type/UI mismatch
resolved by design (not a "bug" in shipped code, since Slice 1 never wired
`myads.tsx` to real data): `AdStatus`'s `'pending'` value was already
dead/unreachable code (confirmed via `addMyAd`'s own comment before
touching anything) — replaced with `'paused'` rather than left alongside
it, avoiding a 5th, confusingly-named, empty-forever tab.

## 8. Blockers

None.

## 9. Decision

# ✅ GO — for this vertical slice specifically (My Ads + Edit + Mutations + Discovery)

**Not a whole-Phase-2B GO.** Scoped exactly to: real listings shown and
mutated (pause/activate/mark-sold/delete) from `myads.tsx`; real edit
(load, hydrate, update, ownership-enforced) from `post/index.tsx`; real
search/discovery/pagination/sort from `home.tsx` and `results.tsx`.

**Verified:** `tsc`/`expo export` clean; full endpoint contract for this
slice live-tested (update field-preservation, image lifecycle, status
visibility, ownership on all 4 real mutations, search variants, category
descendant expansion, pagination, views) across two mirrored rounds;
Sold/Paused/Draft listings confirmed absent from every public-facing
endpoint; no traceback on any tested path including a SQL-injection-shaped
query string.

**Still mocked, unchanged, explicitly out of scope** (§4): variants/sku,
saved searches, favorites/chat/reports (any listing), promotion
("featured"), `nearest`/`favoritesFirst` sort (client-side only). None of
these were silently dropped — each is named here and in
`MOBILE_BACKEND_GAPS.md`.

**No Chat/Favorites/Reviews/Jobs/Services/Notifications/Payments code was
touched.** No Phase 2A regression. No mock data deleted globally.

---
---

# Phase 2B Slice 3 — Favorites, Saved Searches, Reports

**Scope of this section:** real per-user Listing features —
`FAVORITES + SAVED SEARCHES + REPORTS`. Slices 1–2 unmodified, still GO.
Phase 2A untouched. Chat, Reviews, Jobs, Services, Notifications,
Payments, and `ProductVariant`/`sku` are **not** part of this slice —
none of that code was touched. Note: Favorites' local mechanism is
**shared** with Services (`app/favorites.tsx`, `services/[id].tsx`) —
only the Listing side of it was migrated; the Service side is untouched,
by construction (see §1).

**This is NOT a whole-Phase-2B GO.** GO/NO-GO below applies only to
Favorites + Saved Searches + Reports.

## 1. Audit performed before coding

Read before writing anything: `MOBILE_BACKEND_INTEGRATION_REPORT.md`/
`MOBILE_BACKEND_GAPS.md` (Slice 1+2 state), `services/listingService.ts`,
`services/authService.ts`, `lib/apiClient.ts` (unchanged since Slice 2),
`store/useAppStore.ts`'s favorites/savedSearches/reports slices,
`app/favorites.tsx`, `app/saved-searches.tsx`, `app/detail/[id].tsx`'s
favorite/report UI, `components/listing/RowCard.tsx`.

**What the audit found that shaped the design:**
- `favorites: Record<string, true>` is a single flat map keyed by **any**
  id — used identically for Listings *and* Services (`app/favorites.tsx`'s
  own header comment documents this explicitly: the same Record, same
  `toggleFavorite`/`isFavorite`, is what `services/[id].tsx`'s heart
  button reads too). This meant the local mechanism could **not** simply
  be replaced — Services must keep working through it unchanged, so only
  the *Listing* path was made real-backend-aware, inside the same
  functions, branching on `isRealListingId()`.
- The favorite heart isn't only on the detail screen — `components/
  listing/RowCard.tsx` (used by `results.tsx` **and** `favorites.tsx`) has
  its own internal `isFavorite`/`toggleFavorite` calls, and `app/(tabs)/
  home.tsx`'s `MiniCard` reads `isFav`/`toggleFav` closures computed at
  the home.tsx level. Migrating favorites correctly meant every one of
  these existing call sites had to keep working **unchanged** — which
  drove the final design: make `store/useAppStore.ts`'s `toggleFavorite`/
  `isFavorite` themselves real-aware (§2), so every existing consumer gets
  correct behavior for free, with zero changes to `RowCard.tsx` or
  `MiniCard`.
- `SavedSearch`'s current fields (`categoryId`, `query`,
  `conditionFilter`, `fieldFilters`) exactly match what `results.tsx`'s
  filter sheet can produce today — no location or price-range filter
  exists in the UI yet (confirmed in Slice 2's own audit), so those and
  `sort` are schema-ready on the backend (§4) but not yet populated by
  the mobile app.
- **A real, pre-existing bug** in `app/saved-searches.tsx`: restoring a
  saved search only ever passed `category`/`q` to `/results`, silently
  dropping `conditionFilter` and `fieldFilters` — confirmed by reading the
  restore handler's `URLSearchParams` construction directly. Fixed in §5.
- `Report`'s current shape (`id, listingId, reason, createdAt`) has no
  `description` field — the mobile UI never collected one (only a reason
  picker) — the backend model is schema-ready for it (§4) but it isn't
  wired into the report sheet's UI this slice (no UI redesign needed to
  close this gap; not requested).

---

## 2. Favorites — Real Backend

**DocType: `Souq Masr Listing Favorite`** — one row per (owner, listing)
pair; `owner` is Frappe's standard field (the favoriting user), not a
custom one. `listing` is a required `Link` to `Souq Masr Listing`.
**Enforcement of "one favorite per user/listing":** primarily
`add_favorite`'s check-then-idempotent-return (no error, no duplicate row
— matches "Test duplicate add ... safely" literally: duplicate add is not
an error, it's a no-op that returns the existing favorite), backed by a
`validate()` safety check on the DocType itself for the race-condition
case (two near-simultaneous inserts for the same pair). Frappe's DocType
JSON has no composite-unique-key primitive, so this two-layer approach —
not a DB constraint — is the real enforcement, disclosed as such rather
than implied to be a schema guarantee.

**Permissions** (deliberately different from `Souq Masr Listing`'s — a
favorite is *private*, not public data): `Souq Masr Admin` full;
`All` role `create=1` only (any signed-in user can create); `All` +
`if_owner`: `read=1, delete=1` (an authenticated user can only read/delete
their **own** rows — this if_owner scoping, not just create being
guarded, is what stops another authenticated user from reading someone
else's favorites through Frappe's own generic REST resource endpoint, not
only through the custom API). **No Guest row at all** — Guest has zero
access to this DocType by any path.

**API (`souq_masr/api/v1/favorites.py`, all live-tested §8):**
- `add_favorite(listing_id)` — auth required, listing must exist and be
  public (Active/Paused/Sold, matching `get_listing`'s own visibility
  rule), idempotent on duplicate.
- `remove_favorite(listing_id)` — auth required, idempotent on repeated
  removal (a second call is a safe no-op, not an error).
- `is_favorite(listing_id)` — `allow_guest=True`: a Guest session always
  gets `false` with no DB query at all (no identity to check against);
  exported from the mobile service for completeness but not currently
  called directly by any screen (see `get_listing`'s embedded field
  below).
- `get_my_favorites(page, limit)` — auth required, returns listing
  **summaries** (reuses `listings.py`'s `_serialize_summary`, not a
  duplicate adapter), newest-favorited-first, gracefully skips any
  favorite whose listing has since been deleted (an orphaned Favorite row
  — see the delete-listing bug below — never crashes this endpoint).

**Cross-cutting addition:** `is_favorite` is now embedded directly in
every listing response that returns to an authenticated viewer —
`get_listing`'s `_serialize()` (single detail) and every list endpoint's
`_serialize_summary()` (`search_listings`, `get_public_listings`,
`get_listings_by_category`, `get_listings_by_location`, `get_my_listings`,
`get_my_favorites`). List endpoints compute this with **one batched query
per page** (`_favorited_ids_for_current_user()`), not a per-row
`frappe.db.exists()` call — an N+1 query pattern was deliberately avoided
before it was ever written, not fixed after the fact. Live-verified: a
listing's `is_favorite` flips correctly in `search_listings`'s own
response immediately after favoriting, and is always `false` for a Guest
viewer regardless of who else favorited it.

**Security tests, all live-verified (§8):** Guest blocked on
add/remove/get_my_favorites (403, Frappe's own guest-rejection); Guest's
`is_favorite` always `false` with no auth needed; a different user's
`is_favorite`/`get_listing.is_favorite` correctly shows `false` for a
listing someone else favorited; `get_my_favorites` never includes another
user's favorite; `remove_favorite` on a listing the caller never favorited
is a safe no-op (does not touch another user's real favorite of the same
listing — tested explicitly: User A "removing" a favorite it never had
does not affect User B's real favorite of the same listing); invalid
listing id → clean 404, no traceback.

---

## 3. Favorites — Mobile

**Architecture decision, and why:** rather than touching `RowCard.tsx`,
`MiniCard` (home.tsx-local), and `detail/[id].tsx` individually,
`store/useAppStore.ts`'s existing `toggleFavorite`/`isFavorite` — the
**one** interface every consumer already calls — were made real-aware
internally:
- `isFavorite(id)` is **unchanged** — still a synchronous read of the
  local `favorites` cache. What changed is *what keeps that cache
  correct*: `services/listingService.ts`'s `adaptListing`/`adaptSummary`
  now carry the backend's `is_favorite` through as `Listing.isFavoriteOnServer`,
  and a new `hooks/useSeedFavoriteCache.ts` (called from `home.tsx`,
  `results.tsx`, `favorites.tsx`, `detail/[id].tsx` — everywhere a real
  `Listing[]`/`Listing` gets fetched) writes that truth into the shared
  cache via a new `setFavoriteCache` store action. This hook exists
  specifically to avoid an import cycle: `listingService.ts` cannot import
  `useAppStore.ts` directly, because `useAppStore.ts` already needs to
  import `services/favoritesService.ts` for the real toggle below — the
  hook breaks that cycle by living at the screen layer instead (same
  cycle-avoidance pattern `lib/apiClient.ts`'s own header comment already
  documents for a different pair of modules).
- `toggleFavorite(id)` — for a mock/service id, **byte-for-byte
  unchanged**. For a real listing id: optimistically flips the local
  cache immediately (heart re-colors with no perceptible delay, matching
  the pre-existing instant UX), calls `ensureCredentials()` then
  `addFavorite()`/`removeFavorite()` in the background, and **reverts the
  optimistic flip if the result isn't `success`** — for any failure
  reason (no internet, backend down, credential failure), not just a
  generic catch-all. No toast/alert on rollback (a deliberate, disclosed
  choice — the silent self-correction matches how most production apps
  handle a failed heart-tap; the "no fake success" requirement is met by
  the state reverting to the truth, not by an intrusive notification).

**Result: zero code changes needed in `RowCard.tsx` or `home.tsx`'s
`MiniCard`** — both already called `toggleFavorite`/`isFavorite` and now
correctly handle real listings without modification. `app/detail/[id].tsx`
needed only the seeding hook call, not any change to its favorite button
logic.

**`app/favorites.tsx`** — real favorited listings now come from
`getMyFavorites()` (server is the source of truth, not a `filter()` over
the local mock store, which could never have contained a real listing in
the first place). Merged with the existing local mock-listing and
service-favorite logic, unchanged. A small inline retry row appears if the
real fetch fails, without blocking whatever local content still exists.

**Persistence verified across the required scenarios:**
- **App restart / device refresh:** `favorites` itself persists via the
  store's existing `AsyncStorage`-backed `persist` middleware (unchanged,
  pre-existing) as a fast local cache; the seeding hook re-confirms it
  against the server on every fetch, so a stale local flag left over from
  before a restart gets corrected, not just trusted.
- **Logout/login (different session, e.g. reinstall or a second device):**
  the local cache starts empty, but the seeding hook corrects it to the
  server truth as soon as any real listing is fetched (detail view, or any
  list) — this is the actual point of seeding from the server rather than
  only trusting the optimistic local flip.
- **Navigation away/back:** unaffected — the cache is a global Zustand
  store, not screen-local state.

**One disclosed, minor UX characteristic:** unfavoriting a listing from
*inside* `app/favorites.tsx` itself flips its heart correctly but doesn't
instantly remove the row from that screen's list until the screen is
revisited (a fresh `useApiResult` fetch happens on remount) — not a
correctness bug (the heart's own state is always accurate), a live-list-
membership nicety not implemented this pass.

---

## 4. Saved Searches — Real Backend

**DocType: `Souq Masr Saved Search`** — persists the actual search
**definition**, not a snapshot of matching listing ids (so a saved search
still works correctly against listings created after it was saved, as the
request required): `label`, `query`, `category` (Link), `condition`
(Select, same options as Listing's), `field_filters` (JSON-encoded Small
Text — matches the mobile's own opaque `Record<string,string>` shape,
deliberately not normalized into rows since it's criteria, not queryable
data). **Schema-ready, not yet populated by the mobile app** (confirmed
in §1's audit that no UI collects them yet): `location` (Link),
`min_price`/`max_price` (Currency), `sort` (Select, same 6 keys as
`results.tsx`'s `SortKey`).

**Permissions:** same private-by-default shape as Favorites — `All`
create-only plus `if_owner`-scoped read/write/delete, no Guest row.

**API (`souq_masr/api/v1/saved_searches.py`):**
- `create_saved_search(...)` — auth required, validates `category`/
  `location` references. **Duplicate prevention**: queries the caller's
  own saved searches for an exact match across every criteria field
  (including a `sort_keys=True`-normalized `field_filters` JSON string
  comparison) and returns the existing row idempotently rather than
  inserting a duplicate — server-side now, not a client pre-check (the
  old `results.tsx` computed `alreadySavedIdentical` locally; that
  computation is gone, replaced by trusting the server's own dedup, which
  is the actual authority now).
- `get_my_saved_searches()` — auth required, newest-first.
- `delete_saved_search(saved_search_id)` — auth + ownership required.
- No `update_saved_search` — the current UI never edits an existing saved
  search (only creates/deletes), so none was built (no unused/fake
  endpoint).

**Security tests, live-verified (§8):** Guest blocked on create/get (403);
duplicate identical search (Arabic query, same category/condition/
field_filters) returns the *same* id, confirmed no second row created;
User B sees zero of User A's saved searches; User B cannot delete User
A's saved search (403); deleting an already-deleted saved search is a
clean 404, not a crash; Arabic and English query text both round-trip
correctly; an empty query string is accepted (the UI's own "no text,
category-only" saved search case).

---

## 5. Saved Searches — Mobile

**`app/results.tsx`** — `saveSearch()` now calls `createSavedSearch()`
directly; the local `alreadySavedIdentical` pre-check (and its dedicated
`results.alreadySaved` label) was removed entirely — the server's own
idempotent dedup is the real, sole mechanism now (disclosed trade-off: the
save button no longer visually greys out in advance for an identical
search already saved in a *previous session*, since that would require
fetching the full saved-search list just to render the button; pressing
it is still always safe — it can never create a duplicate row). Added a
`saving` loading state (spinner in place of the heart icon) and a real
success/failure `Alert` — no silent, assumed success.

**`app/saved-searches.tsx`** — list and delete now come from
`getMySavedSearches()`/`deleteSavedSearch()` (`ApiStateView` for loading/
error, a small per-row spinner while deleting). **Restore bug fixed**:
tapping a saved search now passes `condition` and `filters` (JSON-encoded
`fieldFilters`) as additional query params to `/results`, alongside the
existing `category`/`q` — `results.tsx`'s `useState` initializers for
`conditionFilter`/`fieldFilters` read them on first render, so a restored
search now reapplies **every** criterion it was saved with, not just
category and text.

**Functional sequence verified** (live HTTP, mirroring the mobile wire
format — Arabic query "آيفون", category, condition, and a
`field_filters` object all specified together): create → appears in
`get_my_saved_searches` → delete → gone. Restore's correctness was
verified at the data level (the saved criteria round-trip through
create→get exactly, and `results.tsx`'s param-reading code was reviewed
directly against the exact query-string shape `saved-searches.tsx` now
builds); the actual on-device navigation was not run in this environment,
consistent with every prior round's disclosed methodology limitation.

---

## 6. Report Listing — Real Backend

**DocType: `Souq Masr Listing Report`** — `listing` (Link, required),
`reason` (Select, validated against the same 8-value `ReportReason` enum
the mobile app already defines — `fake/scam/wrong_category/duplicate/
prohibited/spam/abusive_seller/incorrect_info`, not a new list),
`description` (optional Small Text, schema-ready, not yet collected by
the report-reason-picker UI), `status` (`Open/Reviewed/Dismissed`,
default `Open` — exists only so the record is safely storable/triageable
later; **no admin moderation UI was built this slice**, per explicit
instruction).

**Permissions — the most restrictive of the three new DocTypes,
deliberately:** `All` role gets `create=1` and **nothing else** — no
`read`, `write`, or `delete` at all, not even `if_owner`-scoped. A normal
user cannot read back a report's content (their own or anyone else's)
through *any* Frappe mechanism, generic or custom — satisfying "do not
expose reporter identity to other normal users" and "a normal user must
not be able to edit/delete another user's report" as a structural
guarantee, not just an unimplemented endpoint. `has_reported()`'s boolean
check (below) works anyway because it's a raw `frappe.db.exists()` call,
which bypasses DocType read permissions entirely — the same technique
`is_favorite`/ownership checks already use elsewhere in this codebase.

**API (`souq_masr/api/v1/reports.py`):**
- `report_listing(listing_id, reason, description=None)` — auth required,
  listing must exist and be public, `reason` validated against the known
  enum (clean `validation_error` otherwise, not a raw exception).
  **Duplicate-abuse prevention**: idempotent-return on a second report of
  the same listing by the same user (same id returned, no second row,
  regardless of a different `reason` on the retry) — mirrors
  `add_favorite`'s pattern exactly.
- `has_reported(listing_id)` — auth required, returns only a boolean.
  Exists because the mobile UI needs to know "have I already reported
  this" *after an app restart* too, not just within one session — without
  it, the report button's "already reported" state would have had no way
  to survive past the current app session for a real listing.

**A real bug found and fixed** (discovered directly by this slice's own
testing, not assumed): `delete_listing` (built in Slice 1) raised an
unhandled `LinkExistsError` whenever the listing being deleted had **any**
associated Favorite or Report row — Frappe's default link-integrity check
blocks deleting a document that's still referenced by a `Link` field
elsewhere. Reproduced live (favorited + reported a listing, then called
`delete_listing` as its owner → 500-shaped failure), then fixed by
switching from `doc.delete()` to `frappe.delete_doc(..., force=1,
ignore_permissions=True)` — `force=1` skips the link-integrity block
without touching the linked rows themselves, so a Report **survives** as
an orphaned audit-trail row (the right behavior — a report shouldn't
vanish just because the reported listing was later taken down), while an
orphaned Favorite is silently excluded by `get_my_favorites`'s own
pre-existing `if lid in rows_by_id` guard (no crash, no dangling
reference exposed to the client). Re-verified live after the fix: delete
now succeeds with both a linked favorite and a linked report present, and
the full Slice 3 regression suite was re-run afterward with zero new
failures.

---

## 7. Report Listing — Mobile

**`app/detail/[id].tsx`** — for a mock listing, `openReport`/the report
button are **byte-for-byte unchanged** (still the local `reportListing`/
`hasReported` store actions). For a real listing: a `hasReported()` check
runs once when the real listing loads (seeding a `realReported` local
state, mirroring the favorite-cache-seeding pattern conceptually but kept
local to this one screen since report status is never shown on any list
card, only this one button); selecting a reason now `await`s
`reportListingReal()` and shows the "شكرًا" thank-you alert **only after**
a real success — the old code showed that alert unconditionally,
immediately after firing the local store action, which for a real listing
would have been exactly the "fake reported successfully response" the
request explicitly forbids. A failure now shows a real "تعذّر إرسال
البلاغ" alert instead.

---

## 8. Live HTTP Tests

All against the real, live server (`187.7.19.136`), two rounds — direct
raw-payload calls, then a round mirroring the mobile services' exact wire
format (JSON-encoded `field_filters` nested in the outer JSON body, GET
with query-string params exactly as `frappeGet` builds them) — same
disclosed methodology as every prior round.

```
=== FAVORITES ===
OK  Guest: add/remove/get_my_favorites all 403 (Frappe's own guest-rejection)
OK  Guest: is_favorite always false, no auth needed
OK  add_favorite -> 200, is_favorite=true
OK  duplicate add_favorite -> same favorite id, no new row
OK  is_favorite differs correctly per viewer (favoriter=true, listing owner=false)
OK  get_listing embeds is_favorite correctly per-viewer (guest=false, favoriter=true)
OK  get_my_favorites includes the listing; a different user's list does not
OK  User A "removing" a favorite it never had is a safe no-op AND does not
    touch User B's real favorite of the same listing
OK  repeated remove_favorite is safely idempotent
OK  invalid listing id -> clean 404, no traceback
OK  is_favorite correctly flips in search_listings' own list response
    immediately after favoriting (batched query, verified via a dedicated
    before/after/guest-view test)

=== SAVED SEARCHES ===
OK  Guest: create/get both 403
OK  create with Arabic query ("آيفون") + category + condition + field_filters
OK  create with English label, empty query string (UI-allowed case)
OK  duplicate identical search -> same id returned, no second row
OK  get_my_saved_searches shows exactly the 2 distinct ones, not 3
OK  a different user sees zero of them
OK  User B cannot delete User A's saved search -> 403
OK  User A deletes own -> 200; repeated delete -> clean 404

=== REPORTS ===
OK  Guest cannot report -> 403
OK  invalid reason -> clean validation_error, no traceback
OK  invalid listing id -> clean 404
OK  valid report -> 200
OK  has_reported correct per-user (reporter=true, others=false)
OK  repeated report (different reason) -> idempotent, same report id, no 2nd row
OK  Guest cannot check has_reported (requires identity) -> 403

=== BUG FOUND + FIXED: delete_listing + linked Favorite/Report ===
OK  (before fix) delete_listing on a favorited+reported listing failed
    (LinkExistsError, reproduced directly)
OK  (after fix) delete_listing succeeds with both a linked favorite and a
    linked report present; report row survives (audit trail intact)
OK  full Slice 3 regression suite re-run after the fix -> 0 new failures

======================================================================
ALL SLICE 3 ASSERTIONS PASSED (round 1: 3 domains x multiple groups;
round 2 mirror: 6 groups covering all 3 domains' exact mobile wire format)
```

**Honest methodology note** (same disclosure as every prior round): the
optimistic-update-plus-rollback logic in `store/useAppStore.ts`'s
`toggleFavorite`, the seeding hook's cross-screen behavior, and the
report/save-search UI flows have **not** been exercised inside an actual
device/simulator session in this environment (none is available here).
`tsc --noEmit` and `expo export` (§9) confirm the code as written compiles
and bundles; the backend contract every one of these call sites depends on
has been independently, thoroughly live-tested above, including the exact
double-JSON-encoded wire format the real service files produce.

## 9. Mobile Build Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean, 0 errors |
| `npx expo export --platform ios` | Succeeded, bundled with no errors |

## 10. Data Integrity (Section 9 of the request)

| Scenario | Result |
|---|---|
| Duplicate favorite insertion | Idempotent — returns existing row, no duplicate created |
| Repeated favorite removal | Idempotent — safe no-op |
| Duplicate saved search (identical criteria) | Idempotent — returns existing row, no duplicate created |
| Deleting an already-deleted saved search | Clean 404, not a crash |
| Reporting the same listing repeatedly | Idempotent — returns existing report, no duplicate row, regardless of a different reason on retry |
| Deleted/nonexistent listing referenced by a Favorite or Report | `get_my_favorites` silently excludes it (pre-existing guard, confirmed still correct); a Report row itself is preserved as an orphaned audit-trail record by design (see the delete_listing fix, §6) |

## 11. Mock Dependencies Removed vs. Remaining

**Removed this slice** (real backend is now the sole source for these
specific flows): `app/results.tsx`'s local `alreadySavedIdentical`
computation and `addSavedSearch` call; `app/saved-searches.tsx`'s reads
of `store.savedSearches` and its `removeSavedSearch` call;
`app/detail/[id].tsx`'s unconditional-success report flow for real
listings; `app/favorites.tsx`'s listing source for real listings
(`allListings`'s local filter → `getMyFavorites()`).

**Still mocked, explicitly, and why:**
- `store/useAppStore.ts`'s `favorites` Record, `savedSearches` array, and
  `reports` array are **not deleted** — `favorites` still backs Services'
  favorite button unchanged (a different domain, untouched by design);
  `savedSearches`/`reports` arrays are simply no longer read by the two
  screens that used to read them, kept in the store as-is (no call site
  left depends on them, but removing dead state isn't required by "remove
  mock dependency only where the real backend equivalent is complete" —
  it's inert, not a lie to the user).
- `app/detail/[id].tsx`'s favorite/report logic for **mock** listings —
  fully unchanged, local, as designed.
- `SavedSearch.location`/`minPrice`/`maxPrice`/`sort` — schema-ready
  server-side, not populated (no UI collects them, §1/§4).
- `Souq Masr Listing Report.description` — schema-ready, not collected by
  the mobile report sheet (reason-picker only, unchanged UI).
- Admin moderation of reports — explicitly out of scope this slice, not
  evaluated.

## 12. Bugs Found / Fixed This Slice

One real bug, found by this slice's own testing before it could reach
production use: `delete_listing`'s `LinkExistsError` when a Favorite or
Report row references the listing being deleted — full description, root
cause, and fix in §6. Live-verified fixed, full regression re-run clean.

## 13. Blockers

None.

## 14. Decision

# ✅ GO — for this vertical slice specifically (Favorites + Saved Searches + Reports)

**Not a whole-Phase-2B GO.** Scoped exactly to what this slice covers.

**Backend:** 3 new DocTypes (`Souq Masr Listing Favorite`, `Souq Masr
Saved Search`, `Souq Masr Listing Report`), each with permission shapes
matched to their actual privacy needs (Favorites/Saved Searches:
`if_owner`-scoped private; Reports: create-only, no read path for anyone
but Admin). 8 new endpoints across 3 new API modules
(`favorites.py`/`saved_searches.py`/`reports.py`), all live-tested
including ownership, duplicate-handling, and Guest-rejection. One
cross-cutting backend addition (`is_favorite` embedded in every listing
response, batched per page). One real bug found and fixed
(`delete_listing` + linked rows).

**Mobile:** 3 new service modules
(`favoritesService.ts`/`savedSearchService.ts`/`reportService.ts`), one
new hook (`useSeedFavoriteCache`), and a deliberate architecture choice
(making the existing store actions real-aware internally) that let
`RowCard.tsx` and `home.tsx`'s `MiniCard` — both pre-existing, both used
across multiple screens — keep working with **zero code changes**.
`app/favorites.tsx`, `app/saved-searches.tsx`, and `app/results.tsx`'s
save-search flow now read/write the real backend; `app/detail/[id].tsx`'s
report flow no longer fakes success for real listings; a genuine
pre-existing bug (saved-search restore silently dropping condition/
field-filters) was fixed alongside the migration.

**Verified:** `tsc`/`expo export` clean; two rounds of live HTTP tests
across all three domains including security (Guest rejection on every
mutation and private read, cross-user isolation on favorites/saved
searches, reporter-identity-never-exposed by permission structure, not
just by unimplemented endpoints), data integrity (every duplicate/
repeated/orphaned-reference scenario the request listed), and the exact
mobile wire format.

**No Chat/Reviews/Jobs/Services/Notifications/Payments code touched.** No
Phase 2A/Slice 1/Slice 2 regression. No mock data deleted globally —
`favorites`/`savedSearches`/`reports` remain in `store/useAppStore.ts`,
`favorites` still actively backing Services.

---

# Phase 2B Slice 4 — Real Chat + Timestamped History + Call Signaling + Phone Fallback

**Scope of this section, exactly:** real conversations with server-timestamped
message history and date-grouped display; a real call data model with
server-derived participants, full state machine, security, and a
persisted call-history/timeline; native-dialer phone fallback gated by a
real, backend-authoritative privacy rule. **Not in scope: actual
real-time voice audio.** No WebRTC/RTC-provider SDK is integrated this
slice — see §7 for why, and the documented architecture recommendation
for the follow-up slice that would add it. This split was confirmed with
the requester up front (via an explicit question) before any code was
written, given this environment cannot run a mobile app on a real device
or emulator to test live audio.

## 1. Audit performed before writing any code

Read in full: `mock/messages.ts` (`ChatBubble`/`Conversation` — `time` is
pre-formatted display text, no raw timestamp field exists at all),
`store/useAppStore.ts`'s `sendMessage`/`sendImageMessage`/
`startChatForListing`/`addSystemMessage` (100% local, `Date.now()`-based
ids, device-clock-formatted times), `app/chat/[id].tsx` (revealed an
already-existing call button, an already-existing native-dialer button
with `Linking.openURL`, `seller.phone` shown in plain text
unconditionally with no privacy gate — a real pre-existing leak, fixed in
§6 — and an honest "voice recording not available yet" placeholder on the
mic button), `app/call/[id].tsx` (revealed this was entirely a fake-timer
simulation — a two-second timeout that flipped to "connected" plus a
duration ticker, mute/speaker/keypad controls that toggled nothing real —
exactly the anti-pattern this slice's request forbids building),
`app/(tabs)/messages.tsx` (conversation list, local array, local search).

Also checked every other consumer of chat state: `app/(tabs)/home.tsx`'s
unread badge (now includes real conversations too, see §9), `app/analytics.tsx`
(seller dashboard chat-count stats — untouched, mock-only, disclosed in
§11), `app/seller/[id].tsx` (`startChatForListing` from a seller profile —
untouched; seller profiles for real users don't exist yet, a pre-existing
disclosed gap unrelated to chat).

Frappe's realtime/socketio (`frappe-bench-node-socketio`) was confirmed
running on the VPS but not wired up this slice — polling (2.5-5s, varies
by screen) is used instead for chat/call live updates, as a deliberate
scope reduction. Documented as a disclosed limitation/upgrade path, not a
silent gap.

## 2. New DocTypes

| DocType | Autoname | Key fields | Permissions |
|---|---|---|---|
| `Souq Masr Conversation` | `format:CONV-{#####}` | `buyer`/`seller` (Link User), `listing` (Link), `last_message_at`, `last_message_preview` | Admin full; `All`: `create=1` only — no read/write/delete for any non-admin role |
| `Souq Masr Message` | `format:MSG-{#####}` | `conversation` (Link, reqd), `kind` (Text/System/CallEvent), `text`, `image` (Attach Image), `call` (Link), `is_read` | Same shape as above |
| `Souq Masr Call` | `format:CALL-{#####}` | `conversation` (Link, reqd), `caller`/`callee` (Link User, reqd), `listing` (denormalized), `call_type` ("voice"), `status` (Ringing/Active/Ended/Declined/Missed/Cancelled/Failed), `started_at`/`answered_at`/`ended_at`, `duration` | Same shape as above |

**Why create-only, no blanket read/write:** unlike `Souq Masr Listing`/
`Favorite`/`SavedSearch` (one owner each, `if_owner` works fine), a
conversation and a call have two participants. Frappe's `if_owner`
primitive can't express "either of these two users" on its own. All
read/write access is instead enforced exclusively by explicit Python
membership checks in every whitelisted method (`_assert_participant`/
caller-or-callee checks), using `ignore_permissions=True` on the actual
DB write only after that check passes — defense in depth via real code,
not a decorative permission row.

`caller`/`callee` on Call and `buyer`/`seller` on Conversation are always
derived server-side from conversation membership — never accepted as
client input. This is the entire mechanism behind §7's requirement (a
user must not reach an arbitrary third party by manipulating IDs): the
only path to reach anyone at all is through a conversation you are
already a real participant of.

## 3. Backend endpoints

`souq_masr/api/v1/chat.py` — `start_conversation(listing_id)` (derives
seller from `listing.owner`, idempotent find-or-create on the
buyer+seller+listing triple), `get_my_conversations()` (or-filtered
buyer=user OR seller=user, per-conversation unread count),
`get_conversation(conversation_id, page, limit)` (paginated, newest-first
fetched then reversed to chronological order for display),
`send_message`, `send_image_message` (validates the uploaded
`File.owner == user`, same ownership pattern as `listings.py`'s image
attach), `mark_read` (bulk `frappe.db.set_value`).

`souq_masr/api/v1/calls.py` — `start_call(conversation_id)` (blocks
starting a second call while one is Ringing/Active on the same
conversation), `accept_call`/`decline_call` (callee-only, Ringing-only),
`end_call` (Active→Ended with a computed `duration`, or Ringing→Cancelled
if the caller hangs up before anyone answers; idempotent no-op on an
already-terminal call), `get_call`/`get_active_call_for_conversation`
(must be called via POST — see §4).

Every completed/declined/missed/cancelled call transition appends a
`kind='CallEvent'` `Souq Masr Message` to the conversation's timeline
(e.g. a call-duration line, "مكالمة مرفوضة", "مكالمة ملغاة", "مكالمة
فائتة") — these persist exactly like any other message and survive app
restart, because they're just rows in `Souq Masr Message` fetched the
same way as text messages.

Ring-timeout ("missed call") is resolved lazily on read
(`_resolve_stale_ringing`, 45s `RING_TIMEOUT_SECONDS`) rather than by a
cron/scheduler job — simpler, and live-verified correct with a real
46-second sleep in the test script, not simulated.

## 4. Critical bug found and fixed — GET requests silently roll back DB writes

The 46-second missed-call timeout test showed `get_call` returning
`status: "Missed"` in its JSON response, but a direct database check via
bench console showed the call was still `"Ringing"` in the actual table,
and zero `CallEvent` messages existed. Root cause, confirmed by reading
Frappe's own request-handling code: a database write made while handling
a GET-routed whitelisted method is rolled back at the end of the request
by Frappe's `sync_database()`, because GET is not one of the "unsafe"
HTTP methods it auto-commits for — even though the response body for that
same request correctly reflected the (uncommitted) new state. A genuine,
previously-latent framework gotcha that this slice's lazy-mutation-during-read
design (`_resolve_stale_ringing`) exposed for the first time in this
codebase.

**Fix:** `get_call` and `get_active_call_for_conversation` are now called
via POST only — both from the test scripts and from
`services/callService.ts`. Documented in the function docstrings in
`calls.py`, in `_resolve_stale_ringing`'s own docstring, and in
`services/callService.ts`'s module comment, so this doesn't get silently
reintroduced by a future "this is just a GET, right?" edit.

## 5. Critical bug found and fixed — site-wide timezone misconfiguration

The test script's own timestamp assertion failed by roughly 5.5 hours
against a UTC reference. Investigation via bench console showed
`System Settings.time_zone` was empty, and Frappe's timezone helper fell
back to `Asia/Kolkata` (India, UTC+5:30) — meaning every `now_datetime()`/
`creation` timestamp on the entire site, for every DocType, since the VPS
was first deployed, has been recorded in Indian time, not Egyptian time.
This predates this slice but was only caught now because this is the
first slice with an explicit exact-timestamp-correctness requirement.

**Fix:** the System Settings time zone was set to `Africa/Cairo`,
followed by a web+worker restart. Re-verified `now_datetime()` now
returns correct Cairo-local time (UTC+3, correct for Egypt's
currently-active September DST). Historical rows already written under
the old timezone are not backfilled — out of scope for a one-time data
migration inside a chat feature slice — flagged here explicitly rather
than left undiscovered.

## 6. Critical bug found and fixed — phone number leaked to every viewer

Re-reading `listings.py` while implementing this slice's phone-privacy
requirement surfaced a real, pre-existing leak from Slice 1:
`_seller_public_info()` unconditionally returned the seller's mobile
number to every viewer of `get_listing`, including unauthenticated
Guests. Never caught before because no phone-privacy requirement existed
until this slice.

**Fix:** new `_phone_visible_to_viewer(seller, listing_id)` helper —
visible to (a) the listing owner viewing their own listing, or (b) a
viewer who has a real `Souq Masr Conversation` with that seller about
that specific listing; `False` for a Guest or an unrelated stranger.
`_seller_public_info` updated to accept and use it. Backend-authoritative
— the mobile app never decides this on its own. Live-tested with 5
scenarios (guest / authenticated stranger / owner / buyer with a real
conversation / stranger still blocked even after that conversation
exists) — all passed, see §8.

The same rule governs the phone surfaced inside a real conversation
itself (`chat.py`'s `_serialize_conversation_meta`): once two users are
proven conversation participants, showing each other's phone is the
intended outcome of rule (b) above, not a separate leak.

A related, smaller bug was also caught and fixed before deploy:
`chat.py`'s `_user_display()` returned a dict keyed inconsistently
between its found/not-found branches — one used `"phone"`, the other
`"mobile_no"` — which would only surface as a lookup error in the rare
case of a conversation participant whose User record no longer exists.
Fixed to use the same key in both branches, redeployed, and reverified
via the full smoke suite (§8).

## 7. VoIP audio — not built this slice, architecture recommendation

**What's real:** the full call data model — who called whom, when,
current state, duration, security, and timeline persistence. **What's
not:** any actual audio stream. `app/call/[id].tsx` shows an explicit,
always-visible on-screen disclosure to this effect; it was never hidden
or implied otherwise.

**Why not built now:** this environment cannot run the mobile app at all
— no simulator with working audio, no physical device, and Expo Go
cannot load native WebRTC modules regardless. Any SDK integration
attempted here would be untestable by construction, which is exactly the
scenario the original request says to avoid faking. This was surfaced to
the requester directly before writing any call-related code, and the
confirmed scope was: real chat/call data model now, VoIP audio as a
documented recommendation for a future slice, provider chosen by this
pass.

**Recommendation: LiveKit (self-hosted), not a managed usage-billed vendor.**

| Option | Why not chosen |
|---|---|
| Twilio Voice | PSTN-oriented pricing/complexity aimed at telephony bridging this app doesn't need; per-minute billing that scales with usage the app can't yet predict; regional business-verification overhead. |
| Agora | Strong mobile audio quality/SDKs, but fully proprietary usage-based billing and a vendor-hosted dashboard/credential system that sits awkwardly next to an otherwise self-hosted Frappe stack. |
| Daily.co | Good developer experience, but cloud-only/proprietary with pricing that grows with call volume — same objection as Agora for a cost-sensitive, pre-revenue classifieds app. |
| LiveKit | Open-source, self-hostable (one more service beside the existing Frappe VPS, or a small dedicated box) — infra cost only, no per-minute vendor billing. Official React Native SDK with an Expo config plugin. Server-side token minting is simple and fits the existing pattern of short-lived, server-issued credentials exactly. |

**Integration shape for the follow-up slice** (not built, specified for
handoff): a new endpoint on `calls.py`, reusing the exact same
"is this user caller-or-callee on this specific call" check already
written there, mints a short-lived (roughly 5 minutes, refreshable)
LiveKit access token scoped to a room named after the call
(`CALL-#####`). The LiveKit API key/secret would live only on the server
(environment variable, never shipped to the app, same handling as any
other backend secret); the mobile app would receive only the token.
Actual audio media never flows through Frappe — Frappe's role stays
"identity + call metadata" exactly as it is today, LiveKit's role is
transport only. This requires moving the mobile app off Expo Go onto an
EAS dev-client/custom build (a native module), a larger, separate
undertaking outside this slice's scope.

**Background/incoming calls — also not built, same reasoning:** true
incoming-call support (ringing while the app is closed or backgrounded)
needs CallKit (iOS) / ConnectionService (Android) native integration plus
a VoIP push channel (APNs VoIP push + FCM), which in turn needs a paid
Apple Developer entitlement and a push-notification service wired to
Frappe that does not exist yet. What is built: foreground-only
incoming-call detection via polling `get_active_call_for_conversation`
while the chat screen is open — this slice implements the foreground case
only, and says so rather than presenting it as full background support.

## 8. Live HTTP testing performed

Three-user test suite (buyer/seller/stranger): real timestamps verified
against actual Africa/Cairo local time (not naive UTC), `start_conversation`
idempotency, stranger blocked with a real 403 on both chat and call
endpoints, `get_my_conversations` unread counts, `mark_read`, invalid-id
404s, the full call state machine including a genuine 46-second sleep
proving the ring-timeout → Missed transition with no auto-answer,
cross-user 403s on accept/decline/end (caller cannot accept their own
call; a non-participant cannot touch the call at all), declined/cancelled
flows, and call-event timeline messages appearing correctly. All passed,
across two bug-fix iterations (the GET/commit bug in §4 and the timezone
bug in §5).

Phone-privacy suite (5 scenarios: guest / authenticated stranger / owner
/ buyer-with-real-conversation / stranger-still-blocked-after-that-conversation-exists)
— all passed.

Post-fix smoke suite (run after the `chat.py` `_user_display` fix in §6
and after the mobile-side wiring in §9): fresh listing → real
conversation → message with a real timestamp → seller reads it with the
buyer's name/phone correctly visible → real call Ringing → Active →
Ended with a real ~2s duration → call-event message correctly persisted
in the timeline. All passed against the live VPS after the redeploy and
restart:

```
listing created: LST-00067
conversation: CONV-00068, other_party={'id': '201099990002@phone.souqmasr.local', 'name': 'Smoke Seller', 'phone': '+201099990002'}
message sent: MSG-00069 at 2026-09-02 16:49:31.166428
seller sees other_party={'id': '201099990001@phone.souqmasr.local', 'name': 'Smoke Buyer', 'phone': '+201099990001'}
buyer's conversations: 1
call started: CALL-00070, status=Ringing
call accepted -> Active
call ended, duration=2s
call-event timeline messages: ['مكالمة صوتية — المدة: 00:02']

SMOKE TEST PASSED
```

Test data cleaned up via bench-console `frappe.delete_doc(force=1, ignore_permissions=True)` calls after each round.

## 9. Mobile changes

`services/chatService.ts` and `services/callService.ts` (new) — same
`ApiResult<T>`/adapter pattern as every prior service; deliberately not
unified with the old mock `Conversation`/`ChatBubble` types (a real
conversation's shape is genuinely richer — real user ids, real sender
identity, call events). Screens branch explicitly on
`isRealConversationId(id)`, the same pattern as `detail/[id].tsx`'s
`isRealListingId` branching.

`app/call/[id].tsx` — fully rewritten. Route param is now a real
`CALL-#####` id. Polls `getCall` every 2.5s, driving all UI state from
the real backend (no client-side timers simulating progress). Ring
animation only plays while status is Ringing. Accept/Decline shown only
while Ringing; a single End control while Active; a status label and
back button for any terminal state. The old fake mute/speaker/keypad
controls are removed entirely (they controlled no real audio stream). An
always-visible on-screen banner discloses that call data is real while
audio is not connected yet.

`app/chat/[id].tsx` — real path added alongside the untouched mock path.
Messages are grouped by calendar date exactly per the request's
formatting (today/yesterday/full localized date, Arabic or English per
the active language) — the grouping boundary uses the viewing device's
own calendar day (standard chat-app behavior), but every message's
underlying timestamp is 100% server `created_at`, never overwritten or
recomputed locally. Conversation header shows the other participant's
name and the linked listing. The call button opens a shared bottom-sheet
component instead of calling immediately, with the two choices the
request specifies (free in-app call / regular phone call). Free call
starts a real call and navigates to the call screen. Regular call opens
the native dialer gated on the privacy-checked phone number, with a
"number not available" fallback instead of dialing a blank one.
Foreground incoming-call detection polls for an active call every 3s and
shows an accept/decline banner — gated on the current user actually being
the callee, so a user never sees their own outgoing call misrendered as
incoming. Image attach/send wired to the real upload+send endpoints. The
existing Sale Confirmation Flow UI/logic is preserved unchanged and
mock-only — not extended to real conversations this slice.

`app/(tabs)/messages.tsx` — now renders real conversations (polled every
5s) merged with the existing local mock list, each with its own row
component, search spanning both.

`app/detail/[id].tsx` — the message-seller action now starts a real
conversation for real listings before navigating (idempotent — repeated
taps land on the same conversation, not a new one each time); the sticky
call button now opens the same shared call-choice sheet (previously
navigated straight to the old fake call screen using the seller's id,
which would have been a hard runtime failure against the rewritten call
screen if left as-is — caught and fixed as part of this slice). Free call
from this screen ensures a conversation exists first, then starts the
call. Regular call uses the same privacy-gated phone number with the same
fallback. Mock listings keep the exact previous behavior.

`app/(tabs)/home.tsx` — unread-message badge now sums real conversations'
unread counts (polled every 15s) together with the existing local count.

`services/listingService.ts` — the seller adapter now handles the backend
legitimately returning a null phone (§6's privacy gate), coerced to an
empty string so it composes with the existing seller-phone type and every
existing "no phone" check across the app without a wider type ripple.

**Verification:** `tsc --noEmit` clean (zero errors) after every round of
changes described above. `npx expo export --platform ios` bundles clean
(1837 modules, no errors) — the closest available substitute for a real
device run in this environment; it does not exercise runtime behavior,
which is why the live HTTP tests in §8 exist as the actual correctness
evidence for anything server-relevant.

## 10. Security testing

- Guest rejected (real 403) on every chat/call mutation and on every
  private read.
- Cross-user isolation: a stranger with no conversation gets a real 403
  attempting to read or act on a conversation/call they're not part of —
  tested by id, not just by absence from a list.
- Call security specifically: caller/callee are always server-derived
  from the conversation, never client-supplied — a user cannot reach an
  arbitrary third party by passing a different id in any call endpoint,
  because every call endpoint's first step is resolving the conversation
  and asserting membership before anything else happens. The caller
  cannot accept their own outgoing call; only the callee can decline;
  either participant (not a third party) can end an active call.
- Phone-number privacy verified as backend-authoritative across 5 live
  scenarios — the mobile app has no way to force the number to appear; it
  only ever displays what the server already decided to send.
- No audio recording exists anywhere in this slice — nothing stores or
  proxies a media stream, so there is nothing to audit for retention;
  duration is a plain computed integer from two timestamps, not derived
  from any captured audio.

## 11. What's still mock / explicitly out of scope this slice

- Sale Confirmation Flow (the "mark as sold from chat" UI) — fully
  unchanged, mock-conversations-only. Not extended to real conversations
  this slice; a real listing's mark-sold path remains the direct button
  in My Ads (already real, from Slice 2).
- `app/analytics.tsx`'s chat-count seller stats and `app/seller/[id].tsx`'s
  chat entry point — untouched, still fully mock (the latter was already
  non-functional for real users before this slice, since real
  seller-profile pages don't exist yet — a pre-existing, disclosed gap
  unrelated to chat).
- Real-time delivery (socketio) — not wired up; polling only, disclosed
  in §1.
- Actual VoIP audio, background/incoming-call support (CallKit/
  ConnectionService + push) — not built, documented architecture only,
  §7.
- Historical timestamps written before the §5 timezone fix are not
  backfilled.

## 12. Blockers

None for the scope actually claimed below. Real VoIP audio and
background incoming-call support remain blocked on infrastructure this
environment cannot provide or test (native build pipeline, physical
devices, push credentials) — not attempted, not claimed.

## 13. Decision

# GO — for real chat + timestamped history + call signaling/security + phone fallback
# NO-GO — for actual in-app voice audio (not built; documented architecture only)

Scoped exactly, per the original request's own final rule: do not report
VoIP as GO unless an actual two-device/two-user voice call has been
successfully tested. No such test occurred or could occur in this
environment, so none is claimed.

**What's GO:** real conversations and messages with server-authoritative
timestamps, correctly date-grouped and localized on the mobile side; a
real, secure call data model (start/accept/decline/end, ring-timeout,
duration, full state machine) that is genuinely live-tested via HTTP
end-to-end, including security (§10) and two real backend bugs found and
fixed as a direct result of this slice's own testing (§4 GET-commit, §5
timezone) plus one pre-existing privacy leak (§6); native phone-dialer
fallback correctly gated by a real backend privacy rule instead of always
showing the number; call-event timeline items that persist across app
restart exactly as requested.

**What's NO-GO:** the actual audio layer. `app/call/[id].tsx` discloses
this on-screen rather than presenting fake progress. A concrete, justified
provider recommendation (LiveKit, self-hosted) and integration shape are
documented in §7 for the follow-up slice, rather than an SDK being
installed and left unverified.

**No Reviews/Jobs/Services/Notifications/Payments code touched.** No
Phase 2A/Slice 1/2/3 regression — none of that code was modified this
slice except the two narrowly-scoped fixes covered in §6 (the phone
visibility helper, already covered under this slice since it's this
slice's own requirement that surfaced it) and the seller-phone type
widening in §9. No mock data deleted globally — `store/useAppStore.ts`'s
local `conversations` array and the Sale Confirmation Flow remain fully
intact and functional for mock listings.

---

# Phase 2B Slice 4B — Real In-App Voice Calling (LiveKit)

**Scope, exactly:** make the "free in-app call" choice actually carry
real, two-way voice audio, using self-hosted LiveKit. Everything Slice 4
already built (chat, timestamps, call data model/signaling/security,
phone-dialer fallback) is reused unchanged. **Voice only** — no video
track is ever published, no camera permission is ever requested on
Android, and no camera API is ever called from the client on either
platform (see §5 for the one unavoidable iOS static-linking nuance).

**Per the request's own stop condition:** this section reports what was
built and what was verified via real HTTP and real server-side
inspection. It does **not** claim GO for actual two-device audio — that
test has not happened yet, because it requires a physical device build
(`eas build`) that only the requester can run and verify, per the
explicit division of labor agreed before this slice started (see the
"Two-device test" and "Native build path" decisions earlier in this
conversation). Everything up to that final gate is complete and tested
as thoroughly as this environment allows; §13 says exactly what remains.

## 1. Audit of the existing Slice 4 implementation (before writing anything)

Re-read `souq_masr/api/v1/calls.py`, `souq_masr/api/v1/chat.py`,
`services/callService.ts`, `services/chatService.ts`, `app/call/[id].tsx`,
`app/chat/[id].tsx`, `components/CallChoiceSheet.tsx`, and the `Souq Masr
Call`/`Souq Masr Conversation`/`Souq Masr Message` DocTypes. Confirmed
already correct and reused without modification: the full call state
machine (Ringing/Active/Ended/Declined/Missed/Cancelled/Failed),
server-derived caller/callee, ring-timeout auto-resolution, call-event
timeline messages, the two-choice call sheet, phone-privacy rules, and
the chat screen's foreground incoming-call polling. **Nothing here was
rebuilt.** The only gap was the audio transport itself — nothing
LiveKit-related existed anywhere in the repository before this slice.

## 2. LiveKit architecture review

Verified directly against this project's actual versions (not assumed):

| Requirement | Finding |
|---|---|
| Expo Go | **Confirmed incompatible** — LiveKit's React Native SDK requires native modules (`@livekit/react-native-webrtc`) that Expo Go cannot load. A development build is mandatory; this was never in question, just confirmed. |
| Expo SDK | Project is on SDK 54. `@config-plugins/react-native-webrtc` is version-locked to SDK majors (`13.0.0` ↔ SDK 54, `14.0.0` ↔ SDK 55, `15.x` ↔ SDK 56) — installing `latest` (15.0.2) failed with a peer-dependency conflict demanding SDK ≥56; pinned to `13.0.0` instead, which resolved cleanly. |
| Config plugins | Required, and confirmed working after one real fix: `@livekit/react-native-expo-plugin`'s own package does not declare `@expo/config-plugins` as an installable dependency, and this project's `@expo/config-plugins` copies were all nested (under `expo`, `@expo/cli`, `expo-splash-screen`, etc.) rather than hoisted to the top level — so the plugin's bare `require('@expo/config-plugins')` failed to resolve, breaking `expo export`/`expo prebuild` entirely. Fixed by adding `@expo/config-plugins@54.0.5` as an explicit top-level devDependency. Verified fixed via a real `expo export` run (succeeded, 2024 modules) and a real local `expo prebuild --platform android` run (succeeded — see §9 for why that generated output was discarded rather than committed). |
| `app.json`/`app.config.*` | Project uses static `app.json` only (no `app.config.js`) — changes made directly there: two new plugin entries, `android.blockedPermissions`, and (see §5) an App Transport Security / cleartext-traffic fix. |
| EAS | No `eas.json`, no linked EAS project, not logged into the Expo CLI — all confirmed before starting. `eas.json` created this slice (development/preview/production profiles); the EAS project itself and its credentials are the requester's own, created on first `eas build` run, per the agreed division of labor. |
| iOS entitlements | None required specifically for LiveKit voice calling itself (no VoIP push, no CallKit — see §7). The App Transport Security fix in §5 is unrelated to LiveKit specifically; it's a pre-existing gap this audit surfaced. |
| Android permissions | `RECORD_AUDIO` (needed, requested), `CAMERA` (added by `react-native-webrtc`'s own manifest merge, explicitly blocked — see §5). |

**Deviation from the originally documented recommendation, deliberately:**
the Slice 4 report suggested a companion coturn TURN server. LiveKit
server has had a **built-in TURN server** for some time — confirmed by
reading the actual config schema shipped with the installed
`livekit-server` binary (`turn.enabled`, `turn.udp_port`) — so a separate
coturn process was never deployed. One fewer moving part, same
capability, verified working (see §3).

## 3. Self-hosted LiveKit — deployment

**VPS capacity check (same box as Frappe, 187.7.19.136):** 2 vCPU, 7.8GB
RAM, 90GB free disk, idle load average ~0.06 at deploy time. LiveKit's
own sizing guidance puts a single-node deployment handling "up to a few
hundred concurrent participants" comfortably within this — for a 1:1
voice-only marketplace-chat feature, this VPS has substantial headroom.

**No Docker.** Installed the official `livekit-server` static binary
directly via the upstream install script (`v1.13.6`) and run it as a
native `systemd` unit (`livekit-server.service`, `User=frappe`,
`Restart=on-failure`) — matches this VPS's existing bare-metal-Frappe
operational style rather than introducing a container runtime for one
binary.

**No Redis.** LiveKit's own documentation confirms Redis is required
only once you run more than one `livekit-server` node, for cross-node
room-state coordination — a single node (this deployment; the server log
itself printed `"using single-node routing"` on startup, confirmed live)
works correctly without it. Added only if this ever needs to scale past
one node.

**Config** (`/opt/livekit/config.yaml` on the VPS, real secrets — never
committed; a redacted template is checked in at
`infra/livekit/config.yaml.template`):

```yaml
port: 7880
bind_addresses: ["0.0.0.0"]
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 50100
  use_external_ip: true
keys:
  <api_key>: <api_secret>   # generated via openssl rand -hex 12 / -hex 32
turn:
  enabled: true
  udp_port: 3478
```

**Ports opened / verified reachable from outside the VPS (not just
"ufw is inactive" — actually tested from a separate network):**

| Port | Purpose | Verified |
|---|---|---|
| 7880/TCP | Signaling (HTTP/WS) | ✅ confirmed open (external TCP probe succeeded) |
| 7881/TCP | WebRTC-over-TCP fallback | ✅ confirmed open |
| 3478/UDP | Built-in TURN | ✅ confirmed **working**, not just open — a real STUN Binding Request sent from outside the VPS's network got a real STUN Binding Success Response back (`0x0101` header), proving the UDP path is genuinely alive end-to-end, not merely unfiltered |
| 30000-40000/UDP | TURN relay range (LiveKit's default) | Not individually probed — same host, same absence of firewall rules as the confirmed ports above |
| 50000-50100/UDP | Direct ICE/media range (narrowed from the commonly-suggested 50000-60000; sufficient for this app's concurrency) | Not individually probed, same reasoning |

The full media-port range's reachability is conclusively settled by the
two-device test itself (§13) — if ICE genuinely can't traverse, the call
UI will show `failed`, not a false `connected`.

**Room security, verified live (not just by reading the token):** every
`start_call` explicitly creates the LiveKit room via `RoomServiceClient`
with `max_participants=2` — confirmed directly on the running server
(`list_rooms` showed `max_participants=2` on every room created this
way, matching the call id exactly), not inferred from the request code
alone.

**No TLS yet.** The domain/SSL step from the earlier discussion is still
pending from the requester (DuckDNS subdomain + token requested, not yet
received). `livekit_ws_url` is currently set to the plain
`ws://187.7.19.136:7880` — this does **not** block the two-device test
(WebRTC media itself is always DTLS-SRTP-encrypted regardless of the
signaling channel's own transport security; only the signaling messages
and the initial token exchange travel in cleartext without TLS). It does
mean: (a) the connection is vulnerable to signaling-level tampering on a
hostile network, and (b) — the more concrete, load-bearing issue —
plain `ws://`/`http://` needed an explicit iOS/Android cleartext
exception to be reachable from a real device build at all (§5). Both are
flagged as a follow-up hardening step, not silently worked around.
Because `livekit_ws_url` is read from server config at token-issue time
(never baked into the mobile build), flipping it to `wss://` later needs
**zero mobile rebuild** — only an nginx server block + certbot once the
domain is live.

## 4. Backend token endpoint

`souq_masr/api/v1/calls.py`'s new `get_rtc_token(call_id)`:

- Re-uses the exact same authorization check as every other endpoint in
  the file (`user in (doc.caller, doc.callee)`) — a token is never
  issued to anyone but a real participant of that specific call.
- **Room = the call's own id** (`CALL-#####`), always — never a
  client-supplied room name.
- **Audio-only at the token layer, not just the UI layer:**
  `VideoGrants(can_publish_sources=["microphone"])`. This is enforced by
  the LiveKit *server*, not the client — even a modified mobile client
  presenting this token could not publish a camera or screen-share
  track, because the token itself never grants that permission.
- TTL: 600 seconds (`LIVEKIT_TOKEN_TTL_SECONDS`), short-lived per the
  request. Safe against disconnecting an in-progress call: LiveKit only
  validates the JWT at initial room-join, not for the life of an
  already-established connection.
- Rejects: Guest (401/403), a non-participant (403 — verified against a
  real third user, not just reasoned about), an invalid `call_id` (404),
  and a call that isn't Ringing/Active (a already-Ended call cannot mint
  a new token).
- `livekit-api` (the official Python SDK, `v1.2.1`) added as a real
  dependency of the `souq_masr` app (`pyproject.toml`), not just
  pip-installed ad hoc on the VPS — survives a future
  reinstall/`bench setup requirements`.

**Live HTTP test results** (buyer/seller/stranger, real listing/
conversation/call, real signin tokens):

```
call started: CALL-00085

=== 1. Caller (buyer) gets a valid token ===
buyer token payload: {"video": {"roomJoin": true, "room": "CALL-00085",
"canPublish": true, "canSubscribe": true, "canPublishData": true,
"canPublishSources": ["microphone"]}, "sub":
"201077770001@phone.souqmasr.local", ...}
token ttl = 600s

=== 2. Callee (seller) also gets a valid token for the SAME room ===
seller identity: 201077770002@phone.souqmasr.local

=== 3. Stranger (not a participant) is rejected with 403 ===
status=403

=== 4. Guest (unauthenticated) is rejected ===
status=403

=== 5. Invalid call_id is rejected with 404 ===
status=404

=== 6. Room was actually created on the LiveKit server with max_participants=2 ===
(verified directly against the running server — see §3)

=== 7. After the call ends, no more tokens can be issued for it ===
status=417 (ValidationError)

RTC TOKEN TESTS PASSED
```

Every payload assertion in that suite decodes the **actual JWT** (not
just trusts the HTTP 200) and checks `room`, `canPublishSources`, `sub`
(identity), and the `exp`/`nbf` gap for the TTL — not a superficial
status-code check.

## 5. Mobile: dependencies, permissions, and one real pre-existing bug found

**Packages installed** (`package.json`): `@livekit/react-native`,
`@livekit/react-native-webrtc`, `@livekit/react-native-expo-plugin`,
`@config-plugins/react-native-webrtc@13.0.0` (pinned, see §2),
`livekit-client`, `expo-dev-client`, plus `@expo/config-plugins@54.0.5`
as a devDependency (the resolver fix from §2).

**Voice-only enforcement, platform by platform:**
- **Android:** `android.blockedPermissions: ["android.permission.CAMERA"]`
  added to `app.json`. `react-native-webrtc`'s own config plugin
  unconditionally adds the `CAMERA` permission to the manifest (it
  supports both audio and video use cases); `blockedPermissions` strips
  it back out at manifest-merge time. Verified by reading the actual
  plugin source (`@config-plugins/react-native-webrtc`'s
  `withWebRTC.js`) rather than assuming Expo's merge behavior. Result:
  the built Android app genuinely never declares camera access.
- **iOS:** the same underlying library requires `NSCameraUsageDescription`
  to exist in `Info.plist` for the linked WebRTC framework to build at
  all (confirmed by reading the plugin's own `withPermissions.js` — it
  always writes this key, with no option to omit it). This is a real,
  disclosed platform-level limit, not something worked around: the key's
  *string* is present (customized to say "سوق مصر مش بيستخدم الكاميرا
  خالص — مكالمات صوتية بس" / "not used at all — voice calls only"), but
  **no runtime camera API is ever called from this app's code**, so iOS
  never actually shows the user a camera-permission prompt — the
  permission is never *requested* in the way that matters (no prompt, no
  access), even though the static Info.plist entry exists for the
  reason above.
- No camera track is ever created or published anywhere in
  `app/call/[id].tsx` — `video={false}` explicitly on `<LiveKitRoom>`,
  and no code path calls `setCameraEnabled`.

**A real, pre-existing bug found and fixed while verifying this build
would even run on a physical device:** this project's Frappe API calls
have always used plain `http://187.7.19.136` (no domain, no HTTPS — a
known, disclosed limitation since the VPS was first deployed). That was
never actually exercised on a real device before — every previous slice
was only verified via `tsc`/`expo export`/live HTTP from a dev machine,
never a running mobile app. iOS's App Transport Security **blocks
plaintext HTTP/WS connections by default**; without an exception, the
very first real-device run of this app would have failed to reach the
backend at all — for every existing feature, not just this slice's new
LiveKit connection. Fixed with a narrowly-scoped, explicitly-temporary
exception:

```json
"ios": { "infoPlist": { "NSAppTransportSecurity": { "NSAllowsArbitraryLoads": true } } },
"android": { "usesCleartextTraffic": true }
```

**This must be reverted once the domain + TLS work (§3) is done** — it's
appropriate for a `development`/`internal` EAS build talking to a
plaintext-only backend, not for a public production release. Flagged
here and in `MOBILE_BACKEND_GAPS.md`, not left as a silent permanent
setting.

## 6. Mobile: the call screen (`app/call/[id].tsx`, rewritten again)

Slice 4's version polled `getCall` and rendered ringing/ended states
honestly with no audio at all. This version keeps that same honest
backend-status handling for everything **before** a real connection
exists, and adds a second, real layer once the backend says the call is
`Active`:

- `lib/callUiState.ts` (new): a single pure function
  (`computeCallUiState`) merges the backend's `Souq Masr Call.status`
  with LiveKit's own `ConnectionState` into the exact nine states the
  request specifies (`idle`/`outgoing_call`/`incoming_call`/`connecting`/
  `connected`/`ended`/`rejected`/`missed`/`failed`). **The UI only ever
  shows `connected` when LiveKit's own `ConnectionState.Connected` is
  true** — never merely because the backend record says `Active`.
- Backend polling (2.5s, same as Slice 4) runs **only** until a real RTC
  connection exists; once connected, it stops (§10 of this request:
  "do not send unnecessary polling requests while a LiveKit call is
  active"). From that point, "the other party hung up" is detected from
  a real LiveKit room event (`useRemoteParticipants()` dropping to
  zero), not from continued polling.
- `AudioSession.startAudioSession()`/`stopAudioSession()` bracket the
  screen's mount/unmount lifecycle, per LiveKit's own documented
  pattern.
- Mute: `localParticipant.setMicrophoneEnabled()`, driven by the real
  `useLocalParticipant()` hook — not a local boolean that controls
  nothing.
- Speaker/earpiece: `AudioSession.selectAudioOutput()`
  (`'speaker'`/`'earpiece'` on Android, `'force_speaker'`/`'default'` on
  iOS, per the SDK's own platform split) — wrapped in a try/catch that
  silently no-ops on a device that doesn't support output selection,
  matching the request's own "where supported" wording rather than
  crashing or lying about the state.
- Duration: a real ticking display computed from the moment
  `ConnectionState.Connected` actually becomes true — cosmetic/live-only;
  the **stored** duration is still computed server-side at `end_call`
  from `answered_at`/`ended_at`, unchanged from Slice 4.
- Microphone permission failure: surfaced from
  `useLocalParticipant().lastMicrophoneError` (a real SDK-reported
  error, not inferred) with a "no microphone permission — open Settings"
  banner wired to `Linking.openSettings()`.
- `services/rtcService.ts` (new): the one function that calls
  `get_rtc_token`, typed, adapted to camelCase like every other service
  in this codebase.
- `registerGlobals()` (LiveKit's required one-time WebRTC JS globals
  setup) added once at the top of `app/_layout.tsx`, before any other
  import that could touch LiveKit.

**Not rebuilt:** the two-choice call sheet
(`components/CallChoiceSheet.tsx`), the chat screen's incoming-call
polling/banner, the phone-privacy-gated native-dialer fallback — all
reused exactly as Slice 4 left them. "Free in-app call" now leads to a
screen that actually carries audio instead of one that discloses it
doesn't.

## 7. Incoming call — unchanged from Slice 4, still foreground-only

No push notifications, no CallKit, no ConnectionService were added this
slice — this was explicitly out of scope for "make the free call
actually carry audio" and remains a documented, disclosed gap (see
`MOBILE_BACKEND_GAPS.md`). The foreground detection built in Slice 4
(polling `get_active_call_for_conversation` while the chat screen is
open) is what the two-device test in §13 will exercise — both devices
need their chat screen open (or already past accept) for the callee to
see the incoming call, exactly as before. This is disclosed, not implied
to be full background support.

## 8. Call recording — unchanged, still none

Nothing in this slice stores, buffers, or proxies an audio stream to
disk or to any third party. LiveKit's own recording (Egress) was never
configured, deployed, or referenced anywhere in this setup. The only
persisted call data remains the same metadata fields as Slice 4
(caller/callee/conversation/status/timestamps/duration).

## 9. Verification performed

- `tsc --noEmit`: clean (zero errors) after every round of the changes
  above.
- `npx expo export --platform ios`: clean, 2024 modules (up from 1837
  before this slice, consistent with the added LiveKit code actually
  being included in the bundle graph, not silently excluded).
- `npx expo prebuild --platform android --no-install`: run once, purely
  to prove the config plugins (§2, §5) actually apply without crashing —
  succeeded. The generated `android/` directory and the prebuild's
  side-effects on `app.json`/`package.json` (auto-injected Android
  package name, duplicated permission lists, `expo run:android` script
  rewrite) were **reverted/discarded**, not committed — this project
  stays pure managed-workflow; EAS Build runs its own prebuild in the
  cloud. One real, useful thing this throwaway prebuild surfaced: no
  `android.package`/`ios.bundleIdentifier` exists yet anywhere in this
  project — `eas build` will prompt for one on first run (§14, a genuine
  manual step, not something to invent on the requester's behalf).
- Backend: the full live HTTP suite in §4, plus a re-run of the entire
  Slice 4 chat/call test suite (unaffected — zero new failures).
- **Not yet done, and cannot be done from here:** connecting two real
  LiveKit clients and verifying actual two-way audio. That is §13's job,
  and it requires the physical-device build only the requester can run.

## 10. Production safety

- `frappe-bench.conf` (the bench-managed nginx config for the Frappe
  site) was **not** touched, edited, or regenerated this slice.
- `livekit-server` runs as its own isolated `systemd` unit, its own
  config file (`/opt/livekit/`), no shared process, no shared Redis, no
  shared port with anything Frappe uses.
- The Frappe web/worker processes were restarted only for the
  `calls.py` deployment (standard for any endpoint change, same as every
  prior slice) — never for LiveKit itself, which needed no Frappe
  restart to come up.
- `supervisorctl status` confirmed all existing Frappe processes healthy
  before and after every restart in this slice.

## 11. Failure-handling coverage (coded; two-device-testable, not yet tested live)

Coded and reachable via the state machine in §6, but only verifiable
with real audio on real devices (§13), not from this environment:
caller cancels before answer (→ `Cancelled`, handled), receiver declines
(→ `Declined`, handled, tested at the backend level in Slice 4), receiver
doesn't answer (→ `Missed` after 45s, backend-tested with a real sleep in
Slice 4), microphone permission denied (→ `lastMicrophoneError` banner,
coded, not yet triggered on a real device), token expiry mid-call (→ no
effect on an already-connected session, by LiveKit's own design, per
§4), unauthorized room access (→ 403, backend-tested in §4).
**Network disconnect/reconnect and the actual "both parties can hear
each other" outcome cannot be verified without §13.**

## 12. What's still not built (disclosed, not silently skipped)

- Actual two-device audio verification (§13 — the whole reason this
  section exists at NO-GO, see §15).
- TLS/domain for the public LiveKit endpoint (§3 — still pending from
  the requester's own DuckDNS step).
- Background/incoming-call support via CallKit/ConnectionService + VoIP
  push (§7 — unchanged from Slice 4, not attempted this slice either).
- `NSAllowsArbitraryLoads`/`usesCleartextTraffic` (§5) must be narrowed
  or removed once the backend has real TLS — currently appropriate only
  for an internal development build.
- `android.package`/`ios.bundleIdentifier` are not set — `eas build`
  will prompt for these; they were not invented on the requester's
  behalf since they're effectively permanent once chosen (§14).

## 13. Two-device test — instructions for the requester (not yet run)

This is the final gate, and per the request's own rule, cannot be
converted to GO by anything short of this actually happening:

1. Run the EAS build command in §14 below (Android first is recommended
   — no Apple Developer account needed to sideload an APK; iOS needs a
   paid account for a real-device dev build's signing).
2. Install the resulting build on two physical devices, sign in as two
   different real users (different phone numbers).
3. Device A: open Device B's user's listing → chat → tap the call button
   → "📞 مكالمة مجانية داخل التطبيق".
4. Device B: the chat screen (must be open) shows the incoming-call
   banner (§7 — foreground only) → accept.
5. Verify on both devices: both microphones work, both can hear each
   other, mute works, speaker/earpiece toggle works, duration ticks
   correctly, ending the call from either side ends it for both.
6. Repeat with B declining, then with B not answering at all (verify the
   45-second miss-timeout from Slice 4 still fires correctly with real
   RTC involved).
7. Restart both apps, open the conversation, and verify the call-history
   timeline entries (§ from Slice 4) are still correct and persisted.
8. Retest "📱 اتصال هاتفي عادي" opens the native dialer with the
   privacy-gated number, unchanged from Slice 4.

## 14. EAS build command

```bash
npx eas login                 # first time only, requester's own account
npx eas build --profile development --platform android
# once an Apple Developer account is available:
npx eas build --profile development --platform ios
```

On first run, `eas build` will prompt to create the EAS project (writes
`extra.eas.projectId` into `app.json`) and to choose an Android
`package`/iOS `bundleIdentifier`, since neither exists yet (§9/§12).
These are effectively permanent once set — pick deliberately, e.g.
`com.souqmasr.app`.

## 15. Decision

# NO-GO — for actual two-device voice audio, per the request's own explicit rule
# Infrastructure and code: complete and independently verified wherever this environment allows

Every layer that can be verified without a physical device has been:
self-hosted LiveKit is running and genuinely reachable (a real STUN
response from outside the VPS's network, not just an open port), the
token endpoint is live-tested end-to-end including decoding the actual
JWT payload for room/identity/audio-only-grant/TTL correctness, room
security is verified directly against the running LiveKit server (not
inferred), `tsc`/`expo export`/a real `expo prebuild` all pass, and a
real pre-existing bug (missing ATS/cleartext exception, which would have
blocked *every* existing feature on a real device, not just this one)
was found and fixed as a direct result of preparing for this test.

**What remains is exactly one thing this environment cannot do:** connect
two real LiveKit clients on two physical devices and confirm actual
two-way audio. Per the request's own §17, that gap alone keeps this at
NO-GO — "do not convert NO-GO into GO because the code compiles." §13
above is the exact sequence to run it; report back the actual result
(pass, partial, or specific failure) and this section will be updated to
GO or to document whatever the real test surfaces.

---

# Phase 2B — Reviews (Seller Reviews)

**Scope, exactly:** real seller reviews (rating + comment), a working
seller-profile page for real sellers (a real, pre-existing dead end this
slice fixes as a necessary dependency — see §1), aggregate ratings, and
the eligibility/privacy/security rules the mock UI never had. **Not in
scope:** professional/company reviews (`store/useJobsStore.ts`'s
separately-shaped review concept, used by `app/services/professional/[id].tsx`
and `app/jobs/company/[id].tsx`) — those target Jobs/Services entities
that don't have a real backend yet; building a `Company`/`Professional`
model early just to attach reviews to it would invent structure ahead of
the domains that actually own it. They get real review support as part
of the Jobs and Services slices themselves.

## 1. Audit

`app/seller/[id].tsx` existed already (built for a general "seller
profile" concept, not seeded with any mock data — `mock/users.ts`'s
`sellers` registry is deliberately empty). `useSeller(id)`/`useSellerReviews(id)`
in `store/useAppStore.ts` are 100% local; `Review.rating`'s aggregate on
the seller card is computed client-side from the local `reviews` array,
not stored separately — replicated server-side the same way (§3).

**A real, pre-existing gap found by this audit:** `app/detail/[id].tsx`
already navigates to `/seller/${seller.id}` for both mock and real
listings. For a real listing, `seller.id` is a real Frappe User docname
— but nothing ever built a way to fetch that user's public profile, so
tapping "seller" on any real listing has always landed on "البائع مش
موجود" (seller not found). This was a real dead end since Phase 2B Slice
1, only surfaced now because Reviews needs a working profile page to
attach to. Fixed as part of this slice (`get_seller_profile`, §3).

**Eligibility rule — the existing mock has none at all** (`addReview`
just pushes a row unconditionally; any authenticated user can rate any
seller, unlimited times). Too permissive for a real backend per this
slice's own instruction. **Chosen rule, documented in `reviews.py`'s own
module docstring:** the reviewer must have at least one real `Souq Masr
Conversation` with that seller (either direction) — i.e. they've
actually messaged them about a real listing. This mirrors the exact
precedent already set by phone-number visibility (Slice 4's
`_phone_visible_to_viewer`): "a real conversation exists" is this
codebase's established bar for "these two users have a real
relationship." A stronger "verified completed purchase" gate would be
more precise but needs the Sale Confirmation Flow migrated to real
listings first (still mock-only) — noted as a natural future tightening,
not built here to avoid unrelated scope creep.

## 2. Backend DocTypes

| DocType | Autoname | Fields | Permissions |
|---|---|---|---|
| `Souq Masr Review` | `hash` | `seller` (Link User, reqd), `rating` (Int, reqd, 1-5), `comment` (Small Text) | Admin full; `All`: `create=1`; `All`+`if_owner`: `read=1,write=1,delete=1` — **deliberately no blanket `All: read=1`** |

**Why no blanket read, even though reviews are meant to be public:**
Frappe `User` docnames in this app are phone-derived (e.g.
`201066660001@phone.souqmasr.local`). `Souq Masr Review`'s standard
`owner` field holds the reviewer's docname — if the DocType granted
generic REST read access, anyone could read every review's raw `owner`
value via `/api/resource/Souq Masr Review` and recover reviewers' phone
numbers, a real privacy leak with zero legitimate use. All public
reading instead goes through this file's own whitelisted methods, whose
serialization deliberately never includes the raw `owner`/`reviewer`
field — only a display name (§4).

`Souq Masr Review.validate()` re-checks rating range and self-review
server-side (defense in depth, matching `Souq Masr Listing`'s own
`validate()` pattern) and blocks a genuine duplicate `(owner, seller)`
pair — the primary duplicate-prevention mechanism is `submit_review`'s
own find-existing-and-update logic (§3), this is the second line of
defense for the unlikely race condition, same pattern as Favorites.

## 3. API endpoints

**`souq_masr/api/v1/reviews.py`** (new):
- `submit_review(seller_id, rating, comment=None)` — **upsert**: a
  second submission from the same reviewer updates their existing row
  instead of creating a duplicate (this is also the mobile app's de
  facto "edit my review," since the mock UI never had a separate edit
  flow — resubmitting the rating sheet naturally becomes an edit).
  Validates: signed in, seller is a real `User`, not reviewing yourself,
  rating in 1-5, and the eligibility rule from §1.
- `get_seller_reviews(seller_id, page, limit)` — `allow_guest=True`,
  paginated, newest-first. Each row: display name (`reviewer_name`,
  first name only), rating, comment, timestamp, and `is_mine` (computed
  server-side by comparing to the current session — lets the mobile
  client know "this is your review" **without ever transmitting the
  raw reviewer id to any client**, verified live in §6).
- `get_seller_rating_summary(seller_id)` — `allow_guest=True`, one
  SQL aggregate query (`avg`/`count`), not a full-table fetch into
  Python (avoids the N+1/full-scan pattern this slice's own instructions
  warn against).
- `has_reviewed(seller_id)` — auth; lets the mobile app prefill the
  rating sheet with the user's existing rating/comment before they
  resubmit (same `has_reported`/`is_favorite` precedent pattern already
  used elsewhere in this codebase).
- `delete_review(seller_id)` — auth; deletes only the caller's own
  review of that seller (no generic "delete any review by id" surface —
  the `(owner, seller)` relationship is already unique, so there's
  nothing else to scope it by).

**`souq_masr/api/v1/sellers.py`** (new): `get_seller_profile(seller_id)`
— `allow_guest=True`; name, member-since, active ads count, rating
summary, and a phone field gated by a profile-page-appropriate variant
of the same phone-privacy rule (any real conversation with this seller,
not scoped to one specific listing since a profile isn't listing-scoped).

**`souq_masr/api/v1/listings.py`** (extended): `get_seller_listings(seller_id, page, limit, sort)`
— `allow_guest=True`, reuses the exact same `_serialize_summary`/
`_paginate`/`_favorited_ids_for_current_user`/`_sort_order_by` helpers as
every other public listing endpoint; `status="Active"` only, same as
`get_public_listings` (no Draft/Paused/Sold/Rejected leaking through a
seller's public profile).

## 4. Live HTTP test results

Buyer/seller/stranger, real listing/conversation, real signin tokens —
14 groups, all passed:

```
=== 1. Guest cannot submit a review === status=403
=== 2. Stranger with NO conversation is rejected (eligibility rule) === status=403
=== 3. Seller cannot review themself === status=417
=== 4. Buyer starts a real conversation, THEN can review === review created (is_mine: True)
=== 5. Invalid rating (0, 6) rejected === both rejected correctly
=== 6. Submitting again from the SAME buyer UPDATES, not duplicates === same review id, rating updated 4→5
=== 7. Invalid seller_id -> 404 === status=404
=== 8. Public review list (Guest) — reviewer identity NOT leaked === reviewer_name present, raw reviewer/owner field absent, is_mine=false for Guest
=== 9. Rating summary aggregate === {'average': 5.0, 'count': 1}
=== 10. has_reviewed — true for buyer, false for stranger === correct for both
=== 11. Seller profile endpoint — phone privacy enforced === guest: phone=None; stranger (no chat): phone=None; buyer (real chat): phone visible
=== 12. Seller's own listings, public === total=1
=== 13. Delete review — only the reviewer can remove their own === stranger delete = no-op (nothing to delete); buyer delete = removed; aggregate count back to 0
=== 14. Traceback leakage check — malformed input === no "Traceback"/filesystem path in the response body

REVIEWS TESTS PASSED
```

## 5. Security/ownership test results

Covered directly in §4's groups 1-3, 7, 13-14: Guest rejected on every
mutation; a real third user (with no conversation) rejected specifically
by the eligibility rule, not just generic auth; self-review blocked;
invalid seller id → clean 404 (no traceback); `delete_review` scoped to
the caller's own row only, verified both the no-op (nothing to delete)
and the actual-delete case; malformed input (`rating: "not-a-number"`)
produces a clean validation error, never a Python traceback or
filesystem path in the response body.

## 6. Mobile changes

- `services/reviewService.ts` (new) — `submitReview`, `getSellerReviews`,
  `getSellerRatingSummary`, `hasReviewed`, `deleteReview`,
  `isRealSellerId()` (`id !== 'me'` — sufficient because
  `mock/users.ts`'s `sellers` registry is always empty; there has never
  been any other mock seller id).
- `services/sellerService.ts` (new) — `getSellerProfile`.
- `services/listingService.ts` (extended) — `getSellerListings`.
- `app/seller/[id].tsx` — **split into `RealSellerProfileScreen`
  (isRealSellerId) and `MockSellerProfileScreen`** (unchanged, byte-for-byte
  the prior implementation) rather than interleaving branches through one
  component, mirroring `app/chat/[id].tsx`'s and `app/detail/[id].tsx`'s
  established real/mock separation pattern. The real screen: profile +
  listings + reviews fetched together via `combineApiResultsTuple`
  (one `ApiStateView` for the whole page), prefills the rating sheet from
  `has_reviewed` when the user already reviewed this seller (their
  existing rating/comment, making "قيّم البائع" become "عدّل تقييمك"),
  and adds a "حذف تقييمي" action on the user's own review row (a real
  server capability the original mock UI never exposed a way to trigger).
  "راسل البائع" now starts a real conversation via the seller's first
  active listing.

**Verification:** `tsc --noEmit` clean, `expo export --platform ios`
clean (bundle built successfully).

## 7. What's still mock / out of scope this slice

- Professional/company reviews (`store/useJobsStore.ts`) — untouched,
  deferred to the Jobs/Services slices per §0 above.
- `responseRate` (shown on the mock seller card) has no real-backend
  equivalent yet — the real profile card shows ads count + rating only,
  honestly, rather than a fabricated response-rate number.
- No admin moderation of reviews (matches the same explicit
  out-of-scope decision already made for Listing Reports in Slice 3).

## 8. Blockers

None.

## 9. Decision

# ✅ GO — for Seller Reviews specifically

Backend: 1 new DocType (permission-shape chosen specifically to prevent
a phone-number leak via generic REST, not just copy-pasted from
Favorites), 6 new/extended endpoints across 2 new files + 1 extended
file, all live-tested including the eligibility rule, upsert/dedup
behavior, aggregate correctness, privacy (reviewer identity never
exposed raw, phone gated the same way as everywhere else in this app),
and traceback-leakage checks. One real pre-existing gap fixed as a
necessary dependency (`get_seller_profile` — real sellers had no
profile page at all before this).

Mobile: `app/seller/[id].tsx` now works for real sellers for the first
time; mock sellers untouched byte-for-byte. `tsc`/`expo export` both
clean.

**No Jobs/Services/Notifications/Payments code touched.** No regression
to any prior GO slice.

---

# Phase 2B — Jobs

**Scope, exactly:** real Companies, Job postings, Applications (with
private CV handling), Interviews, Saved Jobs, and a deliberately-scoped
Career Profile — backend complete and live-tested end-to-end; mobile
migrated for the core "set up a company → post a job → discover it →
apply → employer manages applicants/interviews" loop. **Explicitly
deferred, disclosed, not built this slice:** the deep CV-builder
sub-entities, Job Alerts, and Company reviews — see §1 and §9.

## 1. Audit and scope decisions (read before anything else in this section)

Read `mock/jobs/types.ts` (321 lines — the full Jobs+Services domain
model), `mock/jobs/data.ts`, `store/useJobsStore.ts` (363 lines, every
action), and all 11 `app/jobs/*` screens (~2,200 lines combined) before
writing any backend code.

**Three deliberate, documented scope reductions**, all following the
same principle the base instructions modeled on ProductVariant/SKU
("don't invent a second product model, document the dependency"):

1. **Career Profile ships as scalar fields + one resume file, not the
   full CV builder.** The mock `CareerProfile` type has 8 separate array
   sub-entities (education, experience, skills, languages,
   certifications, courses, projects, portfolio) plus a dual
   uploaded/generated resume system. Normalizing all of that into child
   DocTypes with full CRUD APIs is comparable in size to the entire
   Listings domain on its own. What ships: `full_name`, `phone`,
   `email`, `current_job_title`, `desired_job_title`, `years_experience`,
   `career_level`, `expected_salary_min/max`, `preferred_work_types`, one
   real uploaded resume file, and the visibility toggles. This is
   sufficient for the actual product loop this slice targets — an
   employer reviewing a real application — since employers never browse
   arbitrary career profiles anyway (see §5's privacy design).
   `app/jobs/profile.tsx` (691 lines, the CV builder UI),
   `app/jobs/resume-builder.tsx`, and `app/jobs/resume-view/[id].tsx`
   remain fully mock, untouched.
2. **Job categories/professions stay client-side constants, not a
   server taxonomy.** `mock/jobs/categories.ts`/`trades.ts` are
   deliberately a separate, flat list from the marketplace's
   hierarchical `Souq Masr Category` tree (the mock file's own comment:
   "قسمين منفصلين تمامًا... مش نفس التصنيفات"). `category_key`/
   `profession_key` are validated for presence only, matching how the
   mobile UI already treats them (a fixed local picker, not a
   server-driven tree). **Locations DO reuse the real marketplace
   taxonomy** (`Souq Masr Location`) — that part of the domain genuinely
   is shared.
3. **Job Alerts and Company/Professional reviews deferred.** Job Alerts
   (`app/jobs/alerts.tsx`) is a saved-search variant specific to Jobs,
   separable follow-up work. Company reviews were originally slated as
   part of this slice per the Reviews section's own note, but given the
   realistic scope of everything else in this slice, they're deferred
   alongside Professional/Service reviews to when Services is built —
   `souq_masr.api.v1.content_reports`' shared report DocType already has
   `Souq Masr Professional Profile`/`Souq Masr Service` in its target
   enum ready for that follow-up, so this isn't a surprise addition
   later.

## 2. Backend DocTypes

| DocType | Autoname | Shape | Permissions |
|---|---|---|---|
| `Souq Masr Company` | `format:COMP-{#####}` | name/description/industry/size/city/website/phone/email/working_hours/logo/cover/verification | Admin full; `All`: create=1; `All`+if_owner: read/write/delete=1 — **no blanket read**, public reads go through `get_company` only |
| `Souq Masr Job` | `format:JOB-{#####}` | company (Link) + full posting fields, `*_json` Long Text for responsibilities/requirements/skills/benefits | Admin full; `All`: create=1; `All`+if_owner: read/write/delete=1; **`Guest`: read=1** (same public-marketplace shape as `Souq Masr Listing`) |
| `Souq Masr Job Application` | `format:APP-{#####}` | job (Link) + full_name/phone/email/resume_file (private)/cover_letter/status | Admin full; `All`: create=1 **only** — two-participant (candidate+employer), same pattern as Chat/Calls |
| `Souq Masr Job Interview` | `hash` | application/job (Links) + date/time/location/mode/notes/status | Admin full; `All`: create=1 only — same two-participant pattern |
| `Souq Masr Saved Job` | `hash` | job (Link) | Admin full; `All`: create=1; `All`+if_owner: read/delete=1 — exact `Souq Masr Listing Favorite` shape |
| `Souq Masr Career Profile` | `hash` | scalar fields (§1) + resume_file (private) | Admin full; `All`: create=1; `All`+if_owner: read/write/delete=1 — **no read for anyone but the owner, not even employers** (see §5) |
| `Souq Masr Content Report` | `hash` | target_doctype (Select) + target_name (Dynamic Link) + reason/description/status | Admin full; `All`: create=1 only — same shape as `Souq Masr Listing Report`, shared across Job/Company now and Service/Professional Profile later instead of 4 near-duplicate DocTypes |

`Souq Masr Company`/`Souq Masr Career Profile` both enforce **one row
per owner** via upsert (find-existing-and-update instead of insert) in
their API layer, with a `validate()` safety check as the second line of
defense — same pattern as `Souq Masr Review`.

## 3. API endpoints

7 new files under `souq_masr/api/v1/`:

- **`companies.py`** — `create_or_update_my_company` (upsert),
  `get_my_company`, `get_company` (public).
- **`jobs.py`** — `create_job`, `update_job`, `pause_job`/`activate_job`/
  `close_job` (status-transition-gated, mirrors `listings.py`'s
  `_transition_status`), `delete_job` (force=1, same link-integrity fix
  as Slice 3's `delete_listing`, applied proactively here since Saved
  Job/Application/Interview rows will reference a job), `get_job`
  (`PUBLIC_STATUSES` gating, owner exempted), `get_my_jobs`,
  `search_jobs` (q/category/work_type/career_level/city/remote/
  salary_min), `get_jobs_by_company`, `increment_job_views`.
- **`job_applications.py`** — `apply_to_job` (idempotent — reapplying
  returns the same application, not a duplicate), `has_applied`,
  `get_my_applications`, `withdraw_application` (candidate-only),
  `get_applications_for_job` (employer-only), `set_application_status`
  (employer-only), `get_application_resume` (§5).
- **`job_interviews.py`** — `schedule_interview` (employer-only, upsert
  per application, auto-advances the application's status to
  `interview`), `get_interview_for_application`, `get_my_interviews`.
- **`saved_jobs.py`** — exact `favorites.py` shape:
  `save_job`/`unsave_job`/`is_job_saved`/`get_my_saved_jobs`.
- **`career_profile.py`** — `get_my_career_profile`,
  `update_my_career_profile` (upsert), `get_my_resume` (§5).
- **`content_reports.py`** — `report_content`/`has_reported_content`,
  generic across the `target_doctype` enum.

**A real framework quirk found and fixed while testing:** a whitelisted
method that returns Python `None` produces an HTTP response body of `{}`
— **no `"message"` key at all**, not `{"message": null}` as might be
assumed. `get_my_company`, `get_my_career_profile`, and
`get_interview_for_application` all needed their "nothing found" case
wrapped in an explicit dict (`{"company": None}` etc., matching the
`{"call": None}` pattern already established in `calls.py`'s
`get_active_call_for_conversation`) — caught by a live test's `KeyError:
'message'`, fixed, redeployed, reverified.

## 4. Deployment

All 7 DocTypes + 7 API files deployed via the established ssh/cat
pipeline, `bench migrate` (clean, `tabSouq Masr Job`/`Company`/
`Job Application`/`Job Interview`/`Saved Job`/`Career Profile`/
`Content Report` all confirmed via `SHOW TABLES`), web worker restarted.

## 5. CV privacy — the load-bearing security requirement for this slice

Resumes are uploaded with **`is_private=1`** (a new capability added to
`lib/apiClient.ts`'s `frappeUploadFile`, which previously only ever
uploaded public listing images — now takes an `{ isPrivate }` option,
default `false`, so every existing caller's behavior is unchanged).

**Two independent layers, both live-tested:**
1. The raw private file URL (`/private/files/...`) is **not fetchable
   with zero auth at all** — Frappe's own file serving already blocks
   that, confirmed live (a request with no Authorization header at all
   got a clean 403, not the file).
2. Even for an *authenticated* non-participant, the file must never be
   reachable — and Frappe's own private-file permission model is
   **owner-only**, with no concept of "the employer of the job this
   application is for." Relying on it would have let candidates read
   each other's résumés' URLs if they ever leaked, but would have
   wrongly blocked the actual employer too. So `get_application_resume`
   bypasses Frappe's URL-based file serving entirely: it does its own
   explicit candidate-or-employer check (same pattern as every
   Chat/Calls endpoint), reads the file from disk, and returns the
   content **base64-encoded directly in the JSON response** — the
   client never sees a fetchable URL for a private resume at all.

**Live-tested, 8 groups, all passed:** private upload confirmed
(`file_url` starts with `/private/`), raw URL blocked with zero auth
(403), candidate can download via the controlled endpoint (byte-for-byte
match against the uploaded content), employer of that job can also
download it, a **stranger is rejected with 403** (the core test), a
**Guest is rejected** too. One real bug found mid-test: `get_file`
returns a Python `str` (not `bytes`) for files that happen to decode as
valid UTF-8 text — `base64.b64encode` requires bytes, so a `TypeError`
surfaced on a `.txt` test file; fixed by encoding back to UTF-8 bytes
when `get_file` returns a string, applied to both
`get_application_resume` and `get_my_resume`.

**Career Profile privacy is even simpler:** its DocType permissions
grant read to the owner only, full stop — not even `if_owner`-adjacent
logic for employers. An employer never sees a candidate's full Career
Profile; they only ever see what that candidate explicitly submitted
with a specific application (the Application's own `full_name`/`phone`/
`email`/`cover_letter`/resume snapshot). There is no code path anywhere
that exposes a Career Profile to a non-owner — verified live (a
different user's `get_my_career_profile` correctly returns their own
`None`/absence, never someone else's data).

## 6. Live HTTP test results (`test_jobs.py`, 24 groups)

Employer/Candidate/Stranger, real signin tokens, all passed:

```
1. Guest cannot create a company -> 403
2. Employer creates a company (upsert) -> same id on re-save
3. Public (Guest) reads the company profile -> raw owner id NOT exposed
4. Candidate (no company) cannot post a job under employer's company -> 403
5. Employer posts a real job -> responsibilities/requirements/skills/benefits round-trip correctly as real arrays
6. Guest can view the published job
7. Non-owner cannot edit/pause/delete -> 403 on all three
8. Candidate applies -> is_mine=true
9. Employer cannot apply to their own job -> rejected
10. Re-applying returns the SAME application (idempotent)
11. Job's applications_count incremented correctly
12. Stranger CANNOT read the applicants list for a job they don't own -> 403
13. Employer CAN read applicants for their own job -> full contact info visible
14. Stranger CANNOT set application status -> 403
15. Employer sets application status -> shortlisted
16. Employer schedules an interview -> application status auto-advances to "interview"
17. Stranger cannot see the interview (403); candidate can see their own
18. Save/is-saved/unsave job cycle correct
19. Career profile upsert + strict per-owner privacy (a different user's fetch returns none)
20. Withdraw application -> candidate-only, stranger rejected
21. Job pause/activate lifecycle + a paused job is NOT publicly visible (same PUBLIC_STATUSES gating as Listings)
22. Search jobs with q/work_type/salary_min filters
23. Invalid job id -> clean 404, no traceback/filesystem-path leakage
24. Content report — shared Job/Company system scoped correctly per reporting user

JOBS TESTS PASSED
```

Plus the separate 8-group CV privacy suite in §5.

## 7. Security/ownership test results

Covered directly above: Guest rejected on every mutation and every
private read; non-owner rejected on edit/pause/delete/status-change/
interview-scheduling/applicant-list-read, each verified against a real
third user, not just reasoned about; CV access restricted to
candidate-or-employer with a real stranger-gets-403 test; Career Profile
never exposed to anyone but its owner; malformed/invalid input produces
clean validation errors or 404s, never a Python traceback or filesystem
path in the response body (checked explicitly in the test).

## 8. Mobile changes

- **New services** (7): `services/companyService.ts`,
  `services/jobService.ts`, `services/jobApplicationService.ts`,
  `services/jobInterviewService.ts`, `services/savedJobService.ts`,
  `services/careerProfileService.ts`, `services/contentReportService.ts`
  — same adapter/`ApiResult` pattern as every prior slice.
- **`hooks/useMyCompany.ts`** (new) — "my company" resolved as: an
  existing local mock company (legacy, kept working unchanged) **or**
  the real backend one — avoids duplicating this fallback logic across
  every screen that needs to know "does this user have a company yet."
- **`app/jobs/my-company.tsx`** — a pre-existing local company keeps
  editing locally, byte-for-byte; a new company (or no existing company
  at all) now saves to the real backend, including a real logo upload.
- **`app/jobs/post.tsx`** — real create for a real company; real edit
  when `editId` is a real `JOB-#####` id (fetched and hydrated into the
  same multi-step form); mock create/edit preserved unchanged for a
  legacy local company. Fixed a naming collision caught before deploy:
  the real `updateJob` import and the mock store's own `updateJob`
  action needed distinct names (`updateJobMock`) once both existed in
  the same file — the mock branch was accidentally about to call the
  real async service with a mock-shaped object.
- **`app/jobs/[id].tsx`** and **`app/jobs/apply/[id].tsx`** — split into
  `Real*`/`Mock*` components exactly like every prior real/mock screen
  split in this project (`app/seller/[id].tsx`, `app/chat/[id].tsx`).
  Real apply flow uploads an actual resume file
  (`expo-document-picker`, already a dependency) with `isPrivate: true`
  instead of offering the mock's "generated resume" option (tied to the
  deferred CV builder).
- `isRealCompanyId`/`isRealJobId`/`isRealApplicationId` — same autoname-prefix-regex
  pattern as every other domain (`LST-`, `CONV-`, `CALL-`, `COMP-`,
  `JOB-`, `APP-`).

**Verification:** `tsc --noEmit` clean, `expo export --platform ios`
clean.

## 9. What's still mock / explicitly out of scope this slice

- **Deep CV builder** (`app/jobs/profile.tsx`,
  `resume-builder.tsx`, `resume-view/[id].tsx`) — fully mock, per §1's
  documented scope decision.
- **`app/jobs/my-jobs.tsx`, `applicants.tsx`, `applications.tsx`,
  `saved.tsx`, `company/[id].tsx`, `index.tsx`, `results.tsx`** — **not
  yet migrated to the real backend.** The backend they'd need
  (`get_my_jobs`, `get_applications_for_job`, `set_application_status`,
  `schedule_interview`, `get_my_applications`, `get_my_saved_jobs`,
  `get_company`, `get_jobs_by_company`, `search_jobs`) is **built and
  live-tested** (§6) — this is a mobile-wiring gap, not a backend gap.
  Disclosed explicitly per "migrate incrementally... remove only the
  mocks that now have real backend equivalents" — these screens'
  underlying mock data continues to work exactly as before for mock
  jobs/companies, and are the natural next step for a following pass.
- **Job Alerts** (`app/jobs/alerts.tsx`) — fully mock, deferred (§1).
- **Company/Professional reviews** — deferred to Services (§1);
  `content_reports.py` already has the target-doctype enum ready for it.
- Company logo upload on `my-company.tsx` uses the existing public
  (`is_private=0`) upload path, same as listing images — a company logo
  is meant to be public, this is intentional, not an oversight.

## 10. Blockers

None for the scope actually claimed.

## 11. Decision

# ✅ GO — for the Jobs backend (Companies/Jobs/Applications/Interviews/Saved Jobs/Career Profile core) and the migrated mobile core loop (company setup → post/edit a job → view it → apply with a real CV)
# ⏳ Mobile management/discovery screens (my-jobs, applicants, applications, saved, company profile, home, search) remain mock — backend ready, wiring pending, explicitly disclosed in §9

Every mutation tested against Guest, authenticated owner, authenticated
non-owner, invalid ids, and (for CV access specifically) a real
unauthorized stranger — all live HTTP, all passed, including the two
real bugs this slice's own testing surfaced (the `None`-return response
shape, the `str`-vs-`bytes` resume encoding) and fixed before declaring
GO. No Services/Notifications/Payments code touched. No regression to
any prior GO slice.

---

# Phase 2B — Services

**Scope, exactly:** real Professional Profiles and Service listings —
create/edit/pause/activate/delete, public discovery/search, ownership.
**Explicitly deferred, disclosed:** real Favorites for services (the
existing shared local mechanism continues, unchanged), Professional/
Service reviews (as already flagged in both the Reviews and Jobs
sections), and real chat integration for contacting a provider (§1
explains why).

## 1. Audit and scope decisions

Read all 7 `app/services/*` screens (~1,100 lines). Services is a much
smaller domain than Jobs — no applications, no CV, no interviews, just a
provider profile plus service listings, structurally closer to Listings
itself.

**Chat integration deliberately NOT connected this slice.**
`app/services/[id].tsx` never had a "message provider" button to begin
with (only `tel:`/`wa.me` links) — so there's nothing regressed. But
extending real chat *to* Services was considered and explicitly
rejected for this pass: `Souq Masr Conversation.listing` is a `Link` to
`Souq Masr Listing` specifically, not a generic reference. Broadening it
to a `Dynamic Link` across Listings and Services would be a schema
change to an already-shipped, live-tested DocType from Slice 4 —
disproportionate risk for a button that doesn't currently exist in the
mock UI either. Native dialer / WhatsApp deep links remain the only
contact method, matching the existing mock behavior exactly.

**Favorites intentionally NOT migrated.** Services already share
`store/useAppStore.ts`'s generic local `favorites` Record (disclosed
back in Slice 3), keyed by an arbitrary string id. A real `SRV-#####` id
does not match `isRealListingId`'s pattern, so it safely falls through
to the local-only branch with zero risk of cross-wiring into the real
Listing-favorites API — verified by reading `toggleFavorite`'s actual
branch condition before relying on this. Building a normalized `Souq
Masr Service Favorite` table is a small, well-understood follow-up (the
exact `Souq Masr Listing Favorite`/`Souq Masr Saved Job` shape), not
built here to keep this slice bounded.

**Reviews deferred again**, honestly correcting an earlier note: the
Reviews section originally said professional/company reviews would ship
"as part of the Jobs and Services slices themselves." Given the
realistic scope of everything else in both slices, they were deferred in
Jobs and are deferred again here. `content_reports.py`'s shared system
already has `Souq Masr Service`/`Souq Masr Professional Profile` in its
target enum specifically for this — reporting works today (§4), rating
does not yet.

## 2. Backend DocTypes

| DocType | Autoname | Shape | Permissions |
|---|---|---|---|
| `Souq Masr Professional Profile` | `hash` | name/trade_key/photo/description/years_experience/skills_json/service_areas_json/price_starting_from/availability/working_hours/phone/whatsapp/verification | Admin full; `All`: create=1; `All`+if_owner: read/write/delete=1 — no blanket read, public reads through `get_professional_profile`/`get_professional_profile_by_owner` only |
| `Souq Masr Service` | `format:SRV-{#####}` | category_key/trade_key/title/description/price/price_type/service_areas_json/duration/image_urls_json/availability/status/offer_price/offer_ends_at | Admin full; `All`: create=1; `All`+if_owner: read/write/delete=1; `Guest`: read=1 (public, same shape as `Souq Masr Listing`/`Souq Masr Job`) |

One profile per owner (upsert), same pattern as `Souq Masr Company`/
`Souq Masr Career Profile`/`Souq Masr Review`. **No `professional` Link
field on `Souq Masr Service`** — unlike `Souq Masr Job` (which needs an
explicit `company` Link because a company could in principle have
co-owners), a Professional Profile is inherently 1:1 with its owner, so
`owner` alone resolves "whose service is this" without an extra field.

**Images as a JSON array, not a child DocType** — a deliberate, disclosed
deviation from `Souq Masr Listing`'s own choice: Listing Image is a real
child table because each row has more than a bare URL conceptually
(ordering via `idx`); a flat ordered list of public image URLs gains
nothing from a separate table (array order already *is* display order).
Applied consistently with the same `*_json` exception already used for
`Souq Masr Job`'s responsibilities/requirements/skills/benefits fields.

`Souq Masr Service.validate()` rejects an `offer_price >= price` —
caught live in testing (§3).

## 3. API endpoints

- **`professional_profiles.py`** — `create_or_update_my_profile`
  (upsert, full-replace semantics matching `companies.py`'s own
  pattern — the mobile screen always submits the complete form),
  `get_my_profile`, `get_professional_profile`,
  `get_professional_profile_by_owner` (the mobile entry point, since
  `app/services/professional/[id].tsx` navigates by Frappe User id, not
  by the profile's own internal docname).
- **`services.py`** — `create_service` (requires an existing
  professional profile, live-tested), `update_service`,
  `pause_service`/`activate_service` (status-transition-gated),
  `delete_service` (force=1), `get_service` (`PUBLIC_STATUSES` gating),
  `get_my_services`, `search_services` (q/category_key/price_type),
  `get_services_by_professional`.

Phone on a Professional Profile is **not** privacy-gated the way a
Listing's/Career Profile's is — a professional profile is a public "hire
me" business card by design (same as `Souq Masr Company`), matching the
pre-existing mock UI which already showed `provider.phone`
unconditionally to any viewer.

## 4. Live HTTP test results (`test_services.py`, 15 groups)

Professional/Customer/Stranger, real signin tokens, all passed:

```
1. Guest cannot post a service -> 403
2. Cannot create a service without a professional profile first -> rejected
3. Create professional profile (upsert) -> same id on re-save
4. Public (Guest) can view the profile; get_professional_profile_by_owner matches
5. Service creation now works once a profile exists
6. Guest can view the active service
7. Non-owner cannot edit/pause/delete -> 403 on all three
8. Owner pauses -> not publicly visible -> reactivates (same PUBLIC_STATUSES gating as Listings/Jobs)
9. offer_price >= price is rejected; a valid lower offer_price is accepted
10. Search services by q + category_key
11. Services by professional (public)
12. get_my_services correctly scoped — a different user sees none of PRO's services
13. get_my_profile privacy — a stranger's fetch returns their own (none), never PRO's
14. Invalid ids -> clean 404s, no traceback/filesystem-path leakage
15. Shared content-report system (built for Jobs) also correctly covers Souq Masr Service

SERVICES TESTS PASSED
```

## 5. Security/ownership test results

Guest rejected on every mutation (§4.1); non-owner rejected on
edit/pause/delete against a real second user (§4.7); a service cannot be
created without first proving a professional profile exists (§4.2);
`get_my_services`/`get_my_profile` verified scoped strictly per-user
against a real third user, not just reasoned about (§4.12-13); invalid
input (`offer_price >= price`) produces a clean validation error, never a
traceback (§4.9, §4.14).

## 6. Mobile changes

- `services/professionalProfileService.ts`, `services/serviceListingService.ts`
  (new) — same adapter/`ApiResult` pattern as every prior slice. (Note:
  the file is named `serviceListingService.ts`, not `serviceService.ts`,
  to avoid confusion with the `services/` directory itself as a Product
  concept.)
- `hooks/useMyProfessionalProfile.ts` (new) — same "mock first, else
  real" resolution as `hooks/useMyCompany.ts`.
- `app/services/profile.tsx`, `post.tsx`, `[id].tsx`,
  `professional/[id].tsx` — migrated with the same real/mock split
  pattern as every prior slice. A pre-existing local professional
  profile keeps editing locally, byte-for-byte; a new profile (or none
  at all) now saves to the real backend, including a real photo upload.
  The real professional-profile page shows real services but an honestly
  **empty** reviews section with the rating action hidden — no mock
  review data is attached to a real profile it doesn't actually belong
  to.

**Verification:** `tsc --noEmit` clean, `expo export --platform ios`
clean.

## 7. What's still mock / explicitly out of scope this slice

- `app/services/my-services.tsx`, `app/services/index.tsx`,
  `app/services/results.tsx` — **not yet migrated**, same disclosed
  pattern as the equivalent Jobs screens. Backend
  (`get_my_services`/`search_services`) is built and live-tested.
- Real Favorites for services (§1) — deferred, small well-understood
  follow-up.
- Professional/Service reviews (§1) — deferred; reporting works today,
  rating does not.
- Real chat integration for contacting a provider (§1) — deferred;
  native dialer/WhatsApp links remain the only contact method, matching
  the pre-existing mock UI exactly (nothing regressed).

## 8. Blockers

None for the scope actually claimed.

## 9. Decision

# ✅ GO — for the Services backend (Professional Profiles/Service listings) and the migrated mobile core loop (profile setup → post/edit a service → view it → view a provider's public profile)
# ⏳ Mobile discovery/management screens (my-services, home, search) remain mock — backend ready, wiring pending, explicitly disclosed in §7

Every mutation tested against Guest, authenticated owner, and
authenticated non-owner, plus the "no profile yet" precondition check —
all live HTTP, all passed. No Notifications/Payments code touched. No
regression to any prior GO slice (Reviews/Jobs/Chat/Calls/Listings all
re-verified unaffected by inspection — no shared file was modified
except the already-audited `toggleFavorite` branch condition, which was
read, not changed).
