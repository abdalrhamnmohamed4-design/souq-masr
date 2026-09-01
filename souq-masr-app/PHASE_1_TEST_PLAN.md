# Phase 1 — Test Plan

To be executed once a real Frappe/ERPNext bench exists (see `DEPLOYMENT.md`). Every test
below has an exact action, an exact expected result, and an exact failure condition —
none of this has been run yet; running it is the actual point of Phase 1 verification.

**Brand rename note:** all DocType/API/role names below reflect the app's final name,
`souq_masr` / "Souq Masr" — this app was renamed from `mazad` before any live
installation ever happened, so there is no old-name compatibility surface to also test.

---

## A. Installation

| Action | Expected result | Failure condition |
|---|---|---|
| `bench get-app souq_masr <repo-url> --branch main` on a bench with ERPNext v16 already added | App is cloned and registered in `apps.txt`/`apps.json`, no error | Dependency-resolution error citing `frappe = ">=16.21.0,<17.0.0"` not matching the bench's Frappe version |
| `bench --site <site> install-app souq_masr` | Completes with the fixture import and taxonomy seed logged, exit code 0 | Any traceback; exit code non-zero; install hangs |
| Re-run `bench --site <site> install-app souq_masr` on the same site (idempotency check) | Frappe reports the app is already installed, or a no-op; no duplicate taxonomy records created | Duplicate categories/brands/models/locations appear (would mean the `frappe.db.exists()` guards in `seed_taxonomy.py` failed) |

## B. Migration

| Action | Expected result | Failure condition |
|---|---|---|
| `bench --site <site> migrate` on a site that already has `souq_masr` installed | Completes cleanly, DocType schema unchanged, no data loss | Any traceback; a DocType's table gets dropped/altered destructively |
| Edit a DocType JSON's `field_order` only (trivial, non-breaking change), then `bench migrate` | Change reflected in the Desk form's field order, no data loss | Migration fails to detect the JSON change, or corrupts existing records |

## C. DocType creation

