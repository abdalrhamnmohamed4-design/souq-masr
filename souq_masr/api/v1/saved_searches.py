# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Phase 2B Slice 3 — real per-user saved searches. Persists the actual
# search DEFINITION (query/category/condition/field_filters + the
# schema-ready-but-not-yet-populated location/min_price/max_price/sort —
# see souq_masr_saved_search.json's field descriptions), not just a
# snapshot of matching listing ids — a saved search must still work
# correctly against listings created *after* it was saved.

import json

import frappe


def _current_user():
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(frappe._("Sign in required"), frappe.PermissionError)
	return user


def _get_saved_search_or_404(saved_search_id):
	if not saved_search_id or not frappe.db.exists("Souq Masr Saved Search", saved_search_id):
		frappe.throw(frappe._("Saved search not found"), frappe.DoesNotExistError)
	return frappe.get_doc("Souq Masr Saved Search", saved_search_id)


def _serialize(doc):
	return {
		"id": doc.name,
		"label": doc.label,
		"query": doc.query or "",
		"category_key": doc.category or None,
		"condition": doc.condition or None,
		"field_filters": json.loads(doc.field_filters) if doc.field_filters else {},
		"location_id": doc.location or None,
		"min_price": doc.min_price or None,
		"max_price": doc.max_price or None,
		"sort": doc.sort or None,
		"created_at": str(doc.creation),
	}


def _normalized_field_filters(field_filters):
	if not field_filters:
		return {}
	if isinstance(field_filters, str):
		try:
			field_filters = json.loads(field_filters)
		except (TypeError, ValueError):
			frappe.throw(frappe._("Malformed field_filters"), frappe.ValidationError)
	return field_filters or {}


@frappe.whitelist()
def create_saved_search(
	label,
	query=None,
	category=None,
	condition=None,
	field_filters=None,
	location=None,
	min_price=None,
	max_price=None,
	sort=None,
):
	user = _current_user()
	label = (label or "").strip()
	if not label:
		frappe.throw(frappe._("Label is required"), frappe.ValidationError)

	if category and not frappe.db.exists("Souq Masr Listing Category", category):
		frappe.throw(frappe._("Invalid category"), frappe.ValidationError)
	if location and not frappe.db.exists("Souq Masr Location", location):
		frappe.throw(frappe._("Invalid location"), frappe.ValidationError)

	normalized_filters = _normalized_field_filters(field_filters)
	filters_json = json.dumps(normalized_filters, sort_keys=True) if normalized_filters else ""

	# منع تكرار نفس معيار البحث بالظبط لنفس المستخدم — نفس فكرة
	# results.tsx's alreadySavedIdentical المحلية القديمة، بس مُنفَّذة
	# سيرفر-side دلوقتي (idempotent-return مش خطأ، زي add_favorite بالظبط).
	candidates = frappe.get_all(
		"Souq Masr Saved Search",
		filters={
			"owner": user,
			"query": (query or "").strip(),
			"category": category or "",
			"condition": condition or "",
			"location": location or "",
			"min_price": min_price or 0,
			"max_price": max_price or 0,
			"sort": sort or "",
		},
		fields=["name", "field_filters"],
	)
	for c in candidates:
		if (c.field_filters or "") == filters_json:
			return _serialize(frappe.get_doc("Souq Masr Saved Search", c.name))

	doc = frappe.new_doc("Souq Masr Saved Search")
	doc.label = label
	doc.query = (query or "").strip()
	doc.category = category or None
	doc.condition = condition or None
	doc.field_filters = filters_json or None
	doc.location = location or None
	doc.min_price = min_price or None
	doc.max_price = max_price or None
	doc.sort = sort or None
	doc.insert()
	return _serialize(doc)


@frappe.whitelist()
def get_my_saved_searches():
	user = _current_user()
	rows = frappe.get_all("Souq Masr Saved Search", filters={"owner": user}, pluck="name", order_by="creation desc")
	return {"items": [_serialize(frappe.get_doc("Souq Masr Saved Search", n)) for n in rows]}


@frappe.whitelist()
def delete_saved_search(saved_search_id):
	user = _current_user()
	doc = _get_saved_search_or_404(saved_search_id)
	if doc.owner != user:
		frappe.throw(frappe._("You do not have permission to delete this saved search"), frappe.PermissionError)
	doc.delete()
	return {"deleted": True, "id": saved_search_id}
