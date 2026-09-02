# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# One saved job per (owner, job) pair — same pattern as
# Souq Masr Listing Favorite's validate().

import frappe
from frappe.model.document import Document


class SouqMasrSavedJob(Document):
	def validate(self):
		if not self.job:
			return
		existing = frappe.db.exists("Souq Masr Saved Job", {"job": self.job, "owner": self.owner, "name": ["!=", self.name]})
		if existing:
			frappe.throw(frappe._("Already saved"), frappe.DuplicateEntryError)
