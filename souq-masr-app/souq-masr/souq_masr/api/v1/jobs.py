# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Jobs vertical — job postings. Mirrors souq_masr.api.v1.listings'
# architecture closely (ownership via Frappe's standard `owner`,
# _assert_owner-style checks, PUBLIC_STATUSES gating, pagination,
# _paginate/_sort_order_by shaped the same way) since it's the same kind
# of domain: a real user posts a real listing-like record that other real
# users discover and act on.
#
# Job categories/professions are Jobs-specific client-side constants
# (mock/jobs/categories.ts) — a deliberately different, flat taxonomy
# from the marketplace's hierarchical Souq Masr Category tree (per that
# file's own comment: "قسمين منفصلين تمامًا... مش نفس التصنيفات"). No
# server-side lookup DocType for them; category_key/profession_key are
# validated for presence only. location_key DOES reuse the real
# marketplace taxonomy (Souq Masr Location) since locations genuinely are
# shared across Jobs and Listings.

import json

import frappe
from frappe.utils import cint

PAGE_SIZE_DEFAULT = 20
PUBLIC_STATUSES = ("published",)


def _current_user():
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(frappe._("Sign in required"), frappe.PermissionError)
	return user


def _get_job_or_404(job_id):
	if not job_id or not frappe.db.exists("Souq Masr Job", job_id):
		frappe.throw(frappe._("Job not found"), frappe.DoesNotExistError)
	return frappe.get_doc("Souq Masr Job", job_id)


def _assert_owner(doc, user):
	if doc.owner != user:
		frappe.throw(frappe._("You do not own this job posting"), frappe.PermissionError)


def _parse_json_list(value):
	if not value:
		return []
	try:
		parsed = json.loads(value)
		return parsed if isinstance(parsed, list) else []
	except Exception:
		return []


def _to_json_list(value):
	if value is None:
		return "[]"
	if isinstance(value, str):
		try:
			parsed = json.loads(value)
			return json.dumps(parsed if isinstance(parsed, list) else [], ensure_ascii=False)
		except Exception:
			pass
		value = [s.strip() for s in value.split("\n") if s.strip()]
	return json.dumps(list(value), ensure_ascii=False)


def _paginate(page, limit):
	page = cint(page) or 1
	limit = cint(limit) or PAGE_SIZE_DEFAULT
	limit = min(limit, 100)
	return page, limit, (page - 1) * limit


def _serialize(doc):
	is_owner = frappe.session.user == doc.owner
	return {
		"id": doc.name,
		"company": doc.company,
		"title": doc.title,
		"category_key": doc.category_key,
		"profession_key": doc.profession_key,
		"work_type": doc.work_type,
		"career_level": doc.career_level,
		"city": doc.city,
		"area": doc.area,
		"location_key": doc.location_key,
		"remote": bool(doc.remote),
		"salary_min": doc.salary_min,
		"salary_max": doc.salary_max,
		"salary_hidden": bool(doc.salary_hidden),
		"experience_years_min": doc.experience_years_min,
		"experience_years_max": doc.experience_years_max,
		"description": doc.description or "",
		"responsibilities": _parse_json_list(doc.responsibilities_json),
		"requirements": _parse_json_list(doc.requirements_json),
		"skills": _parse_json_list(doc.skills_json),
		"benefits": _parse_json_list(doc.benefits_json),
		"application_method": doc.application_method,
		"application_url": doc.application_url,
		"application_email": doc.application_email,
		"deadline": str(doc.deadline) if doc.deadline else None,
		"status": doc.status,
		"is_urgent": bool(doc.is_urgent),
		"views": doc.views or 0,
		"applications_count": doc.applications_count or 0,
		"posted_at": str(doc.creation),
		"is_owner": is_owner,
	}


def _serialize_summary(row):
	return {
		"id": row.name,
		"title": row.title,
		"company": row.company,
		"category_key": row.category_key,
		"work_type": row.work_type,
		"career_level": row.career_level,
		"city": row.city,
		"remote": bool(row.remote),
		"salary_min": row.salary_min,
		"salary_max": row.salary_max,
		"salary_hidden": bool(row.salary_hidden),
		"is_urgent": bool(row.is_urgent),
		"status": row.status,
		"views": row.views or 0,
		"applications_count": row.applications_count or 0,
		"posted_at": str(row.creation),
	}


SUMMARY_FIELDS = [
	"name", "title", "company", "category_key", "work_type", "career_level", "city",
	"remote", "salary_min", "salary_max", "salary_hidden", "is_urgent", "status",
	"views", "applications_count", "creation",
]


