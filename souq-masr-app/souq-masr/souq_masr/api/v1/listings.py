# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Phase 2B — real Listing CRUD + discovery. Mutations (create/update/delete/
# pause/activate/mark_sold) are NOT allow_guest — Frappe's own dispatch
# layer rejects a Guest session before this code even runs (see
# souq_masr.api.v1.auth's module docstring for why token auth, not cookies).
# Every mutation ALSO re-checks ownership explicitly in Python (defense in
# depth on top of the DocType's own "All" + if_owner permission rows — see
# souq_masr_listing.json) and every insert()/save() here runs WITHOUT
# ignore_permissions, so Frappe's own permission engine is a second,
# independent enforcement layer, not just this file's own if-checks.
#
# Read endpoints (get_listing/get_public_listings/search_listings/
# get_listings_by_category/get_listings_by_location) are allow_guest=True —
# a Guest only ever sees Active/Paused/Sold listings (never Draft/Rejected,
# and never someone else's Draft), matching "Guest can read only public
# listings" exactly.

import json

import frappe
from frappe.utils import cint, flt

# إعادة استخدام حقيقي لمنطق الشجرة الموجود بالفعل (get_descendant_ids) —
# مش نسخة تانية من نفس المنطق. Phase 2B Slice 2: search_listings/
# get_listings_by_category محتاجين "التصنيف ده وكل فروعه" مش تطابق حرفي
# بس (نفس فكرة app/results.tsx's القديمة اللي كانت بتعمل الحساب ده محليًا
# عن طريق mock/taxonomy/categories.ts's getAllDescendantIds).
from souq_masr.api.v1 import taxonomy

PUBLIC_STATUSES = ("Active", "Paused", "Sold")
PAGE_SIZE_DEFAULT = 20
PAGE_SIZE_MAX = 50

SORT_ORDER_BY = {
	"newest": "creation desc",
	"cheapest": "price asc",
	"priciest": "price desc",
	"mostViewed": "views desc",
}


# ============================================================ helpers


def _current_user():
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(frappe._("Sign in required"), frappe.PermissionError)
	return user


def _parse_json_param(value):
	"""POST بـJSON body بيوصل الـlist/dict جاهزين فعليًا (frappe.form_dict
	من json.loads(request.data) مباشرة) — بس بنتعامل مع احتمال نص JSON
	خام كمان (لو النداء جه بطريقة تانية) من غير ما نكسر على أي شكل."""
	if value is None or value == "":
		return None
	if isinstance(value, (list, dict)):
		return value
	try:
		return json.loads(value)
	except (TypeError, ValueError):
		frappe.throw(frappe._("Malformed JSON parameter"), frappe.ValidationError)


def _get_listing_or_404(listing_id: str):
	if not listing_id or not frappe.db.exists("Souq Masr Listing", listing_id):
		frappe.throw(frappe._("Listing not found"), frappe.DoesNotExistError)
	return frappe.get_doc("Souq Masr Listing", listing_id)


def _assert_owner(doc, user):
	if doc.owner != user:
		frappe.throw(frappe._("You do not have permission to modify this listing"), frappe.PermissionError)


def _resolve_location_display(location_key: str):
	"""بترجع (اسم المحافظة، اسم أعمق مستوى لو مختلف عن المحافظة) — نفس
	فكرة get_location_path (taxonomy.py) بالظبط، هنا كنداء داخلي من غير
	HTTP إضافي، عشان get_listing/search_listings يقدروا يعرضوا
	city/district زي ما mobile Listing.city/district القديمين بالظبط."""
	path = []
	current = location_key
	while current:
		if not frappe.db.exists("Souq Masr Location", current):
			break
		row = frappe.db.get_value(
			"Souq Masr Location", current, ["location_key", "location_name", "parent_souq_masr_location"], as_dict=True
		)
		path.insert(0, {"id": row.location_key, "name": row.location_name})
		current = row.parent_souq_masr_location
	governorate = path[0]["name"] if path else ""
	district = path[-1]["name"] if len(path) > 1 else None
	return governorate, district


