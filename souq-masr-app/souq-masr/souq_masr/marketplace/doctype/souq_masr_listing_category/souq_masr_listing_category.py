# Copyright (c) 2025, Souq Masr and contributors
# For license information, please see license.txt

from frappe.utils.nestedset import NestedSet


class SouqMasrListingCategory(NestedSet):
	nsm_parent_field = "parent_souq_masr_listing_category"
