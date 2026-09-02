# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Notifications vertical. `notify()` is the one function every other
# module in this app calls to create a real notification as a
# side-effect of a real event — never called from a client-facing
# whitelisted endpoint directly (there is no `create_notification`
# API here on purpose; see souq_masr_notification.py's own docstring).
#
# Wired real triggers (search each file for `notifications.notify` to
# see the exact call site):
# - chat.py's send_message/send_image_message -> the OTHER participant
# - calls.py's _resolve_stale_ringing (Ringing -> Missed) -> the callee
# - reviews.py's submit_review -> the reviewed seller
# - job_applications.py's apply_to_job -> the job's employer
# - job_applications.py's set_application_status -> the candidate
#
# NOT wired (documented, not silently skipped): a new listing matching a
# saved search would need a background/scheduled job scanning new
# listings against every saved search's criteria — a fundamentally
# different mechanism (polling/cron, not a mutation side-effect) than
# every other trigger here, and a real payments flow doesn't exist yet
# in this codebase (see the Payments section for when that lands, this
# module is ready to receive that call the same way).

import frappe
from frappe.utils import cint

PAGE_SIZE_DEFAULT = 30


def _current_user():
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(frappe._("Sign in required"), frappe.PermissionError)
	return user


def notify(recipient, type, title, body="", reference_type=None, reference_id=None):
	"""بديل استدعاء داخلي بس — مفيش whitelisted endpoint مقابله. أي كود
	تاني في الباك إند بينادي الدالة دي مباشرة (import، مش HTTP) بعد ما
	حدث حقيقي يحصل فعلًا.

	عمدًا **مفيش** فحص "لو recipient == frappe.session.user متبعتش" هنا:
	كل نقطة نداء حالية أصلًا بتضمن recipient != الفاعل بمنطقها الخاص
	(_other_party لرسالة، البائع المختلف عن المُقيِّم، صاحب العمل المختلف
	عن المتقدّم، callee المختلف عن caller ببناء المكالمة نفسه) — ما عدا
	حالة وحيدة كانت هتتكسر بفحص عام كده: calls.py's ring-timeout بيتحل
	lazily في أي طلب (GET/POST) بيقابل المكالمة، ممكن يكون طلب callee
	نفسه (بيعمل poll لمكالمته الواردة) — فحص "متبعتش لنفسك" عام كان
	هيمنع إشعار "مكالمة فائتة" بالظبط للشخص اللي المفروض يوصله."""
	if not recipient or recipient == "Guest":
		return
	doc = frappe.new_doc("Souq Masr Notification")
	doc.type = type
	doc.title = title
	doc.body = body or ""
	doc.reference_type = reference_type
	doc.reference_id = reference_id
	doc.insert(ignore_permissions=True)
	# لقيّة حقيقية اتصلحت وقت الاختبار الحي: Frappe's insert() بيفرض
	# owner = frappe.session.user دايمًا على أي مستند جديد — مبيحترمش أي
	# قيمة تتحط في doc.owner قبل insert() خالص، حتى مع ignore_permissions.
	# ده إجراء أمان مقصود من Frappe نفسه (منع أي كود من "ينتحل" مؤلف
	# مستند وقت الإنشاء) — الطريقة الصح تحطّي owner مختلف هي تحديث DB
	# مباشر بعد الإدراج، مش تعيين الحقل قبله. لقيت الباج ده بس لما اختبار
	# حي فعلي (test_notifications.py) أكّد إن الإشعار بيوصل للمُرسِل نفسه
	# مش للمستلم المفروض.
	frappe.db.set_value("Souq Masr Notification", doc.name, "owner", recipient, update_modified=False)


def _serialize(doc):
	return {
		"id": doc.name,
		"type": doc.type,
		"title": doc.title,
		"body": doc.body or "",
		"reference_type": doc.reference_type,
		"reference_id": doc.reference_id,
		"is_read": bool(doc.is_read),
		"created_at": str(doc.creation),
	}


@frappe.whitelist()
def get_my_notifications(page=1, limit=PAGE_SIZE_DEFAULT):
	user = _current_user()
	page = cint(page) or 1
	limit = cint(limit) or PAGE_SIZE_DEFAULT
	offset = (page - 1) * limit
	filters = {"owner": user}
	total = frappe.db.count("Souq Masr Notification", filters)
	unread = frappe.db.count("Souq Masr Notification", {"owner": user, "is_read": 0})
	rows = frappe.get_all("Souq Masr Notification", filters=filters, fields=["name"], order_by="creation desc", limit_start=offset, limit_page_length=limit)
	items = [_serialize(frappe.get_doc("Souq Masr Notification", r.name)) for r in rows]
	return {"items": items, "total": total, "unread_count": unread, "page": page, "limit": limit}


@frappe.whitelist()
def get_unread_count():
	user = _current_user()
	return {"unread_count": frappe.db.count("Souq Masr Notification", {"owner": user, "is_read": 0})}


@frappe.whitelist()
def mark_read(notification_id):
	user = _current_user()
	if not notification_id or not frappe.db.exists("Souq Masr Notification", notification_id):
		frappe.throw(frappe._("Notification not found"), frappe.DoesNotExistError)
	doc = frappe.get_doc("Souq Masr Notification", notification_id)
	if doc.owner != user:
		frappe.throw(frappe._("This notification does not belong to you"), frappe.PermissionError)
	if not doc.is_read:
		doc.is_read = 1
		doc.save(ignore_permissions=True)
	return {"marked": True}


@frappe.whitelist()
def mark_all_read():
	user = _current_user()
	frappe.db.set_value("Souq Masr Notification", {"owner": user, "is_read": 0}, "is_read", 1)
	return {"marked": True}


@frappe.whitelist()
def remove_notification(notification_id):
	user = _current_user()
	if not notification_id or not frappe.db.exists("Souq Masr Notification", notification_id):
		return {"deleted": True}
	doc = frappe.get_doc("Souq Masr Notification", notification_id)
	if doc.owner != user:
		frappe.throw(frappe._("This notification does not belong to you"), frappe.PermissionError)
	frappe.delete_doc("Souq Masr Notification", notification_id, ignore_permissions=True)
	return {"deleted": True}
