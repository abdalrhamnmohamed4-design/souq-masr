# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Admin-managed payment-receiving numbers (Vodafone Cash/Orange Cash/
# Etisalat Cash/InstaPay/bank transfer) — mirrors mock/paymentNumbers.ts's
# exact shape. No mobile/admin-dashboard UI was built to manage these
# this slice (matches this project's established "admin dashboard is out
# of scope" precedent from every prior phase) — an admin adds/edits rows
# via Frappe's own desk UI (/app/souq-masr-payment-number). Empty by
# default, same "no fake data" convention as every other domain in this
# app.

from frappe.model.document import Document


class SouqMasrPaymentNumber(Document):
	pass
