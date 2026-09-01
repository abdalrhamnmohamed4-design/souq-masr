/**
 * mock/taxonomy/brandLogos.ts
 *
 * شعارات حقيقية للبراندات — بنستخدم مكتبة simple-icons (مفتوحة المصدر،
 * MIT license) عن طريق jsDelivr CDN، اتأكدت من كل سطر هنا فعليًا (curl
 * لكل رابط لحد ما اتأكد إنه بيرجع 200 وSVG حقيقي) قبل ما أحطه. لو حد
 * يبيع آيفون مثلًا، هيشوف لوجو Apple الحقيقي وهو بيختار البراند في
 * نموذج النشر — مش مربع فاضي أو شكل هندسي.
 *
 * البراندات اللي معندهاش شعار متأكد منه هنا (زي Lexus أو TCL أو
 * Chery — مش موجودين في simple-icons) بترجع undefined، والمكوّن اللي
 * بيستخدمها بيرجع لأيقونة التصنيف العادية بدل ما يعرض رابط مكسور.
 */
const SLUGS: Record<string, string> = {
  // سيارات — متأكد منها
  'car-toyota': 'toyota', 'car-hyundai': 'hyundai', 'car-kia': 'kia', 'car-chevrolet': 'chevrolet',
  'car-nissan': 'nissan', 'car-renault': 'renault', 'car-peugeot': 'peugeot', 'car-citroen': 'citroen',
  'car-fiat': 'fiat', 'car-volkswagen': 'volkswagen', 'car-mg': 'mg', 'car-mitsubishi': 'mitsubishi',
  'car-honda': 'honda', 'car-mazda': 'mazda', 'car-suzuki': 'suzuki', 'car-subaru': 'subaru',
  'car-ford': 'ford', 'car-jeep': 'jeep', 'car-ram': 'ram', 'car-bmw': 'bmw', 'car-mercedes': 'mercedes',
  'car-audi': 'audi', 'car-porsche': 'porsche', 'car-volvo': 'volvo', 'car-jaguar': 'jaguar',
  'car-landrover': 'landrover', 'car-tesla': 'tesla', 'car-maserati': 'maserati', 'car-ferrari': 'ferrari',
  'car-lamborghini': 'lamborghini', 'car-bentley': 'bentley', 'car-rollsroyce': 'rollsroyce',
  'car-astonmartin': 'astonmartin', 'car-mclaren': 'mclaren', 'car-skoda': 'skoda',

  // دراجات نارية
  'bike-honda': 'honda', 'bike-vespa': 'vespa', 'bike-ktm': 'ktm',

  // موبايلات
  'phone-apple': 'apple', 'phone-samsung': 'samsung', 'phone-xiaomi': 'xiaomi', 'phone-redmi': 'xiaomi',
  'phone-oppo': 'oppo', 'phone-oneplus': 'oneplus', 'phone-huawei': 'huawei', 'phone-honor': 'honor',
  'phone-vivo': 'vivo', 'phone-nokia': 'nokia', 'phone-motorola': 'motorola', 'phone-sony': 'sony',
  'phone-googlepixel': 'google', 'phone-asus': 'asus', 'phone-lenovo': 'lenovo',

  // لابتوب
  'laptop-dell': 'dell', 'laptop-hp': 'hp', 'laptop-lenovo': 'lenovo', 'laptop-asus': 'asus',
  'laptop-acer': 'acer', 'laptop-msi': 'msi', 'laptop-microsoft': 'microsoft', 'laptop-huawei': 'huawei',
  'laptop-samsung': 'samsung', 'laptop-razer': 'razer',

  // أجهزة منزلية / إلكترونيات
  'app-samsung-tv': 'samsung', 'app-lg': 'lg', 'app-sony-tv': 'sony', 'app-sharp': 'sharp',
  'app-toshiba': 'toshiba', 'app-bosch': 'bosch',
};

export function getBrandLogoUrl(brandId: string): string | undefined {
  const slug = SLUGS[brandId];
  return slug ? `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${slug}.svg` : undefined;
}