def _phone_visible_to_viewer(seller: str, listing_id: str):
	"""لقيّة حقيقية اتصلحت وقت بناء Phase 2B Slice 4 (خصوصية رقم الهاتف،
	القسم 6 من الطلب): get_listing كانت بترجّع رقم البائع لأي حد شايف
	الإعلان — حتى Guest — من غير أي فحص خصوصية خالص، من Slice 1. القاعدة
	دلوقتي: الرقم بيتكشف لصاحب الإعلان نفسه (شايف إعلانه هو)، أو لمستخدم
	عنده محادثة حقيقية (Souq Masr Conversation) مع البائع ده بخصوص
	الإعلان ده بالذات — يعني لازم يكون بدأ شات فعلي، مش مجرد تصفّح.
	Guest ومستخدم عادي متصفّح من غير محادثة، الاتنين ميشوفوش الرقم."""
	viewer = frappe.session.user
	if viewer == "Guest":
		return False
	if viewer == seller:
		return True
	return bool(
		frappe.db.exists(
			"Souq Masr Conversation",
			{"listing": listing_id, "buyer": ["in", (viewer,)], "seller": seller},
		)
		or frappe.db.exists(
			"Souq Masr Conversation",
			{"listing": listing_id, "seller": ["in", (viewer,)], "buyer": seller},
		)
	)


def _seller_public_info(user: str, listing_id: str = None):
	row = frappe.db.get_value("User", user, ["first_name", "mobile_no", "creation"], as_dict=True)
	if not row:
		return {"id": user, "name": "", "phone": None, "member_since": "", "ads_count": 0}
	ads_count = frappe.db.count("Souq Masr Listing", {"owner": user, "status": "Active"})
	reveal_phone = listing_id is not None and _phone_visible_to_viewer(user, listing_id)
	return {
		"id": user,
		"name": row.first_name or "",
		"phone": row.mobile_no if reveal_phone else None,
		"member_since": frappe.utils.formatdate(row.creation, "MMMM yyyy") if row.creation else "",
		"ads_count": ads_count,
	}


def _serialize(doc):
	governorate, district = _resolve_location_display(doc.location) if doc.location else ("", None)
	return {
		"id": doc.name,
		"title": doc.title,
		"description": doc.description or "",
		"status": doc.status,
		"price": flt(doc.price),
		"price_type": doc.price_type,
		"selling_type": doc.selling_type or None,
		"condition": doc.condition or None,
		"category_key": doc.category,
		"brand_id": doc.brand or None,
		"model_id": doc.model or None,
		"location_id": doc.location,
		"governorate": governorate,
		"district": district,
		"views": cint(doc.views),
		"seller_type": doc.seller_type,
		"brand_name": doc.brand_name or None,
		"wholesale_price": flt(doc.wholesale_price) if doc.wholesale_price else None,
		"min_wholesale_qty": cint(doc.min_wholesale_qty) if doc.min_wholesale_qty else None,
		"discount_price": flt(doc.discount_price) if doc.discount_price else None,
		"discount_ends_at": str(doc.discount_ends_at) if doc.discount_ends_at else None,
		"images": [row.image for row in doc.images],
		"attributes": {row.attr_key: row.value for row in doc.attributes},
		"created_at": str(doc.creation),
		"updated_at": str(doc.modified),
		"seller": _seller_public_info(doc.owner, doc.name),
		"is_owner": frappe.session.user == doc.owner,
		"is_favorite": _is_favorited_by_current_user(doc.name),
	}


def _is_favorited_by_current_user(listing_id):
	"""فحص مباشر (frappe.db.exists) مش import من favorites.py — استيراد
	عكسي كان هيسبب دورة (favorites.py أصلًا بتعمل import من listings.py
	لـ_serialize_summary/PUBLIC_STATUSES). Guest دايمًا False من غير ما
	يحتاج نداء قاعدة بيانات أصلًا."""
	if frappe.session.user == "Guest":
		return False
	return bool(frappe.db.exists("Souq Masr Listing Favorite", {"listing": listing_id, "owner": frappe.session.user}))


def _favorited_ids_for_current_user(listing_ids):
	"""نداء واحد يجيب كل مفضّلات المستخدم الحالي من ضمن المجموعة دي —
	مش نداء frappe.db.exists لكل صف لوحده (N+1) في أي قايمة نتايج."""
	if frappe.session.user == "Guest" or not listing_ids:
		return set()
	return set(
		frappe.get_all(
			"Souq Masr Listing Favorite",
			filters={"owner": frappe.session.user, "listing": ["in", listing_ids]},
			pluck="listing",
		)
	)


