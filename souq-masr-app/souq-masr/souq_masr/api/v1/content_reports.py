# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# One shared report system for Jobs + Services content (Job/Company now,
# Service/Professional Profile once the Services vertical is built) —
# reuses Souq Masr Listing Report's exact permission shape (create-only,
# no read for anyone but Admin — reporter identity never exposed, same
# reasoning as reviews.py) instead of duplicating a near-identical
# DocType per target type.

VALID_REASONS = ("fake", "scam", "wrong_category", "duplicate", "prohibited", "spam", "abusive", "incorrect_info")
VALID_TARGET_DOCTYPES = ("Souq Masr Job", "Souq Masr Company", "Souq Masr Service", "Souq Masr Professional Profile")

import frappe


def _current_user():
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(frappe._("Sign in required"), frappe.PermissionError)
	return user


@frappe.whitelist()
def report_content(target_doctype, target_name, reason, description=None):
	user = _current_user()
	if target_doctype not in VALID_TARGET_DOCTYPES:
		frappe.throw(frappe._("Invalid report target type"), frappe.ValidationError)
	if not target_name or not frappe.db.exists(target_doctype, target_name):
		frappe.throw(frappe._("Report target not found"), frappe.DoesNotExistError)
	if reason not in VALID_REASONS:
		frappe.throw(frappe._("Invalid report reason"), frappe.ValidationError)

	existing = frappe.db.exists("Souq Masr Content Report", {"target_doctype": target_doctype, "target_name": target_name, "owner": user})
	if existing:
		return {"id": existing, "already_reported": True}

	doc = frappe.new_doc("Souq Masr Content Report")
	doc.target_doctype = target_doctype
	doc.target_name = target_name
	doc.reason = reason
	doc.description = (description or "").strip() or None
	doc.insert()
	return {"id": doc.name, "already_reported": False}


@frappe.whitelist()
def has_reported_content(target_doctype, target_name):
	user = _current_user()
	return {"has_reported": bool(frappe.db.exists("Souq Masr Content Report", {"target_doctype": target_doctype, "target_name": target_name, "owner": user}))}
