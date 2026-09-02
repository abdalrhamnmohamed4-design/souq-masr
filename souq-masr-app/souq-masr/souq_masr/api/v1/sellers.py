# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Phase 2B — Reviews vertical. get_seller_profile is the missing piece
# that makes app/seller/[id].tsx actually work for a REAL seller — before
# this, tapping "seller" on a real listing's detail page (which already
# navigated to /seller/{real_user_id}, see app/detail/[id].tsx) landed on
# a screen with nothing to fetch (useSeller() only ever looked at the
# local mock store, always empty for a real id) — a real, disclosed
# pre-existing dead end from Phase 2B Slice 1 (real listings existed
# before any way to view their owner's profile), fixed here as part of
# building Reviews (a review needs a working profile page to show up on).

import frappe

from souq_masr.api.v1.reviews import _rating_summary


def _phone_visible_on_profile(seller: str):
	"""نسخة عامة (مش مرتبطة بإعلان معيّن) من listings.py's
	_phone_visible_to_viewer — صفحة البروفايل مش مربوطة بإعلان واحد بالذات،
	فالقاعدة هنا: صاحب البروفايل نفسه، أو أي حد عنده محادثة حقيقية واحدة
	على الأقل مع البائع ده (في أي اتجاه، بخصوص أي إعلان)."""
	viewer = frappe.session.user
	if viewer == "Guest":
		return False
	if viewer == seller:
		return True
	return bool(
		frappe.db.exists("Souq Masr Conversation", {"buyer": viewer, "seller": seller})
		or frappe.db.exists("Souq Masr Conversation", {"buyer": seller, "seller": viewer})
	)


@frappe.whitelist(allow_guest=True)
def get_seller_profile(seller_id):
	if not seller_id or not frappe.db.exists("User", seller_id):
		frappe.throw(frappe._("Seller not found"), frappe.DoesNotExistError)

	row = frappe.db.get_value("User", seller_id, ["first_name", "mobile_no", "creation"], as_dict=True)
	ads_count = frappe.db.count("Souq Masr Listing", {"owner": seller_id, "status": "Active"})
	summary = _rating_summary(seller_id)

	return {
		"id": seller_id,
		"name": row.first_name or "مستخدم سوق مصر",
		"phone": row.mobile_no if _phone_visible_on_profile(seller_id) else None,
		"member_since": frappe.utils.formatdate(row.creation, "MMMM yyyy") if row.creation else "",
		"ads_count": ads_count,
		"rating": summary["average"],
		"review_count": summary["count"],
		"verified": False,
		"is_me": frappe.session.user == seller_id,
	}
