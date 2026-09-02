# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Two-participant domain (candidate + employer) — same "All: create=1
# only, explicit Python membership check per method, ignore_permissions
# on the actual write" pattern as chat.py/calls.py, for exactly the same
# reason: Frappe's if_owner primitive can express "the candidate who
# owns this row" but not "OR the employer of the linked job", so DocType
# permissions alone can't express this relationship — every read/write
# here re-derives and checks membership explicitly instead.
#
# CV PRIVACY: resume_file is uploaded is_private=1 and is NEVER returned
# as a raw URL anywhere in this file's serialization. The only way to
# actually read a resume's bytes is get_application_resume, which does
# its own explicit candidate-or-employer check first, then reads the
# file from disk and returns it base64-encoded directly in the response
# — bypassing Frappe's own private-file URL serving entirely (that
# mechanism is owner-only and has no concept of "the employer of the job
# this application is for", so it can't be trusted to enforce the right
# rule here).

import base64

import frappe
from frappe.utils import cint
from frappe.utils.file_manager import get_file

from souq_masr.api.v1 import notifications

PAGE_SIZE_DEFAULT = 20


def _current_user():
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(frappe._("Sign in required"), frappe.PermissionError)
	return user


def _get_application_or_404(application_id):
	if not application_id or not frappe.db.exists("Souq Masr Job Application", application_id):
		frappe.throw(frappe._("Application not found"), frappe.DoesNotExistError)
	return frappe.get_doc("Souq Masr Job Application", application_id)


def _job_owner(job_id):
	return frappe.db.get_value("Souq Masr Job", job_id, "owner")


def _assert_candidate_or_employer(doc, user):
	if user == doc.owner:
		return
	if user == _job_owner(doc.job):
		return
	frappe.throw(frappe._("You are not a participant in this application"), frappe.PermissionError)


def _serialize(doc, viewer, job_info=None):
	is_candidate = viewer == doc.owner
	is_employer = viewer == _job_owner(doc.job)
	out = {
		"id": doc.name,
		"job": doc.job,
		"full_name": doc.full_name,
		"phone": doc.phone if (is_candidate or is_employer) else None,
		"email": doc.email if (is_candidate or is_employer) else None,
		"has_resume": bool(doc.resume_file),
		"cover_letter": doc.cover_letter or "",
		"status": doc.status,
		"applied_at": str(doc.creation),
		"is_mine": is_candidate,
	}
	if job_info is not None:
		info = job_info.get(doc.job)
		# الوظيفة ممكن تتحذف فعليًا (delete_job's force=1) وطلب التقديم
		# يفضل موجود — job_title=None هو الإشارة لـapplications.tsx إنه
		# يعرض "وظيفة محذوفة" بدل ما يفشل الشاشة كلها.
		out["job_title"] = info["title"] if info else None
		out["company_id"] = info["company"] if info else None
		out["company_name"] = info["company_name"] if info else None
	return out


def _batch_job_info(job_ids):
	# applications.tsx كانت بتعمل client-side join (useAllJobs + useAllCompanies)
	# لكل صف — N+1-shaped. هنا بنجيب كل الوظائف والشركات المطلوبة في
	# استعلامين واحدين بس، مهما كان عدد الطلبات في الصفحة.
	job_ids = [j for j in set(job_ids) if j]
	if not job_ids:
		return {}
	jobs = frappe.get_all("Souq Masr Job", filters={"name": ["in", job_ids]}, fields=["name", "title", "company"])
	company_ids = [j.company for j in jobs if j.company]
	companies = {}
	if company_ids:
		companies = {
			c.name: c.name1
			for c in frappe.get_all("Souq Masr Company", filters={"name": ["in", company_ids]}, fields=["name", "name1"])
		}
	return {j.name: {"title": j.title, "company": j.company, "company_name": companies.get(j.company)} for j in jobs}


@frappe.whitelist()
def apply_to_job(job_id, full_name, phone, email=None, resume_file_url=None, cover_letter=None):
	user = _current_user()
	if not frappe.db.exists("Souq Masr Job", job_id):
		frappe.throw(frappe._("Job not found"), frappe.DoesNotExistError)
	job = frappe.get_doc("Souq Masr Job", job_id)
	if job.status != "published":
		frappe.throw(frappe._("This job is not accepting applications"), frappe.ValidationError)
	if job.owner == user:
		frappe.throw(frappe._("You cannot apply to your own job posting"), frappe.ValidationError)
	if not (full_name or "").strip() or not (phone or "").strip():
		frappe.throw(frappe._("Full name and phone are required"), frappe.ValidationError)

	existing = frappe.db.exists("Souq Masr Job Application", {"job": job_id, "owner": user})
	if existing:
		# نفس فلسفة start_conversation's idempotency — تقديم تاني بنفس
		# اليوزر بيرجّع نفس الطلب، مش يعمل تكرار (Mock's hasAppliedToJob
		# بيمنع التقديم التاني أصلًا، فده أمان إضافي مش تناقض).
		return _serialize(frappe.get_doc("Souq Masr Job Application", existing), user)

	if resume_file_url:
		file_row = frappe.db.get_value("File", {"file_url": resume_file_url}, ["name", "owner"], as_dict=True)
		if not file_row or file_row.owner != user:
			frappe.throw(frappe._("You can only attach a resume file you uploaded yourself"), frappe.PermissionError)

	doc = frappe.new_doc("Souq Masr Job Application")
	doc.job = job_id
	doc.full_name = full_name.strip()
	doc.phone = phone.strip()
	doc.email = (email or "").strip() or None
	doc.resume_file = resume_file_url
	doc.cover_letter = (cover_letter or "").strip() or None
	doc.status = "applied"
	doc.insert()

	frappe.db.set_value("Souq Masr Job", job_id, "applications_count", cint(job.applications_count or 0) + 1, update_modified=False)
	notifications.notify(job.owner, "job_application_received", "متقدّم جديد", f'حد قدّم على وظيفة "{job.title}".', reference_type="job", reference_id=job_id)
	return _serialize(doc, user)