| Action | Expected result | Failure condition |
|---|---|---|
| Desk → search "Souq Masr Listing Category" | List view opens, exactly 53 records | Doctype not found (module/naming mismatch); wrong record count |
| Desk → search "Souq Masr Brand" | List view opens, exactly 98 records | Doctype not found; wrong record count |
| Desk → search "Souq Masr Model" | List view opens, exactly 202 records | Doctype not found; wrong record count |
| Desk → search "Souq Masr Location" | List view opens, exactly 149 records | Doctype not found; wrong record count |
| Desk → search "Souq Masr Listing Attribute" | Doctype exists but has **no standalone list view entry point** (it's `istable: 1`) — only reachable via a parent's child table | It appears as a browsable top-level list (would mean `istable` didn't take effect) |
| Desk → search "Souq Masr Brand Category" | Same as above — child-table only | Appears as a standalone list |

## D. Tree behavior

| Action | Expected result | Failure condition |
|---|---|---|
| Desk → Souq Masr Listing Category → switch to Tree View | Root shows the 19 top-level categories; expanding "vehicles" shows its 7 children (cars, motorcycles, heavy_machinery, trucks_commercial, boats, tires_wheels, auto_parts) | Tree view unavailable; wrong/missing nesting; a category appears under the wrong parent |
| Desk → Souq Masr Location → switch to Tree View | Root shows 27 governorates; expanding "القاهرة" shows 8 cities; expanding "مدينة نصر" shows 3 areas | Same failure modes as above |
| Attempt to set a category's parent to itself (via Desk form) | Rejected with a validation error (NestedSet's own built-in cycle protection) | Silently accepted, or crashes instead of a clean validation message |
| Delete a top-level category that has children (e.g. "vehicles") | Either blocked with a clear "has linked records" error, or cascades per Frappe's own link-behavior config — **exact behavior not yet decided/configured**, this test's job is to discover which one actually happens | Silent data corruption — children left with a dangling/broken parent reference |

## E. Child table behavior

| Action | Expected result | Failure condition |
|---|---|---|
| Open "cars" category → Listing Attributes child table | 17 rows, matching `souq_masr/setup/seed_data/categories.py`'s `cars` entry exactly (sellingType, year, mileage, bodyType, transmission, fuelType, engineCapacity, numberOfSeats, color, interiorColor, origin, licenseStatus, accidentHistory, numberOfOwners, warranty, exchangeAccepted, financingAvailable) | Row count mismatch; a field's `field_type`/`options`/`required` doesn't match the source data |
| Add a new row to that child table via Desk, save | Row persists, `get_category` API call reflects it immediately | Row doesn't persist; API still shows the old 17 |
| Open "misc" category (zero fields in source data) | Empty child table, no rows, no error | An error rendering an empty child table |

## F. Brand → Model relationships

| Action | Expected result | Failure condition |
|---|---|---|
| `GET .../taxonomy.get_models_for_brand?brand_key=car-bmw` | 18 models (1–7 Series, X1–X7, iX, i4, i5, i7, أخرى) | Wrong count; models from a different brand leak in |
| `GET .../taxonomy.get_models_for_brand?brand_key=phone-apple` | 54 models total (44 iPhone entries + 5 iPad entries + 5 Mac entries) — counted directly from `models.py` with a script, not hand-counted | Models scoped to the wrong brand |
| Change a model's `brand` Link field to a nonexistent brand key via the API directly | Rejected — Link field validation should refuse a value that isn't a real `Souq Masr Brand` record | Silently accepted, creating a dangling reference |

## G. Brand → Category relationships

| Action | Expected result | Failure condition |
|---|---|---|
| `GET .../taxonomy.get_brands_for_category?category_key=mobiles` | Apple appears in the list alongside Samsung, Xiaomi, etc. | Apple missing (would mean the `Souq Masr Brand Category` child-row query in `get_brands_for_category` is broken) |
| `GET .../taxonomy.get_brands_for_category?category_key=tablets` | Apple appears again (same brand, second category) — confirms multi-category membership actually works, not just single-category brands | Apple missing from this second category despite being correctly seeded with `category_ids: ["mobiles", "tablets", "laptops"]` |
| `GET .../taxonomy.get_brands_for_category?category_key=cars` | Apple does **not** appear | Apple incorrectly appears (would mean the child-table filter is too permissive) |

## H. Location hierarchy

| Action | Expected result | Failure condition |
|---|---|---|
| `GET .../taxonomy.get_governorates` | Exactly 27 results | Wrong count |
| `GET .../taxonomy.get_location_children?parent=gov-القاهرة` | 8 cities | Wrong count/wrong cities |
| `GET .../taxonomy.get_location_children?parent=city-التجمع-الخامس` | 2 areas (الشيخ زايد الجديد, الرحاب) | Wrong count |
| `GET .../taxonomy.search_locations?q=معادي` | Matches "المعادي" (city) and "المعادي الجديدة" + "زهراء المعادي" (areas) — 3 results, spanning two location types in one query | Only matches one type; misses the substring match |

## I. Taxonomy seed data (exact volume checks)

| Action | Expected result | Failure condition |
|---|---|---|
| Count all `Souq Masr Listing Category` records | 53 | Any other number |
| Count all `Souq Masr Brand` records | 98 | Any other number |
| Count all `Souq Masr Model` records | 202 | Any other number |
| Count all `Souq Masr Location` records | 149 (27 governorate + 103 city + 19 area) | Any other number |
| Spot-check: does "iPhone 15 Pro Max" exist under brand "phone-apple"? | Yes | Missing — would indicate a truncated/broken seed run |

## J. API responses

| Action | Expected result | Failure condition |
|---|---|---|
| Any endpoint, valid params | HTTP 200, `{"message": <real data>}` | HTTP 500; malformed JSON; `message` missing |
| `get_category` with a nonexistent `category_key` | A clean 404-style error via `frappe.throw(..., frappe.DoesNotExistError)` | Unhandled traceback exposing a stack trace to the client |
| `get_children` with no `parent` param at all | Returns the 19 top-level categories (Python default `parent=None` applies) | Error about a missing required argument |
| `search_categories` with `q=` (empty string) | Returns `[]` immediately (short-circuit in the function) | Returns all categories, or errors |
| `get_descendant_ids?category_key=vehicles` | Returns `vehicles` plus all 7 of its children — 8 ids total | Missing the parent itself, or missing children |

## K. Guest API permissions

| Action | Expected result | Failure condition |
|---|---|---|
| Call all 9 taxonomy endpoints with no `Authorization` header / no session cookie | All succeed | Any return a login-required/403 error |
| Call `/api/resource/Souq Masr Brand/car-bmw` (standard REST, not a custom method) with no auth | Succeeds — Guest read permission on the DocType | 403/login-required |
| Attempt `POST /api/resource/Souq Masr Brand` (create) with no auth | Rejected — no Guest create permission exists in any Phase 1 DocType's permissions array | Silently succeeds, creating an unauthenticated write |

## L. Authentication behavior where applicable

| Action | Expected result | Failure condition |
|---|---|---|
| Log in as a normal (non-admin) user, attempt to edit a `Souq Masr Listing Category` via Desk | Blocked — no write permission for any role except `Souq Masr Admin`/System Manager | Edit succeeds |
| Assign the `Souq Masr Admin` role to a test user via Desk, log in as that user, edit a category | Succeeds | Blocked despite having the role — would mean the fixture-imported role isn't wired to the DocType permission correctly |

## M. Error handling

| Action | Expected result | Failure condition |
|---|---|---|
| `get_brands_for_category` with a `category_key` that exists but has zero brands (e.g. "realestate_sale") | Returns `[]` cleanly | Error instead of an empty array |
| `get_models_for_brand` with a `brand_key` that doesn't exist | Returns `[]` (current implementation doesn't distinguish "brand doesn't exist" from "brand has no models" — **known, acceptable gap, not a bug**, both cases are legitimately "nothing to show" for this endpoint's purpose) | A 500 error instead of an empty array |

## N. Duplicate prevention

| Action | Expected result | Failure condition |
|---|---|---|
| Manually re-run `seed_taxonomy()` from `bench console` after a successful install | No new records created — every `frappe.db.exists()` guard short-circuits | Record counts double |
| Attempt to create a second `Souq Masr Listing Category` with `category_key = "cars"` (duplicate) via the API | Rejected — `unique: 1` on `category_key` | Silently creates a second "cars" |
| Attempt to create a second `Souq Masr Brand` with `brand_key = "car-bmw"` | Rejected — `unique: 1` on `brand_key` | Silently creates a duplicate |

## O. Data validation

| Action | Expected result | Failure condition |
|---|---|---|
| Attempt to create a `Souq Masr Listing Category` with no `category_key` | Rejected — `reqd: 1` | Silently accepted with a blank key |
| Attempt to create a `Souq Masr Listing Attribute` row with `field_type = "Select"` and no `options` | Currently **not enforced** — `options` has no `reqd` flag even when `field_type` is Select. **Known gap, flag if this matters before Phase 2.** | (n/a — documenting current behavior, not asserting a pass/fail) |
| Attempt to set a `Souq Masr Model.brand` to a `Souq Masr Brand` key that doesn't exist | Rejected — standard Link field validation | Silently accepted |

## P. Mobile → API compatibility

| Action | Expected result | Failure condition |
|---|---|---|
| Point a local build of the mobile app's taxonomy calls at the real API (per `PHASE_1_MOBILE_API_MAPPING.md`) instead of `mock/taxonomy/*.ts`, for the post-ad wizard's category step only | Category grid renders identically to the mock-data version — same categories, same icons, same drill-down behavior | Any visual/behavioral difference traceable to a field-name or shape mismatch not caught in the mapping doc |
| Same, for the location picker | Governorate list, city drill-down, and search all behave identically to the current `LocationPicker.tsx` | Same as above |
| Same, for brand/model selection in the post-ad wizard on a `has_brands` category (e.g. "cars") | Brand grid renders with logos, selecting a brand shows its models | Logos fail to load (would point to the `logo` Attach Image field being empty — expected, since no logos were seeded, only referenced structurally) or model list empty |

**Note on the logo gap:** Phase 1's `Souq Masr Brand.logo` field exists but was **not**
seeded with actual image files — the mobile app currently renders brand logos via
`components/BrandLogo.tsx`'s own bundled SVG lookup (`mock/taxonomy/brandLogos.ts`),
not from taxonomy data at all. This is not a Phase 1 regression; it's an existing,
separate mobile-side asset system that this migration hasn't touched. Worth deciding
during Phase 2 planning whether logos move server-side or stay a mobile-bundled asset.
