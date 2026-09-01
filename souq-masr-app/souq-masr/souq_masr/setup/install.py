# Copyright (c) 2025, Souq Masr and contributors
# For license information, please see license.txt

import frappe

from .seed_data.seed_app_version_config import seed_app_version_config
from .seed_data.seed_taxonomy import seed_taxonomy


def after_install():
	"""Runs once, automatically, after `bench --site <site> install-app souq_masr`.
	Seeds the real taxonomy (categories/brands/models/locations) so the app is
	immediately usable — no manual data entry step, and nothing fabricated:
	every value here is the same reference data the mobile app already ships.
	"""
	frappe.logger("souq_masr").info("Seeding Souq Masr taxonomy...")
	seed_taxonomy()
	frappe.logger("souq_masr").info("Souq Masr taxonomy seeded.")

	frappe.logger("souq_masr").info("Seeding Souq Masr App Version Config defaults...")
	seed_app_version_config()
	frappe.logger("souq_masr").info("Souq Masr App Version Config defaults seeded.")
