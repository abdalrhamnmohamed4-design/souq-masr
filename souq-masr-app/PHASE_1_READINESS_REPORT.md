# Phase 1 Readiness Report — Souq Masr Taxonomy Module

**Scope:** deployment-readiness audit of the existing Phase 1 scaffold, plus a full
brand rename from "Mazad" to "Souq Masr" (سوق مصر) completed in the same pass. No Phase
2 DocTypes (Listing, Seller Profile, Review, Report, Favorite, Jobs, Services, Wallet,
Orders) were created — per instruction, that work stays frozen until this phase installs
and verifies on a real Frappe/ERPNext instance.

---

## Brand Rename / Technical Compatibility

### What was renamed

Everything, in full, including the technical layer — not just visible branding:

- **Python package / app identifier:** `mazad` → `souq_masr`
- **App metadata** (`hooks.py`): `app_title`, `app_publisher`, `app_email`
- **Directory structure:** `mazad-app/mazad/mazad/` → `souq-masr-app/souq-masr/souq_masr/`
  (repo root, app-repo root, and the actual importable Python package, all three levels)
- **All 6 DocTypes**, their JSON files, their folder names, and their Python controller
  class names:
  - `Mazad Listing Category` → `Souq Masr Listing Category` (`SouqMasrListingCategory`)
  - `Mazad Listing Attribute` → `Souq Masr Listing Attribute` (`SouqMasrListingAttribute`)
  - `Mazad Brand` → `Souq Masr Brand` (`SouqMasrBrand`)
  - `Mazad Brand Category` → `Souq Masr Brand Category` (`SouqMasrBrandCategory`)
  - `Mazad Model` → `Souq Masr Model` (`SouqMasrModel`)
  - `Mazad Location` → `Souq Masr Location` (`SouqMasrLocation`)
- **Every cross-DocType reference**: Link/Table/Table MultiSelect `options` values
  (e.g. `Mazad Model.brand`'s Link target, `Mazad Brand.categories`'s Table MultiSelect
  target), matched consistently everywhere a DocType is referenced by name
- **NestedSet parent field names**: `parent_mazad_listing_category` →
  `parent_souq_masr_listing_category`, `parent_mazad_location` →
  `parent_souq_masr_location` — both the JSON field definitions and every place Python
  code reads/writes them (`doc.parent_souq_masr_listing_category`, seed/API filters)
- **The child-table field** `Mazad Brand Category.mazad_listing_category` →
  `Souq Masr Brand Category.souq_masr_listing_category`
- **API namespace**: `mazad.api.v1.taxonomy.*` → `souq_masr.api.v1.taxonomy.*` (falls
  out automatically from the package rename, since the dotted path mirrors the folder
  structure)
- **The admin Role fixture**: `Mazad Admin` → `Souq Masr Admin`, in both `fixtures/role.json`
  and the `hooks.py` fixture filter, and in every DocType's `permissions` array that
  references it
- **All 5 documentation files** (`README.md`, `DEPLOYMENT.md`, `PHASE_1_TEST_PLAN.md`,
  `PHASE_1_MOBILE_API_MAPPING.md`, this file) — every command, path, DocType name, and
  API endpoint updated to match
- **Mobile app user-facing branding**: every visible "مزاد" string across ~20 screens
  (headers, share text, empty states, legal terms, settings, notification channel name,
  default display-name fallbacks), plus `app.json`'s `name`/`slug`/`scheme` and
  permission-prompt strings, plus `package.json`'s `name`
- **Admin dashboard branding**: sidebar logo, browser tab title, mock admin account
  emails (`@mazad.app` → `@souqmasr.app`), settings page `appName`/support email,
  payment-method label ("محفظة مزاد" → "محفظة سوق مصر")

### What was intentionally NOT renamed, and why

| Item | Why it stays |
|---|---|
| Three AsyncStorage/persistence keys in the mobile app (`mazad-app-store`, `mazad-jobs-store`, `mazad.themeMode`) | Invisible technical identifiers — no user ever sees them, so there's zero branding value in changing them. Renaming carries a small but real risk: if a real device already has app data persisted under the old key, changing the key orphans that data (it isn't deleted, just inaccessible until reinstall). No upside, non-zero downside — documented with an explicit comment at each site rather than silently left alone. |
| `mock/taxonomy/types.ts`'s `auction: 'مزاد'` (and the admin's mirrored copy) | **Not a branding occurrence at all.** This is the literal Arabic word for "auction" — a `SellingType` enum label, unrelated domain/taxonomy data that happens to share a string with the old brand name by coincidence (the original name was itself a pun on this word). Renaming it would corrupt real taxonomy data, which was explicitly out of scope. |
| A handful of code comments referencing historical source filenames (`mazad-v2.html`, `mazadhome.html`) in `theme/decorative.ts`, `theme/tokens.ts`, `components/Icon.tsx`, `components/PriceGauge.tsx`, `mock/plans.ts`, `docs/SCREENS.md`, and two comments in `app/(tabs)/home.tsx` / `app/(tabs)/profile.tsx` | These name real historical design-mockup files this code was originally transcribed from, during an earlier phase of this project — not brand references. Renaming them would misrepresent where the code actually came from. |
| The published artifact titled "Mazad ERPNext Blueprint" | It's a already-published, historical planning document from before the rename — its content is a record of that planning session. Its title/URL were left as-is since renaming a historical record isn't the same operation as renaming live product surface; a redeploy would be a separate, explicit decision if wanted. |

