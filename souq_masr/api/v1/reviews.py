# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Phase 2B — Reviews vertical. Scoped to SELLER reviews (rating a real
# Frappe User who owns listings) — the only review concept the mobile
# app's existing UI actually implements against a domain with a real
# backend so far (app/seller/[id].tsx's store/useAppStore.ts's `Review`
# type). The separate professional/company review concept used by
# app/services/professional/[id].tsx and app/jobs/company/[id].tsx
# (store/useJobsStore.ts's differently-shaped review) is out of scope
# here — those target Jobs/Services entities that don't have a real
# backend yet, and will get their own review support as part of those
# verticals rather than inventing a Company/Professional model early
# just to attach reviews to it.
#
# ELIGIBILITY RULE (chosen, documented — the existing mobile mock has NO
# rule at all: any authenticated user can rate any seller, unlimited
# times, per useAppStore.ts's addReview). That's too permissive for a
# real backend ("do not allow arbitrary users to manufacture reviews for
# sellers they have no valid relationship with"). Chosen rule: the
# reviewer must have at least one real Souq Masr Conversation with that
# seller (in either buyer/seller direction) — i.e. they've actually
# messaged them about a real listing. This mirrors the exact precedent
# already set by phone-number visibility (listings.py's
# _phone_visible_to_viewer): "a real conversation exists" is this
# codebase's established bar for "these two users have a real
# relationship". A stronger "verified completed purchase" gate would be
# more precise, but needs the Sale Confirmation Flow migrated to real
# listings first (still mock-only per Phase 2B Slice 4) — noted as a
# natural future tightening, not built here to avoid scope creep into an
# unrelated flow.
#
# PRIVACY: reviewer identity is shown as a display name only
# (first_name) — the raw Frappe User id/docname is NEVER included in any
# public review response. User docnames in this app are phone-derived
# (e.g. "201077770001@phone.souqmasr.local") — returning them publicly on
# a review (which anyone can read, unlike a chat message only its two
# participants ever see) would leak the reviewer's phone number to every
# visitor of the seller's profile. This is exactly why
# Souq Masr Review's own DocType permissions grant no blanket "All:
# read=1" — every public read here goes through this file's own
# serialization, which strips that field deliberately.

import frappe
from frappe.utils import cint

from souq_masr.api.v1 import notifications

PAGE_SIZE_DEFAULT = 20


def _current_user():
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(frappe._("Sign in required"), frappe.PermissionError)
	return user


def _assert_real_seller(seller_id):
	if not seller_id or not frappe.db.exists("User", seller_id):
		frappe.throw(frappe._("Seller not found"), frappe.DoesNotExistError)


def _has_relationship(reviewer, seller):
	return bool(
		frappe.db.exists("Souq Masr Conversation", {"buyer": reviewer, "seller": seller})
		or frappe.db.exists("Souq Masr Conversation", {"buyer": seller, "seller": reviewer})
	)


def _reviewer_display_name(user):
	name = frappe.db.get_value("User", user, "first_name")
	return name or "مستخدم سوق مصر"


def _serialize_review(doc, viewer):
	return {
		"id": doc.name,
		"seller": doc.seller,
		"reviewer_name": _reviewer_display_name(doc.owner),
		"rating": doc.rating,
		"comment": doc.comment or "",
		"created_at": str(doc.creation),
		"is_mine": bool(viewer) and viewer == doc.owner,
	}


def _rating_summary(seller_id):
	row = frappe.db.sql(
		"""select avg(rating) as avg_rating, count(*) as review_count
		from `tabSouq Masr Review` where seller=%s""",
		(seller_id,),
		as_dict=True,
	)
	avg_rating = row[0].avg_rating if row else None
	count = row[0].review_count if row else 0
	return {
		"average": round(float(avg_rating), 1) if avg_rating is not None else 0,
		"count": cint(count),
	}


@frappe.whitelist()
def submit_review(seller_id, rating, comment=None):
	"""بيعمل upsert — نفس المستخدم بيقيّم نفس البائع تاني، بيتحدّث التقييم
	الموجود مش يتسجّل صف تاني (منع التكرار، وبديل بسيط لواجهة "تعديل
	تقييم" مش موجودة في الموبايل حاليًا)."""
	user = _current_user()
	_assert_real_seller(seller_id)
	if seller_id == user:
		frappe.throw(frappe._("You cannot review yourself"), frappe.ValidationError)

	rating = cint(rating)
	if rating < 1 or rating > 5:
		frappe.throw(frappe._("Rating must be between 1 and 5"), frappe.ValidationError)

	if not _has_relationship(user, seller_id):
		frappe.throw(
			frappe._("You can only review a seller you've actually messaged about a listing"),
			frappe.PermissionError,
		)

	existing = frappe.db.exists("Souq Masr Review", {"seller": seller_id, "owner": user})
	if existing:
		doc = frappe.get_doc("Souq Masr Review", existing)
		doc.rating = rating
		doc.comment = (comment or "").strip()
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.new_doc("Souq Masr Review")
		doc.seller = seller_id
		doc.rating = rating
		doc.comment = (comment or "").strip()
		doc.insert()
		# إشعار على أول تقييم بس — مش على كل تعديل لاحق، عشان منكررش
		# إزعاج البائع كل ما المُقيِّم يغيّر رأيه.
		notifications.notify(seller_id, "review_received", "تقييم جديد", f"حد قيّمك {rating} نجوم.")

	return _serialize_review(doc, user)


@frappe.whitelist(allow_guest=True)
def get_seller_reviews(seller_id, page=1, limit=PAGE_SIZE_DEFAULT):
	_assert_real_seller(seller_id)
	page = cint(page) or 1
	limit = cint(limit) or PAGE_SIZE_DEFAULT
	offset = (page - 1) * limit
	viewer = frappe.session.user if frappe.session.user != "Guest" else None

	total = frappe.db.count("Souq Masr Review", {"seller": seller_id})
	rows = frappe.get_all(
		"Souq Masr Review",
		filters={"seller": seller_id},
		fields=["name"],
		order_by="creation desc",
		limit_start=offset,
		limit_page_length=limit,
	)
	items = [_serialize_review(frappe.get_doc("Souq Masr Review", r.name), viewer) for r in rows]
	return {"items": items, "total": total, "page": page, "limit": limit}


@frappe.whitelist(allow_guest=True)
def get_seller_rating_summary(seller_id):
	_assert_real_seller(seller_id)
	return _rating_summary(seller_id)


@frappe.whitelist()
def has_reviewed(seller_id):
	user = _current_user()
	existing = frappe.db.get_value("Souq Masr Review", {"seller": seller_id, "owner": user}, ["name", "rating", "comment"], as_dict=True)
	if not existing:
		return {"has_reviewed": False}
	return {"has_reviewed": True, "review_id": existing.name, "rating": existing.rating, "comment": existing.comment or ""}


@frappe.whitelist()
def delete_review(seller_id):
	"""بتمسح تقييم المستخدم الحالي هو نفسه للبائع ده — مش endpoint عام لمسح
	أي تقييم بأي id (مفيش داعي، العلاقة (owner, seller) وحيدة أصلًا)."""
	user = _current_user()
	existing = frappe.db.exists("Souq Masr Review", {"seller": seller_id, "owner": user})
	if not existing:
		return {"deleted": False}
	frappe.delete_doc("Souq Masr Review", existing, ignore_permissions=True)
	return {"deleted": True}
