# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# One company per owner — the mobile UI (app/jobs/my-company.tsx) only
# ever assumes a single "my company", so this validate() blocks a second
# row for the same owner (primary enforcement is
# souq_masr.api.v1.companies.create_or_update_my_company's
# find-existing-and-update logic; this is the second line of defense,
# same pattern as Souq Masr Review/Listing Favorite).

import frappe
from frappe.model.document import Document


class SouqMasrCompany(Document):
	def validate(self):
		existing = frappe.db.exists("Souq Masr Company", {"owner": self.owner, "name": ["!=", self.name]})
		if existing:
			frappe.throw(frappe._("You already have a company profile"), frappe.DuplicateEntryError)
