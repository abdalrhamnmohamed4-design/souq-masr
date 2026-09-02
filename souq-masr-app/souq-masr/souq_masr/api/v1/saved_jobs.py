# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Exact same shape as souq_masr.api.v1.favorites — one saved row per
# (owner, job) pair, idempotent create/remove.

import frappe

from souq_masr.api.v1.jobs import SUMMARY_FIELDS, _serialize_summary


def _current_user():
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(frappe._("Sign in required"), frappe.PermissionError)
	return user


@frappe.whitelist()
def save_job(job_id):
	user = _current_user()
	if not frappe.db.exists("Souq Masr Job", job_id):
		frappe.throw(frappe._("Job not found"), frappe.DoesNotExistError)
	existing = frappe.db.exists("Souq Masr Saved Job", {"job": job_id, "owner": user})
	if existing:
		return {"id": existing, "job": job_id}
	doc = frappe.new_doc("Souq Masr Saved Job")
	doc.job = job_id
	doc.insert()
	return {"id": doc.name, "job": job_id}


@frappe.whitelist()
def unsave_job(job_id):
	user = _current_user()
	existing = frappe.db.exists("Souq Masr Saved Job", {"job": job_id, "owner": user})
	if existing:
		frappe.delete_doc("Souq Masr Saved Job", existing, ignore_permissions=True)
	return {"removed": True}


@frappe.whitelist(allow_guest=True)
def is_job_saved(job_id):
	if frappe.session.user == "Guest":
		return {"saved": False}
	return {"saved": bool(frappe.db.exists("Souq Masr Saved Job", {"job": job_id, "owner": frappe.session.user}))}


@frappe.whitelist()
def get_my_saved_jobs():
	# كانت بترجّع {"items": ["JOB-1", "JOB-2", ...]} — أسماء وظائف عارية
	# بس، ده كان بيجبر jobs/saved.tsx إنه يعمل fetch لكل وظيفة على حدة
	# (N+1). دلوقتي بترجّع كائنات كاملة، بنفس قايمة الحقول اللي بيرجّعها
	# search_jobs/get_my_jobs (SUMMARY_FIELDS)، بنفس سابقة get_my_favorites
	# في نطاق الـListings اللي بترجّع كائنات كاملة مش أرقام.
	user = _current_user()
	saved = frappe.get_all("Souq Masr Saved Job", filters={"owner": user}, fields=["job"], order_by="creation desc")
	job_ids = [r.job for r in saved]
	if not job_ids:
		return {"items": []}
	# ترتيب الحفظ (الأحدث أولًا) هو المصدر الوحيد للترتيب — get_all على
	# الوظائف نفسها بيتعمل بترتيب مختلف (id: in list)، فبنعيد الترتيب يدويًا.
	rows = frappe.get_all("Souq Masr Job", filters={"name": ["in", job_ids]}, fields=SUMMARY_FIELDS)
	by_id = {r.name: r for r in rows}
	items = [_serialize_summary(by_id[jid]) for jid in job_ids if jid in by_id]
	return {"items": items}
