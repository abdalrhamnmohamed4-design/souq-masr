# Souq Masr — Phase 1 Deployment Guide

**Status of this document:** every command below is real, standard Frappe/Frappe Cloud
usage — checked against current Frappe/ERPNext documentation and source
(`frappe/erpnext`'s `version-16` branch, fetched directly) at the time this was written,
not recalled from memory alone. What is **not** verified, because no live instance exists
to verify it against, is called out explicitly rather than glossed over. Anywhere the
exact Frappe Cloud dashboard UI (button labels, screen layout) matters, this says so and
points you to follow whatever the dashboard shows at the time, rather than inventing
click-paths that might be stale.

**Brand rename note:** this app and every command below reflect the app's real, final
name — `souq_masr`. It was originally scaffolded as `mazad` and fully renamed before any
live installation ever happened (never a git repo, never pushed, never connected to
Frappe Cloud, never installed anywhere) — see the root `README.md`'s "Brand Rename /
Technical Compatibility" section and `PHASE_1_READINESS_REPORT.md` for the full record.
Nothing in this document is a compatibility shim for the old name; there's no live
system anywhere that ever depended on it.

---

## 0. Version requirements — stated explicitly, not guessed

| Component | Required version | Source |
|---|---|---|
| Frappe Framework | `>=16.21.0,<17.0.0` | Matches `[tool.bench.frappe-dependencies]` in `souq-masr/pyproject.toml`, itself matched to what ERPNext's own `version-16` branch declares for itself (checked directly from `frappe/erpnext`'s `pyproject.toml` on that branch) |
| ERPNext | `version-16` branch | Released 12 January 2026, described by Frappe as "the most stable major release yet," planned EOL end of 2029 |
| Python | The bench/site's own Python — Frappe Cloud provisions this automatically for whichever Frappe version you select; ERPNext v16's own `pyproject.toml` declares `requires-python >= 3.14`. This app's own code needs nothing newer than 3.10, so it isn't the constraint — the framework version you choose is. | ERPNext `version-16` `pyproject.toml`, fetched directly |
| MariaDB, Redis, Node.js (build) | Whatever Frappe Cloud's managed image ships for the chosen Frappe version | Frappe Cloud manages this — not something to configure by hand on a Private Bench |

**Why v16 over v15:** v15 is also fully supported (EOL end of 2027, requires only Python
3.10+, `frappe >=15.111.0,<16.0.0`) and is the more conservative, longer-battle-tested
choice if you'd rather not be an early adopter of a release that's been out ~7 months.
If you choose v15 instead, change `souq-masr/pyproject.toml`'s
`[tool.bench.frappe-dependencies]` line to `frappe = ">=15.111.0,<16.0.0"` before
connecting the app — that's the only file this decision touches.

---

## 1. Prerequisites (your side, before anything else)

- [ ] A Frappe Cloud account with a **payment method on file** — Private Benches
  (the tier with app-development/SSH access, required to install a custom app) are
  explicitly not available on the free trial.
- [ ] This repository (`souq-masr-app/souq-masr/`) pushed as its **own git repository**,
  named `souq-masr` by convention (matching `app_name = "souq_masr"` in `hooks.py`).
  GitHub is the practical choice — Frappe Cloud connects to it via a GitHub App install,
  not a raw SSH key.
- [ ] Decide v15 vs v16 (see §0) before connecting the app, since that's a one-line
  change that's much easier before the bench exists than after.

## 2. Create the Private Bench — **Frappe Cloud dashboard only**

