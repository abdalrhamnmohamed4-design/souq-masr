# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Career Profile — deliberately scoped to top-level scalar fields + one
# resume file, NOT the full mock CV-builder (education/experience/
# certifications/courses/projects/portfolio arrays). Documented,
# disclosed scope reduction (same "don't invent a second product model,
# document the dependency" principle the base instructions modeled on
# ProductVariant/SKU) — building 6 more normalized child DocTypes for the
# deep CV builder is a large, separable follow-up, not required for the
# core "post a job / apply / employer reviews the application" loop this
# slice targets. app/jobs/profile.tsx's deep sections stay mock-only.
#
# PRIVACY: Souq Masr Career Profile grants NO read to anyone but its
# owner (see the DocType's own permissions) — not even employers. An
# employer never browses arbitrary career profiles; they only ever see
# what a candidate explicitly submitted with a specific application
# (job_applications.py's own full_name/phone/email/resume snapshot on
# the Application itself). This is what actually satisfies "CVs must not
# become publicly readable just because a job exists" — there is no
# code path where a Career Profile is exposed to a non-owner at all.

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
		"full_name": doc.full_name or "",
		"phone": doc.phone or "",
		"email": doc.email or "",
		"current_job_title": doc.current_job_title or "",
		"desired_job_title": doc.desired_job_title or "",
		"years_experience": doc.years_experience,
		"career_level": doc.career_level,
		"expected_salary_min": doc.expected_salary_min,
		"expected_salary_max": doc.expected_salary_max,
		"preferred_work_types": _parse_json_list(doc.preferred_work_types_json),
		"has_resume": bool(doc.resume_file),
		"visibility": doc.visibility,
		"show_phone": bool(doc.show_phone),
		"show_email": bool(doc.show_email),
		"show_cv": bool(doc.show_cv),
	}


@frappe.whitelist()
def get_my_career_profile():
	# لاحظ: Frappe بيرجّع {} (من غير مفتاح "message" خالص) لو الدالة
	# رجّعت None بالظبط — مش {"message": null} زي المتوقّع. لازم نلف
	# الغياب في dict صريح زي get_active_call_for_conversation's
	# {"call": None} بالظبط، مش نرجّع None عاري.
	user = _current_user()
	existing = frappe.db.exists("Souq Masr Career Profile", {"owner": user})
	if not existing:
		return {"profile": None}
	return {"profile": _serialize(frappe.get_doc("Souq Masr Career Profile", existing))}


@frappe.whitelist()
def update_my_career_profile(**kwargs):
	user = _current_user()
	existing = frappe.db.exists("Souq Masr Career Profile", {"owner": user})
	doc = frappe.get_doc("Souq Masr Career Profile", existing) if existing else frappe.new_doc("Souq Masr Career Profile")

	scalar_fields = ["full_name", "phone", "email", "current_job_title", "desired_job_title", "career_level"]
	int_fields = ["years_experience", "expected_salary_min", "expected_salary_max"]
	bool_fields = ["show_phone", "show_email", "show_cv"]

	for f in scalar_fields:
		if f in kwargs:
			setattr(doc, f, kwargs[f])
	for f in int_fields:
		if f in kwargs and kwargs[f] not in (None, ""):
			setattr(doc, f, frappe.utils.cint(kwargs[f]))
	for f in bool_fields:
		if f in kwargs:
			setattr(doc, f, frappe.utils.cint(kwargs[f]))
	if "preferred_work_types" in kwargs:
		doc.preferred_work_types_json = _to_json_list(kwargs["preferred_work_types"])
	if "visibility" in kwargs and kwargs["visibility"] in ("public", "employers_only", "private"):
		doc.visibility = kwargs["visibility"]
	if "resume_file_url" in kwargs and kwargs["resume_file_url"]:
		file_row = frappe.db.get_value("File", {"file_url": kwargs["resume_file_url"]}, ["owner"], as_dict=True)
		if not file_row or file_row.owner != user:
			frappe.throw(frappe._("You can only attach a resume file you uploaded yourself"), frappe.PermissionError)
		doc.resume_file = kwargs["resume_file_url"]

	if existing:
		doc.save(ignore_permissions=True)
	else:
		doc.insert()
	return _serialize(doc)


@frappe.whitelist()
def get_my_resume():
	"""نفس منطق get_application_resume — إرجاع الملف بـbase64 مباشر، مش
	رابط، عشان يفضل خاص حتى لو الرابط اتسرّب بطريقة ما."""
	import base64

	from frappe.utils.file_manager import get_file

	user = _current_user()
	existing = frappe.db.exists("Souq Masr Career Profile", {"owner": user})
	if not existing:
		return {"has_resume": False}
	doc = frappe.get_doc("Souq Masr Career Profile", existing)
	if not doc.resume_file:
		return {"has_resume": False}
	filename, content = get_file(doc.resume_file)
	if isinstance(content, str):
		content = content.encode("utf-8")
	return {"has_resume": True, "filename": filename, "content_base64": base64.b64encode(content).decode("ascii")}