def _serialize_summary(row, favorited_ids=None):
	"""نسخة مختصرة لقوايم النتائج (search/public/by_category/by_location) —
	من غير attributes/images الكاملة، زي أي endpoint تجميعي تاني في
	المشروع (get_children's summary vs get_category's detail).
	favorited_ids: set محسوبة مرة واحدة لكل الصفحة (شوف
	_favorited_ids_for_current_user) — None يعني "مفيش سياق مفضّلة"
	(get_my_favorites بيمرّر True مباشرة، كل عنصر فيها مفضّل بالتعريف)."""
	governorate, district = _resolve_location_display(row.location) if row.location else ("", None)
	thumb = frappe.db.get_value("Souq Masr Listing Image", {"parent": row.name}, "image", order_by="idx asc")
	is_favorite = True if favorited_ids is True else (row.name in favorited_ids if favorited_ids is not None else False)
	return {
		"id": row.name,
		"title": row.title,
		"price": flt(row.price),
		"price_type": row.price_type,
		"condition": row.condition or None,
		"category_key": row.category,
		"governorate": governorate,
		"district": district,
		"thumb": thumb,
		"views": cint(row.views),
		"status": row.status,
		"created_at": str(row.creation),
		"is_favorite": is_favorite,
	}


def _attach_images(doc, urls, user: str):
	if not urls:
		return
	for url in urls:
		file_row = frappe.db.get_value("File", {"file_url": url}, ["name", "owner"], as_dict=True)
		if not file_row:
			frappe.throw(
				frappe._("Image not found: {0} — upload it first via /api/method/upload_file").format(url),
				frappe.ValidationError,
			)
		if file_row.owner != user:
			frappe.throw(frappe._("You can only attach images you uploaded yourself"), frappe.PermissionError)
		doc.append("images", {"image": url})


def _validate_taxonomy_refs(category, location, brand, model):
	if not category or not frappe.db.exists("Souq Masr Listing Category", category):
		frappe.throw(frappe._("Invalid category"), frappe.ValidationError)
	if not location or not frappe.db.exists("Souq Masr Location", location):
		frappe.throw(frappe._("Invalid location"), frappe.ValidationError)
	if brand and not frappe.db.exists("Souq Masr Brand", brand):
		frappe.throw(frappe._("Invalid brand"), frappe.ValidationError)
	if model and not frappe.db.exists("Souq Masr Model", model):
		frappe.throw(frappe._("Invalid model"), frappe.ValidationError)


def _paginate(page, limit):
	page = cint(page) or 1
	limit = min(cint(limit) or PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX)
	if page < 1:
		page = 1
	return page, limit, (page - 1) * limit


def _sort_order_by(sort):
	"""'newest'|'cheapest'|'priciest'|'mostViewed' — قيمة غير معروفة أو
	فاضية بترجع لـnewest بأمان (نفس افتراضي app/results.tsx's SortKey).
	'nearest'/'favoritesFirst' (مطلوبين في results.tsx) مش هنا عمدًا —
	الأول محتاج إحداثيات جهاز مش متجمّعة، والتاني محتاج نظام Favorites
	حقيقي على السيرفر (خارج نطاق الـslice دي بالكامل) — الاتنين لسه
	بيترتّبوا client-side على الصفحة الحالية بس، موثّق في التقرير."""
	return SORT_ORDER_BY.get(sort, SORT_ORDER_BY["newest"])


def _expand_category(category_key):
	"""التصنيف ده + كل فروعه — إعادة استخدام taxonomy.get_descendant_ids
	مباشرة (نداء Python عادي، مش HTTP) بدل ما نعيد كتابة نفس المنطق."""
	return taxonomy.get_descendant_ids(category_key)


# ============================================================ mutations (auth required)


