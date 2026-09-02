# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Phase 2B Slice 3 — real listing reports. No read-back endpoint beyond
# has_reported()'s boolean (no report content, no other users' reports —
# "do not expose reporter identity to other normal users") — the DocType's
# own permissions (souq_masr_listing_report.json) grant "All" role
# create-only, nothing else, so even a generic Frappe REST call can't read/
# edit/delete a report as a normal user. Admin moderation UI is explicitly
# out of scope this slice; status exists only so the record is safely
# storable/triageable later (Desk access, Souq Masr Admin role).

import frappe

from souq_masr.api.v1.listings import PUBLIC_STATUSES

VALID_REASONS = (
	"fake",
	"scam",
	"wrong_category",
	"duplicate",
	"prohibited",
	"spam",
	"abusive_seller",
	"incorrect_info",
)


def _current_user():
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(frappe._("Sign in required"), frappe.PermissionError)
	return user


@frappe.whitelist()
def report_listing(listing_id, reason, description=None):
	user = _current_user()

	if not listing_id or not frappe.db.exists("Souq Masr Listing", listing_id):
		frappe.throw(frappe._("Listing not found"), frappe.DoesNotExistError)
	status = frappe.db.get_value("Souq Masr Listing", listing_id, "status")
	if status not in PUBLIC_STATUSES:
		frappe.throw(frappe._("Listing not found"), frappe.DoesNotExistError)

	if reason not in VALID_REASONS:
		frappe.throw(frappe._("Invalid report reason"), frappe.ValidationError)

	# منع الإبلاغ المتكرر المسيء — idempotent-return مش خطأ ومفيش صف تاني
	# (القسم 9 من الطلب: نفس نمط add_favorite بالظبط).
	existing = frappe.db.exists("Souq Masr Listing Report", {"listing": listing_id, "owner": user})
	if existing:
		return {"reported": True, "id": existing}

	doc = frappe.new_doc("Souq Masr Listing Report")
	doc.listing = listing_id
	doc.reason = reason
	doc.description = (description or "").strip() or None
	doc.status = "Open"
	doc.insert()
	return {"reported": True, "id": doc.name}


@frappe.whitelist()
def has_reported(listing_id):
	user = _current_user()
	exists = frappe.db.exists("Souq Masr Listing Report", {"listing": listing_id, "owner": user})
	return {"has_reported": bool(exists)}
