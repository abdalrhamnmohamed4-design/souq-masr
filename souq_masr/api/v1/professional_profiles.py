# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Services vertical — professional/tradesperson profile. One per owner
# (upsert). No blanket DocType read (raw `owner` is phone-derived, same
# reasoning as reviews.py/companies.py) — public reads go through
# get_professional_profile only.
#
# Phone here is NOT privacy-gated like Listings/Career Profile — a
# professional profile IS a public "hire me" business card by design
# (same as Souq Masr Company), matching the existing mock UI which shows
# provider.phone unconditionally to any viewer.

import json

import frappe


def _current_user():
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(frappe._("Sign in required"), frappe.PermissionError)
	return user


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


def _serialize(doc):
	return {
		"id": doc.name,
		"owner": doc.owner,
		"name": doc.name1,
		"trade_key": doc.trade_key,
		"photo": doc.photo,
		"description": doc.description or "",
		"years_experience": doc.years_experience,
		"skills": _parse_json_list(doc.skills_json),
		"service_areas": _parse_json_list(doc.service_areas_json),
		"price_starting_from": doc.price_starting_from,
		"availability": doc.availability or "",
		"working_hours": doc.working_hours or "",
		"phone": doc.phone or "",
		"whatsapp": doc.whatsapp or "",
		"verification": doc.verification,
		"is_owner": frappe.session.user == doc.owner,
	}


@frappe.whitelist()
def create_or_update_my_profile(name, description, trade_key=None, photo=None, years_experience=None, skills=None, service_areas=None, price_starting_from=None, availability=None, working_hours=None, phone=None, whatsapp=None):
	user = _current_user()
	name = (name or "").strip()
	if len(name) < 2:
		frappe.throw(frappe._("Name is required"), frappe.ValidationError)

	existing = frappe.db.exists("Souq Masr Professional Profile", {"owner": user})
	doc = frappe.get_doc("Souq Masr Professional Profile", existing) if existing else frappe.new_doc("Souq Masr Professional Profile")
	doc.name1 = name
	doc.trade_key = trade_key
	doc.description = (description or "").strip()
	doc.years_experience = frappe.utils.cint(years_experience) if years_experience not in (None, "") else None
	doc.skills_json = _to_json_list(skills)
	doc.service_areas_json = _to_json_list(service_areas)
	doc.price_starting_from = frappe.utils.cint(price_starting_from) if price_starting_from not in (None, "") else None
	doc.availability = availability
	doc.working_hours = working_hours
	doc.phone = phone
	doc.whatsapp = whatsapp
	if photo is not None:
		doc.photo = photo
	if existing:
		doc.save(ignore_permissions=True)
	else:
		doc.insert()
	return _serialize(doc)


@frappe.whitelist()
def get_my_profile():
	user = _current_user()
	existing = frappe.db.exists("Souq Masr Professional Profile", {"owner": user})
	if not existing:
		return {"profile": None}
	return {"profile": _serialize(frappe.get_doc("Souq Masr Professional Profile", existing))}


@frappe.whitelist(allow_guest=True)
def get_professional_profile(profile_id):
	if not profile_id or not frappe.db.exists("Souq Masr Professional Profile", profile_id):
		frappe.throw(frappe._("Profile not found"), frappe.DoesNotExistError)
	return _serialize(frappe.get_doc("Souq Masr Professional Profile", profile_id))


@frappe.whitelist(allow_guest=True)
def get_professional_profile_by_owner(owner):
	"""بديل مباشر للاستخدام مع Frappe User id بدل Professional Profile's
	الاسم الداخلي — app/services/professional/[id].tsx's مسار 'me' القديم
	بيستخدم user id مش اسم Profile، فده أسهل نقطة دخول من الموبايل."""
	existing = frappe.db.exists("Souq Masr Professional Profile", {"owner": owner})
	if not existing:
		frappe.throw(frappe._("Profile not found"), frappe.DoesNotExistError)
	return _serialize(frappe.get_doc("Souq Masr Professional Profile", existing))
