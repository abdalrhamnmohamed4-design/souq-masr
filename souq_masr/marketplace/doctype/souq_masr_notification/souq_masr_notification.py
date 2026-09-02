# Copyright (c) 2026, Souq Masr and contributors
# For license information, please see license.txt
#
# `owner` here means "the recipient this notification is FOR", not "who
# created it" — set explicitly by souq_masr.api.v1.notifications.notify()
# before insert (server-side, ignore_permissions=True). There is
# deliberately no "All: create=1" permission row on this DocType (see the
# JSON) — nothing a mobile client sends can create a notification
# directly; every row here is a real side-effect of a real event
# elsewhere in the backend (a message sent, a call missed, a review
# received, a job application filed/updated), never fabricated to
# populate the UI.

from frappe.model.document import Document


class SouqMasrNotification(Document):
	pass
