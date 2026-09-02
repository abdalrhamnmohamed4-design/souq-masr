# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Phase 2B Slice 4 — real call signaling/state (Souq Masr Call): who
# called whom, when, current state, duration, security, timeline —
# genuinely real, live-tested, backend-authoritative.
#
# Phase 2B Slice 4B — adds get_rtc_token, the one function that actually
# authorizes real voice audio: a short-lived, audio-only-scoped LiveKit
# access token (self-hosted LiveKit, see MOBILE_BACKEND_INTEGRATION_REPORT.md's
# Phase 2B Slice 4B section for the full deployment). This module still
# never touches the audio stream itself — it only decides WHO may join
# WHICH room, with WHAT permissions (microphone publish only, never
# video). The actual media transport is LiveKit's job entirely.
#
# caller/callee are ALWAYS derived from the conversation's own
# buyer/seller fields — callee is never a client-supplied id. This is
# what stops User A from starting a call to an arbitrary User C by
# manipulating ids: the only way to reach anyone at all is through a
# conversation you're already a real participant of. The same rule
# extends to get_rtc_token: a token is only ever issued to the actual
# caller/callee of the specific call requested, scoped to that call's own
# room, audio-only.
#
# No audio, no recording: nothing in this app stores or proxies any audio
# stream. duration is a plain integer computed from two timestamps.

import frappe
from datetime import timedelta
from frappe.utils import now_datetime
from livekit import api as livekit_api

# Phase 2B Slice 4B — مدة صلاحية الـtoken قصيرة عمدًا (القسم 7 من الطلب)،
# آمن لأن LiveKit بيتحقق من الـJWT وقت الاتصال الأول بس، مش طول عمر
# الجلسة — يعني مكالمة شغّالة فعليًا ميتقطعش لو الـtoken انتهت صلاحيته
# وهو لسه متصل، بس محدش يقدر يستخدم نفس الـtoken بعد كده يبدأ اتصال جديد.
LIVEKIT_TOKEN_TTL_SECONDS = 600

# لو Ringing فضلت من غير رد أكتر من كده، بتتحسب Missed تلقائيًا أول ما
# أي نداء (accept/decline/get_active_call_for_conversation) يلاقيها —
# مفيش scheduler/cron منفصل، الفحص بيحصل lazily وقت أي قراءة/كتابة.
RING_TIMEOUT_SECONDS = 45


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


def _get_call_or_404(call_id):
	if not call_id or not frappe.db.exists("Souq Masr Call", call_id):
		frappe.throw(frappe._("Call not found"), frappe.DoesNotExistError)
	return frappe.get_doc("Souq Masr Call", call_id)


def _serialize_call(doc):
	return {
		"id": doc.name,
		"conversation_id": doc.conversation,
		"caller": doc.caller,
		"callee": doc.callee,
		"listing_id": doc.listing,
		"call_type": doc.call_type,
		"status": doc.status,
		"started_at": str(doc.started_at) if doc.started_at else None,
		"answered_at": str(doc.answered_at) if doc.answered_at else None,
		"ended_at": str(doc.ended_at) if doc.ended_at else None,
		"duration": doc.duration or None,
	}


