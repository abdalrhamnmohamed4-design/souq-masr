# Ported 1:1 from ../../../mock/taxonomy/categories.ts in the Souq Masr mobile app —
# same ids, same field keys, same option lists. Not fabricated placeholder data.
#
# Shape per category dict:
#   id, parent_id, name_ar, name_en, icon, order, has_brands (optional),
#   allowed_conditions (optional list), allowed_selling_types (optional list),
#   fields: [ {key, label, field_type, required, filterable, searchable, options, unit} ]


def f(key, label, field_type, **extra):
	field = {
		"key": key,
		"label": label,
		"field_type": field_type,
		"required": extra.get("required", False),
		"filterable": extra.get("filterable", True),
		"searchable": extra.get("searchable", False),
	}
	if "options" in extra:
		field["options"] = extra["options"]
	if "unit" in extra:
		field["unit"] = extra["unit"]
	return field


CATEGORIES = [
	# ============================================================ 1. المركبات
	{"id": "vehicles", "parent_id": None, "name_ar": "مركبات", "name_en": "Vehicles", "icon": "car", "order": 1, "fields": []},
	{
		"id": "cars", "parent_id": "vehicles", "name_ar": "سيارات", "name_en": "Cars", "icon": "car", "order": 1,
		"has_brands": True,
		"allowed_selling_types": ["sale", "rent"],
		"fields": [
			f("sellingType", "نوع العرض", "select", options=["للبيع", "للإيجار"], required=True),
			f("year", "سنة الصنع", "year", required=True),
			f("mileage", "الكيلومترات", "number", unit="كم", required=True),
			f("bodyType", "الفئة", "select", options=["سيدان", "دفع رباعي", "هاتشباك", "كوبيه", "كشف", "بيك أب", "فان", "ميني فان"]),
			f("transmission", "ناقل الحركة", "select", options=["أوتوماتيك", "مانيوال"], required=True),
			f("fuelType", "الوقود", "select", options=["بنزين", "ديزل", "كهرباء", "هايبرد"]),
			f("engineCapacity", "سعة المحرك", "text"),
			f("numberOfSeats", "عدد المقاعد", "number", filterable=False),
			f("color", "اللون الخارجي", "text", filterable=False),
			f("interiorColor", "لون الفرش", "text", filterable=False),
			f("origin", "المنشأ", "select", options=["مصر", "مستورد", "مستورد خصوصي"]),
			f("licenseStatus", "حالة الرخصة", "select", options=["سارية", "منتهية", "بدون رخصة"]),
			f("accidentHistory", "تاريخ حوادث", "boolean"),
			f("numberOfOwners", "عدد الملاك السابقين", "number", filterable=False),
			f("warranty", "ضمان", "boolean"),
			f("exchangeAccepted", "قابلة للاستبدال", "boolean"),
			f("financingAvailable", "تمويل متاح", "boolean"),
		],
	},
	{
		"id": "motorcycles", "parent_id": "vehicles", "name_ar": "دراجات نارية", "name_en": "Motorcycles", "icon": "bike", "order": 2,
		"has_brands": True,
		"fields": [
			f("type", "النوع", "select", options=["دراجة نارية", "سكوتر", "سكوتر كهربائي", "دراجة كهربائية", "ATV", "تروسيكل", "دراجة كروس", "تورينج", "رياضية", "كلاسيك"]),
			f("engineCc", "سعة المحرك (cc)", "number"),
			f("mileage", "الكيلومترات", "number", unit="كم"),
			f("transmission", "ناقل الحركة", "select", options=["أوتوماتيك", "مانيوال"]),
			f("color", "اللون", "text", filterable=False),
			f("license", "رخصة", "boolean"),
			f("warranty", "ضمان", "boolean"),
		],
	},
	{
		"id": "heavy_machinery", "parent_id": "vehicles", "name_ar": "معدات ثقيلة", "name_en": "Heavy Machinery", "icon": "tool", "order": 3,
		"fields": [f("machineType", "نوع المعدة", "select", options=["حفار", "لودر", "بلدوزر", "ونش", "رافعة شوكية", "جرار", "حصادة", "كومبريسور", "مولد كهرباء"])],
	},
	{
		"id": "trucks_commercial", "parent_id": "vehicles", "name_ar": "شاحنات ومركبات تجارية", "name_en": "Trucks & Commercial", "icon": "car", "order": 4,
		"has_brands": True,
		"fields": [
			f("vehicleType", "النوع", "select", options=["شاحنة", "أتوبيس", "ميني باص", "مقطورة", "صهريج", "تبريد", "ونش سحب"]),
			f("capacity", "الحمولة", "text"),
		],
	},
	{
		"id": "boats", "parent_id": "vehicles", "name_ar": "قوارب ومراكب", "name_en": "Boats", "icon": "car", "order": 5,
		"fields": [f("boatType", "النوع", "select", options=["قارب", "يخت", "جت سكي", "قارب صيد", "قارب سريع", "كاياك"])],
	},
	{
		"id": "tires_wheels", "parent_id": "vehicles", "name_ar": "إطارات وجنوط", "name_en": "Tires & Wheels", "icon": "car", "order": 6,
		"fields": [
			f("size", "المقاس", "text", required=True),
			f("width", "العرض", "number"),
			f("diameter", "القطر", "number"),
			f("season", "الموسم", "select", options=["صيفي", "شتوي", "جميع المواسم"]),
		],
	},
	{
		"id": "auto_parts", "parent_id": "vehicles", "name_ar": "قطع غيار", "name_en": "Auto Parts", "icon": "tool", "order": 7,
		"fields": [
			f("partCategory", "قسم القطعة", "select", options=["محرك", "ناقل حركة", "تعليق وتوجيه", "فرامل", "كهرباء", "هيكل خارجي", "تبريد", "وقود وعادم", "إكسسوارات"]),
			f("compatibleWith", "متوافقة مع", "text"),
		],
	},

	# ============================================================ 2. الموبايلات والتابلت
	{"id": "mobiles_tablets", "parent_id": None, "name_ar": "موبايلات وتابلت", "name_en": "Mobiles & Tablets", "icon": "mobile", "order": 2, "fields": []},
	{
		"id": "mobiles", "parent_id": "mobiles_tablets", "name_ar": "موبايلات", "name_en": "Mobile Phones", "icon": "mobile", "order": 1,
		"has_brands": True,
		"fields": [
			f("storage", "السعة التخزينية", "select", options=["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB"], required=True),
			f("ram", "الرام", "select", options=["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"]),
			f("color", "اللون", "text", filterable=False),
			f("batteryHealth", "صحة البطارية", "number", unit="%"),
			f("simType", "نوع الشريحة", "select", options=["شريحة واحدة", "شريحتين", "eSIM"]),
			f("network5g", "يدعم 5G", "boolean"),
			f("screenSize", "حجم الشاشة", "text", filterable=False),
			f("warranty", "ضمان", "boolean"),
			f("originalBox", "العلبة الأصلية", "boolean"),
			f("chargerIncluded", "الشاحن موجود", "boolean"),
			f("faceIdFingerprint", "بصمة/فيس آي دي شغالة", "boolean"),
			f("region", "الإصدار/المنطقة", "text", filterable=False),
			f("screenReplaced", "الشاشة اتغيرت", "boolean"),
			f("batteryReplaced", "البطارية اتغيرت", "boolean"),
		],
	},
	{
		"id": "tablets", "parent_id": "mobiles_tablets", "name_ar": "تابلت", "name_en": "Tablets", "icon": "mobile", "order": 2,
		"has_brands": True,
		"fields": [
			f("storage", "السعة التخزينية", "select", options=["32GB", "64GB", "128GB", "256GB", "512GB"]),
			f("ram", "الرام", "select", options=["3GB", "4GB", "6GB", "8GB"]),
			f("screenSize", "حجم الشاشة", "text"),
			f("cellular", "شريحة اتصال", "boolean"),
			f("warranty", "ضمان", "boolean"),
		],
	},
	{
		"id": "mobile_accessories", "parent_id": "mobiles_tablets", "name_ar": "إكسسوارات موبايل", "name_en": "Mobile Accessories", "icon": "mobile", "order": 3,
		"fields": [f("accessoryType", "النوع", "select", options=["شاحن", "كابل", "باور بانك", "جراب", "حماية شاشة", "شاحن لاسلكي", "سماعات", "شاشة بديل"])],
	},

	# ============================================================ 3. الكمبيوتر واللابتوب
	{"id": "computers", "parent_id": None, "name_ar": "كمبيوتر ولابتوب", "name_en": "Computers & Laptops", "icon": "laptop", "order": 3, "fields": []},
	{
		"id": "laptops", "parent_id": "computers", "name_ar": "لابتوب", "name_en": "Laptops", "icon": "laptop", "order": 1,
		"has_brands": True,
		"fields": [
			f("cpu", "المعالج", "text", required=True),
			f("generation", "الجيل", "text"),
			f("ram", "الرام", "select", options=["4GB", "8GB", "16GB", "32GB", "64GB"]),
			f("storage", "التخزين", "text"),
			f("gpu", "كارت الشاشة", "text"),
			f("screenSize", "حجم الشاشة", "text", filterable=False),
			f("os", "نظام التشغيل", "select", options=["Windows", "macOS", "Linux", "Chrome OS", "بدون"]),
			f("batteryHealth", "صحة البطارية", "number", unit="%", filterable=False),
			f("warranty", "ضمان", "boolean"),
		],
	},
	{
		"id": "desktops", "parent_id": "computers", "name_ar": "كمبيوتر مكتبي", "name_en": "Desktop Computers", "icon": "laptop", "order": 2,
		"fields": [f("purpose", "الاستخدام", "select", options=["ألعاب", "مكتبي", "محطة عمل", "ميني بي سي", "سيرفر"])],
	},
	{
		"id": "pc_parts", "parent_id": "computers", "name_ar": "قطع كمبيوتر", "name_en": "Computer Parts", "icon": "laptop", "order": 3,
		"fields": [f("partType", "النوع", "select", options=["معالج", "كارت شاشة", "رام", "مذربورد", "SSD", "هارد", "باور سبلاي", "كيسة", "تبريد", "شاشة", "كيبورد", "ماوس"])],
	},

	# ============================================================ 4. الألعاب
	{
		"id": "gaming", "parent_id": None, "name_ar": "ألعاب", "name_en": "Gaming", "icon": "game", "order": 4,
		"fields": [
			f("platform", "المنصة", "select", options=["PS4", "PS5", "Xbox One", "Xbox Series X", "Xbox Series S", "Nintendo Switch", "PC"]),
			f("itemType", "النوع", "select", options=["جهاز", "يد تحكم", "لعبة", "حساب", "إكسسوار", "كرسي جيمنج", "مكتب جيمنج", "سماعة جيمنج", "VR"]),
		],
	},

	# ============================================================ 5. إلكترونيات
	{"id": "electronics", "parent_id": None, "name_ar": "إلكترونيات", "name_en": "Electronics", "icon": "devices", "order": 5, "fields": []},
	{
		"id": "tvs", "parent_id": "electronics", "name_ar": "شاشات تلفزيون", "name_en": "TVs", "icon": "devices", "order": 1,
		"has_brands": True,
		"fields": [
			f("screenSize", "حجم الشاشة", "text", required=True),
			f("resolution", "الدقة", "select", options=["HD", "Full HD", "4K", "8K"]),
			f("panelType", "نوع الشاشة", "select", options=["LED", "QLED", "OLED"]),
			f("smartTv", "سمارت TV", "boolean"),
			f("warranty", "ضمان", "boolean"),
		],
	},
	{
		"id": "audio", "parent_id": "electronics", "name_ar": "صوتيات", "name_en": "Audio", "icon": "devices", "order": 2,
		"has_brands": True,
		"fields": [f("audioType", "النوع", "select", options=["سماعات", "سماعات أذن", "سبيكر", "ساوند بار", "هوم ثياتر", "أمبليفاير", "ميكروفون", "معدات دي جي"])],
	},
	{
		"id": "cameras", "parent_id": "electronics", "name_ar": "كاميرات", "name_en": "Cameras", "icon": "devices", "order": 3,
		"has_brands": True,
		"fields": [f("cameraType", "النوع", "select", options=["DSLR", "ميرورليس", "كومباكت", "أكشن كام", "كاميرا مراقبة", "درون", "عدسة"])],
	},

	# ============================================================ 6. الأجهزة المنزلية
	{"id": "home_appliances", "parent_id": None, "name_ar": "أجهزة منزلية", "name_en": "Home Appliances", "icon": "box", "order": 6, "fields": []},
	{
		"id": "ac", "parent_id": "home_appliances", "name_ar": "تكييفات", "name_en": "Air Conditioning", "icon": "box", "order": 1,
		"has_brands": True,
		"fields": [
			f("acType", "النوع", "select", options=["سبليت", "شباك", "محمول", "مركزي"]),
			f("capacity", "القدرة", "select", options=["1 حصان", "1.5 حصان", "2.25 حصان", "3 حصان", "5 حصان"]),
			f("inverter", "إنفرتر", "boolean"),
			f("coolingHeating", "تبريد/تدفئة", "select", options=["تبريد فقط", "تبريد وتدفئة"]),
			f("warranty", "ضمان", "boolean"),
		],
	},
	{
		"id": "refrigerators", "parent_id": "home_appliances", "name_ar": "ثلاجات", "name_en": "Refrigerators", "icon": "box", "order": 2,
		"has_brands": True,
		"fields": [f("capacity", "السعة", "text"), f("type", "النوع", "select", options=["نوفروست", "عادية"])],
	},
	{
		"id": "washing_machines", "parent_id": "home_appliances", "name_ar": "غسالات", "name_en": "Washing Machines", "icon": "box", "order": 3,
		"has_brands": True,
		"fields": [
			f("type", "النوع", "select", options=["أوتوماتيك", "نصف أوتوماتيك", "فتحة علوية", "فتحة أمامية"]),
			f("capacity", "السعة", "text"),
		],
	},
	{
		"id": "kitchen_appliances", "parent_id": "home_appliances", "name_ar": "أجهزة مطبخ", "name_en": "Kitchen Appliances", "icon": "box", "order": 4,
		"fields": [f("itemType", "النوع", "select", options=["فرن", "ميكروويف", "غسالة أطباق", "خلاط", "مضرب", "ماكينة قهوة", "قلاية هوائية", "غلاية", "توستر"])],
	},
	{
		"id": "cleaning_appliances", "parent_id": "home_appliances", "name_ar": "أجهزة تنظيف", "name_en": "Cleaning", "icon": "box", "order": 5,
		"fields": [f("itemType", "النوع", "select", options=["مكنسة كهربائية", "مكنسة روبوت", "منظف بخار"])],
	},

	# ============================================================ 7. العقارات
	{"id": "real_estate", "parent_id": None, "name_ar": "عقارات", "name_en": "Real Estate", "icon": "house", "order": 7, "fields": []},
	{
		"id": "realestate_sale", "parent_id": "real_estate", "name_ar": "عقارات للبيع", "name_en": "For Sale", "icon": "house", "order": 1,
		"allowed_selling_types": ["sale"],
		"fields": [
			f("propertyType", "نوع العقار", "select", options=["شقة", "فيلا", "تاون هاوس", "توين هاوس", "شاليه", "بنتهاوس", "دوبلكس", "استوديو", "عمارة", "أرض", "مزرعة", "مكتب", "محل", "عيادة", "مخزن", "مصنع"], required=True),
			f("area", "المساحة", "number", unit="م²", required=True),
			f("bedrooms", "غرف النوم", "number"),
			f("bathrooms", "الحمامات", "number"),
			f("floor", "الدور", "number"),
			f("floorsInBuilding", "عدد أدوار العقار", "number", filterable=False),
			f("finishing", "التشطيب", "select", options=["سوبر لوكس", "لوكس", "نصف تشطيب", "على الطوب الأحمر"]),
			f("elevator", "أسانسير", "boolean"),
			f("parking", "جراج", "boolean"),
			f("garden", "حديقة", "boolean"),
			f("pool", "مسبح", "boolean"),
			f("seaView", "فيو بحر", "boolean"),
			f("paymentMethod", "طريقة الدفع", "select", options=["كاش", "تقسيط"]),
			f("downPayment", "المقدم", "number", filterable=False),
			f("deliveryDate", "تاريخ التسليم", "date", filterable=False),
		],
	},
	{
		"id": "realestate_rent", "parent_id": "real_estate", "name_ar": "عقارات للإيجار", "name_en": "For Rent", "icon": "house", "order": 2,
		"allowed_selling_types": ["rent"],
		"fields": [
			f("propertyType", "نوع العقار", "select", options=["شقة", "شقة مفروشة", "فيلا", "شاليه", "غرفة", "غرفة مشتركة", "مكتب", "محل", "عيادة", "مخزن"], required=True),
			f("area", "المساحة", "number", unit="م²"),
			f("bedrooms", "غرف النوم", "number"),
			f("bathrooms", "الحمامات", "number"),
			f("floor", "الدور", "number"),
			f("furnished", "مفروشة", "boolean"),
			f("ac", "تكييف", "boolean"),
			f("security", "أمن", "boolean"),
			f("compound", "داخل كومباوند", "boolean"),
		],
	},

	# ============================================================ 8. الأثاث والمنزل
	{
		"id": "furniture", "parent_id": None, "name_ar": "أثاث ومنزل", "name_en": "Furniture & Home", "icon": "sofa", "order": 8,
		"fields": [
			f("itemType", "النوع", "select", options=["غرفة معيشة", "غرفة نوم", "غرفة سفرة", "كنبة", "كرسي", "ترابيزة", "سرير", "مرتبة", "دولاب", "مكتب", "أثاث أطفال", "ستائر", "سجاد", "إضاءة", "مراية", "ديكور", "أثاث مطبخ", "أثاث حمام", "أثاث حديقة"]),
			f("material", "الخامة", "text", filterable=False),
		],
	},

	# ============================================================ 9. الأزياء
	{"id": "fashion", "parent_id": None, "name_ar": "أزياء", "name_en": "Fashion", "icon": "shirt", "order": 9, "fields": []},
	{
		"id": "fashion_women", "parent_id": "fashion", "name_ar": "حريمي", "name_en": "Women", "icon": "shirt", "order": 1,
		"fields": [
			f("itemType", "النوع", "select", options=["فستان", "توب", "قميص", "جاكيت", "معطف", "بنطلون", "جينز", "جيبة", "عباية", "حجاب", "ملابس رياضية", "ملابس سباحة", "حذاء", "شنطة", "ساعة", "مجوهرات", "إكسسوار"]),
			f("size", "المقاس", "select", options=["XS", "S", "M", "L", "XL", "XXL"]),
			f("brand", "الماركة", "text", filterable=False),
		],
	},
	{
		"id": "fashion_men", "parent_id": "fashion", "name_ar": "رجالي", "name_en": "Men", "icon": "shirt", "order": 2,
		"fields": [
			f("itemType", "النوع", "select", options=["قميص", "تيشيرت", "بنطلون", "جينز", "بدلة", "جاكيت", "معطف", "ملابس رياضية", "حذاء", "سنيكرز", "ساعة", "شنطة", "إكسسوار"]),
			f("size", "المقاس", "select", options=["S", "M", "L", "XL", "XXL", "XXXL"]),
			f("brand", "الماركة", "text", filterable=False),
		],
	},
	{
		"id": "fashion_kids", "parent_id": "fashion", "name_ar": "أطفال", "name_en": "Kids", "icon": "shirt", "order": 3,
		"fields": [f("itemType", "النوع", "select", options=["ملابس أولادي", "ملابس بناتي", "ملابس بيبي", "حذاء بيبي", "حذاء أطفال", "ملابس مدرسة", "لعب", "عربية أطفال", "كارسيت", "أثاث أطفال"])],
	},
	{
		"id": "fashion_shoes_bags", "parent_id": "fashion", "name_ar": "أحذية وشنط", "name_en": "Shoes & Bags", "icon": "case", "order": 4,
		"fields": [
			f("itemType", "النوع", "select", options=["حذاء رجالي", "حذاء حريمي", "حذاء رياضي", "حذاء أطفال", "شنطة يد", "شنطة ظهر", "محفظة", "حزام"]),
			f("size", "المقاس", "select", options=["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"]),
			f("brand", "الماركة", "text", filterable=False),
		],
	},
	{
		"id": "fashion_accessories", "parent_id": "fashion", "name_ar": "إكسسوارات وساعات", "name_en": "Accessories & Watches", "icon": "star", "order": 5,
		"fields": [
			f("itemType", "النوع", "select", options=["ساعة", "نظارة", "مجوهرات", "إكسسوار شعر", "قلادة", "خاتم", "سوار"]),
			f("brand", "الماركة", "text", filterable=False),
		],
	},

	# ============================================================ 10. الجمال والعناية
	{
		"id": "beauty", "parent_id": None, "name_ar": "الجمال والعناية الشخصية", "name_en": "Beauty & Personal Care", "icon": "face", "order": 10,
		"fields": [f("itemType", "النوع", "select", options=["مكياج", "عناية بالبشرة", "عناية بالشعر", "عطور", "عود وبخور", "أدوات شعر", "سيشوار", "مكواة شعر", "أدوات حلاقة", "أجهزة تجميل", "منتجات أظافر", "معدات صالون"])],
	},

	# ============================================================ 11. الخدمات
	{"id": "services", "parent_id": None, "name_ar": "خدمات", "name_en": "Services", "icon": "tool", "order": 11, "fields": []},
	{
		"id": "services_home", "parent_id": "services", "name_ar": "خدمات منزلية", "name_en": "Home Services", "icon": "tool", "order": 1,
		"allowed_selling_types": ["service"],
		"fields": [f("serviceType", "نوع الخدمة", "select", options=["سباكة", "كهرباء", "دهانات", "نجارة", "تكييفات", "صيانة أجهزة", "تنظيف", "مكافحة حشرات", "نقل عفش", "تركيب أثاث", "ألوميتال", "سيكوريت", "لحام", "أرضيات", "سيراميك"], required=True)],
	},
	{
		"id": "services_auto", "parent_id": "services", "name_ar": "خدمات سيارات", "name_en": "Automotive Services", "icon": "tool", "order": 2,
		"allowed_selling_types": ["service"],
		"fields": [f("serviceType", "نوع الخدمة", "select", options=["ميكانيكا", "غسيل سيارات", "تلميع", "إطارات", "سطحة", "تغيير زيت", "كهرباء عربيات", "تكييف عربيات", "فحص"])],
	},
	{
		"id": "services_tech", "parent_id": "services", "name_ar": "خدمات تقنية", "name_en": "Technology Services", "icon": "tool", "order": 3,
		"allowed_selling_types": ["service"],
		"fields": [f("serviceType", "نوع الخدمة", "select", options=["صيانة كمبيوتر", "صيانة موبايل", "برمجة", "تطوير مواقع", "تطوير تطبيقات", "دعم فني", "شبكات", "كاميرات مراقبة", "ستالايت"])],
	},
	{
		"id": "services_business", "parent_id": "services", "name_ar": "خدمات أعمال", "name_en": "Business Services", "icon": "tool", "order": 4,
		"allowed_selling_types": ["service"],
		"fields": [f("serviceType", "نوع الخدمة", "select", options=["محاسبة", "ضرائب", "قانونية", "تسويق", "إعلانات", "تصميم جرافيك", "طباعة", "ترجمة", "موارد بشرية", "استشارات"])],
	},
	{
		"id": "services_events", "parent_id": "services", "name_ar": "خدمات مناسبات", "name_en": "Events", "icon": "tool", "order": 5,
		"allowed_selling_types": ["service"],
		"fields": [f("serviceType", "نوع الخدمة", "select", options=["تنظيم أفراح", "تصوير", "فيديو", "كاترينج", "قاعات", "ديكور", "دي جي", "فرق موسيقية"])],
	},

	# ============================================================ 12. الوظائف
	{
		"id": "jobs", "parent_id": None, "name_ar": "وظائف", "name_en": "Jobs", "icon": "case", "order": 12,
		"allowed_selling_types": ["job"],
		"fields": [
			f("jobCategory", "مجال الوظيفة", "select", options=["محاسبة", "مبيعات", "تسويق", "تكنولوجيا المعلومات", "برمجة", "هندسة", "إنشاءات", "رعاية صحية", "تعليم", "ضيافة وسياحة", "تجزئة", "خدمة عملاء", "إدارة", "موارد بشرية", "قانونية", "تصميم", "نقل", "أمن", "تصنيع", "لوجستيات"], required=True),
			f("employmentType", "نوع الوظيفة", "select", options=["دوام كامل", "دوام جزئي", "عن بعد", "فريلانس", "تدريب", "مؤقت", "موسمي"], required=True),
			f("salary", "الراتب", "number", filterable=False),
			f("salaryType", "نوع الراتب", "select", options=["شهري", "يومي", "بالساعة", "حسب المشروع"]),
			f("experience", "الخبرة المطلوبة", "select", options=["بدون خبرة", "أقل من سنة", "1-3 سنوات", "3-5 سنوات", "أكتر من 5 سنوات"]),
			f("education", "المؤهل", "select", options=["أي مؤهل", "ثانوية", "دبلوم", "بكالوريوس", "ماجستير أو أعلى"]),
			f("remote", "عن بعد", "boolean"),
			f("company", "الشركة", "text", filterable=False),
		],
	},

	# ============================================================ 13. الحيوانات
	{
		"id": "pets", "parent_id": None, "name_ar": "حيوانات أليفة", "name_en": "Pets & Animals", "icon": "paw", "order": 13,
		"fields": [
			f("species", "النوع", "select", options=["كلاب", "قطط", "طيور", "أسماك", "أرانب", "هامستر", "خيول", "أبقار", "أغنام", "ماعز", "دجاج", "بط", "حمام", "سلاحف", "أخرى"], required=True),
			f("breed", "السلالة", "text"),
			f("age", "العمر", "text", filterable=False),
			f("gender", "النوع", "select", options=["ذكر", "أنثى"]),
			f("vaccinated", "مطعّم", "boolean"),
			f("pedigree", "شهادة نسب", "boolean"),
		],
	},
	{
		"id": "pet_supplies", "parent_id": "pets", "name_ar": "مستلزمات حيوانات", "name_en": "Pet Supplies", "icon": "paw", "order": 2,
		"fields": [f("itemType", "النوع", "select", options=["أكل", "ألعاب", "أقفاص", "أحواض أسماك", "إكسسوارات"])],
	},

	# ============================================================ 14. الرياضة واللياقة
	{
		"id": "sports", "parent_id": None, "name_ar": "رياضة ولياقة", "name_en": "Sports & Fitness", "icon": "bike", "order": 14,
		"fields": [
			f("itemType", "النوع", "select", options=["معدات جيم", "جهاز مشي", "دراجة ثابتة", "أوزان", "دمبل", "بنش", "دراجة هوائية", "دراجة كهربائية", "دراجة أطفال", "بادل", "تنس", "كرة قدم", "كرة سلة", "سباحة", "تخييم", "صيد", "غوص", "فنون قتالية", "ملابس رياضية", "أحذية رياضية"]),
			f("brand", "الماركة", "text", filterable=False),
		],
	},

	# ============================================================ 15. الموسيقى والفن
	{
		"id": "music_art", "parent_id": None, "name_ar": "موسيقى وفن", "name_en": "Music & Art", "icon": "mic", "order": 15,
		"fields": [f("itemType", "النوع", "select", options=["جيتار", "بيانو", "كيبورد", "درامز", "كمان", "عود", "ميكروفون", "أمبليفاير", "معدات دي جي", "لوحات فنية", "حرف يدوية", "مقتنيات فنية"])],
	},

	# ============================================================ 16. الكتب والتعليم
	{
		"id": "books_education", "parent_id": None, "name_ar": "كتب وتعليم", "name_en": "Books & Education", "icon": "book", "order": 16,
		"fields": [
			f("itemType", "النوع", "select", options=["كتب", "كتب مدرسية", "كتب جامعية", "كتب لغات", "مواد تعليمية", "أدوات مكتبية", "آلات حاسبة", "كورسات", "دروس خصوصية"]),
			f("subject", "المادة", "text", filterable=False),
		],
	},

	# ============================================================ 17. معدات الأعمال
	{
		"id": "business_equipment", "parent_id": None, "name_ar": "معدات ومنشآت تجارية", "name_en": "Business & Commercial Equipment", "icon": "office", "order": 17,
		"allowed_selling_types": ["sale", "business_sale"],
		"fields": [f("itemType", "النوع", "select", options=["مطعم للبيع", "كافيه للبيع", "محل للبيع", "نشاط تجاري للبيع", "امتياز تجاري", "معدات مطاعم", "تبريد", "معدات مطابخ", "معدات صالونات", "معدات طبية", "معدات صناعية", "معدات إنشاءات", "مولدات", "معدات طاقة شمسية", "CNC", "معدات لحام", "معدات خياطة", "معدات تغليف", "معدات مخازن"])],
	},

	# ============================================================ 18. المقتنيات
	{
		"id": "collectibles", "parent_id": None, "name_ar": "مقتنيات وهوايات", "name_en": "Collectibles & Leisure", "icon": "star", "order": 18,
		"fields": [f("itemType", "النوع", "select", options=["عملات", "طوابع", "ساعات", "تحف", "لوحات", "تذكارات", "كتب نادرة", "أسطوانات", "مقتنيات موسيقية", "كروت", "كروت رياضية", "تذاكر", "قسائم"])],
	},

	# ============================================================ 19. متنوعة
	{"id": "misc", "parent_id": None, "name_ar": "متنوعة", "name_en": "Other", "icon": "box", "order": 19, "fields": []},
]
