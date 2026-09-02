# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Two-participant domain (candidate + employer), same pattern as
# job_applications.py — only the employer schedules; both can read.

import frappe

from souq_masr.api.v1 import notifications


def _current_user():
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(frappe._("Sign in required"), frappe.PermissionError)
	return user


def _job_owner(job_id):
	return frappe.db.get_value("Souq Masr Job", job_id, "owner")


def _serialize(doc):
	return {
		"id": doc.name,
		"application": doc.application,
		"job": doc.job,
		"date": str(doc.date) if doc.date else None,
		"time": doc.time,
		"location": doc.location or "",
		"mode": doc.mode,
		"notes": doc.notes or "",
		"status": doc.status,
	}


@frappe.whitelist()
def schedule_interview(application_id, date, time, mode="in_person", location=None, notes=None):
	user = _current_user()
	if not frappe.db.exists("Souq Masr Job Application", application_id):
		frappe.throw(frappe._("Application not found"), frappe.DoesNotExistError)
	application = frappe.get_doc("Souq Masr Job Application", application_id)
	if _job_owner(application.job) != user:
		frappe.throw(frappe._("Only the employer can schedule an interview"), frappe.PermissionError)

	existing = frappe.db.exists("Souq Masr Job Interview", {"application": application_id})
	doc = frappe.get_doc("Souq Masr Job Interview", existing) if existing else frappe.new_doc("Souq Masr Job Interview")
	doc.application = application_id
	doc.job = application.job
	doc.date = date
	doc.time = time
	doc.mode = mode or "in_person"
	doc.location = location
	doc.notes = notes
	doc.status = "scheduled"
	if existing:
		doc.save(ignore_permissions=True)
	else:
		doc.insert()

	application.status = "interview"
	application.save(ignore_permissions=True)
	job_title = frappe.db.get_value("Souq Masr Job", application.job, "title")
	notifications.notify(
		application.owner, "job_application_status_changed", "دعوة لمقابلة",
		f'اتحددتلك مقابلة بخصوص وظيفة "{job_title}".', reference_type="application", reference_id=application.name,
	)
	return _serialize(doc)


@frappe.whitelist()
def get_interview_for_application(application_id):
	user = _current_user()
	if not frappe.db.exists("Souq Masr Job Application", application_id):
		frappe.throw(frappe._("Application not found"), frappe.DoesNotExistError)
	application = frappe.get_doc("Souq Masr Job Application", application_id)
	if user not in (application.owner, _job_owner(application.job)):
		frappe.throw(frappe._("You are not a participant in this application"), frappe.PermissionError)
	existing = frappe.db.exists("Souq Masr Job Interview", {"application": application_id})
	# نفس تصحيح get_my_career_profile/get_my_company — لازم dict صريح
	# بدل None عاري (Frappe بيرجّع {} من غير "message" خالص غير كده).
	if not existing:
		return {"interview": None}
	return {"interview": _serialize(frappe.get_doc("Souq Masr Job Interview", existing))}


@frappe.whitelist()
def get_my_interviews(page=1, limit=20):
	"""مقابلات المرشّح الحالي — كل المقابلات المرتبطة بطلباته هو."""
	user = _current_user()
	from frappe.utils import cint

	page = cint(page) or 1
	limit = cint(limit) or 20
	offset = (page - 1) * limit
	my_application_ids = frappe.get_all("Souq Masr Job Application", filters={"owner": user}, pluck="name")
	if not my_application_ids:
		return {"items": [], "total": 0, "page": page, "limit": limit}
	filters = {"application": ["in", my_application_ids]}
	total = frappe.db.count("Souq Masr Job Interview", filters)
	rows = frappe.get_all("Souq Masr Job Interview", filters=filters, fields=["name"], order_by="date desc", limit_start=offset, limit_page_length=limit)
	return {"items": [_serialize(frappe.get_doc("Souq Masr Job Interview", r.name)) for r in rows], "total": total, "page": page, "limit": limit}