def _resolve_stale_ringing(doc):
	"""Ringing من زمن (RING_TIMEOUT_SECONDS) من غير رد → Missed تلقائيًا،
	وبتسجّل رسالة CallEvent "مكالمة فائتة" — نفس تأثير timeout حقيقي على
	السيرفر، مش على العميل (عشان الحالة تتصحّح حتى لو العميل اللي بدأ
	المكالمة قفل التطبيق قبل ما حد يرد).

	مهم لأي حد بينادي الدالة دي (مباشرة أو عبر get_call/
	get_active_call_for_conversation): لازم يبقى POST مش GET، حتى لو
	منطقيًا "قراءة". لقيّة حقيقية (bug فعلي اتصلح وقت اختبار الـslice
	دي حي — شوف MOBILE_BACKEND_INTEGRATION_REPORT.md): Frappe's
	sync_database() بيعمل commit تلقائي بس للـ"unsafe" HTTP methods
	(POST/PUT/DELETE)؛ أي تعديل يحصل جوه معالج GET بيتعمله rollback
	تلقائي في نهاية الطلب حتى لو الرد نفسه (JSON) عرض القيمة الجديدة
	بشكل صحيح — يعني doc.save() هنا كانت بترجع النتيجة الصح في نفس
	الطلب بس من غير ما تتسجّل فعليًا في قاعدة البيانات لو النداء كان GET.
	get_call/get_active_call_for_conversation عمدًا مش allow_guest-only
	reads فعليًا، دول POST endpoints ليهم side effect حقيقي."""
	if doc.status != "Ringing":
		return doc
	age = (now_datetime() - doc.started_at).total_seconds()
	if age < RING_TIMEOUT_SECONDS:
		return doc
	doc.status = "Missed"
	doc.ended_at = now_datetime()
	doc.save(ignore_permissions=True)
	_append_call_event_message(doc, "مكالمة فائتة")
	return doc


def _append_call_event_message(call_doc, text):
	msg = frappe.new_doc("Souq Masr Message")
	msg.conversation = call_doc.conversation
	msg.kind = "CallEvent"
	msg.text = text
	msg.call = call_doc.name
	msg.insert(ignore_permissions=True)
	frappe.db.set_value("Souq Masr Conversation", call_doc.conversation, "last_message_at", now_datetime(), update_modified=False)
	frappe.db.set_value("Souq Masr Conversation", call_doc.conversation, "last_message_preview", text, update_modified=False)


def _format_duration(seconds):
	m, s = divmod(int(seconds or 0), 60)
	return f"{m:02d}:{s:02d}"


def _livekit_credentials():
	api_key = frappe.conf.get("livekit_api_key")
	api_secret = frappe.conf.get("livekit_api_secret")
	ws_url = frappe.conf.get("livekit_ws_url")
	if not api_key or not api_secret or not ws_url:
		frappe.throw(frappe._("Voice calling is not configured on this server"), frappe.ValidationError)
	return api_key, api_secret, ws_url


def _livekit_http_url(ws_url):
	# LiveKitAPI's admin/room endpoints speak http(s), not ws(s) — same
	# host/port, different scheme. The mobile client gets the ws(s) form
	# (services/rtcService.ts), this is server-side only.
	return ws_url.replace("wss://", "https://", 1).replace("ws://", "http://", 1)


def _ensure_room(doc):
	"""بتنشئ غرفة LiveKit صراحة بـmax_participants=2 — دفاع إضافي (مش
	بديل) عن الفحص الأساسي في get_rtc_token: حتى لو token اتسرّب أو
	انسخ بطريقة ما، مفيش طرف ثالث يقدر ينضم للغرفة دي أصلًا لأنها مقفولة
	على شخصين بالظبط (القسم 4 من طلب Slice 4B). لو فشلت (السيرفر مش
	متاح مؤقتًا مثلًا)، مش بنوقف بدء المكالمة — LiveKit بينشئ الغرفة
	تلقائيًا أول ما أول مشارك ينضم على أي حال، بس من غير حد max_participants
	الصريح ده في الحالة دي؛ بنسجّل الخطأ في error log عشان يبان، مش بنبلعه
	بصمت."""
	import asyncio

	async def _create():
		api_key, api_secret, ws_url = _livekit_credentials()
		lkapi = livekit_api.LiveKitAPI(_livekit_http_url(ws_url), api_key, api_secret)
		try:
			await lkapi.room.create_room(
				livekit_api.CreateRoomRequest(name=doc.name, max_participants=2, empty_timeout=300)
			)
		finally:
			await lkapi.aclose()

	try:
		asyncio.run(_create())
	except Exception:
		frappe.log_error(title="LiveKit: failed to pre-create room", message=frappe.get_traceback())