def _validate_company(company_id, user):
	if not company_id or not frappe.db.exists("Souq Masr Company", company_id):
		frappe.throw(frappe._("Company not found"), frappe.DoesNotExistError)
	owner = frappe.db.get_value("Souq Masr Company", company_id, "owner")
	if owner != user:
		frappe.throw(frappe._("You can only post jobs under your own company"), frappe.PermissionError)


def _validate_location(location_key):
	if location_key and not frappe.db.exists("Souq Masr Location", location_key):
		frappe.throw(frappe._("Invalid location"), frappe.ValidationError)


@frappe.whitelist()
def create_job(
	company, title, category_key, work_type, city=None, area=None, location_key=None,
	profession_key=None, career_level=None, remote=0, salary_min=None, salary_max=None,
	salary_hidden=0, experience_years_min=None, experience_years_max=None, description=None,
	responsibilities=None, requirements=None, skills=None, benefits=None,
	application_method="in_app", application_url=None, application_email=None, deadline=None,
	is_urgent=0,
):
	user = _current_user()
	_validate_company(company, user)
	_validate_location(location_key)
	if not (title or "").strip() or not (category_key or "").strip() or not (work_type or "").strip():
		frappe.throw(frappe._("Title, category and work type are required"), frappe.ValidationError)

	doc = frappe.new_doc("Souq Masr Job")
	doc.company = company
	doc.title = title.strip()
	doc.category_key = category_key.strip()
	doc.profession_key = profession_key
	doc.work_type = work_type
	doc.career_level = career_level or None
	doc.city = city
	doc.area = area
	doc.location_key = location_key
	doc.remote = cint(remote)
	doc.salary_min = cint(salary_min) if salary_min not in (None, "") else None
	doc.salary_max = cint(salary_max) if salary_max not in (None, "") else None
	doc.salary_hidden = cint(salary_hidden)
	doc.experience_years_min = cint(experience_years_min) if experience_years_min not in (None, "") else None
	doc.experience_years_max = cint(experience_years_max) if experience_years_max not in (None, "") else None
	doc.description = description or ""
	doc.responsibilities_json = _to_json_list(responsibilities)
	doc.requirements_json = _to_json_list(requirements)
	doc.skills_json = _to_json_list(skills)
	doc.benefits_json = _to_json_list(benefits)
	doc.application_method = application_method or "in_app"
	doc.application_url = application_url
	doc.application_email = application_email
	doc.deadline = deadline
	doc.is_urgent = cint(is_urgent)
	doc.status = "published"
	doc.insert()
	return _serialize(doc)


@frappe.whitelist()
def update_job(job_id, **kwargs):
	user = _current_user()
	doc = _get_job_or_404(job_id)
	_assert_owner(doc, user)

	scalar_fields = [
		"title", "category_key", "profession_key", "work_type", "career_level", "city", "area",
		"location_key", "description", "application_method", "application_url", "application_email", "deadline",
	]
	int_fields = ["salary_min", "salary_max", "experience_years_min", "experience_years_max"]
	bool_fields = ["remote", "salary_hidden", "is_urgent"]
	list_fields = {"responsibilities": "responsibilities_json", "requirements": "requirements_json", "skills": "skills_json", "benefits": "benefits_json"}

	if "location_key" in kwargs:
		_validate_location(kwargs.get("location_key"))

	for f in scalar_fields:
		if f in kwargs:
			setattr(doc, f, kwargs[f])
	for f in int_fields:
		if f in kwargs:
			setattr(doc, f, cint(kwargs[f]) if kwargs[f] not in (None, "") else None)
	for f in bool_fields:
		if f in kwargs:
			setattr(doc, f, cint(kwargs[f]))
	for mobile_key, doc_field in list_fields.items():
		if mobile_key in kwargs:
			setattr(doc, doc_field, _to_json_list(kwargs[mobile_key]))

	doc.save(ignore_permissions=True)
	return _serialize(doc)


def _transition_status(job_id, new_status, allowed_from):
	user = _current_user()
	doc = _get_job_or_404(job_id)
	_assert_owner(doc, user)
	if doc.status not in allowed_from:
		frappe.throw(frappe._("Cannot move a job with status '{0}' to '{1}'").format(doc.status, new_status), frappe.ValidationError)
	doc.status = new_status
	doc.save(ignore_permissions=True)
	return _serialize(doc)


@frappe.whitelist()
def pause_job(job_id):
	return _transition_status(job_id, "paused", ("published",))


