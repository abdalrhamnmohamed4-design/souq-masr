# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class SouqMasrPaymentRequest(Document):
	def validate(self):
		if not self.amount or self.amount <= 0:
			frappe.throw(frappe._("Amount must be a positive number"), frappe.ValidationError)