@frappe.whitelist()
def start_call(conversation_id):
	user = _current_user()
	conv = _get_conversation_or_404(conversation_id)
	_assert_participant(conv, user)
	callee = conv.seller if user == conv.buyer else conv.buyer

	# منع مكالمتين Ringing/Active مع بعض على نفس المحادثة في نفس الوقت.
	existing = frappe.get_all(
		"Souq Masr Call",
		filters={"conversation": conversation_id, "status": ["in", ("Ringing", "Active")]},
		fields=["name"],
		limit_page_length=1,
	)
	if existing:
		doc = _resolve_stale_ringing(frappe.get_doc("Souq Masr Call", existing[0].name))
		if doc.status in ("Ringing", "Active"):
			frappe.throw(frappe._("There is already an active call on this conversation"), frappe.ValidationError)

	doc = frappe.new_doc("Souq Masr Call")
	doc.conversation = conversation_id
	doc.caller = user
	doc.callee = callee
	doc.listing = conv.listing
	doc.call_type = "voice"
	doc.status = "Ringing"
	doc.started_at = now_datetime()
	doc.insert()
	_ensure_room(doc)
	return _serialize_call(doc)


@frappe.whitelist()
def accept_call(call_id):
	user = _current_user()
	doc = _get_call_or_404(call_id)
	if user != doc.callee:
		frappe.throw(frappe._("Only the callee can accept this call"), frappe.PermissionError)
	doc = _resolve_stale_ringing(doc)
	if doc.status != "Ringing":
		frappe.throw(frappe._("Cannot accept a call with status '{0}'").format(doc.status), frappe.ValidationError)
	doc.status = "Active"
	doc.answered_at = now_datetime()
	doc.save(ignore_permissions=True)
	return _serialize_call(doc)


@frappe.whitelist()
def decline_call(call_id):
	user = _current_user()
	doc = _get_call_or_404(call_id)
	if user != doc.callee:
		frappe.throw(frappe._("Only the callee can decline this call"), frappe.PermissionError)
	doc = _resolve_stale_ringing(doc)
	if doc.status != "Ringing":
		frappe.throw(frappe._("Cannot decline a call with status '{0}'").format(doc.status), frappe.ValidationError)
	doc.status = "Declined"
	doc.ended_at = now_datetime()
	doc.save(ignore_permissions=True)
	_append_call_event_message(doc, "مكالمة مرفوضة")
	return _serialize_call(doc)


@frappe.whitelist()
def end_call(call_id):
	user = _current_user()
	doc = _get_call_or_404(call_id)
	if user not in (doc.caller, doc.callee):
		frappe.throw(frappe._("You are not a participant in this call"), frappe.PermissionError)
	doc = _resolve_stale_ringing(doc)

	if doc.status == "Active":
		doc.status = "Ended"
		doc.ended_at = now_datetime()
		doc.duration = int((doc.ended_at - doc.answered_at).total_seconds()) if doc.answered_at else 0
		doc.save(ignore_permissions=True)
		_append_call_event_message(doc, f"مكالمة صوتية — المدة: {_format_duration(doc.duration)}")
	elif doc.status == "Ringing":
		# الطرف اللي بدأ المكالمة قفلها قبل ما حد يرد.
		doc.status = "Cancelled"
		doc.ended_at = now_datetime()
		doc.save(ignore_permissions=True)
		_append_call_event_message(doc, "مكالمة ملغاة")
	# أي حالة تانية (خلّصت بالفعل) — إرجاع الحالة الحالية من غير تعديل، idempotent.
	return _serialize_call(doc)


