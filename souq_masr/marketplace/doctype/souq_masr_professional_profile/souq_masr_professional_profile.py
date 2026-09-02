# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# One profile per owner — same upsert pattern as Souq Masr Company/Review.

import frappe
from frappe.model.document import Document


class SouqMasrProfessionalProfile(Document):
	def validate(self):
		existing = frappe.db.exists("Souq Masr Professional Profile", {"owner": self.owner, "name": ["!=", self.name]})
		if existing:
			frappe.throw(frappe._("You already have a professional profile"), frappe.DuplicateEntryError)