@frappe.whitelist()
def create_listing(
	title,
	category,
	location,
	price=0,
	price_type="negotiable",
	description="",
	brand=None,
	model=None,
	selling_type=None,
	condition=None,
	seller_type="individual",
	brand_name=None,
	wholesale_price=None,
	min_wholesale_qty=None,
	discount_price=None,
	discount_ends_at=None,
	attributes=None,
	image_urls=None,
):
	user = _current_user()
	title = (title or "").strip()
	if len(title) < 3:
		frappe.throw(frappe._("Title must be at least 3 characters"), frappe.ValidationError)

	_validate_taxonomy_refs(category, location, brand, model)

	doc = frappe.new_doc("Souq Masr Listing")
	doc.title = title
	doc.description = description or ""
	doc.category = category
	doc.brand = brand or None
	doc.model = model or None
	doc.location = location
	doc.price = flt(price)
	doc.price_type = price_type
	doc.selling_type = selling_type or None
	doc.condition = condition or None
	doc.status = "Active"
	doc.seller_type = seller_type or "individual"
	doc.brand_name = brand_name or None
	doc.wholesale_price = flt(wholesale_price) if wholesale_price else None
	doc.min_wholesale_qty = cint(min_wholesale_qty) if min_wholesale_qty else None
	doc.discount_price = flt(discount_price) if discount_price else None
	doc.discount_ends_at = discount_ends_at or None

	for key, value in (_parse_json_param(attributes) or {}).items():
		doc.append("attributes", {"attr_key": key, "value": value})

	_attach_images(doc, _parse_json_param(image_urls) or [], user)

	doc.insert()  # respects DocType permissions — real enforcement, not ignore_permissions
	return _serialize(doc)


@frappe.whitelist()
def update_listing(
	listing_id,
	title=None,
	category=None,
	location=None,
	price=None,
	price_type=None,
	description=None,
	brand=None,
	model=None,
	selling_type=None,
	condition=None,
	brand_name=None,
	wholesale_price=None,
	min_wholesale_qty=None,
	discount_price=None,
	discount_ends_at=None,
	attributes=None,
	image_urls=None,
):
	user = _current_user()
	doc = _get_listing_or_404(listing_id)
	_assert_owner(doc, user)

	if title is not None:
		title = title.strip()
		if len(title) < 3:
			frappe.throw(frappe._("Title must be at least 3 characters"), frappe.ValidationError)
		doc.title = title
	if category is not None or location is not None or brand is not None or model is not None:
		_validate_taxonomy_refs(
			category if category is not None else doc.category,
			location if location is not None else doc.location,
			brand if brand is not None else doc.brand,
			model if model is not None else doc.model,
		)
	if category is not None:
		doc.category = category
	if location is not None:
		doc.location = location
	if brand is not None:
		doc.brand = brand or None
	if model is not None:
		doc.model = model or None
	if price is not None:
		doc.price = flt(price)
	if price_type is not None:
		doc.price_type = price_type
	if description is not None:
		doc.description = description
	if selling_type is not None:
		doc.selling_type = selling_type or None
	if condition is not None:
		doc.condition = condition or None
	if brand_name is not None:
		doc.brand_name = brand_name or None
	if wholesale_price is not None:
		doc.wholesale_price = flt(wholesale_price) or None
	if min_wholesale_qty is not None:
		doc.min_wholesale_qty = cint(min_wholesale_qty) or None
	if discount_price is not None:
		doc.discount_price = flt(discount_price) or None
	if discount_ends_at is not None:
		doc.discount_ends_at = discount_ends_at or None

	parsed_attrs = _parse_json_param(attributes)
	if parsed_attrs is not None:
		doc.set("attributes", [])
		for key, value in parsed_attrs.items():
			doc.append("attributes", {"attr_key": key, "value": value})

	parsed_urls = _parse_json_param(image_urls)
	if parsed_urls is not None:
		doc.set("images", [])
		_attach_images(doc, parsed_urls, user)

	doc.save()
	return _serialize(doc)


@frappe.whitelist()
def delete_listing(listing_id):
	user = _current_user()
	doc = _get_listing_or_404(listing_id)
	_assert_owner(doc, user)
	# force=1: من غير كده Frappe بيرفض الحذف بـLinkExistsError لو فيه أي
	# Souq Masr Listing Favorite أو Souq Masr Listing Report بيشاور على
	# الإعلان ده (اكتُشفت الحالة دي فعليًا وقت اختبار Phase 2B Slice 3 —
	# Report لازم يفضل موجود كسجل حتى لو الإعلان اتشال بعد كده، مش يتحذف
	# معاه). الملكية اتأكدت فوق بالفعل، فـignore_permissions هنا آمن —
	# نفس المبدأ المتّبع في كل مكان تاني بالمشروع (فحص صريح في بايثون
	# قبل أي عملية، مش الاعتماد على Frappe's engine بمفرده).
	frappe.delete_doc("Souq Masr Listing", listing_id, force=1, ignore_permissions=True)
	return {"deleted": True, "id": listing_id}


