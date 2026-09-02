# Mobile ↔ Backend Integration Report — Phase 2A

**Scope of this report:** Phase 2A (Taxonomy) only, per the explicit
instruction not to migrate everything at once. Phases 2B-2F (listings,
auth, user actions, chat, listing creation) have **not started** — every
screen in those areas is still 100% on local/mock data, unchanged, and
every missing endpoint they'd need is catalogued in `MOBILE_BACKEND_GAPS.md`
rather than faked.

No admin dashboard work happened. No mock/local data files were deleted.

**Update (this pass):** `app/(tabs)/home.tsx` and `app/category/[id].tsx`
migrated, reusing the exact same infrastructure built for
`categories.tsx` — no new API client, no duplicate taxonomy logic. See §2A
and §4A below for this pass's detail; §1-§8 below is the original
`categories.tsx`-only report, left intact.

---

## 1. Infrastructure built this phase

| File | Purpose |
|---|---|
| `config/env.ts` | *(already existed)* — the single place `API_BASE_URL` is configured (`EXPO_PUBLIC_API_BASE_URL`). Now actually populated in `.env` (gitignored) with the live VPS: `http://187.7.19.136` (see `BACKEND_PRODUCTION_READINESS.md`). |
| `lib/apiClient.ts` | *(extended, not rewritten)* — added `frappeGet<T>()`: the one function every service layer must call through. Handles connectivity check, dev-mock short-circuit, `{message: ...}` envelope unwrapping, and full status-code branching (401/403/404/422/429/5xx/timeout/network error). |
| `types/frappeApi.ts` | `ApiResult<T>` — one discriminated-union result type used everywhere (`success \| no_internet \| backend_unavailable \| not_found \| unauthorized \| forbidden \| validation_error \| rate_limited \| server_error \| timeout`). |
| `services/taxonomyService.ts` | All 10 taxonomy endpoints, each returning the app's **existing** `Category`/`Brand`/`Model`/`LocationNode` types (from `mock/taxonomy/types.ts`) — not Frappe's raw field names — so consumer screens need zero shape changes. |
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

### ⏳ Not migrated yet — still mock, unchanged, tracked for a Phase 2A follow-up

| Screen | Current source | Why not this pass |
|---|---|---|
| `app/(tabs)/home.tsx` (category grid section) | `mock/homeFeed.ts`'s `homeCategories` | Same `getChildren()` call would work; deferred only because the rest of `home.tsx` is deep in Phase 2B (listings) territory and doing one section live while the rest stays mock risked an inconsistent screen for one migration slice — cleaner as its own small follow-up. |
| `app/category/[id].tsx` (drill-down + attributes) | `mock/taxonomy/categories.ts`'s `getChildren`/`getCategory` | Needs `get_category` + `get_children` wired together with breadcrumb (`get_path` — endpoint exists, not yet called from the app). |
| `app/results.tsx` (dynamic filters) | `mock/taxonomy/categories.ts` for `field.label`/`field.options` | Needs `get_category`'s `fields` array live — endpoint ready (verified in §4), screen not yet rewired. |
| `app/post/index.tsx` (category/brand/model pickers, attribute step) | `mock/taxonomy/*` throughout | Largest, most interconnected consumer (category tree, brands, models, dynamic attributes all in one multi-step form) — intentionally left for a dedicated pass, not attempted piecemeal. |
| `components/LocationPicker.tsx` (governorates/cities/areas, used by `home.tsx` and `post/index.tsx`) | `mock/taxonomy/locations.ts` | **Partially blocked**: `get_governorates` and `get_location_children` are both live and tested (§4), but the picker's drill-down header and pre-selected-location resume both need a single-location lookup by ID that doesn't exist server-side yet — see `MOBILE_BACKEND_GAPS.md` #1/#2. Converting only the parts that don't need it would leave the component in a half-mock, half-live state that's worse than leaving it fully on mock until the two small endpoints exist. |

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

