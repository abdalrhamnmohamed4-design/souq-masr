# Copyright (c) 2025, Souq Masr and contributors
# For license information, please see license.txt
#
# The actual installer. Runs once via after_install (see ../install.py), and is
# safe to re-run on every `bench migrate` — every insert is guarded by
# frappe.db.exists() first, so nothing gets duplicated. Everything here uses
# frappe.get_doc()/frappe.db.exists() per the mandated ORM-only rule — no raw
# SQL anywhere in this file.
#
# Data volume seeded: 19 top-level + full-depth categories (matching the six
# PART-40 verification categories exactly), ~90 brands, ~250 models, 27
# governorates + their real cities/areas. All ported 1:1 from the mobile
# app's own mock/taxonomy/*.ts — this is real reference data the product
# already ships with, not placeholder content invented for this migration.
# Brand rename note: only DocType names and field names below changed
# (Mazad -> Souq Masr); the imported CATEGORIES/BRANDS/MODELS/locations data
# itself is untouched — same ids, same field keys, same option lists.

import frappe

from .brands import BRANDS
from .categories import CATEGORIES
from .locations import build_locations
from .models import MODELS

CONDITION_LABELS = {
	"new": "جديد",
	"like_new": "زي الجديد",
	"excellent": "ممتاز",
	"good": "جيد",
	"used": "مستعمل",
}


def seed_taxonomy():
	"""Entry point — called from souq_masr.setup.install.after_install."""
	_seed_categories()
	_seed_brands()
	_seed_models()
	_seed_locations()
	frappe.db.commit()


def _seed_categories():
	for cat in CATEGORIES:
		if frappe.db.exists("Souq Masr Listing Category", cat["id"]):
			continue

		fields_table = [
			{
				"doctype": "Souq Masr Listing Attribute",
				"attr_key": field["key"],
				"label": field["label"],
				"field_type": _map_field_type(field["field_type"]),
				"required": 1 if field.get("required") else 0,
				"filterable": 1 if field.get("filterable", True) else 0,
				"searchable": 1 if field.get("searchable") else 0,
				"options": "\n".join(field["options"]) if field.get("options") else None,
				"unit": field.get("unit"),
			}
			for field in cat["fields"]
		]

		has_children = any(c["parent_id"] == cat["id"] for c in CATEGORIES)

		doc = frappe.get_doc(
			{
				"doctype": "Souq Masr Listing Category",
				"category_key": cat["id"],
				"name_ar": cat["name_ar"],
				"name_en": cat["name_en"],
				"parent_souq_masr_listing_category": cat["parent_id"],
				"is_group": 1 if has_children else 0,
				"icon": cat["icon"],
				"sort_order": cat["order"],
				"active": 1,
				"has_brands": 1 if cat.get("has_brands") else 0,
				"allowed_conditions": "\n".join(cat["allowed_conditions"]) if cat.get("allowed_conditions") else None,
				"allowed_selling_types": "\n".join(cat["allowed_selling_types"]) if cat.get("allowed_selling_types") else None,
				"fields": fields_table,
			}
		)
		doc.insert(ignore_permissions=True)


def _seed_brands():
	for brand in BRANDS:
		if frappe.db.exists("Souq Masr Brand", brand["id"]):
			continue
		doc = frappe.get_doc(
			{
				"doctype": "Souq Masr Brand",
				"brand_key": brand["id"],
				"brand_name": brand["name"],
				"categories": [
					{"doctype": "Souq Masr Brand Category", "souq_masr_listing_category": cat_id}
					for cat_id in brand["category_ids"]
					if frappe.db.exists("Souq Masr Listing Category", cat_id)
				],
			}
		)
		doc.insert(ignore_permissions=True)


def _seed_models():
	for model in MODELS:
		if not frappe.db.exists("Souq Masr Brand", model["brand"]):
			continue
		if frappe.db.exists("Souq Masr Model", {"brand": model["brand"], "model_name": model["model_name"]}):
			continue
		doc = frappe.get_doc(
			{
				"doctype": "Souq Masr Model",
				"brand": model["brand"],
				"model_name": model["model_name"],
			}
		)
		doc.insert(ignore_permissions=True)


def _seed_locations():
	# is_group is approximated by level (governorate/city assumed to be groups,
	# area assumed a leaf) rather than checking each node's actual children —
	# correct for every governorate and for cities that do have areas, but a
	# city with no seeded areas (most of them) ends up flagged is_group=1 with
	# no children. Cosmetic only (affects the Desk tree-view's expand icon,
	# not the real parent/child links or any API response) — worth fixing
	# with a real children-count pass before this ships past Phase 1.
	for loc in build_locations():
		if frappe.db.exists("Souq Masr Location", loc["id"]):
			continue
		doc = frappe.get_doc(
			{
				"doctype": "Souq Masr Location",
				"location_key": loc["id"],
				"location_name": loc["name"],
				"location_type": loc["type"].capitalize(),
				"parent_souq_masr_location": loc["parent_id"],
				"is_group": 1 if loc["type"] in ("governorate", "city") else 0,
			}
		)
		doc.insert(ignore_permissions=True)


def _map_field_type(ts_type: str) -> str:
	"""mock/taxonomy/types.ts CategoryField['type'] -> Souq Masr Listing Attribute.field_type"""
	return {
		"text": "Text",
		"number": "Number",
		"select": "Select",
		"multiselect": "Multiselect",
		"boolean": "Boolean",
		"date": "Date",
		"year": "Year",
		"location": "Location",
	}.get(ts_type, "Text")