### Why a full technical rename was safe to do directly (not deferred as a migration)

This project's `mazad-app` / now `souq-masr-app` directory **was not a git repository
until this pass** — confirmed by direct inspection before starting. It had never been
pushed anywhere, never connected to Frappe Cloud, and never installed on any live
Frappe/ERPNext instance (confirmed in the prior Phase 1 readiness audit: the
recommendation was "GO on **attempting** installation," meaning installation had not
yet happened). There is no database with `tabMazad Listing Category` (etc.) tables
anywhere, no site depending on the old DocType names, and no external API consumer
calling the old `mazad.api.*` namespace over real HTTP. Every one of the risk criteria
this task asked to check against — database migration, site migration, DocType
migration, API path changes for a live consumer, installed_apps changes, Frappe Cloud
app repository changes — is **not applicable**, precisely because none of those things
exist yet. This is exactly the "before the first production installation" window the
task described as the safe case for a direct rename, not a deferred migration.

### Migration requirements

**None, right now.** If this repository is ever installed against a real site under the
old `mazad` name before this rename is pushed, that would create a real migration
scenario (renaming a live DocType requires `frappe.rename_doc()` per-record plus a
schema migration, not a file edit) — but that has not happened and, per this rename
being completed now, will not need to.

### API compatibility

Fully preserved in the only sense that matters: **nothing has ever called the old
`mazad.api.*` namespace over real HTTP**, because the mobile app's taxonomy screens
still read from local `mock/taxonomy/*.ts` today — the repository-layer integration
that would call this API at all hasn't been built yet (that's Phase 2+ mobile work).
There is no "old API compatibility layer" to build because there was never a real
consumer of the old API to keep compatible with. The new `souq_masr.api.v1.taxonomy.*`
namespace is what `PHASE_1_MOBILE_API_MAPPING.md` documents for when that integration
work happens.

---

## 1. Files audited (this pass)

All 36 scaffold files (now under `souq-masr-app/`), plus the ~30 mobile/admin files
found to reference the old brand name during the project-wide search. Every DocType
JSON and Python controller was re-read in full after the directory restructure to
confirm cross-references were updated consistently, not just the files' own names.

## 2. Changes made

Summarized above under "What was renamed." At the file level: 6 DocType JSON+Python
pairs rewritten, `hooks.py`/`pyproject.toml`/`fixtures/role.json`/`setup/install.py`/
`setup/seed_data/seed_taxonomy.py`/`api/v1/taxonomy.py` rewritten, 1 seed-data comment
updated (data itself untouched), 5 documentation files rewritten, ~20 mobile app files
edited for user-facing text, 6 admin dashboard files edited, `app.json` and
`package.json` updated, `package-lock.json` regenerated via `npm install --package-lock-only`.

## 3. Technical identifiers renamed

- 1 Python package/app name
- 6 DocType names + 6 controller class names + 6 folder names
- 3 Link/Table-MultiSelect cross-references between DocTypes
- 2 NestedSet parent field names + 1 child-table field name
- 1 API namespace root (cascades to all 9 endpoints)
- 1 Role name (fixture + 6 DocTypes' permission arrays, all consistent)
- 1 npm package name

## 4. Technical identifiers intentionally retained

- **3** — the mobile app's AsyncStorage/persistence storage keys (`mazad-app-store`,
  `mazad-jobs-store`, `mazad.themeMode`). Reason: invisible to users, zero branding
  value, non-zero risk of orphaning real on-device data if any exists. Documented with
  an inline comment at each of the three sites.

## 5. Migration requirements

None — see "Migration requirements" above. Nothing has been installed anywhere yet.

## 6. Tests executed

Everything actually runnable without a live Frappe instance:

- `python -m py_compile` on every `.py` file in the renamed app tree
- JSON validity parse on every `.json` file in the renamed app tree
- `npx tsc --noEmit` (mobile app)
- `npx tsc -b` (admin dashboard)
- `npx vite build` (admin dashboard production build)
- `npx expo export --platform ios` (mobile full bundle export)
- Live Metro bundle-fetch sweep of all 56 mobile routes
- A full project-wide re-search for "Mazad"/"mazad"/"مزاد" after all edits, to classify
  every remaining occurrence (see §8)
