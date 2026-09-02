# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class SouqMasrContentReport(Document):
	def validate(self):
		if not self.target_name or not frappe.db.exists(self.target_doctype, self.target_name):
			frappe.throw(frappe._("Report target not found"), frappe.ValidationError)
