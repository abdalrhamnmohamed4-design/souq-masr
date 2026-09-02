# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Phase 2B Slice 3 — real per-user favorites for Listings. Deliberately a
# normalized DocType (Souq Masr Listing Favorite: one row per owner+listing
# pair, owner = Frappe's standard field) rather than a JSON blob on User —
# lets Frappe's own permission engine (if_owner rows, see
# souq_masr_listing_favorite.json) and add_favorite/remove_favorite's
# explicit checks both enforce ownership independently, and keeps
# get_my_favorites a plain, indexed query instead of a JSON-parse-and-filter.
#
# Mutations require auth (Frappe's default whitelist(allow_guest=False)
# guest-rejection, same mechanism as every other Phase 2B mutation).
# is_favorite is allow_guest=True on purpose — a Guest viewing a listing
# just always sees "not favorited" (no identity to check against), matching
# the mobile app's existing unfilled-heart-for-guests UX; it never needs an
# auth prompt just to render that state.

import frappe

from souq_masr.api.v1.listings import PUBLIC_STATUSES, _paginate, _serialize_summary


def _current_user():
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(frappe._("Sign in required"), frappe.PermissionError)
	return user


def _assert_public_listing(listing_id):
	if not listing_id or not frappe.db.exists("Souq Masr Listing", listing_id):
		frappe.throw(frappe._("Listing not found"), frappe.DoesNotExistError)
	status = frappe.db.get_value("Souq Masr Listing", listing_id, "status")
	if status not in PUBLIC_STATUSES:
		frappe.throw(frappe._("Listing not found"), frappe.DoesNotExistError)


@frappe.whitelist()
def add_favorite(listing_id):
	user = _current_user()
	_assert_public_listing(listing_id)

	existing = frappe.db.exists("Souq Masr Listing Favorite", {"listing": listing_id, "owner": user})
	if existing:
		# idempotent — تكرار الإضافة مش خطأ، بس مفيش صف تاني بيتعمل
		# (القسم 9 من الطلب: "duplicate favorite insertion" لازم يتعامل معاها بأمان)
		return {"is_favorite": True, "id": existing}

	doc = frappe.new_doc("Souq Masr Listing Favorite")
	doc.listing = listing_id
	doc.insert()  # respects DocType permissions — real enforcement
	return {"is_favorite": True, "id": doc.name}


@frappe.whitelist()
def remove_favorite(listing_id):
	user = _current_user()
	existing = frappe.db.exists("Souq Masr Listing Favorite", {"listing": listing_id, "owner": user})
	if not existing:
		# idempotent — شيل حاجة مش موجودة أصلًا مش خطأ (القسم 9: "repeated favorite removal")
		return {"is_favorite": False}
	frappe.get_doc("Souq Masr Listing Favorite", existing).delete()
	return {"is_favorite": False}


@frappe.whitelist(allow_guest=True)
def is_favorite(listing_id):
	if frappe.session.user == "Guest":
		return {"is_favorite": False}
	exists = frappe.db.exists("Souq Masr Listing Favorite", {"listing": listing_id, "owner": frappe.session.user})
	return {"is_favorite": bool(exists)}


@frappe.whitelist()
def get_my_favorites(page=1, limit=50):
	user = _current_user()
	page, limit, offset = _paginate(page, limit)

	total = frappe.db.count("Souq Masr Listing Favorite", {"owner": user})
	fav_rows = frappe.get_all(
		"Souq Masr Listing Favorite",
		filters={"owner": user},
		fields=["listing"],
		order_by="creation desc",
		limit_start=offset,
		limit_page_length=limit,
	)
	listing_ids = [r.listing for r in fav_rows]
	if not listing_ids:
		return {"items": [], "total": total, "page": page, "limit": limit}

	rows = frappe.get_all(
		"Souq Masr Listing",
		filters={"name": ["in", listing_ids]},
		fields=["name", "title", "price", "price_type", "condition", "category", "location", "views", "status", "creation"],
	)
	rows_by_id = {r.name: r for r in rows}
	# نفس ترتيب المفضلة (الأحدث إضافة الأول)، مش ترتيب الإعلانات نفسه —
	# إعلان اتشال (نادر، لسه معندناش delete cascade) بيتجاهل بأمان بدل ما يكسر الرد.
	ordered = [rows_by_id[lid] for lid in listing_ids if lid in rows_by_id]
	return {"items": [_serialize_summary(r, True) for r in ordered], "total": total, "page": page, "limit": limit}