def _transition_status(listing_id, new_status, allowed_from):
	user = _current_user()
	doc = _get_listing_or_404(listing_id)
	_assert_owner(doc, user)
	if doc.status not in allowed_from:
		frappe.throw(
			frappe._("Cannot move listing from status '{0}' to '{1}'").format(doc.status, new_status),
			frappe.ValidationError,
		)
	doc.status = new_status
	doc.save()
	return _serialize(doc)


@frappe.whitelist()
def pause_listing(listing_id):
	return _transition_status(listing_id, "Paused", allowed_from=("Active",))


@frappe.whitelist()
def activate_listing(listing_id):
	return _transition_status(listing_id, "Active", allowed_from=("Paused", "Draft"))


@frappe.whitelist()
def mark_listing_sold(listing_id):
	return _transition_status(listing_id, "Sold", allowed_from=("Active", "Paused"))


@frappe.whitelist()
def get_my_listings(status=None, page=1, limit=PAGE_SIZE_DEFAULT):
	user = _current_user()
	page, limit, offset = _paginate(page, limit)
	filters = {"owner": user}
	if status:
		filters["status"] = status
	total = frappe.db.count("Souq Masr Listing", filters)
	rows = frappe.get_all(
		"Souq Masr Listing",
		filters=filters,
		fields=["name", "title", "price", "price_type", "condition", "category", "location", "views", "status", "creation"],
		order_by="modified desc",
		limit_start=offset,
		limit_page_length=limit,
	)
	favorited_ids = _favorited_ids_for_current_user([r.name for r in rows])
	return {"items": [_serialize_summary(r, favorited_ids) for r in rows], "total": total, "page": page, "limit": limit}


# ============================================================ reads (Guest allowed)


@frappe.whitelist(allow_guest=True)
def get_listing(listing_id):
	doc = _get_listing_or_404(listing_id)
	is_owner = frappe.session.user == doc.owner
	if doc.status not in PUBLIC_STATUSES and not is_owner:
		# Draft/Rejected مش عام — بس ظاهر لصاحبه بس، زي ما القسم 3 من
		# الطلب بيطلب بالظبط ("Guest can read only public listings").
		frappe.throw(frappe._("Listing not found"), frappe.DoesNotExistError)
	return _serialize(doc)


@frappe.whitelist(allow_guest=True)
def get_public_listings(page=1, limit=PAGE_SIZE_DEFAULT, sort=None):
	page, limit, offset = _paginate(page, limit)
	filters = {"status": "Active"}
	total = frappe.db.count("Souq Masr Listing", filters)
	rows = frappe.get_all(
		"Souq Masr Listing",
		filters=filters,
		fields=["name", "title", "price", "price_type", "condition", "category", "location", "views", "status", "creation"],
		order_by=_sort_order_by(sort),
		limit_start=offset,
		limit_page_length=limit,
	)
	favorited_ids = _favorited_ids_for_current_user([r.name for r in rows])
	return {"items": [_serialize_summary(r, favorited_ids) for r in rows], "total": total, "page": page, "limit": limit}


