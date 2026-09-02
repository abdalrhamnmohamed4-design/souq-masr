# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Services vertical — service listings posted by a professional. Mirrors
# listings.py's/jobs.py's architecture (ownership via `owner`,
# PUBLIC_STATUSES gating, pagination) since it's the same kind of
# domain. No `professional` Link field — a professional profile is
# already 1:1 with its owner (unlike Job->Company, which needs an
# explicit Link since a company could in principle have co-owners),
# so `owner` alone is sufficient to resolve "whose service is this".

import json

import frappe
from frappe.utils import cint

PAGE_SIZE_DEFAULT = 20
PUBLIC_STATUSES = ("active",)


def _current_user():
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(frappe._("Sign in required"), frappe.PermissionError)
	return user


def _get_service_or_404(service_id):
	if not service_id or not frappe.db.exists("Souq Masr Service", service_id):
		frappe.throw(frappe._("Service not found"), frappe.DoesNotExistError)
	return frappe.get_doc("Souq Masr Service", service_id)


def _assert_owner(doc, user):
	if doc.owner != user:
		frappe.throw(frappe._("You do not own this service"), frappe.PermissionError)


def _to_json_list(value):
	if value is None:
		return "[]"
	if isinstance(value, str):
		try:
			parsed = json.loads(value)
			return json.dumps(parsed if isinstance(parsed, list) else [], ensure_ascii=False)
		except Exception:
			return "[]"
	return json.dumps(list(value), ensure_ascii=False)


def _parse_json_list(value):
	if not value:
		return []
	try:
		parsed = json.loads(value)
		return parsed if isinstance(parsed, list) else []
	except Exception:
		return []


def _paginate(page, limit):
	page = cint(page) or 1
	limit = cint(limit) or PAGE_SIZE_DEFAULT
	limit = min(limit, 100)
	return page, limit, (page - 1) * limit


def _serialize(doc):
	return {
		"id": doc.name,
		"owner": doc.owner,
		"category_key": doc.category_key,
		"trade_key": doc.trade_key,
		"title": doc.title,
		"description": doc.description or "",
		"price": doc.price,
		"price_type": doc.price_type,
		"service_areas": _parse_json_list(doc.service_areas_json),
		"duration": doc.duration or "",
		"image_urls": _parse_json_list(doc.image_urls_json),
		"availability": doc.availability or "",
		"status": doc.status,
		"offer_price": doc.offer_price,
		"offer_ends_at": str(doc.offer_ends_at) if doc.offer_ends_at else None,
		"posted_at": str(doc.creation),
		"is_owner": frappe.session.user == doc.owner,
	}


SUMMARY_FIELDS = [
	"name", "owner", "category_key", "trade_key", "title", "price", "price_type",
	"service_areas_json", "image_urls_json", "status", "offer_price", "offer_ends_at", "creation",
]


def _serialize_summary(row):
	return {
		"id": row.name,
		"owner": row.owner,
		"category_key": row.category_key,
		"trade_key": row.trade_key,
		"title": row.title,
		"price": row.price,
		"price_type": row.price_type,
		"service_areas": _parse_json_list(row.service_areas_json),
		"image_urls": _parse_json_list(row.image_urls_json),
		"status": row.status,
		"offer_price": row.offer_price,
		"offer_ends_at": str(row.offer_ends_at) if row.offer_ends_at else None,
		"posted_at": str(row.creation),
	}


@frappe.whitelist()
def create_service(category_key, title, description=None, trade_key=None, price=None, price_type="starting_from", service_areas=None, duration=None, image_urls=None, availability=None, offer_price=None, offer_ends_at=None):
	user = _current_user()
	if not frappe.db.exists("Souq Masr Professional Profile", {"owner": user}):
		frappe.throw(frappe._("You need a professional profile before posting a service"), frappe.ValidationError)
	if not (category_key or "").strip() or not (title or "").strip():
		frappe.throw(frappe._("Category and title are required"), frappe.ValidationError)

	doc = frappe.new_doc("Souq Masr Service")
	doc.category_key = category_key.strip()
	doc.trade_key = trade_key
	doc.title = title.strip()
	doc.description = description or ""
	doc.price = cint(price) if price not in (None, "") else None
	doc.price_type = price_type or "starting_from"
	doc.service_areas_json = _to_json_list(service_areas)
	doc.duration = duration
	doc.image_urls_json = _to_json_list(image_urls)
	doc.availability = availability
	doc.offer_price = cint(offer_price) if offer_price not in (None, "") else None
	doc.offer_ends_at = offer_ends_at
	doc.status = "active"
	doc.insert()
	return _serialize(doc)


