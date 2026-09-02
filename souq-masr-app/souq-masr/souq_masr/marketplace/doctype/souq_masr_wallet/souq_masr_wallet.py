# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# One wallet per owner (enforced in souq_masr.api.v1.payments'
# _get_or_create_wallet, find-or-create, same idempotent pattern used
# throughout this app). track_changes=1 on the DocType gives a free,
# automatic version-history audit trail of every balance mutation.

import frappe
from frappe.model.document import Document


class SouqMasrWallet(Document):
	def validate(self):
		if self.balance is not None and self.balance < 0:
			frappe.throw(frappe._("Wallet balance cannot go negative"), frappe.ValidationError)
