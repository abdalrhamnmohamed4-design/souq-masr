# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class SouqMasrService(Document):
	def validate(self):
		if self.offer_price and self.price and self.offer_price >= self.price:
			frappe.throw(frappe._("Offer price must be lower than the regular price"), frappe.ValidationError)
