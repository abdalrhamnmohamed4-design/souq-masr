# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# One review per (owner, seller) pair — enforced here (defense in depth;
# the primary enforcement is souq_masr.api.v1.reviews.submit_review's
# find-existing-and-update-instead-of-insert logic, same
# check-then-idempotent-write pattern as Favorites/Saved Searches). This
# validate() also re-checks rating range and self-review server-side —
# never trust that the API layer's own checks are the only gate, same
# "defense in depth via explicit code" principle used throughout this app
# (see Souq Masr Listing's validate() for price/category checks).

import frappe
from frappe.model.document import Document


class SouqMasrReview(Document):
	def validate(self):
		if not self.rating or self.rating < 1 or self.rating > 5:
			frappe.throw(frappe._("Rating must be between 1 and 5"), frappe.ValidationError)
		if self.seller and self.seller == self.owner:
			frappe.throw(frappe._("You cannot review yourself"), frappe.ValidationError)
		if not self.seller:
			return
		existing = frappe.db.exists(
			"Souq Masr Review", {"seller": self.seller, "owner": self.owner, "name": ["!=", self.name]}
		)
		if existing:
			frappe.throw(frappe._("You have already reviewed this seller"), frappe.DuplicateEntryError)
