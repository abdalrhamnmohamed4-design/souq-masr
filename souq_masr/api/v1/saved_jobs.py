# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Exact same shape as souq_masr.api.v1.favorites — one saved row per
# (owner, job) pair, idempotent create/remove.

import frappe


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
	user = _current_user()
	rows = frappe.get_all("Souq Masr Saved Job", filters={"owner": user}, fields=["job"], order_by="creation desc")
	return {"items": [r.job for r in rows]}
