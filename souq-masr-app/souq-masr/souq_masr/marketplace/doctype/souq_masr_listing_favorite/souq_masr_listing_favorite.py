# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# One favorite per (owner, listing) pair. Primary enforcement is
# souq_masr.api.v1.favorites.add_favorite's check-then-idempotent-return
# (no error, no duplicate row, just returns the existing favorite) — this
# validate() is the second, DB-adjacent line of defense for the unlikely
# race where two inserts for the same pair land close together (Frappe
# doesn't offer a composite-unique-key field option in DocType JSON, so
# this explicit check is the real constraint, not a schema-level one).

import frappe
from frappe.model.document import Document


class SouqMasrListingFavorite(Document):
	def validate(self):
		if not self.listing:
			return
		existing = frappe.db.exists(
			"Souq Masr Listing Favorite", {"listing": self.listing, "owner": self.owner, "name": ["!=", self.name]}
		)
		if existing:
			frappe.throw(frappe._("Already favorited"), frappe.DuplicateEntryError)