@frappe.whitelist(allow_guest=True)
def search_listings(q=None, category_key=None, condition=None, field_filters=None, city_governorate=None, sort=None, page=1, limit=PAGE_SIZE_DEFAULT):
	"""مطابق لروح app/results.tsx's الحالي: بحث نصي + تصنيف (+ كل فروعه) +
	حالة + فلاتر ديناميكية (attributes) + محافظة + ترتيب، كلهم اختياريين
	ومجتمعين مع بعض."""
	page, limit, offset = _paginate(page, limit)
	listing_names = None
	parsed_field_filters = _parse_json_param(field_filters) or {}
	if parsed_field_filters:
		for key, value in parsed_field_filters.items():
			matching = set(
				frappe.get_all(
					"Souq Masr Listing Attribute Value",
					filters={"attr_key": key, "value": value},
					pluck="parent",
				)
			)
			listing_names = matching if listing_names is None else (listing_names & matching)
		if not listing_names:
			return {"items": [], "total": 0, "page": page, "limit": limit}

	base_filters = {"status": "Active"}
	if category_key:
		# التصنيف ده + كل فروعه — بحث في "سيارات" لازم يرجّع نتايج من
		# "سيدان"/"دفع رباعي"... مش بس تطابق حرفي، زي results.tsx's
		# getAllDescendantIds المحلية القديمة بالظبط (بس من السيرفر دلوقتي).
		base_filters["category"] = ["in", _expand_category(category_key)]
	if condition:
		base_filters["condition"] = condition
	if listing_names is not None:
		base_filters["name"] = ["in", list(listing_names)]

	if city_governorate:
		# مواقع تحت المحافظة دي — نفس فكرة get_descendant_ids بس للمواقع،
		# بنحسبها هنا محليًا (مفيش حاجة لنداء API منفصل من جوه الباك إند لنفسه).
		gov_and_children = _location_and_descendants(city_governorate)
		base_filters["location"] = ["in", gov_and_children]

	# or_filters (عنوان أو وصف) بيتجمّع مع base_filters (AND) — بحث نصي
	# حقيقي عبر الحقلين مش العنوان بس.
	or_filters = [["title", "like", f"%{q}%"], ["description", "like", f"%{q}%"]] if q else None

	if or_filters:
		# frappe.db.count مبيدعمش or_filters — بنعدّ بنفس فلاتر get_all
		# عبر get_all's pluck بدل count المباشر في الحالة دي بس.
		total = len(frappe.get_all("Souq Masr Listing", filters=base_filters, or_filters=or_filters, pluck="name"))
	else:
		total = frappe.db.count("Souq Masr Listing", base_filters)
	rows = frappe.get_all(
		"Souq Masr Listing",
		filters=base_filters,
		or_filters=or_filters,
		fields=["name", "title", "price", "price_type", "condition", "category", "location", "views", "status", "creation"],
		order_by=_sort_order_by(sort),
		limit_start=offset,
		limit_page_length=limit,
	)
	favorited_ids = _favorited_ids_for_current_user([r.name for r in rows])
	return {"items": [_serialize_summary(r, favorited_ids) for r in rows], "total": total, "page": page, "limit": limit}


def _location_and_descendants(location_key):
	ids = [location_key]
	children = frappe.get_all("Souq Masr Location", filters={"parent_souq_masr_location": location_key}, pluck="location_key")
	for child_id in children:
		ids.extend(_location_and_descendants(child_id))
	return ids


@frappe.whitelist(allow_guest=True)
def get_listings_by_category(category_key, page=1, limit=PAGE_SIZE_DEFAULT, sort=None):
	return search_listings(category_key=category_key, page=page, limit=limit, sort=sort)


@frappe.whitelist(allow_guest=True)
def get_listings_by_location(location_key, page=1, limit=PAGE_SIZE_DEFAULT, sort=None):
	page, limit, offset = _paginate(page, limit)
	ids = _location_and_descendants(location_key)
	filters = {"status": "Active", "location": ["in", ids]}
	total = frappe.db.count("Souq Masr Listing", filters)
	rows = frappe.get_all(
		"Souq Masr Listing",
		filters=filters,
		fields=["name", "title", "price", "price_type", "condition", "category", "location", "views", "status", "creation"],
		order_by=_sort_order_by(sort),
		limit_start=offset,
		limit_page_length=limit,
	)
	favorited_ids = _favorited_ids_for_current_user([r.name for r in rows])
	return {"items": [_serialize_summary(r, favorited_ids) for r in rows], "total": total, "page": page, "limit": limit}


@frappe.whitelist(allow_guest=True)
def increment_listing_views(listing_id):
	"""مش بوابة ملكية — أي حد (حتى Guest) بيشوف إعلان عام بيزوّد عداده،
	زي أي منصة إعلانات — بس لازم يكون Active/Paused/Sold (عام) مش Draft
	حد تاني، فبنمر بنفس فحص get_listing's public-visibility الأول."""
	doc = _get_listing_or_404(listing_id)
	is_owner = frappe.session.user == doc.owner
	if doc.status not in PUBLIC_STATUSES and not is_owner:
		frappe.throw(frappe._("Listing not found"), frappe.DoesNotExistError)
	frappe.db.set_value("Souq Masr Listing", listing_id, "views", cint(doc.views) + 1, update_modified=False)
	return {"views": cint(doc.views) + 1}
