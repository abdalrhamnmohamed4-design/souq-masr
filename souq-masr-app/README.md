# souq_masr

Custom Frappe app that extends ERPNext with **Souq Masr** (سوق مصر)'s marketplace, jobs,
and services functionality. Built per `Mazad ERPNext Blueprint` (kept under that filename
— see "Brand Rename / Technical Compatibility" below) — every DocType and seed value here
is derived from the real, working schemas in the Souq Masr mobile app (`../mock`, `../store`),
not invented.

**Status:** Phase 1 scaffold — app skeleton + the taxonomy module (Listing Category,
Listing Attribute, Brand, Model, Location), seeded from the real taxonomy this project
already built (19 top-level categories, ~90 brands, ~250 models, all 27 governorates +
real cities/areas). No ERPNext-dependent modules (marketplace listings, jobs, wallet)
yet — those come in the phases after this one, per the blueprint's §10.

Also scaffolded, alongside Phase 1 (cross-cutting, not domain-specific): a `Platform`
module holding `Souq Masr App Version Config` — backs the mobile app's Force Update /
Online-Only system. Root repo's `VERSION_CONTROL.md` covers the full mobile-side
architecture; this app's `PHASE_1_MOBILE_API_MAPPING.md` §8 covers the endpoint.

## Brand Rename / Technical Compatibility

This app, its DocTypes, and its API namespace were originally scaffolded under the
name **Mazad**, then fully renamed to **Souq Masr** before any live installation ever
happened. Full detail in `PHASE_1_READINESS_REPORT.md`'s "Brand Rename" section — short
version:

- **What changed:** the Python package (`mazad` → `souq_masr`), the app title, all 6
  DocTypes (`Mazad Listing Category` → `Souq Masr Listing Category`, etc.), every
  Link/Table field that referenced those DocTypes by name, the API namespace
  (`mazad.api.v1.*` → `souq_masr.api.v1.*`), and the admin Role fixture.
- **Why a full rename was safe:** this repository has never been a git repo until this
  rename, was never pushed anywhere, never connected to Frappe Cloud, and never
  installed on any live Frappe/ERPNext instance. There was no database, no site, and no
  external consumer of the old names to migrate away from — renaming now was strictly
  safer and cheaper than renaming later, after a real install exists.
- **What did NOT change:** the actual taxonomy data (category ids, names, fields, brand
  ids, model names, location ids/names) — untouched, per explicit instruction. The
  historical planning document `Mazad ERPNext Blueprint` keeps its original title/URL
  (it's an already-published artifact; its content is a historical record of that
  planning session, not live product surface).

## Connecting this to a real bench

This repo has never been installed against a running Frappe instance — none exists yet
(see the blueprint's §01 audit). To connect it to a Frappe Cloud Private Bench:

1. Push this `souq-masr-app/souq-masr` directory as its own git repository (rename the
   repo to `souq-masr` — Frappe apps are conventionally one app per repo, named after
   the app).
2. On Frappe Cloud: create a Private Bench → add the `souq_masr` app from that repo →
   attach it to a site alongside ERPNext.
3. Run the standard install: `bench --site <site> install-app souq_masr`.
4. `after_install` (in `souq_masr/setup/install.py`) seeds the taxonomy automatically —
   nothing manual required beyond the install itself.

## Verifying locally before that

Nothing in this scaffold has been run against a live `bench` — there isn't one on this
machine (see the audit). Every DocType JSON and Python file here follows standard Frappe
v15/v16 conventions, but **must be verified with a real `bench migrate` + `bench run-tests`**
the first time a real bench exists. Treat that as the actual "does this work" checkpoint,
not this file existing.

## Layout

```
souq_masr/
  hooks.py              app metadata, no customizations of ERPNext core registered
  modules.txt            currently: Marketplace, Platform
  marketplace/doctype/    Souq Masr Listing Category (tree), Souq Masr Listing Attribute
                          (child table), Souq Masr Brand, Souq Masr Model,
                          Souq Masr Location (tree), Souq Masr Brand Category (child)
  platform/doctype/       Souq Masr App Version Config (Force Update / Online-Only,
                          one record per platform, admin-only — see VERSION_CONTROL.md)
  setup/
    install.py            after_install hook -> seed_taxonomy() + seed_app_version_config()
    seed_data/             the real taxonomy, ported 1:1 from mock/taxonomy/*.ts, plus
                          harmless default App Version Config records (block nobody)
  api/v1/
    taxonomy.py           whitelisted read endpoints the mobile app's taxonomy screens
                          need (categories, brands-for-category, models-for-brand,
                          locations, location search) — 9 endpoints total
    app_config.py         get_version_config(platform) — Force Update backing endpoint
```