@frappe.whitelist()
def update_service(service_id, **kwargs):
	user = _current_user()
	doc = _get_service_or_404(service_id)
	_assert_owner(doc, user)

	scalar_fields = ["category_key", "trade_key", "title", "description", "price_type", "duration", "availability", "offer_ends_at"]
	int_fields = ["price", "offer_price"]
	list_fields = {"service_areas": "service_areas_json", "image_urls": "image_urls_json"}

	for f in scalar_fields:
		if f in kwargs:
			setattr(doc, f, kwargs[f])
	for f in int_fields:
		if f in kwargs:
			setattr(doc, f, cint(kwargs[f]) if kwargs[f] not in (None, "") else None)
	for mobile_key, doc_field in list_fields.items():
		if mobile_key in kwargs:
			setattr(doc, doc_field, _to_json_list(kwargs[mobile_key]))

	doc.save(ignore_permissions=True)
	return _serialize(doc)


def _transition_status(service_id, new_status, allowed_from):
	user = _current_user()
	doc = _get_service_or_404(service_id)
	_assert_owner(doc, user)
	if doc.status not in allowed_from:
		frappe.throw(frappe._("Cannot move a service with status '{0}' to '{1}'").format(doc.status, new_status), frappe.ValidationError)
	doc.status = new_status
	doc.save(ignore_permissions=True)
	return _serialize(doc)


@frappe.whitelist()
def pause_service(service_id):
	return _transition_status(service_id, "paused", ("active",))


@frappe.whitelist()
def activate_service(service_id):
	return _transition_status(service_id, "active", ("paused",))


@frappe.whitelist()
def delete_service(service_id):
	user = _current_user()
	doc = _get_service_or_404(service_id)
	_assert_owner(doc, user)
	frappe.delete_doc("Souq Masr Service", service_id, force=1, ignore_permissions=True)
	return {"deleted": True}


@frappe.whitelist(allow_guest=True)
def get_service(service_id):
	doc = _get_service_or_404(service_id)
	is_owner = frappe.session.user == doc.owner
	if doc.status not in PUBLIC_STATUSES and not is_owner:
		frappe.throw(frappe._("Service not found"), frappe.DoesNotExistError)
	return _serialize(doc)


@frappe.whitelist()
def get_my_services(status=None, page=1, limit=PAGE_SIZE_DEFAULT):
	user = _current_user()
	page, limit, offset = _paginate(page, limit)
	filters = {"owner": user}
	if status:
		filters["status"] = status
	total = frappe.db.count("Souq Masr Service", filters)
	rows = frappe.get_all("Souq Masr Service", filters=filters, fields=SUMMARY_FIELDS, order_by="creation desc", limit_start=offset, limit_page_length=limit)
	return {"items": [_serialize_summary(r) for r in rows], "total": total, "page": page, "limit": limit}


# app/services/results.tsx's filter sheet — trade_key وsort كانوا موجودين
# في الواجهة (تصفية بالمهنة الفرعية، ترتيب بالسعر) من غير دعم حقيقي في
# الباك إند، فكان لازم client-side filtering على المصفوفة الوهمية كلها.
def _service_sort_order_by(sort):
	return {
		"newest": "creation desc",
		"price_asc": "price asc, creation desc",
		"price_desc": "price desc, creation desc",
	}.get(sort, "creation desc")


@frappe.whitelist(allow_guest=True)
def search_services(q=None, category_key=None, trade_key=None, price_type=None, sort=None, page=1, limit=PAGE_SIZE_DEFAULT):
	page, limit, offset = _paginate(page, limit)
	filters = {"status": "active"}
	if category_key:
		filters["category_key"] = category_key
	if trade_key:
		filters["trade_key"] = trade_key
	if price_type:
		filters["price_type"] = price_type

	if q and q.strip():
		like = f"%{q.strip()}%"
		names = set(r.name for r in frappe.get_all("Souq Masr Service", filters={**filters, "title": ["like", like]}, fields=["name"]))
		names |= set(r.name for r in frappe.get_all("Souq Masr Service", filters={**filters, "description": ["like", like]}, fields=["name"]))
		if not names:
			return {"items": [], "total": 0, "page": page, "limit": limit}
		filters["name"] = ["in", list(names)]

	total = frappe.db.count("Souq Masr Service", filters)
	rows = frappe.get_all("Souq Masr Service", filters=filters, fields=SUMMARY_FIELDS, order_by=_service_sort_order_by(sort), limit_start=offset, limit_page_length=limit)
	return {"items": [_serialize_summary(r) for r in rows], "total": total, "page": page, "limit": limit}


@frappe.whitelist(allow_guest=True)
def get_services_by_professional(owner, page=1, limit=PAGE_SIZE_DEFAULT):
	page, limit, offset = _paginate(page, limit)
	filters = {"owner": owner, "status": "active"}
	total = frappe.db.count("Souq Masr Service", filters)
	rows = frappe.get_all("Souq Masr Service", filters=filters, fields=SUMMARY_FIELDS, order_by="creation desc", limit_start=offset, limit_page_length=limit)
	return {"items": [_serialize_summary(r) for r in rows], "total": total, "page": page, "limit": limit}
