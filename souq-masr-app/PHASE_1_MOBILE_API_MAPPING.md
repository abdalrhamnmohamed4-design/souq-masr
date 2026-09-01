# Phase 1 — Mobile ↔ API Mapping

Every real taxonomy operation the mobile app performs today (via `mock/taxonomy/*.ts`'s
exported functions), mapped to its Frappe endpoint. Nothing here is speculative — each
row was checked directly against the actual call sites in `app/`, not inferred from the
mock functions' existence alone.

**Brand rename note:** all endpoint paths and DocType names below use the app's final
name, `souq_masr`/"Souq Masr" — renamed from `mazad` before any live installation ever
happened. There is no old-namespace compatibility layer because nothing ever called the
old one over real HTTP.

**Scope note:** this covers general marketplace taxonomy only (categories, brands,
models, locations) — the same scope as the Phase 1 DocTypes. Jobs/services taxonomy
(`mock/jobs/categories.ts`, `mock/jobs/trades.ts`, `mock/jobs/skills.ts`) is out of
scope until Phase 2+, matching the blueprint's module layout. This is a deliberate
scope boundary, not an oversight.

---

## 1. Category browsing

| Mobile call site | Mock function | Frappe endpoint | Params | Response fields consumed |
|---|---|---|---|---|
| `app/post/index.tsx` `CategoryStep`, `app/(tabs)/categories.tsx` | `getChildren(parentId)` | `GET /api/method/souq_masr.api.v1.taxonomy.get_children` | `parent` (omit for top-level) | `id`, `name_ar`, `icon`, `is_group` (mobile calls this "hasKids", derived as `children.length > 0` — see §7 mismatch) |
| `app/business.tsx` | `getTopLevel()` | same endpoint, `parent` omitted | — | same as above |
| `app/post/index.tsx`, `app/detail/[id].tsx`, `app/results.tsx` | `getPath(id)` | `GET .../taxonomy.get_path` | `category_key` | `id`, `name` — mobile only ever reads `.name`, never `.nameEn`/`.icon` from a path entry, confirmed by grep |
| `app/results.tsx` `.get_category(id)` equivalent, `app/post/index.tsx` `AttributesStep` | `getCategory(id)` | `GET .../taxonomy.get_category` | `category_key` | `id`, `name_ar`, `name_en`, `icon`, `has_brands`, `allowed_conditions`, `allowed_selling_types`, `fields[]` (each: `key`, `label`, `type`, `required`, `filterable`, `searchable`, `options`, `unit`) |
| `app/post/index.tsx` `CategoryStep` search box | (inline `.filter()` over `getChildren(null).flatMap(...)`, not a dedicated mock function) | `GET .../taxonomy.search_categories` | `q`, `limit` (default 30) | `id`, `name_ar`, `name_en`, `icon` |
| `app/(tabs)/home.tsx`, `app/(tabs)/categories.tsx`, `app/results.tsx` | `getAllDescendantIds(id)` | `GET .../taxonomy.get_descendant_ids` **(added during this audit — see §7)** | `category_key` | flat array of category key strings, includes the category itself |
| `app/post/index.tsx` `selectLeaf()` | `isLeaf(id)` equivalent | **not a separate call** — derive client-side from `get_children(parent=id)` returning an empty array | — | — |

## 2. Brands

| Mobile call site | Mock function | Frappe endpoint | Params | Response fields consumed |
|---|---|---|---|---|
| `app/post/index.tsx` `BrandStep` | `getBrandsForCategory(categoryId)` | `GET .../taxonomy.get_brands_for_category` | `category_key` | `id`, `name`, `logo` |
| `app/detail/[id].tsx`, `app/post/index.tsx` review step | `getBrand(id)` (single lookup) | **`GET /api/resource/Souq Masr Brand/{brand_key}`** — Frappe's standard REST resource endpoint, not a custom method. See §7. | — (path param) | `brand_key`, `brand_name`, `logo` |

## 3. Models

| Mobile call site | Mock function | Frappe endpoint | Params | Response fields consumed |
|---|---|---|---|---|
| `app/post/index.tsx` `BrandStep` | `getModelsForBrand(brandId)` | `GET .../taxonomy.get_models_for_brand` | `brand_key` | `id`, `name` |
| `app/detail/[id].tsx` | `getModel(id)` (single lookup) | **`GET /api/resource/Souq Masr Model/{name}`** — standard REST resource endpoint. See §7. | — (path param) | `model_name` |

## 4. Locations

| Mobile call site | Mock function | Frappe endpoint | Params | Response fields consumed |
|---|---|---|---|---|
| `components/LocationPicker.tsx` | `getGovernorates()` | `GET .../taxonomy.get_governorates` | — | `id`, `name` |
| `components/LocationPicker.tsx` (drill-down) | `getLocationChildren(parentId)` | `GET .../taxonomy.get_location_children` | `parent` | `id`, `name`, `location_type` |
| `components/LocationPicker.tsx` search box | `searchLocations(q)` | `GET .../taxonomy.search_locations` | `q`, `limit` (default 30) | `id`, `name`, `location_type`, `parent_id` |
| `app/post/index.tsx`, `app/jobs/post.tsx` | `getLocation(id)` (single lookup) | **`GET /api/resource/Souq Masr Location/{location_key}`** — standard REST resource endpoint | — (path param) | `location_name`, `location_type` |
| `app/post/index.tsx`, `app/jobs/post.tsx` | `locationPathLabel(id)` | **client-side only** — walk `get_location_children`/resource lookups and join `location_name` with `، `, exactly like the mobile function already does locally | — | — |

---

