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
