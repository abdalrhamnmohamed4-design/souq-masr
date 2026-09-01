# Copyright (c) 2025, Souq Masr and contributors
# For license information, please see license.txt
#
# Read-only taxonomy endpoints. All allow_guest=True on purpose — the mobile
# app's own product principle (see mock/jobs/types.ts's CareerProfile comment:
# "تصفّح الأول بدون إجبار" / browse first, don't force login) means category/
# brand/location browsing has to work before anyone signs in. Nothing here
# mutates anything, so there's no permission risk in exposing it to guests.

import frappe


@frappe.whitelist(allow_guest=True)
def get_children(parent=None):
	"""Top-level categories if parent is empty, else that category's direct children —
	mirrors mock/taxonomy/categories.ts's getChildren()."""
	filters = {"parent_souq_masr_listing_category": parent or ""}
	return frappe.get_all(
		"Souq Masr Listing Category",
		filters=filters,
		fields=["category_key as id", "name_ar", "name_en", "icon", "sort_order", "is_group", "has_brands"],
		order_by="sort_order asc",
	)


@frappe.whitelist(allow_guest=True)
def get_category(category_key: str):
	"""Full category detail including its dynamic attribute definitions — this is
	what the post-ad wizard's Attributes step and the results screen's dynamic
	filter sheet both render directly from."""
	if not frappe.db.exists("Souq Masr Listing Category", category_key):
		frappe.throw(frappe._("Category not found"), frappe.DoesNotExistError)

	doc = frappe.get_doc("Souq Masr Listing Category", category_key)
	return {
		"id": doc.category_key,
		"name_ar": doc.name_ar,
		"name_en": doc.name_en,
		"parent_id": doc.parent_souq_masr_listing_category or None,
		"icon": doc.icon,
		"has_brands": bool(doc.has_brands),
		"allowed_conditions": (doc.allowed_conditions or "").splitlines() or None,
		"allowed_selling_types": (doc.allowed_selling_types or "").splitlines() or None,
		"fields": [
			{
				"key": row.attr_key,
				"label": row.label,
				"type": row.field_type,
				"required": bool(row.required),
				"filterable": bool(row.filterable),
				"searchable": bool(row.searchable),
				"options": (row.options or "").splitlines() or None,
				"unit": row.unit or None,
			}
			for row in doc.fields
		],
	}


@frappe.whitelist(allow_guest=True)
def get_path(category_key: str):
	"""Breadcrumb from root to this category — mirrors getPath()."""
	path = []
	current = category_key
	while current:
		if not frappe.db.exists("Souq Masr Listing Category", current):
			break
		row = frappe.db.get_value(
			"Souq Masr Listing Category", current, ["category_key", "name_ar", "parent_souq_masr_listing_category"], as_dict=True
		)
		path.insert(0, {"id": row.category_key, "name": row.name_ar})
		current = row.parent_souq_masr_listing_category
	return path


@frappe.whitelist(allow_guest=True)
def get_descendant_ids(category_key: str):
	"""mirrors getAllDescendantIds() — added during the Phase 1 mobile-API
	cross-check (see PHASE_1_MOBILE_API_MAPPING.md): three real screens
	(home, the categories tab, results) scope a listing search to "this
	category and everything under it" and had no endpoint for that at all
	before this. Includes category_key itself, matching the mobile helper's
	own documented behavior exactly."""
	if not frappe.db.exists("Souq Masr Listing Category", category_key):
		return []
	ids = [category_key]
	direct_children = frappe.get_all(
		"Souq Masr Listing Category", filters={"parent_souq_masr_listing_category": category_key}, pluck="category_key"
	)
	for child_id in direct_children:
		ids.extend(get_descendant_ids(child_id))
	return ids


@frappe.whitelist(allow_guest=True)
def search_categories(q: str, limit=30):
	"""Matches mock/taxonomy behavior used by the post-ad wizard's category search box.
	limit is cast explicitly rather than relying on the `int` type hint alone —
	query-string params always arrive as strings, and whether Frappe's automatic
	whitelisted-method type coercion reliably covers every case isn't something
	verifiable without a live instance, so this doesn't depend on it either way."""
	q = (q or "").strip()
	if not q:
		return []
	limit = int(limit) if limit else 30
	return frappe.get_all(
		"Souq Masr Listing Category",
		or_filters=[["name_ar", "like", f"%{q}%"], ["name_en", "like", f"%{q}%"]],
		fields=["category_key as id", "name_ar", "name_en", "icon"],
		limit=limit,
	)


@frappe.whitelist(allow_guest=True)
def get_brands_for_category(category_key: str):
	"""mirrors getBrandsForCategory(). Deliberately a two-step query (find matching
	child rows, then fetch their parents) rather than a dotted child-table filter —
	this is the pattern I can actually verify is correct get_all/get_list usage;
	the shorthand dotted-filter syntax varies enough across Frappe versions that
	guessing at it here, with no live instance to test against, isn't worth the
	risk of shipping code that looks right but silently returns nothing."""
	brand_names = frappe.get_all(
		"Souq Masr Brand Category",
		filters={"souq_masr_listing_category": category_key},
		pluck="parent",
	)
	if not brand_names:
		return []
	return frappe.get_all(
		"Souq Masr Brand",
		filters={"name": ["in", brand_names]},
		fields=["brand_key as id", "brand_name as name", "logo"],
		order_by="brand_name asc",
	)


@frappe.whitelist(allow_guest=True)
def get_models_for_brand(brand_key: str):
	"""mirrors getModelsForBrand()."""
	return frappe.get_all(
		"Souq Masr Model",
		filters={"brand": brand_key},
		fields=["name as id", "model_name as name"],
		order_by="model_name asc",
	)


@frappe.whitelist(allow_guest=True)
def get_governorates():
	return frappe.get_all(
		"Souq Masr Location",
		filters={"location_type": "Governorate"},
		fields=["location_key as id", "location_name as name"],
		order_by="location_name asc",
	)


@frappe.whitelist(allow_guest=True)
def get_location_children(parent: str):
	return frappe.get_all(
		"Souq Masr Location",
		filters={"parent_souq_masr_location": parent},
		fields=["location_key as id", "location_name as name", "location_type"],
		order_by="location_name asc",
	)


@frappe.whitelist(allow_guest=True)
def search_locations(q: str, limit=30):
	"""mirrors searchLocations() — search across governorate/city/area together,
	not scoped to whichever level happens to be on screen (the mobile app's
	LocationPicker explicitly relies on this "search everything at once"
	behavior, matching the OpenSooq-style UX it was built against)."""
	q = (q or "").strip()
	if not q:
		return []
	limit = int(limit) if limit else 30
	return frappe.get_all(
		"Souq Masr Location",
		filters=[["location_name", "like", f"%{q}%"]],
		fields=["location_key as id", "location_name as name", "location_type", "parent_souq_masr_location as parent_id"],
		limit=limit,
	)