@frappe.whitelist()
def has_applied(job_id):
	user = _current_user()
	return {"has_applied": bool(frappe.db.exists("Souq Masr Job Application", {"job": job_id, "owner": user}))}


@frappe.whitelist()
def get_my_applications(status=None, page=1, limit=PAGE_SIZE_DEFAULT):
	user = _current_user()
	page = cint(page) or 1
	limit = cint(limit) or PAGE_SIZE_DEFAULT
	offset = (page - 1) * limit
	filters = {"owner": user}
	if status:
		filters["status"] = status
	total = frappe.db.count("Souq Masr Job Application", filters)
	rows = frappe.get_all("Souq Masr Job Application", filters=filters, fields=["name"], order_by="creation desc", limit_start=offset, limit_page_length=limit)
	docs = [frappe.get_doc("Souq Masr Job Application", r.name) for r in rows]
	job_info = _batch_job_info([d.job for d in docs])
	items = [_serialize(d, user, job_info=job_info) for d in docs]
	return {"items": items, "total": total, "page": page, "limit": limit}


@frappe.whitelist()
def withdraw_application(application_id):
	user = _current_user()
	doc = _get_application_or_404(application_id)
	if doc.owner != user:
		frappe.throw(frappe._("Only the candidate can withdraw their own application"), frappe.PermissionError)
	if doc.status in ("withdrawn", "rejected", "accepted"):
		return _serialize(doc, user)
	doc.status = "withdrawn"
	doc.save(ignore_permissions=True)
	return _serialize(doc, user)


@frappe.whitelist()
def get_applications_for_job(job_id, page=1, limit=PAGE_SIZE_DEFAULT):
	"""صاحب الوظيفة (employer) بس — القسم الحقيقي اللي بيمنع أي مستخدم
	تاني يشوف متقدّمين وظيفة مش بتاعته."""
	user = _current_user()
	if not frappe.db.exists("Souq Masr Job", job_id):
		frappe.throw(frappe._("Job not found"), frappe.DoesNotExistError)
	if _job_owner(job_id) != user:
		frappe.throw(frappe._("You do not own this job posting"), frappe.PermissionError)

	page = cint(page) or 1
	limit = cint(limit) or PAGE_SIZE_DEFAULT
	offset = (page - 1) * limit
	filters = {"job": job_id}
	total = frappe.db.count("Souq Masr Job Application", filters)
	rows = frappe.get_all("Souq Masr Job Application", filters=filters, fields=["name"], order_by="creation desc", limit_start=offset, limit_page_length=limit)
	items = [_serialize(frappe.get_doc("Souq Masr Job Application", r.name), user) for r in rows]
	return {"items": items, "total": total, "page": page, "limit": limit}


@frappe.whitelist()
def set_application_status(application_id, status):
	user = _current_user()
	doc = _get_application_or_404(application_id)
	if _job_owner(doc.job) != user:
		frappe.throw(frappe._("Only the employer can update this application's status"), frappe.PermissionError)
	valid = ("applied", "viewed", "shortlisted", "interview", "offer", "accepted", "rejected")
	if status not in valid:
		frappe.throw(frappe._("Invalid status"), frappe.ValidationError)
	doc.status = status
	doc.save(ignore_permissions=True)
	job_title = frappe.db.get_value("Souq Masr Job", doc.job, "title")
	notifications.notify(
		doc.owner, "job_application_status_changed", "تحديث على طلبك",
		f'حالة طلبك على وظيفة "{job_title}" اتغيّرت.', reference_type="application", reference_id=doc.name,
	)
	return _serialize(doc, user)


@frappe.whitelist()
def get_application_resume(application_id):
	user = _current_user()
	doc = _get_application_or_404(application_id)
	_assert_candidate_or_employer(doc, user)
	if not doc.resume_file:
		return {"has_resume": False}
	filename, content = get_file(doc.resume_file)
	# get_file بترجّع str لو الملف اتقرا كـUTF-8 صح (نادر لسيرة ذاتية
	# حقيقية PDF/DOC، بس ممكن يحصل)، وbytes غير كده — base64.b64encode
	# محتاج bytes دايمًا.
	if isinstance(content, str):
		content = content.encode("utf-8")
	return {
		"has_resume": True,
		"filename": filename,
		"content_base64": base64.b64encode(content).decode("ascii"),
	}
