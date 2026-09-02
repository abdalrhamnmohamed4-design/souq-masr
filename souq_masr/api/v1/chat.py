# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Phase 2B Slice 4 — real conversations + messages. Every timestamp
# returned here is Frappe's own `creation` field, set by the database at
# insert time — never a client-supplied value (see MOBILE_BACKEND_INTEGRATION_REPORT.md's
# Phase 2B Slice 4 section, "server timestamp is the only source of
# truth"). Souq Masr Conversation/Souq Masr Message both grant "All" role
# create-only permissions (no read/write/delete for any non-admin role at
# all — same shape as Souq Masr Listing Report) precisely because a
# conversation has TWO participants, not one owner, so Frappe's simple
# if_owner permission primitive can't correctly scope "either participant
# can read this" on its own. Every read/write here explicitly re-derives
# and checks membership in Python instead — the real, sole enforcement
# layer, not a decorative one.

import frappe
from frappe.utils import cint, now_datetime

from souq_masr.api.v1 import notifications

PAGE_SIZE_DEFAULT = 50


def _current_user():
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(frappe._("Sign in required"), frappe.PermissionError)
	return user


def _get_conversation_or_404(conversation_id):
	if not conversation_id or not frappe.db.exists("Souq Masr Conversation", conversation_id):
		frappe.throw(frappe._("Conversation not found"), frappe.DoesNotExistError)
	return frappe.get_doc("Souq Masr Conversation", conversation_id)


def _assert_participant(conv, user):
	if user not in (conv.buyer, conv.seller):
		frappe.throw(frappe._("You are not a participant in this conversation"), frappe.PermissionError)


def _other_party(conv, user):
	return conv.seller if user == conv.buyer else conv.buyer


def _user_display(user):
	row = frappe.db.get_value("User", user, ["first_name", "mobile_no"], as_dict=True)
	if not row:
		return {"id": user, "name": "", "mobile_no": None}
	return {"id": user, "name": row.first_name or "", "mobile_no": row.mobile_no or None}


def _listing_context(listing_id):
	if not listing_id or not frappe.db.exists("Souq Masr Listing", listing_id):
		return None
	row = frappe.db.get_value("Souq Masr Listing", listing_id, ["title", "price", "status"], as_dict=True)
	thumb = frappe.db.get_value("Souq Masr Listing Image", {"parent": listing_id}, "image", order_by="idx asc")
	return {"id": listing_id, "title": row.title, "price": row.price, "status": row.status, "thumb": thumb}


def _serialize_conversation_meta(conv, viewer):
	"""بيانات المحادثة + الطرف التاني + سياق الإعلان + رقم هاتفه — الرقم
	بيتكشف هنا **لأن viewer اتأكد فعلًا إنه مشارك حقيقي في المحادثة دي**
	(القسم 6 من الطلب: خصوصية الرقم — مش بيتعرض لأي حد، بس لمن عنده سياق
	محادثة حقيقي معاه، مُنفَّذ سيرفر-side مش مجرد إخفاء واجهة)."""
	other = _other_party(conv, viewer)
	other_info = _user_display(other)
	return {
		"id": conv.name,
		"other_party": {"id": other, "name": other_info["name"], "phone": other_info["mobile_no"]},
		"listing": _listing_context(conv.listing),
		"last_message_at": str(conv.last_message_at) if conv.last_message_at else None,
		"last_message_preview": conv.last_message_preview or "",
		"is_buyer": viewer == conv.buyer,
	}


def _serialize_message(doc):
	return {
		"id": doc.name,
		"conversation_id": doc.conversation,
		"kind": doc.kind,
		"text": doc.text or "",
		"image": doc.image or None,
		"call_id": doc.call or None,
		"is_read": bool(doc.is_read),
		"sender": doc.owner,
		"created_at": str(doc.creation),
	}


def _touch_last_message(conv, preview):
	conv.db_set("last_message_at", now_datetime(), update_modified=False)
	conv.db_set("last_message_preview", preview, update_modified=False)


@frappe.whitelist()
def start_conversation(listing_id):
	user = _current_user()
	if not listing_id or not frappe.db.exists("Souq Masr Listing", listing_id):
		frappe.throw(frappe._("Listing not found"), frappe.DoesNotExistError)
	listing_owner = frappe.db.get_value("Souq Masr Listing", listing_id, "owner")

	existing = frappe.db.exists("Souq Masr Conversation", {"buyer": user, "seller": listing_owner, "listing": listing_id})
	if existing:
		return _serialize_conversation_meta(frappe.get_doc("Souq Masr Conversation", existing), user)

	doc = frappe.new_doc("Souq Masr Conversation")
	doc.buyer = user
	doc.seller = listing_owner
	doc.listing = listing_id
	doc.insert()
	return _serialize_conversation_meta(doc, user)