@frappe.whitelist()
def activate_job(job_id):
	return _transition_status(job_id, "published", ("paused", "draft"))


@frappe.whitelist()
def close_job(job_id):
	return _transition_status(job_id, "closed", ("published", "paused"))


@frappe.whitelist()
def delete_job(job_id):
	user = _current_user()
	doc = _get_job_or_404(job_id)
	_assert_owner(doc, user)
	# نفس قرار listings.py's delete_listing بالظبط: force=1 عشان صفوف
	# Saved Job/Job Application/Job Interview المرتبطة متمنعش الحذف
	# (Frappe's default link-integrity check) — نفس الـLinkExistsError
	# اللقيّة الحقيقية اللي اتصلحت في Slice 3، متطبّقة هنا من الأول.
	frappe.delete_doc("Souq Masr Job", job_id, force=1, ignore_permissions=True)
	return {"deleted": True}


@frappe.whitelist(allow_guest=True)
def get_job(job_id):
	doc = _get_job_or_404(job_id)
	is_owner = frappe.session.user == doc.owner
	if doc.status not in PUBLIC_STATUSES and not is_owner:
		frappe.throw(frappe._("Job not found"), frappe.DoesNotExistError)
	return _serialize(doc)


@frappe.whitelist()
def get_my_jobs(status=None, page=1, limit=PAGE_SIZE_DEFAULT):
	user = _current_user()
	page, limit, offset = _paginate(page, limit)
	filters = {"owner": user}
	if status:
		filters["status"] = status
	total = frappe.db.count("Souq Masr Job", filters)
	rows = frappe.get_all("Souq Masr Job", filters=filters, fields=SUMMARY_FIELDS, order_by="creation desc", limit_start=offset, limit_page_length=limit)
	return {"items": [_serialize_summary(r) for r in rows], "total": total, "page": page, "limit": limit}


@frappe.whitelist(allow_guest=True)
def search_jobs(q=None, category_key=None, work_type=None, career_level=None, city=None, remote=None, salary_min=None, page=1, limit=PAGE_SIZE_DEFAULT):
	page, limit, offset = _paginate(page, limit)
	filters = {"status": "published"}
	if category_key:
		filters["category_key"] = category_key
	if work_type:
		filters["work_type"] = work_type
	if career_level:
		filters["career_level"] = career_level
	if city:
		filters["city"] = city
	if remote not in (None, "", "0", 0):
		filters["remote"] = 1
	if salary_min not in (None, ""):
		filters["salary_max"] = [">=", cint(salary_min)]

	job_names = None
	if q and q.strip():
		like = f"%{q.strip()}%"
		job_names = set(r.name for r in frappe.get_all("Souq Masr Job", filters={**filters, "title": ["like", like]}, fields=["name"]))
		job_names |= set(r.name for r in frappe.get_all("Souq Masr Job", filters={**filters, "description": ["like", like]}, fields=["name"]))
		if not job_names:
			return {"items": [], "total": 0, "page": page, "limit": limit}
		filters["name"] = ["in", list(job_names)]

	total = frappe.db.count("Souq Masr Job", filters)
	rows = frappe.get_all("Souq Masr Job", filters=filters, fields=SUMMARY_FIELDS, order_by="creation desc", limit_start=offset, limit_page_length=limit)
	return {"items": [_serialize_summary(r) for r in rows], "total": total, "page": page, "limit": limit}


@frappe.whitelist(allow_guest=True)
def get_jobs_by_company(company_id, page=1, limit=PAGE_SIZE_DEFAULT):
	if not company_id or not frappe.db.exists("Souq Masr Company", company_id):
		frappe.throw(frappe._("Company not found"), frappe.DoesNotExistError)
	page, limit, offset = _paginate(page, limit)
	filters = {"company": company_id, "status": "published"}
	total = frappe.db.count("Souq Masr Job", filters)
	rows = frappe.get_all("Souq Masr Job", filters=filters, fields=SUMMARY_FIELDS, order_by="creation desc", limit_start=offset, limit_page_length=limit)
	return {"items": [_serialize_summary(r) for r in rows], "total": total, "page": page, "limit": limit}


@frappe.whitelist(allow_guest=True)
def increment_job_views(job_id):
	doc = _get_job_or_404(job_id)
	if doc.status not in PUBLIC_STATUSES and frappe.session.user != doc.owner:
		frappe.throw(frappe._("Job not found"), frappe.DoesNotExistError)
	frappe.db.set_value("Souq Masr Job", job_id, "views", (doc.views or 0) + 1, update_modified=False)
	return {"views": (doc.views or 0) + 1}