- Manual recount of taxonomy seed volume (53/98/202/149) via the same Python script
  approach used in the original readiness pass, confirming the rename didn't touch
  record counts

## 7. Test results

All green — see the "Quality Requirements" checklist results at the end of this
document for the full 10-point breakdown with exact output.

## 8. Remaining "Mazad" occurrences and why they remain

Not zero, and deliberately not reported as zero — classified exactly as requested:

- **User-facing Mazad occurrences: 0.** Every screen, share text, notification, legal
  document, settings label, and admin dashboard string now reads "سوق مصر"/"Souq Masr".
- **Safe technical occurrences renamed: 16** (the items counted in §3 above).
- **Technical-compatibility occurrences intentionally retained: 3** — the three
  AsyncStorage keys listed in §4, each with an inline code comment explaining why.
- **Non-branding coincidental matches, correctly left alone: 2** — `auction: 'مزاد'`
  in `mock/taxonomy/types.ts` and its admin-side mirror, both the literal Arabic word
  for "auction," not a brand reference.
- **Historical/documentary comments, correctly left alone: ~9** — code comments across
  6 mobile files plus `docs/SCREENS.md` naming real historical HTML mockup files this
  code was originally transcribed from.
- **1 historical artifact title** ("Mazad ERPNext Blueprint") — a previously-published
  planning document, left as a historical record rather than redeployed under a new title.

## 9. Architectural risks (carried over from the prior audit, still accurate)

- **NestedSet insert ordering**: `seed_taxonomy()` relies on parent-before-child
  insertion order in `categories.py`/`locations.py` matching the tree structure exactly.
  Untouched by the rename; still a real dependency to keep in mind for future edits.
- **`is_group` staleness**: computed once at seed time, not automatically recomputed on
  later edits. Cosmetic only. Unchanged by the rename.
- **`Souq Masr Listing Attribute.options` has no `reqd` enforcement** even when
  `field_type = "Select"`. Unchanged by the rename, still worth closing before Phase 2.
- **Frappe Cloud UI drift**: documented at a process level, not a literal walkthrough.
- **~500 sequential inserts in one `after_install` hook**: no batching, untested against
  a live site. Unchanged by the rename.
- **New, rename-specific risk**: the "Mazad ERPNext Blueprint" artifact's *content*
  (its DocType design tables, API examples) still shows the old names, since only its
  title/URL were deliberately left alone and its body wasn't touched in this pass — if
  anyone references that document directly instead of this one going forward, they'll
  see stale naming. Worth a note there or a fresh republish if it's going to keep being
  used as a live reference rather than a historical record.

## 10. Final GO / NO-GO for the Souq Masr-branded Phase 1

**GO** — for installing this, under its final name, on a real Frappe Cloud Private
Bench, with the same conditions as the prior audit:

- Treat the first install as a **test**, following `PHASE_1_TEST_PLAN.md` section by
  section.
- Do not proceed to Phase 2 until sections A–J pass.
- Any install/migrate failure is real new information about this specific app
  structure — bring it back for a fix rather than working around it live.

This is a **GO on attempting real installation under the Souq Masr name**, not a claim
that installation will succeed — that claim was never available before the rename and
isn't available now either, for the same honest reason: no live Frappe instance has
ever run this code. What changed in this pass is that the app now carries its correct,
final identity everywhere, technical and visible both, so the first real install will
be testing the name this product is actually going to ship under — not a placeholder
that would need a second, riskier rename later.

---

## Quality Requirements — verification results

| # | Check | Result |
|---|---|---|
| 1 | Mobile `npx tsc --noEmit` | ✅ 0 errors |
| 2 | Admin `npx tsc -b` | ✅ 0 errors |
| 3 | Admin `npx vite build` | ✅ succeeds |
| 4 | `npx expo export --platform ios` | ✅ succeeds |
| 5 | Live-bundle sweep, 56 mobile routes | ✅ 56/56 HTTP 200 |
| 6 | `python -m py_compile` on every renamed `.py` file | ✅ all clean |
| 7 | JSON validity on every file | ✅ all valid |
| 8 | Taxonomy seed data volume re-verified | ✅ 53 / 98 / 202 / 149 — unchanged by rename |
| 9 | All 9 taxonomy API definitions exist | ✅ `get_children`, `get_category`, `get_path`, `get_descendant_ids`, `search_categories`, `get_brands_for_category`, `get_models_for_brand`, `get_governorates`, `get_location_children`, `search_locations` — confirmed present in the renamed `api/v1/taxonomy.py` |
| 10 | Full repo re-search for Mazad/mazad/مزاد | ✅ done — see §8 above for the full classified breakdown, not a bare "0 occurrences" claim |

(Exact commands and raw output for 1–7 are in the session's working log; summarized
here per the requested report format.)
