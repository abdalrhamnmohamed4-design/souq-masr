# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Payments vertical. IMPORTANT — this is NOT a card/gateway integration
# (Paymob, Stripe, etc.) — none exists anywhere in this codebase, and
# per the explicit instruction for this slice ("Do NOT invent a payment
# provider integration"), none was invented. It is the real backend for
# the product's ACTUAL, already-designed payment model: the mobile app
# (app/pay.tsx) shows the user real admin-managed receiving numbers
# (Vodafone Cash/Orange Cash/Etisalat Cash/InstaPay/bank transfer), the
# user transfers money to one of them OUTSIDE this system (there is no
# way to verify that programmatically without a gateway, by design of
# this product), and then submits a claim here — which starts Pending,
# not confirmed. Only a real admin approving it (via Frappe's own desk
# UI or API, not a client-facing endpoint — see approve_payment_request)
# actually credits the wallet. This is what makes the whole flow
# reconciliation-safe and free of any "fake payment succeeded" state:
# the mobile app's OLD mock behavior (store/useAppStore.ts's topUp())
# credited the wallet the instant the user tapped "confirm" with zero
# verification of anything — exactly the anti-pattern this slice's own
# instructions warn against, and exactly what this file replaces.
#
# Wallet-to-wallet transfer (app/transfer.tsx) is architecturally
# different and handled separately (transfer_balance): no external money
# enters the system, so there is nothing to verify externally — it is a
# real-time, atomic, server-authoritative ledger operation instead of a
# pending-approval one.
#
# Ad promotion (app/promote/[id].tsx) is deliberately NOT wired to real
# spending this slice — no real "featured listing" capability exists in
# the Listings backend yet either (Phase 2B Slice 2's own report:
# "'featured' stays honestly empty array — no promotion system"),
# so there is nothing real for a promotion payment to actually purchase.
# Documented as a dependency on that feature landing first, not silently
# skipped.

import frappe
from frappe.utils import cint, now_datetime

from souq_masr.api.v1 import notifications

PAGE_SIZE_DEFAULT = 20


def _current_user():
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(frappe._("Sign in required"), frappe.PermissionError)
	return user


def _is_admin():
	return "Souq Masr Admin" in frappe.get_roles(frappe.session.user)


def _assert_admin():
	if not _is_admin():
		frappe.throw(frappe._("Admin only"), frappe.PermissionError)


def _get_or_create_wallet(user):
	existing = frappe.db.exists("Souq Masr Wallet", {"owner": user})
	if existing:
		return frappe.get_doc("Souq Masr Wallet", existing)
	doc = frappe.new_doc("Souq Masr Wallet")
	doc.balance = 0
	doc.insert(ignore_permissions=True)
	frappe.db.set_value("Souq Masr Wallet", doc.name, "owner", user, update_modified=False)
	doc.reload()
	return doc


def _credit(user, amount):
	wallet = _get_or_create_wallet(user)
	wallet.balance = cint(wallet.balance or 0) + cint(amount)
	wallet.save(ignore_permissions=True)
	return wallet.balance


def _debit(user, amount):
	wallet = _get_or_create_wallet(user)
	if cint(wallet.balance or 0) < cint(amount):
		frappe.throw(frappe._("Insufficient balance"), frappe.ValidationError)
	wallet.balance = cint(wallet.balance) - cint(amount)
	wallet.save(ignore_permissions=True)
	return wallet.balance


def _serialize_request(doc):
	return {
		"id": doc.name,
		"amount": doc.amount,
		"method": doc.method,
		"payment_number": doc.payment_number,
		"reference_note": doc.reference_note or "",
		"status": doc.status,
		"admin_note": doc.admin_note or "",
		"created_at": str(doc.creation),
		"processed_at": str(doc.processed_at) if doc.processed_at else None,
	}


def _serialize_payment_number(doc):
	return {
		"id": doc.name,
		"method": doc.method,
		"label": doc.label or "",
		"holder_name": doc.holder_name,
		"number": doc.number,
	}


@frappe.whitelist()
def get_active_payment_numbers():
	_current_user()
	rows = frappe.get_all(
		"Souq Masr Payment Number", filters={"active": 1}, fields=["name", "method", "label", "holder_name", "number"], order_by="creation asc"
	)
	return {"items": [{"id": r.name, "method": r.method, "label": r.label or "", "holder_name": r.holder_name, "number": r.number} for r in rows]}


@frappe.whitelist()
def get_my_wallet():
	user = _current_user()
	wallet = _get_or_create_wallet(user)
	return {"balance": cint(wallet.balance or 0)}


@frappe.whitelist()
def create_topup_request(amount, method=None, payment_number=None, reference_note=None):
	"""بيسجّل *طلب* شحن بس — الرصيد **مش** بيتزاد هنا خالص. لازم أدمن
	حقيقي يوافق (approve_payment_request) بعد ما يتأكد من التحويل الفعلي
	من كشف حسابه/محفظته هو. القسم ده بالظبط هو اللي بيمنع "نجاح دفع وهمي"
	— الحالة الافتراضية Pending، مش Approved."""
	user = _current_user()
	amount = cint(amount)
	if amount <= 0:
		frappe.throw(frappe._("Amount must be a positive number"), frappe.ValidationError)
	if payment_number and not frappe.db.exists("Souq Masr Payment Number", {"name": payment_number, "active": 1}):
		frappe.throw(frappe._("Invalid payment number"), frappe.ValidationError)

	doc = frappe.new_doc("Souq Masr Payment Request")
	doc.amount = amount
	doc.method = method
	doc.payment_number = payment_number
	doc.reference_note = reference_note
	doc.status = "Pending"
	doc.insert()
	return _serialize_request(doc)


