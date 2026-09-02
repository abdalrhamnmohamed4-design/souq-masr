# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Jobs vertical — Company (employer) profile. One company per owner
# (upsert, see souq_masr_company.py's validate()). Public reads go
# through get_company only (allow_guest) — Souq Masr Company's DocType
# permissions grant no blanket read, matching the same
# "custom-serialization-only" convention as sellers.py/reviews.py.

import frappe


def _current_user():
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(frappe._("Sign in required"), frappe.PermissionError)
	return user


def _serialize(doc):
	return {
		"id": doc.name,
		"owner": doc.owner if frappe.session.user == doc.owner else None,
		"name": doc.name1,
		"description": doc.description or "",
		"industry": doc.industry or "",
		"size": doc.size,
		"city": doc.city or "",
		"website": doc.website or "",
		"phone": doc.phone or "",
		"email": doc.email or "",
		"working_hours": doc.working_hours or "",
		"logo": doc.logo,
		"cover": doc.cover,
		"verification": doc.verification,
		"is_owner": frappe.session.user == doc.owner,
	}


@frappe.whitelist()
def create_or_update_my_company(name, description, industry=None, size=None, city=None, website=None, phone=None, email=None, working_hours=None, logo=None, cover=None):
	user = _current_user()
	name = (name or "").strip()
	description = (description or "").strip()
	if len(name) < 2:
		frappe.throw(frappe._("Company name is required"), frappe.ValidationError)

	existing = frappe.db.exists("Souq Masr Company", {"owner": user})
	doc = frappe.get_doc("Souq Masr Company", existing) if existing else frappe.new_doc("Souq Masr Company")
	doc.name1 = name
	doc.description = description
	doc.industry = industry
	doc.size = size or "1-10"
	doc.city = city
	doc.website = website
	doc.phone = phone
	doc.email = email
	doc.working_hours = working_hours
	# نفس فحص career_profile.py's resume_file_url/chat.py's send_image_message
	# بالظبط — من غيره، أي مستخدم كان يقدر يمرّر file_url ملف حد تاني رفعه
	# (حتى لو عام) كـlogo/cover بتاعه هو، من غير أي تحقق ملكية.
	if logo is not None:
		if logo:
			file_row = frappe.db.get_value("File", {"file_url": logo}, "owner")
			if not file_row or file_row != user:
				frappe.throw(frappe._("You can only attach a file you uploaded yourself"), frappe.PermissionError)
		doc.logo = logo
	if cover is not None:
		if cover:
			file_row = frappe.db.get_value("File", {"file_url": cover}, "owner")
			if not file_row or file_row != user:
				frappe.throw(frappe._("You can only attach a file you uploaded yourself"), frappe.PermissionError)
		doc.cover = cover
	if existing:
		doc.save(ignore_permissions=True)
	else:
		doc.insert()
	return _serialize(doc)


@frappe.whitelist()
def get_my_company():
	# Frappe بيرجّع {} من غير مفتاح "message" لو الدالة رجّعت None بالظبط —
	# لازم نلف الغياب في dict صريح، مش نرجّع None عاري (نفس تصحيح
	# career_profile.py's get_my_career_profile بالظبط).
	user = _current_user()
	existing = frappe.db.exists("Souq Masr Company", {"owner": user})
	if not existing:
		return {"company": None}
	return {"company": _serialize(frappe.get_doc("Souq Masr Company", existing))}


@frappe.whitelist(allow_guest=True)
def get_company(company_id):
	if not company_id or not frappe.db.exists("Souq Masr Company", company_id):
		frappe.throw(frappe._("Company not found"), frappe.DoesNotExistError)
	return _serialize(frappe.get_doc("Souq Masr Company", company_id))