## 5. Standard REST resource endpoints — use these instead of writing custom code

Every Phase 1 DocType already grants `Guest: read=1` (see each DocType's `permissions`
array). That means Frappe's **built-in** REST resource API already works, with zero
custom code, for any single-record-by-id lookup:

```
GET /api/resource/Souq Masr Brand/{brand_key}
GET /api/resource/Souq Masr Model/{name}
GET /api/resource/Souq Masr Location/{location_key}
GET /api/resource/Souq Masr Listing Category/{category_key}   (though get_category above
                                                                 returns a richer, flatter
                                                                 shape purpose-built for the
                                                                 mobile app — prefer it)
```

This is the direct application of "use Frappe/ERPNext standard functionality wherever
possible" from the original migration brief — four point-lookups the mobile app needs
require **no custom endpoint at all**, they just weren't in the original 8-endpoint list
because that list only covered the custom `souq_masr.api.v1.taxonomy.*` methods, not
what Frappe already provides for free.

## 6. Response envelope note

Frappe's `/api/method/...` responses wrap the return value in `{"message": <value>}` —
this is standard Frappe behavior, not a Souq Masr design choice. The mobile app's
repository layer (per the blueprint's `Repository Interface → Frappe API Repository`
layering) needs to unwrap `response.message` once, in one place, rather than every
screen doing it — this is a mobile-side integration detail to build when the repository
layer is written, not a backend change.

## 7. Concrete mismatches found and fixed during this cross-check

| # | Mismatch | Fix |
|---|---|---|
| 1 | `getAllDescendantIds()` — used in 3 real screens (`home.tsx`, `(tabs)/categories.tsx`, `results.tsx`) — had **no** corresponding endpoint in the original 8. | Added `get_descendant_ids` as a 9th taxonomy endpoint (real, recursive implementation, not a stub — see `api/v1/taxonomy.py`). |
| 2 | `getBrand(id)`, `getModel(id)`, `getLocation(id)` single-record lookups have no dedicated custom method. | Not a gap — resolved via Frappe's standard `/api/resource/<DocType>/<name>` REST endpoint, already enabled by each DocType's existing Guest-read permission. Documented above rather than duplicating with custom code. |
| 3 | Mobile's `Category.hasKids` concept (`getChildren(cat.id).length > 0`, computed inline in `post/index.tsx`) has no direct field match — `is_group` is a close but not identical concept (see below). | Not fixed — flagged as a real, minor semantic gap. See below. |

### Known remaining gap (not fixed — needs a product decision, not a technical fix)

Mobile's `post/index.tsx` computes "does this category have children" **live**, by
calling `getChildren(cat.id).length > 0` at render time — always accurate by
construction. The backend's `is_group` field is set **once, at seed time**, computed
from the taxonomy snapshot that existed when `seed_taxonomy()` ran. If an admin later
adds a child category to a previously-childless category through the Desk UI, `is_group`
on the parent will not automatically flip to `1` unless something updates it.

This doesn't affect Phase 1 (nothing edits the taxonomy after seeding yet), but it's
worth deciding before Phase 2's admin CRUD ships: either (a) have `get_children`'s
response include a live-computed `has_children` boolean instead of trusting the stored
`is_group`, mirroring the mobile app's own always-correct-by-construction approach, or
(b) add a hook that recomputes `is_group` on the parent whenever a category is created
with a parent set. Not deciding this now — flagging it for Phase 2 planning.

## 8. App Version Config (Force Update / Online-Only)

Added alongside the mobile app's `StartupGate`/`useAppGateStore` (see the repo root's
`VERSION_CONTROL.md`). Same rules as taxonomy: `allow_guest=True` because this check
runs before the sign-in screen is even reachable; every field name matches
`types/appVersion.ts`'s `AppVersionConfig` literally, field for field.

| Mobile call site | Frappe endpoint | Params | DocType behind it |
|---|---|---|---|
| `services/appVersionService.ts`'s `fetchAppVersionConfig()` | `GET /api/method/souq_masr.api.v1.app_config.get_version_config` | `platform` (`ios`\|`android`) | `Souq Masr App Version Config` (module `Platform`, one record per platform, `autoname: field:platform`) |

Unlike the taxonomy DocTypes, **`Souq Masr App Version Config` does not grant `Guest`/`All`
read permission on the DocType itself** — only `Souq Masr Admin` can read/write it via
Desk or `/api/resource/`. The mobile app never talks to the DocType directly; it only
ever calls the whitelisted method above, which reads the doc with the framework's own
elevated access inside a controlled, single-purpose function. This is deliberately
tighter than the taxonomy pattern: there's no reason to expose the raw config table to
anonymous REST reads when a purpose-built endpoint already exists, even though nothing
in it is secret (store URLs and version numbers aren't sensitive) — least-privilege by
default, not because a leak here would be damaging.

**Not implemented (documented for Phase 2, per the version-control request's §10):** a
`before_request` hook that reads the `X-App-Version`/`X-App-Build`/`X-Platform` headers
(now sent on every request via `lib/apiClient.ts`) and returns `426 Upgrade Required` on
sensitive endpoints when the caller is below `minimum_supported_version`. Not built now
because none of the endpoints it would protect (`listings.create`, `chat.send`, etc.)
exist yet either — this is scaffolding with nothing real to guard, which this project's
own rule against unverifiable placeholder code rules out. The mobile side already
recognizes a `426` from any request that does go through `apiFetch()` and reacts
correctly (`lib/apiClient.ts`'s `UpgradeRequiredError` → `markMandatoryUpdateRequired()`),
so wiring the server-side hook later is a pure backend addition, no mobile change needed.