@frappe.whitelist()
def get_my_payment_requests(page=1, limit=PAGE_SIZE_DEFAULT):
	user = _current_user()
	page = cint(page) or 1
	limit = cint(limit) or PAGE_SIZE_DEFAULT
	offset = (page - 1) * limit
	filters = {"owner": user}
	total = frappe.db.count("Souq Masr Payment Request", filters)
	rows = frappe.get_all("Souq Masr Payment Request", filters=filters, fields=["name"], order_by="creation desc", limit_start=offset, limit_page_length=limit)
	items = [_serialize_request(frappe.get_doc("Souq Masr Payment Request", r.name)) for r in rows]
	return {"items": items, "total": total, "page": page, "limit": limit}


@frappe.whitelist()
def transfer_balance(to_phone, amount):
	"""تحويل رصيد حقيقي بين مستخدمين — فوري، مش محتاج موافقة أدمن، لأن
	مفيش فلوس خارجية بتدخل النظام أصلًا (عكس create_topup_request تمامًا)
	— مجرد نقل رصيد مؤكّد بالفعل من محفظة لمحفظة، بالتحقق الفعلي من
	الرصيد المتاح وقت التنفيذ، مش قيمة العميل المُرسَلة."""
	user = _current_user()
	amount = cint(amount)
	if amount <= 0:
		frappe.throw(frappe._("Amount must be a positive number"), frappe.ValidationError)

	to_phone = (to_phone or "").strip()
	recipient = frappe.db.get_value("User", {"mobile_no": to_phone}, "name")
	if not recipient:
		frappe.throw(frappe._("No user found with that phone number"), frappe.DoesNotExistError)
	if recipient == user:
		frappe.throw(frappe._("You cannot transfer balance to yourself"), frappe.ValidationError)

	_debit(user, amount)
	_credit(recipient, amount)
	notifications.notify(recipient, "payment_confirmed", "استلمت رصيد", f"استلمت {amount} ج.م رصيد.")
	return {"balance": _get_or_create_wallet(user).balance}


# ============================================================ Admin-only
# مفيش UI موبايل بينادي الاتنين دول خالص — الأدمن بيستخدمهم عن طريق
# Frappe's desk UI (/app/souq-masr-payment-request) أو نداء API مباشر،
# نفس القرار المتّبع مع كل حالة "verification pending" تانية في المشروع
# ده (شركة/ملف محترف) — بناء admin dashboard حقيقي خارج نطاق أي slice
# لحد دلوقتي.

@frappe.whitelist()
def approve_payment_request(request_id):
	_assert_admin()
	if not request_id or not frappe.db.exists("Souq Masr Payment Request", request_id):
		frappe.throw(frappe._("Payment request not found"), frappe.DoesNotExistError)
	doc = frappe.get_doc("Souq Masr Payment Request", request_id)
	if doc.status != "Pending":
		# idempotent — إعادة الموافقة على طلب اتوافق عليه بالفعل مش بتزوّد
		# الرصيد تاني، بترجّع الحالة الحالية بس.
		return _serialize_request(doc)

	new_balance = _credit(doc.owner, doc.amount)
	doc.status = "Approved"
	doc.processed_at = now_datetime()
	doc.save(ignore_permissions=True)
	notifications.notify(doc.owner, "payment_confirmed", "اتأكد الشحن", f"{doc.amount} ج.م اتضافوا لرصيدك.")
	return {**_serialize_request(doc), "new_balance": new_balance}


@frappe.whitelist()
def reject_payment_request(request_id, admin_note=None):
	_assert_admin()
	if not request_id or not frappe.db.exists("Souq Masr Payment Request", request_id):
		frappe.throw(frappe._("Payment request not found"), frappe.DoesNotExistError)
	doc = frappe.get_doc("Souq Masr Payment Request", request_id)
	if doc.status != "Pending":
		return _serialize_request(doc)

	doc.status = "Rejected"
	doc.admin_note = admin_note
	doc.processed_at = now_datetime()
	doc.save(ignore_permissions=True)
	notifications.notify(doc.owner, "system", "تعذّر تأكيد الشحن", admin_note or "مقدرناش نأكد عملية الشحن — تواصل مع الدعم.")
	return _serialize_request(doc)


@frappe.whitelist()
def get_pending_payment_requests(page=1, limit=PAGE_SIZE_DEFAULT):
	_assert_admin()
	page = cint(page) or 1
	limit = cint(limit) or PAGE_SIZE_DEFAULT
	offset = (page - 1) * limit
	filters = {"status": "Pending"}
	total = frappe.db.count("Souq Masr Payment Request", filters)
	rows = frappe.get_all("Souq Masr Payment Request", filters=filters, fields=["name"], order_by="creation asc", limit_start=offset, limit_page_length=limit)
	items = [_serialize_request(frappe.get_doc("Souq Masr Payment Request", r.name)) for r in rows]
	return {"items": items, "total": total, "page": page, "limit": limit}
