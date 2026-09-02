# Mobile ↔ Backend Integration Report — Phase 2A

**Scope of this report:** Phase 2A (Taxonomy) only, per the explicit
instruction not to migrate everything at once. Phases 2B-2F (listings,
auth, user actions, chat, listing creation) have **not started** — every
screen in those areas is still 100% on local/mock data, unchanged, and
every missing endpoint they'd need is catalogued in `MOBILE_BACKEND_GAPS.md`
rather than faked.

No admin dashboard work happened. No mock/local data files were deleted.

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

### ✅ Migrated to the real backend this phase

| Screen | Was | Now | Endpoint(s) used | Auth |
|---|---|---|---|---|
| `app/(tabs)/categories.tsx` | `getTopLevel()` from `mock/taxonomy/categories.ts` (sync) | `getChildren()` from `services/taxonomyService.ts` (async, live) | `get_children` | Guest |

That's the one screen fully switched over and **proven live** (see §4).
Everything else below is unchanged.

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

## 5. Regression check

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean, 0 errors |
| `npx expo export --platform ios` | Succeeded, bundle built (1824 modules) |
| Existing screens | No screen outside `app/(tabs)/categories.tsx` had any code path changed |

## 6. Bugs found/fixed this phase

None new — the four bugs found during backend verification
(`BACKEND_PRODUCTION_READINESS.md` §9) were already fixed before this
phase began; this phase's integration test re-confirmed all four fixes are
still correct when accessed through the app's actual adapter code (see the
`get_location_children` and `search_locations('فيصل')` checks in §4 above).

## 7. Remaining backend gaps affecting this phase specifically

- `get_location(location_key)` — blocks `LocationPicker.tsx`'s full migration (`MOBILE_BACKEND_GAPS.md` #1)
- `get_location_path(location_key)` — blocks `locationPathLabel()` migration (`MOBILE_BACKEND_GAPS.md` #2)

Every other gap (listings, auth, favorites, chat, etc.) is Phase 2B+ scope,
not a Phase 2A blocker — catalogued in full in `MOBILE_BACKEND_GAPS.md`.

---

## 8. Decision

# ⚠️ PARTIAL-GO — Phase 2A infrastructure is GO; screen migration is ~15% complete by design

**What's GO:** the API client/service layer, error-state handling, the
single-source environment config, and the pattern for migrating a screen
(`categories.tsx` is the working reference implementation) — all built,
type-checked, export-checked, and proven against the real live backend with
a real HTTP integration test, not assumptions.

**What's explicitly NOT claimed as done:** taxonomy is "linked to the real
backend" only for one screen so far. `home.tsx`'s category grid,
`category/[id].tsx`, `results.tsx`'s dynamic filters,
`post/index.tsx`'s category/brand/model pickers, and `LocationPicker.tsx`
are all still reading `mock/taxonomy/*` exactly as before — correctly
unbroken, but not yet "real." This is the deliberate, incremental pace the
phase instructions asked for (§15: "لا تعمل migration كاملة مرة واحدة"),
not a shortfall being hidden.

**Recommended next step:** continue Phase 2A by migrating
`home.tsx`'s category grid and `category/[id].tsx` next (same pattern,
already proven), then add the two small missing location endpoints
before tackling `LocationPicker.tsx` and `post/index.tsx`.