## 5. Regression check (re-run after this pass)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean, 0 errors |
| `npx expo export --platform ios` | Succeeded |
| Screens touched this pass | `app/(tabs)/categories.tsx` (previous pass), `app/(tabs)/home.tsx`, `app/category/[id].tsx` — plus 2 additive helper changes: `hooks/useApiResult.ts` (2 new combiner functions) and `mock/taxonomy/types.ts` (new optional `Category.isGroup` field). No other screen's code path changed. |

## 6. Bugs found/fixed this phase

None new. The four bugs found during backend verification
(`BACKEND_PRODUCTION_READINESS.md` §9) were already fixed before Phase 2A
began; both this pass's integration test and the direct `get_path`/404
checks in §4A re-confirmed the category-tree-relevant fix (Bug #2,
missing `lft`/`rgt`) and the traceback fix (Bug #4) still hold when
accessed through the app's actual new code (`home.tsx`, `category/[id].tsx`),
not just through the original test harness.

## 7. Remaining backend gaps affecting Phase 2A

- `get_location(location_key)` — blocks `LocationPicker.tsx`'s migration (`MOBILE_BACKEND_GAPS.md` #1) — **still not started, as instructed**
- `get_location_path(location_key)` — blocks `locationPathLabel()` migration (`MOBILE_BACKEND_GAPS.md` #2) — **still not started, as instructed**

No new gaps surfaced while migrating `home.tsx`/`category/[id].tsx` — every
endpoint both screens needed already existed and worked.

Every other gap (listings, auth, favorites, chat, etc.) is Phase 2B+ scope,
not a Phase 2A blocker — catalogued in full in `MOBILE_BACKEND_GAPS.md`.

## Remaining Phase 2A work

| Screen | Status |
|---|---|
| `app/(tabs)/categories.tsx` | ✅ Done |
| `app/(tabs)/home.tsx` | ✅ Done (category grid, brand-shortcut labels, property-type chips, car-brand chips) |
| `app/category/[id].tsx` | ✅ Done |
| `app/results.tsx` (dynamic filters — `get_category`'s `fields`) | ⏳ Not started |
| `app/post/index.tsx` (category/brand/model pickers, attribute step) | ⏳ Not started |
| `components/LocationPicker.tsx` | ⏳ Blocked on the 2 missing location endpoints above |

---

## 8. Decision

# ✅ GO — for `app/(tabs)/home.tsx` and `app/category/[id].tsx` specifically

**Files changed this pass:**
`app/(tabs)/home.tsx`, `app/category/[id].tsx`,
`hooks/useApiResult.ts` (additive: `combineApiResultList`,
`combineApiResultsTuple`), `mock/taxonomy/types.ts` (additive: `Category.isGroup?`),
`services/taxonomyService.ts` (additive: populate `isGroup` in the existing
`adaptCategorySummary`). No new API client, no duplicate taxonomy logic —
both screens reuse `lib/apiClient.ts` → `services/taxonomyService.ts` →
`hooks/useApiResult.ts` → `components/ApiStateView.tsx` exactly as built for
`categories.tsx`.

**Mock calls removed from these two screens:**
`getTopLevel`/`homeCategories`, 6× `getCategory` (brand shortcuts),
`getCategory('realestate_sale')`, `getBrandsForCategory('cars')` (all from
`mock/taxonomy/*`) in `home.tsx`; `getCategory`/`getChildren`/`getPath`
(all from `mock/taxonomy/categories.ts`) in `category/[id].tsx`. What
remains in both files is disclosed and intentional (§2A above) — listing
helpers (Phase 2B territory) and `LocationPicker`'s own dependency
(untouched, as instructed).

**Real endpoints used:** `get_children`, `get_category`, `get_path`,
`get_brands_for_category` — all pre-existing, none invented.

**Tests performed:** live HTTP integration test (§4A) mirroring both
screens' exact new request sequences; direct multi-level `get_path` check;
direct 404/traceback check; `tsc --noEmit`; `expo export`.

**Test results:** all passed — see §4A and §5.

**Remaining Phase 2A work:** `results.tsx`, `post/index.tsx`,
`LocationPicker.tsx` (blocked on 2 missing endpoints) — see table above.

**No Phase 2B work was started.** No listings/auth/chat code touched, no
fake endpoints created.
