/**
 * src/mock/taxonomy/categories.ts — نسخة الأدمن من شجرة التصنيفات، نفس
 * المحتوى بالظبط اللي في تطبيق الموبايل (mock/taxonomy/categories.ts
 * هناك) — الفرق الوحيد أسماء أيقونات Lucide بدل IconName. أي تعديل هنا
 * (إضافة/حذف/تعديل تصنيف) محلي جوه الأدمن بس (مفيش باك إند يزامن
 * النسختين دلوقتي).
 */
import type { Category, CategoryField } from './types';

const f = (key: string, label: string, type: CategoryField['type'], extra: Partial<CategoryField> = {}): CategoryField => ({
  key, label, type, filterable: true, searchable: false, ...extra,
});

export const categories: Category[] = [
  { id: 'vehicles', parentId: null, name: 'مركبات', nameEn: 'Vehicles', icon: 'Car', order: 1, fields: [], active: true },
  {
    id: 'cars', parentId: 'vehicles', name: 'سيارات', nameEn: 'Cars', icon: 'Car', order: 1, hasBrands: true, active: true,
    fields: [
      f('sellingType', 'نوع العرض', 'select', { options: ['للبيع', 'للإيجار'], required: true }),
      f('year', 'سنة الصنع', 'year', { required: true }),
      f('mileage', 'الكيلومترات', 'number', { unit: 'كم', required: true }),
      f('bodyType', 'الفئة', 'select', { options: ['سيدان', 'دفع رباعي', 'هاتشباك', 'كوبيه', 'كشف', 'بيك أب', 'فان', 'ميني فان'] }),
      f('transmission', 'ناقل الحركة', 'select', { options: ['أوتوماتيك', 'مانيوال'], required: true }),
      f('fuelType', 'الوقود', 'select', { options: ['بنزين', 'ديزل', 'كهرباء', 'هايبرد'] }),
      f('engineCapacity', 'سعة المحرك', 'text'),
      f('numberOfSeats', 'عدد المقاعد', 'number', { filterable: false }),
      f('color', 'اللون الخارجي', 'text', { filterable: false }),
      f('interiorColor', 'لون الفرش', 'text', { filterable: false }),
      f('origin', 'المنشأ', 'select', { options: ['مصر', 'مستورد', 'مستورد خصوصي'] }),
      f('licenseStatus', 'حالة الرخصة', 'select', { options: ['سارية', 'منتهية', 'بدون رخصة'] }),
      f('accidentHistory', 'تاريخ حوادث', 'boolean'),
      f('numberOfOwners', 'عدد الملاك السابقين', 'number', { filterable: false }),
      f('warranty', 'ضمان', 'boolean'),
      f('exchangeAccepted', 'قابلة للاستبدال', 'boolean'),
      f('financingAvailable', 'تمويل متاح', 'boolean'),
    ],
    allowedSellingTypes: ['sale', 'rent'],
  },
  { id: 'motorcycles', parentId: 'vehicles', name: 'دراجات نارية', nameEn: 'Motorcycles', icon: 'Bike', order: 2, hasBrands: true, active: true,
    fields: [
      f('type', 'النوع', 'select', { options: ['دراجة نارية', 'سكوتر', 'سكوتر كهربائي', 'دراجة كهربائية', 'ATV', 'تروسيكل', 'دراجة كروس', 'تورينج', 'رياضية', 'كلاسيك'] }),
      f('engineCc', 'سعة المحرك (cc)', 'number'), f('mileage', 'الكيلومترات', 'number', { unit: 'كم' }),
      f('transmission', 'ناقل الحركة', 'select', { options: ['أوتوماتيك', 'مانيوال'] }),
      f('color', 'اللون', 'text', { filterable: false }), f('license', 'رخصة', 'boolean'), f('warranty', 'ضمان', 'boolean'),
    ] },
  { id: 'heavy_machinery', parentId: 'vehicles', name: 'معدات ثقيلة', nameEn: 'Heavy Machinery', icon: 'Truck', order: 3, active: true,
    fields: [f('machineType', 'نوع المعدة', 'select', { options: ['حفار', 'لودر', 'بلدوزر', 'ونش', 'رافعة شوكية', 'جرار', 'حصادة', 'كومبريسور', 'مولد كهرباء'] })] },
  { id: 'trucks_commercial', parentId: 'vehicles', name: 'شاحنات ومركبات تجارية', nameEn: 'Trucks & Commercial', icon: 'Truck', order: 4, hasBrands: true, active: true,
    fields: [f('vehicleType', 'النوع', 'select', { options: ['شاحنة', 'أتوبيس', 'ميني باص', 'مقطورة', 'صهريج', 'تبريد', 'ونش سحب'] }), f('capacity', 'الحمولة', 'text')] },
  { id: 'boats', parentId: 'vehicles', name: 'قوارب ومراكب', nameEn: 'Boats', icon: 'Anchor', order: 5, active: true,
    fields: [f('boatType', 'النوع', 'select', { options: ['قارب', 'يخت', 'جت سكي', 'قارب صيد', 'قارب سريع', 'كاياك'] })] },
  { id: 'tires_wheels', parentId: 'vehicles', name: 'إطارات وجنوط', nameEn: 'Tires & Wheels', icon: 'CircleDot', order: 6, active: true,
    fields: [f('size', 'المقاس', 'text', { required: true }), f('width', 'العرض', 'number'), f('diameter', 'القطر', 'number'), f('season', 'الموسم', 'select', { options: ['صيفي', 'شتوي', 'جميع المواسم'] })] },
  { id: 'auto_parts', parentId: 'vehicles', name: 'قطع غيار', nameEn: 'Auto Parts', icon: 'Cog', order: 7, active: true,
    fields: [f('partCategory', 'قسم القطعة', 'select', { options: ['محرك', 'ناقل حركة', 'تعليق وتوجيه', 'فرامل', 'كهرباء', 'هيكل خارجي', 'تبريد', 'وقود وعادم', 'إكسسوارات'] }), f('compatibleWith', 'متوافقة مع', 'text')] },

  { id: 'mobiles_tablets', parentId: null, name: 'موبايلات وتابلت', nameEn: 'Mobiles & Tablets', icon: 'Smartphone', order: 2, fields: [], active: true },
  { id: 'mobiles', parentId: 'mobiles_tablets', name: 'موبايلات', nameEn: 'Mobile Phones', icon: 'Smartphone', order: 1, hasBrands: true, active: true,
    fields: [
      f('storage', 'السعة التخزينية', 'select', { options: ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB'], required: true }),
      f('ram', 'الرام', 'select', { options: ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB'] }),
      f('color', 'اللون', 'text', { filterable: false }), f('batteryHealth', 'صحة البطارية', 'number', { unit: '%' }),
      f('simType', 'نوع الشريحة', 'select', { options: ['شريحة واحدة', 'شريحتين', 'eSIM'] }),
      f('network5g', 'يدعم 5G', 'boolean'), f('screenSize', 'حجم الشاشة', 'text', { filterable: false }),
      f('warranty', 'ضمان', 'boolean'), f('originalBox', 'العلبة الأصلية', 'boolean'), f('chargerIncluded', 'الشاحن موجود', 'boolean'),
      f('faceIdFingerprint', 'بصمة/فيس آي دي شغالة', 'boolean'), f('region', 'الإصدار/المنطقة', 'text', { filterable: false }),
      f('screenReplaced', 'الشاشة اتغيرت', 'boolean'), f('batteryReplaced', 'البطارية اتغيرت', 'boolean'),
    ] },
  { id: 'tablets', parentId: 'mobiles_tablets', name: 'تابلت', nameEn: 'Tablets', icon: 'Tablet', order: 2, hasBrands: true, active: true,
    fields: [f('storage', 'السعة التخزينية', 'select', { options: ['32GB', '64GB', '128GB', '256GB', '512GB'] }), f('ram', 'الرام', 'select', { options: ['3GB', '4GB', '6GB', '8GB'] }), f('screenSize', 'حجم الشاشة', 'text'), f('cellular', 'شريحة اتصال', 'boolean'), f('warranty', 'ضمان', 'boolean')] },
  { id: 'mobile_accessories', parentId: 'mobiles_tablets', name: 'إكسسوارات موبايل', nameEn: 'Mobile Accessories', icon: 'Cable', order: 3, active: true,
    fields: [f('accessoryType', 'النوع', 'select', { options: ['شاحن', 'كابل', 'باور بانك', 'جراب', 'حماية شاشة', 'شاحن لاسلكي', 'سماعات', 'شاشة بديل'] })] },

  { id: 'computers', parentId: null, name: 'كمبيوتر ولابتوب', nameEn: 'Computers & Laptops', icon: 'Laptop', order: 3, fields: [], active: true },
  { id: 'laptops', parentId: 'computers', name: 'لابتوب', nameEn: 'Laptops', icon: 'Laptop', order: 1, hasBrands: true, active: true,
    fields: [
      f('cpu', 'المعالج', 'text', { required: true }), f('generation', 'الجيل', 'text'), f('ram', 'الرام', 'select', { options: ['4GB', '8GB', '16GB', '32GB', '64GB'] }),
      f('storage', 'التخزين', 'text'), f('gpu', 'كارت الشاشة', 'text'), f('screenSize', 'حجم الشاشة', 'text', { filterable: false }),
      f('os', 'نظام التشغيل', 'select', { options: ['Windows', 'macOS', 'Linux', 'Chrome OS', 'بدون'] }),
      f('batteryHealth', 'صحة البطارية', 'number', { unit: '%', filterable: false }), f('warranty', 'ضمان', 'boolean'),
    ] },
  { id: 'desktops', parentId: 'computers', name: 'كمبيوتر مكتبي', nameEn: 'Desktop Computers', icon: 'Monitor', order: 2, active: true, fields: [f('purpose', 'الاستخدام', 'select', { options: ['ألعاب', 'مكتبي', 'محطة عمل', 'ميني بي سي', 'سيرفر'] })] },
  { id: 'pc_parts', parentId: 'computers', name: 'قطع كمبيوتر', nameEn: 'Computer Parts', icon: 'MemoryStick', order: 3, active: true, fields: [f('partType', 'النوع', 'select', { options: ['معالج', 'كارت شاشة', 'رام', 'مذربورد', 'SSD', 'هارد', 'باور سبلاي', 'كيسة', 'تبريد', 'شاشة', 'كيبورد', 'ماوس'] })] },

  { id: 'gaming', parentId: null, name: 'ألعاب', nameEn: 'Gaming', icon: 'Gamepad2', order: 4, active: true,
    fields: [f('platform', 'المنصة', 'select', { options: ['PS4', 'PS5', 'Xbox One', 'Xbox Series X', 'Xbox Series S', 'Nintendo Switch', 'PC'] }), f('itemType', 'النوع', 'select', { options: ['جهاز', 'يد تحكم', 'لعبة', 'حساب', 'إكسسوار', 'كرسي جيمنج', 'مكتب جيمنج', 'سماعة جيمنج', 'VR'] })] },

  { id: 'electronics', parentId: null, name: 'إلكترونيات', nameEn: 'Electronics', icon: 'Tv', order: 5, fields: [], active: true },
  { id: 'tvs', parentId: 'electronics', name: 'شاشات تلفزيون', nameEn: 'TVs', icon: 'Tv', order: 1, hasBrands: true, active: true,
    fields: [f('screenSize', 'حجم الشاشة', 'text', { required: true }), f('resolution', 'الدقة', 'select', { options: ['HD', 'Full HD', '4K', '8K'] }), f('panelType', 'نوع الشاشة', 'select', { options: ['LED', 'QLED', 'OLED'] }), f('smartTv', 'سمارت TV', 'boolean'), f('warranty', 'ضمان', 'boolean')] },
  { id: 'audio', parentId: 'electronics', name: 'صوتيات', nameEn: 'Audio', icon: 'Speaker', order: 2, hasBrands: true, active: true, fields: [f('audioType', 'النوع', 'select', { options: ['سماعات', 'سماعات أذن', 'سبيكر', 'ساوند بار', 'هوم ثياتر', 'أمبليفاير', 'ميكروفون', 'معدات دي جي'] })] },
  { id: 'cameras', parentId: 'electronics', name: 'كاميرات', nameEn: 'Cameras', icon: 'Camera', order: 3, hasBrands: true, active: true, fields: [f('cameraType', 'النوع', 'select', { options: ['DSLR', 'ميرورليس', 'كومباكت', 'أكشن كام', 'كاميرا مراقبة', 'درون', 'عدسة'] })] },

  { id: 'home_appliances', parentId: null, name: 'أجهزة منزلية', nameEn: 'Home Appliances', icon: 'Refrigerator', order: 6, fields: [], active: true },
  { id: 'ac', parentId: 'home_appliances', name: 'تكييفات', nameEn: 'Air Conditioning', icon: 'Wind', order: 1, hasBrands: true, active: true,
    fields: [f('acType', 'النوع', 'select', { options: ['سبليت', 'شباك', 'محمول', 'مركزي'] }), f('capacity', 'القدرة', 'select', { options: ['1 حصان', '1.5 حصان', '2.25 حصان', '3 حصان', '5 حصان'] }), f('inverter', 'إنفرتر', 'boolean'), f('coolingHeating', 'تبريد/تدفئة', 'select', { options: ['تبريد فقط', 'تبريد وتدفئة'] }), f('warranty', 'ضمان', 'boolean')] },
  { id: 'refrigerators', parentId: 'home_appliances', name: 'ثلاجات', nameEn: 'Refrigerators', icon: 'Refrigerator', order: 2, hasBrands: true, active: true, fields: [f('capacity', 'السعة', 'text'), f('type', 'النوع', 'select', { options: ['نوفروست', 'عادية'] })] },
  { id: 'washing_machines', parentId: 'home_appliances', name: 'غسالات', nameEn: 'Washing Machines', icon: 'WashingMachine', order: 3, hasBrands: true, active: true, fields: [f('type', 'النوع', 'select', { options: ['أوتوماتيك', 'نصف أوتوماتيك', 'فتحة علوية', 'فتحة أمامية'] }), f('capacity', 'السعة', 'text')] },
  { id: 'kitchen_appliances', parentId: 'home_appliances', name: 'أجهزة مطبخ', nameEn: 'Kitchen Appliances', icon: 'CookingPot', order: 4, active: true, fields: [f('itemType', 'النوع', 'select', { options: ['فرن', 'ميكروويف', 'غسالة أطباق', 'خلاط', 'مضرب', 'ماكينة قهوة', 'قلاية هوائية', 'غلاية', 'توستر'] })] },
  { id: 'cleaning_appliances', parentId: 'home_appliances', name: 'أجهزة تنظيف', nameEn: 'Cleaning', icon: 'Sparkles', order: 5, active: true, fields: [f('itemType', 'النوع', 'select', { options: ['مكنسة كهربائية', 'مكنسة روبوت', 'منظف بخار'] })] },

  { id: 'real_estate', parentId: null, name: 'عقارات', nameEn: 'Real Estate', icon: 'Home', order: 7, fields: [], active: true },
  { id: 'realestate_sale', parentId: 'real_estate', name: 'عقارات للبيع', nameEn: 'For Sale', icon: 'Home', order: 1, active: true,
    fields: [
      f('propertyType', 'نوع العقار', 'select', { options: ['شقة', 'فيلا', 'تاون هاوس', 'توين هاوس', 'شاليه', 'بنتهاوس', 'دوبلكس', 'استوديو', 'عمارة', 'أرض', 'مزرعة', 'مكتب', 'محل', 'عيادة', 'مخزن', 'مصنع'], required: true }),
      f('area', 'المساحة', 'number', { unit: 'م²', required: true }), f('bedrooms', 'غرف النوم', 'number'), f('bathrooms', 'الحمامات', 'number'),
      f('floor', 'الدور', 'number'), f('floorsInBuilding', 'عدد أدوار العقار', 'number', { filterable: false }),
      f('finishing', 'التشطيب', 'select', { options: ['سوبر لوكس', 'لوكس', 'نصف تشطيب', 'على الطوب الأحمر'] }),
      f('elevator', 'أسانسير', 'boolean'), f('parking', 'جراج', 'boolean'), f('garden', 'حديقة', 'boolean'), f('pool', 'مسبح', 'boolean'), f('seaView', 'فيو بحر', 'boolean'),
      f('paymentMethod', 'طريقة الدفع', 'select', { options: ['كاش', 'تقسيط'] }), f('downPayment', 'المقدم', 'number', { filterable: false }), f('deliveryDate', 'تاريخ التسليم', 'date', { filterable: false }),
    ], allowedSellingTypes: ['sale'] },
  { id: 'realestate_rent', parentId: 'real_estate', name: 'عقارات للإيجار', nameEn: 'For Rent', icon: 'Home', order: 2, active: true,
    fields: [
      f('propertyType', 'نوع العقار', 'select', { options: ['شقة', 'شقة مفروشة', 'فيلا', 'شاليه', 'غرفة', 'غرفة مشتركة', 'مكتب', 'محل', 'عيادة', 'مخزن'], required: true }),
      f('area', 'المساحة', 'number', { unit: 'م²' }), f('bedrooms', 'غرف النوم', 'number'), f('bathrooms', 'الحمامات', 'number'), f('floor', 'الدور', 'number'),
      f('furnished', 'مفروشة', 'boolean'), f('ac', 'تكييف', 'boolean'), f('security', 'أمن', 'boolean'), f('compound', 'داخل كومباوند', 'boolean'),
    ], allowedSellingTypes: ['rent'] },

  { id: 'furniture', parentId: null, name: 'أثاث ومنزل', nameEn: 'Furniture & Home', icon: 'Sofa', order: 8, active: true,
    fields: [f('itemType', 'النوع', 'select', { options: ['غرفة معيشة', 'غرفة نوم', 'غرفة سفرة', 'كنبة', 'كرسي', 'ترابيزة', 'سرير', 'مرتبة', 'دولاب', 'مكتب', 'أثاث أطفال', 'ستائر', 'سجاد', 'إضاءة', 'مراية', 'ديكور', 'أثاث مطبخ', 'أثاث حمام', 'أثاث حديقة'] }), f('material', 'الخامة', 'text', { filterable: false })] },

  { id: 'fashion', parentId: null, name: 'أزياء', nameEn: 'Fashion', icon: 'Shirt', order: 9, fields: [], active: true },
  { id: 'fashion_women', parentId: 'fashion', name: 'حريمي', nameEn: 'Women', icon: 'Shirt', order: 1, active: true, fields: [f('itemType', 'النوع', 'select', { options: ['فستان', 'توب', 'قميص', 'جاكيت', 'معطف', 'بنطلون', 'جينز', 'جيبة', 'عباية', 'حجاب', 'ملابس رياضية', 'ملابس سباحة', 'حذاء', 'شنطة', 'ساعة', 'مجوهرات', 'إكسسوار'] }), f('size', 'المقاس', 'select', { options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] }), f('brand', 'الماركة', 'text', { filterable: false })] },
  { id: 'fashion_men', parentId: 'fashion', name: 'رجالي', nameEn: 'Men', icon: 'Shirt', order: 2, active: true, fields: [f('itemType', 'النوع', 'select', { options: ['قميص', 'تيشيرت', 'بنطلون', 'جينز', 'بدلة', 'جاكيت', 'معطف', 'ملابس رياضية', 'حذاء', 'سنيكرز', 'ساعة', 'شنطة', 'إكسسوار'] }), f('size', 'المقاس', 'select', { options: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] }), f('brand', 'الماركة', 'text', { filterable: false })] },
  { id: 'fashion_kids', parentId: 'fashion', name: 'أطفال', nameEn: 'Kids', icon: 'Baby', order: 3, active: true, fields: [f('itemType', 'النوع', 'select', { options: ['ملابس أولادي', 'ملابس بناتي', 'ملابس بيبي', 'حذاء بيبي', 'حذاء أطفال', 'ملابس مدرسة', 'لعب', 'عربية أطفال', 'كارسيت', 'أثاث أطفال'] })] },

  { id: 'beauty', parentId: null, name: 'الجمال والعناية الشخصية', nameEn: 'Beauty & Personal Care', icon: 'Sparkles', order: 10, active: true,
    fields: [f('itemType', 'النوع', 'select', { options: ['مكياج', 'عناية بالبشرة', 'عناية بالشعر', 'عطور', 'عود وبخور', 'أدوات شعر', 'سيشوار', 'مكواة شعر', 'أدوات حلاقة', 'أجهزة تجميل', 'منتجات أظافر', 'معدات صالون'] })] },

  { id: 'services', parentId: null, name: 'خدمات', nameEn: 'Services', icon: 'Wrench', order: 11, fields: [], active: true },
  { id: 'services_home', parentId: 'services', name: 'خدمات منزلية', nameEn: 'Home Services', icon: 'Wrench', order: 1, active: true, allowedSellingTypes: ['service'], fields: [f('serviceType', 'نوع الخدمة', 'select', { options: ['سباكة', 'كهرباء', 'دهانات', 'نجارة', 'تكييفات', 'صيانة أجهزة', 'تنظيف', 'مكافحة حشرات', 'نقل عفش', 'تركيب أثاث', 'ألوميتال', 'سيكوريت', 'لحام', 'أرضيات', 'سيراميك'], required: true })] },
  { id: 'services_auto', parentId: 'services', name: 'خدمات سيارات', nameEn: 'Automotive Services', icon: 'Car', order: 2, active: true, allowedSellingTypes: ['service'], fields: [f('serviceType', 'نوع الخدمة', 'select', { options: ['ميكانيكا', 'غسيل سيارات', 'تلميع', 'إطارات', 'سطحة', 'تغيير زيت', 'كهرباء عربيات', 'تكييف عربيات', 'فحص'] })] },
  { id: 'services_tech', parentId: 'services', name: 'خدمات تقنية', nameEn: 'Technology Services', icon: 'Laptop', order: 3, active: true, allowedSellingTypes: ['service'], fields: [f('serviceType', 'نوع الخدمة', 'select', { options: ['صيانة كمبيوتر', 'صيانة موبايل', 'برمجة', 'تطوير مواقع', 'تطوير تطبيقات', 'دعم فني', 'شبكات', 'كاميرات مراقبة', 'ستالايت'] })] },
  { id: 'services_business', parentId: 'services', name: 'خدمات أعمال', nameEn: 'Business Services', icon: 'Briefcase', order: 4, active: true, allowedSellingTypes: ['service'], fields: [f('serviceType', 'نوع الخدمة', 'select', { options: ['محاسبة', 'ضرائب', 'قانونية', 'تسويق', 'إعلانات', 'تصميم جرافيك', 'طباعة', 'ترجمة', 'موارد بشرية', 'استشارات'] })] },
  { id: 'services_events', parentId: 'services', name: 'خدمات مناسبات', nameEn: 'Events', icon: 'PartyPopper', order: 5, active: true, allowedSellingTypes: ['service'], fields: [f('serviceType', 'نوع الخدمة', 'select', { options: ['تنظيم أفراح', 'تصوير', 'فيديو', 'كاترينج', 'قاعات', 'ديكور', 'دي جي', 'فرق موسيقية'] })] },

  { id: 'jobs', parentId: null, name: 'وظائف', nameEn: 'Jobs', icon: 'Briefcase', order: 12, active: true, allowedSellingTypes: ['job'],
    fields: [
      f('jobCategory', 'مجال الوظيفة', 'select', { options: ['محاسبة', 'مبيعات', 'تسويق', 'تكنولوجيا المعلومات', 'برمجة', 'هندسة', 'إنشاءات', 'رعاية صحية', 'تعليم', 'ضيافة وسياحة', 'تجزئة', 'خدمة عملاء', 'إدارة', 'موارد بشرية', 'قانونية', 'تصميم', 'نقل', 'أمن', 'تصنيع', 'لوجستيات'], required: true }),
      f('employmentType', 'نوع الوظيفة', 'select', { options: ['دوام كامل', 'دوام جزئي', 'عن بعد', 'فريلانس', 'تدريب', 'مؤقت', 'موسمي'], required: true }),
      f('salary', 'الراتب', 'number', { filterable: false }), f('salaryType', 'نوع الراتب', 'select', { options: ['شهري', 'يومي', 'بالساعة', 'حسب المشروع'] }),
      f('experience', 'الخبرة المطلوبة', 'select', { options: ['بدون خبرة', 'أقل من سنة', '1-3 سنوات', '3-5 سنوات', 'أكتر من 5 سنوات'] }),
      f('education', 'المؤهل', 'select', { options: ['أي مؤهل', 'ثانوية', 'دبلوم', 'بكالوريوس', 'ماجستير أو أعلى'] }),
      f('remote', 'عن بعد', 'boolean'), f('company', 'الشركة', 'text', { filterable: false }),
    ] },

  { id: 'pets', parentId: null, name: 'حيوانات أليفة', nameEn: 'Pets & Animals', icon: 'PawPrint', order: 13, active: true,
    fields: [
      f('species', 'النوع', 'select', { options: ['كلاب', 'قطط', 'طيور', 'أسماك', 'أرانب', 'هامستر', 'خيول', 'أبقار', 'أغنام', 'ماعز', 'دجاج', 'بط', 'حمام', 'سلاحف', 'أخرى'], required: true }),
      f('breed', 'السلالة', 'text'), f('age', 'العمر', 'text', { filterable: false }), f('gender', 'النوع', 'select', { options: ['ذكر', 'أنثى'] }),
      f('vaccinated', 'مطعّم', 'boolean'), f('pedigree', 'شهادة نسب', 'boolean'),
    ] },
  { id: 'pet_supplies', parentId: 'pets', name: 'مستلزمات حيوانات', nameEn: 'Pet Supplies', icon: 'Bone', order: 2, active: true, fields: [f('itemType', 'النوع', 'select', { options: ['أكل', 'ألعاب', 'أقفاص', 'أحواض أسماك', 'إكسسوارات'] })] },

  { id: 'sports', parentId: null, name: 'رياضة ولياقة', nameEn: 'Sports & Fitness', icon: 'Dumbbell', order: 14, active: true,
    fields: [f('itemType', 'النوع', 'select', { options: ['معدات جيم', 'جهاز مشي', 'دراجة ثابتة', 'أوزان', 'دمبل', 'بنش', 'دراجة هوائية', 'دراجة كهربائية', 'دراجة أطفال', 'بادل', 'تنس', 'كرة قدم', 'كرة سلة', 'سباحة', 'تخييم', 'صيد', 'غوص', 'فنون قتالية', 'ملابس رياضية', 'أحذية رياضية'] }), f('brand', 'الماركة', 'text', { filterable: false })] },

  { id: 'music_art', parentId: null, name: 'موسيقى وفن', nameEn: 'Music & Art', icon: 'Music', order: 15, active: true,
    fields: [f('itemType', 'النوع', 'select', { options: ['جيتار', 'بيانو', 'كيبورد', 'درامز', 'كمان', 'عود', 'ميكروفون', 'أمبليفاير', 'معدات دي جي', 'لوحات فنية', 'حرف يدوية', 'مقتنيات فنية'] })] },

  { id: 'books_education', parentId: null, name: 'كتب وتعليم', nameEn: 'Books & Education', icon: 'BookOpen', order: 16, active: true,
    fields: [f('itemType', 'النوع', 'select', { options: ['كتب', 'كتب مدرسية', 'كتب جامعية', 'كتب لغات', 'مواد تعليمية', 'أدوات مكتبية', 'آلات حاسبة', 'كورسات', 'دروس خصوصية'] }), f('subject', 'المادة', 'text', { filterable: false })] },

  { id: 'business_equipment', parentId: null, name: 'معدات ومنشآت تجارية', nameEn: 'Business & Commercial Equipment', icon: 'Building2', order: 17, active: true, allowedSellingTypes: ['sale', 'business_sale'],
    fields: [f('itemType', 'النوع', 'select', { options: ['مطعم للبيع', 'كافيه للبيع', 'محل للبيع', 'نشاط تجاري للبيع', 'امتياز تجاري', 'معدات مطاعم', 'تبريد', 'معدات مطابخ', 'معدات صالونات', 'معدات طبية', 'معدات صناعية', 'معدات إنشاءات', 'مولدات', 'معدات طاقة شمسية', 'CNC', 'معدات لحام', 'معدات خياطة', 'معدات تغليف', 'معدات مخازن'] })] },

  { id: 'collectibles', parentId: null, name: 'مقتنيات وهوايات', nameEn: 'Collectibles & Leisure', icon: 'Star', order: 18, active: true,
    fields: [f('itemType', 'النوع', 'select', { options: ['عملات', 'طوابع', 'ساعات', 'تحف', 'لوحات', 'تذكارات', 'كتب نادرة', 'أسطوانات', 'مقتنيات موسيقية', 'كروت', 'كروت رياضية', 'تذاكر', 'قسائم'] })] },

  { id: 'misc', parentId: null, name: 'متنوعة', nameEn: 'Other', icon: 'Package', order: 19, fields: [], active: true },
];

export function getCategory(id: string) {
  return categories.find((c) => c.id === id);
}
export function getChildren(parentId: string | null) {
  return categories.filter((c) => c.parentId === parentId).sort((a, b) => a.order - b.order);
}
export function getTopLevel() {
  return getChildren(null);
}
export function getPath(id: string): Category[] {
  const path: Category[] = [];
  let current = getCategory(id);
  while (current) {
    path.unshift(current);
    current = current.parentId ? getCategory(current.parentId) : undefined;
  }
  return path;
}

export default categories;
