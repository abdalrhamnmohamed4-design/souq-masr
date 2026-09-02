# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# ############################################################
# SECURITY — P0, OPEN, BLOCKS REAL PRODUCTION USE
# ############################################################
# signin() below performs NO verification that the caller actually owns
# the phone number they pass. It is a find-or-create: if a User with
# that mobile_no already exists, this re-issues a FRESH, VALID
# api_key/api_secret pair for that existing account and returns it to
# whoever asked. There is no OTP, no password, no proof of possession.
#
# Consequence, live-proven with a self-contained proof-of-concept
# (see MOBILE_BACKEND_INTEGRATION_REPORT.md's "Master Production
# Readiness + Hardening Pass" §3): anyone who knows an existing user's
# phone number can obtain full credentials for that user's real
# account, then read their private chats, act as them anywhere, and —
# because payments.transfer_balance requires nothing beyond "you are
# authenticated as this user" — drain their real wallet balance.
#
# This was a DELIBERATE product decision from before a real backend
# existed (see app/signin.tsx's own header comment and ACCESS_CONTROL.md)
# — reasonable against local mock data, NOT acceptable against a live
# backend holding real money and real private data.
#
# Fixing it correctly requires real SMS OTP verification, which needs a
# third-party SMS provider chosen and paid for by the product owner —
# the same class of decision this codebase already, correctly, declined
# to make unilaterally for payment gateways. DO NOT paper over this
# with a client-side check, a shared secret, or a self-invented
# challenge scheme: none of those are real phone-ownership proof.
# ############################################################
#
# Minimum real authentication foundation for Phase 2B — built ONLY because
# real server-side listing ownership requires it (see
# MOBILE_BACKEND_INTEGRATION_REPORT.md's Phase 2B "Ownership / Authentication"
# section for the full design rationale). Matches the mobile app's own,
# already-shipped product decision documented in app/signin.tsx's header
# comment: name + phone number, no OTP, no password, no separate signup
# flow — signin() below is a find-or-create, not two different endpoints.
#
# Auth mechanism: Frappe's own built-in API key/secret token auth
# (Authorization: token <api_key>:<api_secret>) — the exact same mechanism
# Frappe core's own User > "Generate Keys" desk action uses
# (frappe/core/doctype/user/user.py's generate_keys, which is
# System-Manager-only; this endpoint replicates its few lines of logic for
# a Guest-facing signin call instead of inventing a new auth scheme).
# Nothing here issues a session cookie — the mobile app is a stateless REST
# client, so token auth (no cookie jar to manage) is the correct fit, not a
# shortcut.

import frappe

SYNTHETIC_EMAIL_DOMAIN = "phone.souqmasr.local"


@frappe.whitelist(allow_guest=True)
def signin(name: str, phone: str, country_iso: str = "EG"):
	"""Find-or-create a real Frappe User for this phone number, (re)issue a
	fresh api_key/api_secret pair, and return both plus the user's public
	identity. Idempotent by design: calling this again with the same phone
	always resolves to the same User — never creates a duplicate account —
	which is what lets the mobile app call this silently to backfill
	credentials for an already-locally-authenticated user (see
	services/authService.ts's ensureCredentials()).
	"""
	name = (name or "").strip()
	phone = (phone or "").strip()
	country_iso = (country_iso or "EG").strip().upper()

	if len(name) < 2:
		frappe.throw(frappe._("Name is required"), frappe.ValidationError)
	if not phone.startswith("+") or not phone[1:].isdigit() or len(phone) < 8:
		frappe.throw(frappe._("Invalid phone number — expected international format, e.g. +201012345678"), frappe.ValidationError)

	existing_name = frappe.db.get_value("User", {"mobile_no": phone}, "name")

	if existing_name:
		user_doc = frappe.get_doc("User", existing_name)
		if user_doc.first_name != name or user_doc.full_name != name:
			user_doc.first_name = name
			user_doc.full_name = name
	else:
		user_doc = frappe.new_doc("User")
		user_doc.email = f"{phone.lstrip('+')}@{SYNTHETIC_EMAIL_DOMAIN}"
		user_doc.first_name = name
		user_doc.full_name = name
		user_doc.mobile_no = phone
		user_doc.user_type = "Website User"
		user_doc.send_welcome_email = 0
		user_doc.enabled = 1

	# نفس منطق Frappe core's generate_keys بالظبط (frappe/core/doctype/user/user.py) —
	# api_secret نص عادي هنا بس، قبل الـsave؛ بعد الـsave الحقل نفسه (Password
	# fieldtype) بيتشفّر تلقائيًا ومينفعش يترجّع تاني، فلازم نرجّع القيمة
	# المحلية دي في الرد مباشرة، مش نعيد قراءتها من الـdoc بعد الحفظ.
	api_secret = frappe.generate_hash(length=15)
	if not user_doc.api_key:
		user_doc.api_key = frappe.generate_hash(length=15)
	user_doc.api_secret = api_secret

	if user_doc.is_new():
		user_doc.insert(ignore_permissions=True)
		# "All" role بيتضاف تلقائيًا لأي يوزر جديد من Frappe core نفسه
		# (User.on_update) — مفيش حاجة إضافية مطلوبة هنا عشان صلاحيات
		# Souq Masr Listing's "All" + if_owner تشتغل، بس بنتأكد صراحة
		# بدل ما نفترض بصمت.
		if "All" not in frappe.get_roles(user_doc.name):
			user_doc.add_roles("All")
	else:
		user_doc.save(ignore_permissions=True)

	return {
		"user": {"id": user_doc.name, "name": user_doc.first_name, "phone": user_doc.mobile_no},
		"api_key": user_doc.api_key,
		"api_secret": api_secret,
	}
