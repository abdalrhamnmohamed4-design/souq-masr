# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# App Version Configuration endpoint (Force Update / Online-Only requirement).
# allow_guest=True on purpose — this check has to run before the user can even
# reach the sign-in screen (see components/StartupGate.tsx on the mobile side:
# Connectivity → Backend → Version → Maintenance → Auth/Guest → App).
#
# Server-side enforcement note (request's §10 — "do not rely exclusively on
# the mobile app"): this endpoint only *reports* the configuration; it doesn't
# itself reject anything. The X-App-Version/X-App-Build/X-Platform headers
# every mobile request now carries (lib/apiClient.ts) are meant for a shared
# before_request hook that rejects SENSITIVE endpoints (listings.create,
# chat.send, etc.) with 426 once those endpoints exist — not written here
# because none of those real Frappe endpoints exist yet either (Phase 2).
# Building that hook now, with nothing real for it to guard, would be
# unverifiable scaffolding — documented instead in
# souq-masr-app/PHASE_1_MOBILE_API_MAPPING.md so it isn't forgotten.

import frappe


@frappe.whitelist(allow_guest=True)
def get_version_config(platform: str = "ios"):
	"""Returns the AppVersionConfig for one platform — mirrors
	types/appVersion.ts's AppVersionConfig exactly, field for field, because
	the mobile app's fetchAppVersionConfig() (services/appVersionService.ts)
	assigns the response body's "message" straight into that type with no
	remapping. If a field is renamed here, it must be renamed there too."""
	if platform not in ("ios", "android"):
		frappe.throw(frappe._("platform must be 'ios' or 'android'"), frappe.ValidationError)

	if not frappe.db.exists("Souq Masr App Version Config", platform):
		# لا يوجد سجل لسه لهذه المنصة — الأصدق أهم من رد وهمي: نرجّع
		# active=False (المطلوب بيتصرف كأن الفحص عدّى عادي، شوف
		# useAppGateStore.runStartupCheck) بدل ما نخترع أرقام إصدارات.
		return {
			"platform": platform,
			"active": False,
			"latest_version": "0.0.0",
			"minimum_supported_version": "0.0.0",
			"force_update": False,
			"maintenance_mode": False,
			"update_message_ar": "",
			"update_message_en": "",
			"update_url_ios": "",
			"update_url_android": "",
		}

	doc = frappe.get_doc("Souq Masr App Version Config", platform)
	return {
		"platform": doc.platform,
		"latest_version": doc.latest_version,
		"minimum_supported_version": doc.minimum_supported_version,
		"latest_build": doc.latest_build or None,
		"minimum_supported_build": doc.minimum_supported_build or None,
		"force_update": bool(doc.force_update),
		"update_message_ar": doc.update_message_ar,
		"update_message_en": doc.update_message_en,
		"update_url_ios": doc.update_url_ios or "",
		"update_url_android": doc.update_url_android or "",
		"active": bool(doc.active),
		"maintenance_mode": bool(doc.maintenance_mode),
		"maintenance_message_ar": doc.maintenance_message_ar or "",
		"maintenance_message_en": doc.maintenance_message_en or "",
	}
