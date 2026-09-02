# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# One career profile per owner — same upsert-with-safety-check pattern as
# Souq Masr Review/Souq Masr Company.

import frappe
from frappe.model.document import Document


class SouqMasrCareerProfile(Document):
	def validate(self):
		existing = frappe.db.exists("Souq Masr Career Profile", {"owner": self.owner, "name": ["!=", self.name]})
		if existing:
			frappe.throw(frappe._("You already have a career profile"), frappe.DuplicateEntryError)
