# Ported 1:1 from ../../../mock/taxonomy/locations.ts — same 27 governorates,
# same real cities, same real areas for the governorates the mobile app went
# deep on (Cairo, Giza, Alexandria, Suez, North Coast, Sinai resort towns).

GOVERNORATE_NAMES = [
	"القاهرة", "الجيزة", "الإسكندرية", "القليوبية", "بورسعيد", "السويس", "دمياط", "الدقهلية",
	"الشرقية", "الغربية", "المنوفية", "البحيرة", "كفر الشيخ", "الفيوم", "بني سويف", "المنيا",
	"أسيوط", "سوهاج", "قنا", "الأقصر", "أسوان", "البحر الأحمر", "الوادي الجديد", "مطروح",
	"شمال سيناء", "جنوب سيناء", "الإسماعيلية",
]


def _slug(s: str) -> str:
	return s.replace(" ", "-")


def build_locations() -> list[dict]:
	"""Mirrors mock/taxonomy/locations.ts's governorateNames.map(...) + addCity()
	calls exactly — same ids, same order, same nesting."""
	locations: list[dict] = []

	for name in GOVERNORATE_NAMES:
		locations.append({"id": f"gov-{_slug(name)}", "name": name, "type": "governorate", "parent_id": None})

	def add_city(gov_id: str, city_name: str, areas: list[str] | None = None):
		city_id = f"city-{_slug(city_name)}"
		locations.append({"id": city_id, "name": city_name, "type": "city", "parent_id": gov_id})
		for a in areas or []:
			locations.append({"id": f"area-{_slug(city_name)}-{_slug(a)}", "name": a, "type": "area", "parent_id": city_id})

	add_city("gov-القاهرة", "مدينة نصر", ["عباس العقاد", "الحي العاشر", "الحي السابع"])
	add_city("gov-القاهرة", "المعادي", ["المعادي الجديدة", "زهراء المعادي"])
	add_city("gov-القاهرة", "مصر الجديدة", ["روكسي", "الميرغني"])
	add_city("gov-القاهرة", "التجمع الخامس", ["الشيخ زايد الجديد", "الرحاب"])
	add_city("gov-القاهرة", "حلوان")
	add_city("gov-القاهرة", "شبرا")
	add_city("gov-القاهرة", "الزيتون")
	add_city("gov-القاهرة", "وسط البلد")

	add_city("gov-الجيزة", "6 أكتوبر", ["الحي الأول", "الحي المتميز"])
	add_city("gov-الجيزة", "الشيخ زايد")
	add_city("gov-الجيزة", "الدقي")
	add_city("gov-الجيزة", "المهندسين")
	add_city("gov-الجيزة", "فيصل")
	add_city("gov-الجيزة", "حدائق الأهرام")
	add_city("gov-الجيزة", "إمبابة")

	add_city("gov-الإسكندرية", "سموحة")
	add_city("gov-الإسكندرية", "ميامي")
	add_city("gov-الإسكندرية", "سيدي جابر")
	add_city("gov-الإسكندرية", "العجمي")

	add_city("gov-السويس", "الأربعين")
	add_city("gov-السويس", "الجناين")
	add_city("gov-السويس", "فيصل")
	add_city("gov-السويس", "السويس البلد")
	add_city("gov-السويس", "العين السخنة", ["بورتو السخنة", "كيلو 43", "كيلو 63"])

	add_city("gov-القليوبية", "بنها")
	add_city("gov-القليوبية", "شبرا الخيمة")
	add_city("gov-القليوبية", "القناطر الخيرية")
	add_city("gov-القليوبية", "قليوب")

	add_city("gov-بورسعيد", "حي الشرق")
	add_city("gov-بورسعيد", "حي المناخ")
	add_city("gov-بورسعيد", "حي الزهور")

	add_city("gov-دمياط", "دمياط الجديدة")
	add_city("gov-دمياط", "رأس البر")
	add_city("gov-دمياط", "فارسكور")

	add_city("gov-الدقهلية", "المنصورة")
	add_city("gov-الدقهلية", "طلخا")
	add_city("gov-الدقهلية", "ميت غمر")
	add_city("gov-الدقهلية", "دكرنس")

	add_city("gov-الشرقية", "الزقازيق")
	add_city("gov-الشرقية", "العاشر من رمضان")
	add_city("gov-الشرقية", "بلبيس")
	add_city("gov-الشرقية", "أبو كبير")

	add_city("gov-الغربية", "طنطا")
	add_city("gov-الغربية", "المحلة الكبرى")
	add_city("gov-الغربية", "كفر الزيات")
	add_city("gov-الغربية", "زفتى")

	add_city("gov-المنوفية", "شبين الكوم")
	add_city("gov-المنوفية", "منوف")
	add_city("gov-المنوفية", "السادات")
	add_city("gov-المنوفية", "أشمون")

	add_city("gov-البحيرة", "دمنهور")
	add_city("gov-البحيرة", "كفر الدوار")
	add_city("gov-البحيرة", "رشيد")

	add_city("gov-كفر الشيخ", "كفر الشيخ")
	add_city("gov-كفر الشيخ", "دسوق")
	add_city("gov-كفر الشيخ", "بلطيم")

	add_city("gov-الفيوم", "الفيوم")
	add_city("gov-الفيوم", "إطسا")
	add_city("gov-الفيوم", "سنورس")

	add_city("gov-بني سويف", "بني سويف")
	add_city("gov-بني سويف", "الواسطى")
	add_city("gov-بني سويف", "ناصر")

	add_city("gov-المنيا", "المنيا")
	add_city("gov-المنيا", "ملوي")
	add_city("gov-المنيا", "بني مزار")

	add_city("gov-أسيوط", "أسيوط")
	add_city("gov-أسيوط", "ديروط")
	add_city("gov-أسيوط", "منفلوط")

	add_city("gov-سوهاج", "سوهاج")
	add_city("gov-سوهاج", "جرجا")
	add_city("gov-سوهاج", "أخميم")

	add_city("gov-قنا", "قنا")
	add_city("gov-قنا", "نجع حمادي")
	add_city("gov-قنا", "دشنا")

	add_city("gov-الأقصر", "الأقصر")
	add_city("gov-الأقصر", "إسنا")
	add_city("gov-الأقصر", "الطود")

	add_city("gov-أسوان", "أسوان")
	add_city("gov-أسوان", "كوم أمبو")
	add_city("gov-أسوان", "إدفو")

	add_city("gov-البحر الأحمر", "الغردقة")
	add_city("gov-البحر الأحمر", "مرسى علم")
	add_city("gov-البحر الأحمر", "رأس غارب")
	add_city("gov-البحر الأحمر", "الجونة")
	add_city("gov-البحر الأحمر", "سهل حشيش")

	add_city("gov-الوادي الجديد", "الخارجة")
	add_city("gov-الوادي الجديد", "الداخلة")
	add_city("gov-الوادي الجديد", "الفرافرة")

	add_city("gov-مطروح", "مرسى مطروح")
	add_city("gov-مطروح", "الحمام")
	add_city("gov-مطروح", "سيدي براني")
	add_city("gov-مطروح", "الساحل الشمالي", ["مارينا", "مراسي", "سيدي عبد الرحمن", "هاسيندا باي", "العلمين الجديدة"])

	add_city("gov-شمال سيناء", "العريش")
	add_city("gov-شمال سيناء", "الشيخ زويد")
	add_city("gov-شمال سيناء", "رفح")

	add_city("gov-جنوب سيناء", "شرم الشيخ")
	add_city("gov-جنوب سيناء", "دهب")
	add_city("gov-جنوب سيناء", "نويبع")
	add_city("gov-جنوب سيناء", "طابا")
	add_city("gov-جنوب سيناء", "رأس سدر")

	add_city("gov-الإسماعيلية", "الإسماعيلية")
	add_city("gov-الإسماعيلية", "فايد")
	add_city("gov-الإسماعيلية", "القنطرة")

	return locations
