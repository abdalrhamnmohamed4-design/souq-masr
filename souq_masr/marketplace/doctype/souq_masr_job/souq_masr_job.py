# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Defense in depth (same principle as Souq Masr Listing's validate()):
# the API layer (souq_masr.api.v1.jobs) already checks these, this is
# the second, DB-adjacent line of defense.

import frappe
from frappe.model.document import Document


class SouqMasrJob(Document):
	def validate(self):
		if self.company:
			company_owner = frappe.db.get_value("Souq Masr Company", self.company, "owner")
			if company_owner and company_owner != self.owner:
				frappe.throw(frappe._("You can only post jobs under your own company"), frappe.PermissionError)
		if self.salary_min and self.salary_max and self.salary_min > self.salary_max:
			frappe.throw(frappe._("Minimum salary cannot exceed maximum salary"), frappe.ValidationError)
		if self.experience_years_min and self.experience_years_max and self.experience_years_min > self.experience_years_max:
			frappe.throw(frappe._("Minimum experience cannot exceed maximum experience"), frappe.ValidationError)