@frappe.whitelist()
def get_my_conversations():
	user = _current_user()
	# buyer=user OR seller=user — المستخدم ممكن يبقى الطرف اللي بدأ
	# المحادثة أو صاحب الإعلان اللي اتراسل بشأنه، من غير فرق.
	rows = frappe.get_all(
		"Souq Masr Conversation",
		or_filters=[["buyer", "=", user], ["seller", "=", user]],
		fields=["name"],
		order_by="last_message_at desc, modified desc",
	)
	convs = [_serialize_conversation_meta(frappe.get_doc("Souq Masr Conversation", r.name), user) for r in rows]
	unread_counts = {}
	for r in rows:
		unread_counts[r.name] = frappe.db.count(
			"Souq Masr Message", {"conversation": r.name, "is_read": 0, "kind": ["!=", "System"], "owner": ["!=", user]}
		)
	for c in convs:
		c["unread"] = unread_counts.get(c["id"], 0)
	return {"items": convs}


@frappe.whitelist()
def get_conversation(conversation_id, page=1, limit=PAGE_SIZE_DEFAULT):
	user = _current_user()
	conv = _get_conversation_or_404(conversation_id)
	_assert_participant(conv, user)

	page = cint(page) or 1
	limit = cint(limit) or PAGE_SIZE_DEFAULT
	offset = (page - 1) * limit

	total = frappe.db.count("Souq Masr Message", {"conversation": conversation_id})
	rows = frappe.get_all(
		"Souq Masr Message",
		filters={"conversation": conversation_id},
		fields=["name"],
		order_by="creation desc",
		limit_start=offset,
		limit_page_length=limit,
	)
	# رجّعناهم الأحدث الأول للـpagination (صفحة 1 = آخر رسائل)، بعدين
	# بنعكسهم لترتيب زمني تصاعدي عادي (الأقدم فوق) زي أي شاشة شات حقيقية.
	messages = [_serialize_message(frappe.get_doc("Souq Masr Message", r.name)) for r in reversed(rows)]

	return {
		"conversation": _serialize_conversation_meta(conv, user),
		"messages": messages,
		"total": total,
		"page": page,
		"limit": limit,
	}


@frappe.whitelist()
def send_message(conversation_id, text):
	user = _current_user()
	conv = _get_conversation_or_404(conversation_id)
	_assert_participant(conv, user)

	text = (text or "").strip()
	if not text:
		frappe.throw(frappe._("Message text is required"), frappe.ValidationError)

	doc = frappe.new_doc("Souq Masr Message")
	doc.conversation = conversation_id
	doc.kind = "Text"
	doc.text = text
	doc.insert()
	_touch_last_message(conv, text)
	notifications.notify(
		_other_party(conv, user), "message_received", "رسالة جديدة",
		text[:120], reference_type="conversation", reference_id=conversation_id,
	)
	return _serialize_message(doc)


@frappe.whitelist()
def send_image_message(conversation_id, image_url):
	user = _current_user()
	conv = _get_conversation_or_404(conversation_id)
	_assert_participant(conv, user)

	if not image_url:
		frappe.throw(frappe._("image_url is required"), frappe.ValidationError)
	file_row = frappe.db.get_value("File", {"file_url": image_url}, ["name", "owner"], as_dict=True)
	if not file_row:
		frappe.throw(frappe._("Image not found — upload it first via /api/method/upload_file"), frappe.ValidationError)
	if file_row.owner != user:
		frappe.throw(frappe._("You can only attach images you uploaded yourself"), frappe.PermissionError)

	doc = frappe.new_doc("Souq Masr Message")
	doc.conversation = conversation_id
	doc.kind = "Text"
	doc.image = image_url
	doc.insert()
	_touch_last_message(conv, "📷 صورة")
	notifications.notify(
		_other_party(conv, user), "message_received", "رسالة جديدة",
		"📷 صورة", reference_type="conversation", reference_id=conversation_id,
	)
	return _serialize_message(doc)


@frappe.whitelist()
def mark_read(conversation_id):
	user = _current_user()
	conv = _get_conversation_or_404(conversation_id)
	_assert_participant(conv, user)
	frappe.db.set_value(
		"Souq Masr Message",
		{"conversation": conversation_id, "owner": ["!=", user], "is_read": 0},
		"is_read",
		1,
	)
	return {"marked": True}