@frappe.whitelist()
def get_call(call_id):
	"""استدعيها بـPOST مش GET — الدالة دي ممكن تعدّل الحالة فعليًا لـMissed
	لو ring timeout عدّى (_resolve_stale_ringing)، وFrappe مبيعملش commit
	تلقائي لتعديلات حصلت جوه معالج GET. شوف _resolve_stale_ringing's
	تعليق التفصيلي فوق."""
	user = _current_user()
	doc = _get_call_or_404(call_id)
	if user not in (doc.caller, doc.callee):
		frappe.throw(frappe._("You are not a participant in this call"), frappe.PermissionError)
	doc = _resolve_stale_ringing(doc)
	return _serialize_call(doc)


@frappe.whitelist()
def get_active_call_for_conversation(conversation_id):
	"""بديل incoming-call notification حقيقي في النسخة دي — الطرف التاني
	بيعرف إن فيه مكالمة جاية بس لو هو فاتح نفس شاشة الشات وبيعمل poll
	(foreground بس، موثّق صراحة في التقرير — القسم 8 من الطلب).

	استدعيها بـPOST مش GET — نفس سبب get_call بالظبط (_resolve_stale_ringing
	تعديل حقيقي، مش قراءة بحتة)."""
	user = _current_user()
	conv = _get_conversation_or_404(conversation_id)
	_assert_participant(conv, user)
	rows = frappe.get_all(
		"Souq Masr Call",
		filters={"conversation": conversation_id, "status": ["in", ("Ringing", "Active")]},
		fields=["name"],
		order_by="creation desc",
		limit_page_length=1,
	)
	if not rows:
		return {"call": None}
	doc = _resolve_stale_ringing(frappe.get_doc("Souq Masr Call", rows[0].name))
	if doc.status not in ("Ringing", "Active"):
		return {"call": None}
	return {"call": _serialize_call(doc)}


@frappe.whitelist()
def get_rtc_token(call_id):
	"""Phase 2B Slice 4B — الطبقة الوحيدة اللي بتوّلد LiveKit access token
	حقيقي. الغرفة = اسم المكالمة نفسه (CALL-#####) بالظبط — نفس القيد
	الأمني بتاع كل endpoint تاني في الملف ده: المستخدم لازم يبقى caller أو
	callee على *المكالمة دي بالذات* (اتأكد فعليًا فوق، مش افتراض)، فمفيش
	طريقة يوصل بيها لغرفة/هوية تانية بمجرد تمرير id مختلف (القسم 4 و7 من
	طلب Slice 4B: "Prevent arbitrary users from generating tokens for
	rooms they are not authorized to access").

	صوت بس — canPublishSources مقصورة على "microphone" فقط، مفيش أي صلاحية
	نشر كاميرا/شير-سكرين خالص على مستوى الـtoken نفسه (مش مجرد إخفاء زرار
	في الواجهة — حتى لو تطبيق موبايل معدّل حاول ينشر فيديو، LiveKit
	السيرفر نفسه هيرفضه لأن الـtoken ملوش الصلاحية دي أصلًا)."""
	user = _current_user()
	doc = _get_call_or_404(call_id)
	if user not in (doc.caller, doc.callee):
		frappe.throw(frappe._("You are not a participant in this call"), frappe.PermissionError)
	doc = _resolve_stale_ringing(doc)
	if doc.status not in ("Ringing", "Active"):
		frappe.throw(frappe._("Cannot get a voice token for a call with status '{0}'").format(doc.status), frappe.ValidationError)

	api_key, api_secret, ws_url = _livekit_credentials()
	grants = livekit_api.VideoGrants(
		room_join=True,
		room=doc.name,
		can_publish=True,
		can_publish_sources=["microphone"],
		can_subscribe=True,
	)
	token = (
		livekit_api.AccessToken(api_key, api_secret)
		.with_identity(user)
		.with_ttl(timedelta(seconds=LIVEKIT_TOKEN_TTL_SECONDS))
		.with_grants(grants)
		.to_jwt()
	)
	return {"token": token, "ws_url": ws_url, "room": doc.name, "identity": user}
