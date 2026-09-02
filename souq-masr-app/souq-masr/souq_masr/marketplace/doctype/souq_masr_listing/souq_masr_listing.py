# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Cross-field business rules that a plain Link field can't express by itself
# (a Link only validates "does this row exist", not "is it the right kind of
# row for this other field's value"). souq_masr.api.v1.listings.py also
# validates these same things before ever calling insert()/save(), so a
# malformed request gets a clean validation_error response instead of
# reaching this far — this is the second, DocType-level line of defense,
# the same "enforced server-side, not just hidden in the UI" pattern the
# whole Listing domain is built around (see MOBILE_BACKEND_INTEGRATION_REPORT.md
# §Phase 2B, ownership/authentication architecture).

import frappe
from frappe.model.document import Document


class SouqMasrListing(Document):
	def validate(self):
		self.validate_category()
		self.validate_brand_matches_category()
		self.validate_model_matches_brand()
		self.validate_price()

	def validate_category(self):
		if self.category and frappe.db.get_value("Souq Masr Listing Category", self.category, "is_group"):
			frappe.throw(
				frappe._("Category {0} is a group category and can't have listings directly — pick one of its subcategories").format(self.category),
				frappe.ValidationError,
			)

	def validate_brand_matches_category(self):
		if not self.brand:
			return
		linked = frappe.db.exists(
			"Souq Masr Brand Category", {"parent": self.brand, "souq_masr_listing_category": self.category}
		)
		if not linked:
			frappe.throw(
				frappe._("Brand {0} is not linked to category {1}").format(self.brand, self.category),
				frappe.ValidationError,
			)

	def validate_model_matches_brand(self):
		if not self.model:
			return
		model_brand = frappe.db.get_value("Souq Masr Model", self.model, "brand")
		if not self.brand or model_brand != self.brand:
			frappe.throw(
				frappe._("Model {0} does not belong to brand {1}").format(self.model, self.brand),
				frappe.ValidationError,
			)

	def validate_price(self):
		if self.price_type in ("free", "contact", "on_request"):
			return
		if self.price is None or self.price < 0:
			frappe.throw(frappe._("Price must be a non-negative number for price_type '{0}'").format(self.price_type), frappe.ValidationError)
		if self.discount_price and self.discount_price >= self.price:
			frappe.throw(frappe._("Discount price must be lower than the regular price"), frappe.ValidationError)
