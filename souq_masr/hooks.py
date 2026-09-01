app_name = "souq_masr"
app_title = "Souq Masr"
app_publisher = "Souq Masr"
app_description = "Marketplace, Jobs, and Services layer for ERPNext"
app_email = "dev@souqmasr.example"
app_license = "MIT"

# Souq Masr extends ERPNext — it must never run without it. This is the one line
# that actually enforces "do not duplicate what ERPNext already does": if ERPNext
# isn't installed on the site, `bench install-app souq_masr` refuses to proceed.
required_apps = ["erpnext"]

# Seeds the real taxonomy (categories/brands/models/locations, ported from the
# mobile app's own mock/taxonomy/*.ts) immediately after install — see
# souq_masr/setup/install.py. Nothing fabricated for this migration; same
# reference data the product already ships with.
after_install = "souq_masr.setup.install.after_install"

# ---------------------------------------------------------------------------
# Nothing below this line customizes ERPNext or Frappe core. Per the blueprint's
# §22 rule, every real customization must go through one of: Custom Field,
# Property Setter, a whitelisted method, a doc_event hook on a Souq Masr DocType,
# or a Workflow — never an edit to an ERPNext/Frappe source file. As of this
# scaffold (Phase 0/1 — taxonomy only) there is nothing here yet that even
# touches an ERPNext DocType, so these sections are placeholders, not omissions.
# ---------------------------------------------------------------------------

# doc_events = {
#     "Sales Invoice": {
#         "on_submit": "souq_masr.wallet.events.on_sales_invoice_submit",
#     },
# }

# The taxonomy DocTypes' permissions (see marketplace/doctype/*/*.json) grant
# full CRUD to a "Souq Masr Admin" role — nothing else in this scaffold creates
# that Role, so without this fixture it would not exist on a fresh install
# and the admin-side permission rule would reference a Role that isn't real
# yet (found during the Phase 1 deployment-readiness audit — see
# PHASE_1_READINESS_REPORT.md). Fixtures import automatically on every
# `bench migrate`, which `bench install-app` runs internally.
fixtures = [
	{"dt": "Role", "filters": [["name", "in", ["Souq Masr Admin"]]]},
]

# scheduler_events = {
#     "daily": [
#         "souq_masr.marketplace.tasks.expire_listings",
#     ],
# }