1. Frappe Cloud dashboard → **Benches** → **New Bench**.
2. Choose **Private Bench** (not Public/Managed — Public benches don't allow custom apps).
3. Select the Frappe version matching your §0 decision (v16 recommended).
4. Add the `erpnext` app to the bench (from Frappe Cloud's official app marketplace —
   do not fork it, per the migration brief's own rule).
5. **The exact click-path/labels for the next two steps may differ from what's written
   here by the time you do this** — Frappe Cloud's dashboard changes over time and this
   was written from current docs, not a live walkthrough. Follow whatever the dashboard
   actually shows for "Add App from GitHub" / "Add Custom App":
   - Add the `souq_masr` app: point it at your git repo, authorize Frappe Cloud's GitHub
     App access to that repo if prompted, select the branch to track.
   - Deploy the bench (this builds it with both `erpnext` and `souq_masr` installed at
     the framework level — a site still needs to be created separately, next).

## 3. Create the site — **Frappe Cloud dashboard, mostly**

1. **Sites** → **New Site** → attach to the Private Bench you just created.
2. Apps to install on the site: `erpnext`, then `souq_masr` (order matters —
   `souq_masr` declares `required_apps = ["erpnext"]`, so installing `souq_masr` first
   should auto-pull `erpnext` too, but installing in the stated order avoids relying on
   that).
3. Site creation runs `bench new-site` + `bench --site <site> install-app erpnext` +
   `bench --site <site> install-app souq_masr` internally. Installing `souq_masr`
   triggers, automatically, with no manual step needed:
   - the fixtures import (`Souq Masr Admin` role — see `souq_masr/fixtures/role.json`)
   - the taxonomy seed (`after_install` → `seed_taxonomy()` — 53 categories, 98 brands,
     202 models, 149 locations)

## 4. If you need to do any of this over SSH / bench CLI instead

Private Bench plans include SSH access. If you prefer the CLI over the dashboard flow
above, the equivalent commands (standard `bench`, nothing Souq-Masr-specific) are:

```bash
# from inside the bench, via SSH — exact SSH connection details come from the
# Frappe Cloud dashboard for your specific bench, not reproducible here
bench get-app erpnext --branch version-16
bench get-app souq_masr https://github.com/<your-org>/souq-masr --branch main
bench new-site <site-name>
bench --site <site-name> install-app erpnext
bench --site <site-name> install-app souq_masr
```

`bench --site <site-name> migrate` is what actually runs on every `install-app` and
every subsequent deploy — this is the command that syncs the DocType JSONs, imports the
`Role` fixture, and (via `after_install`, first install only) seeds the taxonomy.

## 5. Verify the DocTypes exist (Desk UI, after install)

Log into the site's Desk (`https://<site>/app`) as Administrator, then:

- Search for **"Souq Masr Listing Category"** in the awesomebar → should open a list
  view with 53 records, tree-view toggle available (top-right, "Switch to Tree View" or
  similar — exact Desk UI wording not independently re-verified here).
- Same for **"Souq Masr Brand"** (98), **"Souq Masr Model"** (202), **"Souq Masr
  Location"** (149, tree view too).
- **Users** → confirm a **"Souq Masr Admin"** role now exists in the Role list — this is
  the fixture import; if it's missing, the fixture didn't import (see Troubleshooting).

## 6. Verify the seed actually ran correctly

Desk → **Souq Masr Listing Category** list view → open **"cars"** → the **Listing
Attributes** child table should show 17 rows (transmission, mileage, fuel type, etc.) —
this is the deepest-fielded category and the fastest single check that the whole
category→attribute pipeline actually worked, not just that records exist.

Desk → **Souq Masr Brand** → open **"phone-apple"** → the **Categories** field
(Table MultiSelect) should show `mobiles`, `tablets`, `laptops` — three rows, confirming
the multi-category brand relationship seeded correctly.

## 7. Test the 9 taxonomy API endpoints

From any HTTP client (curl, Postman, or the mobile app once repointed) — all `allow_guest=True`,
no auth header needed for these:

```
GET https://<site>/api/method/souq_masr.api.v1.taxonomy.get_children
GET https://<site>/api/method/souq_masr.api.v1.taxonomy.get_children?parent=vehicles
GET https://<site>/api/method/souq_masr.api.v1.taxonomy.get_category?category_key=cars
GET https://<site>/api/method/souq_masr.api.v1.taxonomy.get_path?category_key=realestate_sale
GET https://<site>/api/method/souq_masr.api.v1.taxonomy.get_descendant_ids?category_key=vehicles
GET https://<site>/api/method/souq_masr.api.v1.taxonomy.search_categories?q=سيارات
GET https://<site>/api/method/souq_masr.api.v1.taxonomy.get_brands_for_category?category_key=cars
GET https://<site>/api/method/souq_masr.api.v1.taxonomy.get_models_for_brand?brand_key=car-bmw
GET https://<site>/api/method/souq_masr.api.v1.taxonomy.get_governorates
GET https://<site>/api/method/souq_masr.api.v1.taxonomy.get_location_children?parent=gov-القاهرة
GET https://<site>/api/method/souq_masr.api.v1.taxonomy.search_locations?q=معادي
```

Expected: every one returns `{"message": [...]}` (Frappe's standard whitelisted-method
envelope — see `PHASE_1_MOBILE_API_MAPPING.md` §6) with real data, **with no
Authorization header** — if any of these demand login, guest permissions didn't apply
correctly (see Troubleshooting).

## 8. Check permissions properly, not just "did it return data"

- As a logged-out/guest request (no session cookie, no API key): all 11 calls above
  should succeed — confirms Guest read permission actually took effect.
- As a logged-in non-admin user: attempting to **create/edit/delete** a
  `Souq Masr Listing Category` record via `/api/resource/Souq Masr Listing Category`
  should be **rejected** — only `Souq Masr Admin` (and the Frappe System Manager /
  Administrator) has write access, per each DocType's `permissions` array.
- Confirm the `Souq Masr Admin` role, once assigned to a real user via Desk, actually
  grants that user write access — this exercises the fixture-imported role end-to-end,
  not just its existence.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| App-add fails with a dependency/version error | `souq_masr`'s declared `frappe = ">=16.21.0,<17.0.0"` doesn't match the bench's actual Frappe version | Confirm the bench's Frappe version matches; adjust `pyproject.toml`'s `[tool.bench.frappe-dependencies]` to match (see §0) |
| Install fails citing a **required app not found** | The bench doesn't have `erpnext`, or has it from the wrong org/fork | Frappe Cloud dashboard → Apps tab → remove any wrong-org copy, add the official `frappe/erpnext` |
| Site creation succeeds but `Souq Masr Admin` role doesn't exist | Fixture import didn't run, or ran before `Role` doctype was ready | Run `bench --site <site> migrate` again manually over SSH — fixture import is idempotent, safe to re-run |
| Taxonomy list views are empty | `after_install` didn't fire (can happen if the app was already installed once before, since `after_install` only runs on first install) | Over SSH: `bench --site <site> console`, then `from souq_masr.setup.seed_data.seed_taxonomy import seed_taxonomy; seed_taxonomy()` — safe to run manually, every insert is guarded by `frappe.db.exists()` |
| API calls return a permission/login-required error even though `allow_guest=True` is set | Site-level setting blocking guest API access, or the DocType's own Guest permission row didn't sync | Desk → **Souq Masr Listing Category** → **Role Permissions Manager** → confirm a **Guest** row with Read checked exists; if missing, `bench --site <site> migrate` again |
| Tree view doesn't show the expected parent/child nesting | `is_group` on some category is wrong (see the known caveat in `souq_masr/setup/seed_data/seed_taxonomy.py`'s `_seed_locations()` — most cities are flagged `is_group=1` even where they have no seeded areas) | Cosmetic only — doesn't affect API responses or actual parent/child links, just the Desk tree-view's expand icon. Not currently fixed; noted as a real, minor known issue. |
| `bench get-app souq_masr <repo-url>` fails locally/over SSH | Repo is private and Frappe Cloud/your SSH key isn't authorized against it | Either make the repo accessible to the bench's configured GitHub App install, or use a personal access token in the clone URL |

## What this document does **not** claim

This has never been run against a live Frappe instance — none exists yet (confirmed by
direct inspection of this machine — no bench, no Docker daemon running, no WSL Linux
distro, and this project was not even a git repository until the brand-rename pass that
produced the current `souq_masr` naming). Every command and version number above is real
and sourced, not invented, but "the commands are correct" and "this app installs cleanly
on a real bench" are two different claims — only the first one is made here. See
`PHASE_1_READINESS_REPORT.md` for the explicit list of what remains unverified.
