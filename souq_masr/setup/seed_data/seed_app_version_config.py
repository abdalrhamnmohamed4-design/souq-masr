# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# Seeds one harmless default "Souq Masr App Version Config" record per
# platform so a freshly-installed site isn't stuck with an empty list (which
# get_version_config already handles safely — see api/v1/app_config.py — but
# an admin should have something real to edit, not a blank form). Defaults
# are deliberately permissive: minimum_supported_version == latest_version ==
# the mobile app's current app.json version, force_update/maintenance_mode
# both off. This blocks nobody on a fresh install; the admin raises
# minimum_supported_version only when they actually ship a new mandatory
# release. Idempotent like seed_taxonomy.py — safe to re-run on every
# `bench migrate`.

import frappe

DEFAULT_VERSION = "1.0.0"
DEFAULT_BUILD = 1

DEFAULT_MESSAGE_AR = "لازم تحدّث التطبيق علشان تقدر تكمل"
DEFAULT_MESSAGE_EN = "You must update the app to continue"


def seed_app_version_config():
	"""Entry point — called from souq_masr.setup.install.after_install."""
	for platform in ("ios", "android"):
		if frappe.db.exists("Souq Masr App Version Config", platform):
			continue
		frappe.get_doc(
			{
				"doctype": "Souq Masr App Version Config",
				"platform": platform,
				"active": 1,
				"latest_version": DEFAULT_VERSION,
				"latest_build": DEFAULT_BUILD,
				"minimum_supported_version": DEFAULT_VERSION,
				"minimum_supported_build": DEFAULT_BUILD,
				"force_update": 0,
				"update_message_ar": DEFAULT_MESSAGE_AR,
				"update_message_en": DEFAULT_MESSAGE_EN,
				# متعمّد فاضي — مفيش روابط store وهمية (طلب Force Update §14).
				"update_url_ios": "",
				"update_url_android": "",
				"maintenance_mode": 0,
			}
		).insert(ignore_permissions=True)
