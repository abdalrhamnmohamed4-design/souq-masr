/**
 * mock/taxonomy/locations.ts — مصر: محافظة ← مدينة ← حي ← منطقة
 * (PART 5). الـ27 محافظة كاملين، وكل واحدة فيها مدن حقيقية (3-8 مدن)،
 * والمحافظات الكبرى (القاهرة، الجيزة، الإسكندرية، السويس، التجمع
 * الخامس) فيها أحياء/مناطق كمان.
 */
import type { LocationNode } from './types';

export const governorateNames = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'القليوبية', 'بورسعيد', 'السويس', 'دمياط', 'الدقهلية',
  'الشرقية', 'الغربية', 'المنوفية', 'البحيرة', 'كفر الشيخ', 'الفيوم', 'بني سويف', 'المنيا',
  'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد', 'مطروح',
  'شمال سيناء', 'جنوب سيناء', 'الإسماعيلية',
];

function slug(s: string) {
  return s.replace(/\s+/g, '-');
}

export const locations: LocationNode[] = governorateNames.map((name) => ({
  id: `gov-${slug(name)}`,
  name,
  type: 'governorate',
  parentId: null,
}));

// id بيتحسب من slug(cityName) بس — لو فيه مدينتين حقيقيتين في محافظتين
// مختلفتين بنفس الاسم بالظبط (زي "فيصل" في الجيزة والسويس)، بيتصادموا
// على نفس الـid ويضيع واحد منهم صامت. key اختياري بيحل التصادم ده لمدينة
// بعينها من غير ما يغيّر id أي مدينة تانية.
function addCity(govId: string, cityName: string, areas: string[] = [], key?: string) {
  const cityId = key ?? `city-${slug(cityName)}`;
  locations.push({ id: cityId, name: cityName, type: 'city', parentId: govId });
  areas.forEach((a) => locations.push({ id: `area-${slug(cityName)}-${slug(a)}`, name: a, type: 'area', parentId: cityId }));
}

addCity('gov-القاهرة', 'مدينة نصر', ['عباس العقاد', 'الحي العاشر', 'الحي السابع']);
addCity('gov-القاهرة', 'المعادي', ['المعادي الجديدة', 'زهراء المعادي']);
addCity('gov-القاهرة', 'مصر الجديدة', ['روكسي', 'الميرغني']);
addCity('gov-القاهرة', 'التجمع الخامس', ['الشيخ زايد الجديد', 'الرحاب']);
addCity('gov-القاهرة', 'حلوان');
addCity('gov-القاهرة', 'شبرا');
addCity('gov-القاهرة', 'الزيتون');
addCity('gov-القاهرة', 'وسط البلد');

addCity('gov-الجيزة', '6 أكتوبر', ['الحي الأول', 'الحي المتميز']);
addCity('gov-الجيزة', 'الشيخ زايد');
addCity('gov-الجيزة', 'الدقي');
addCity('gov-الجيزة', 'المهندسين');
addCity('gov-الجيزة', 'فيصل');
addCity('gov-الجيزة', 'حدائق الأهرام');
addCity('gov-الجيزة', 'إمبابة');

addCity('gov-الإسكندرية', 'سموحة');
addCity('gov-الإسكندرية', 'ميامي');
addCity('gov-الإسكندرية', 'سيدي جابر');
addCity('gov-الإسكندرية', 'العجمي');

addCity('gov-السويس', 'الأربعين');
addCity('gov-السويس', 'الجناين');
addCity('gov-السويس', 'فيصل', [], 'city-فيصل-السويس'); // تصادم id مع فيصل الجيزة — شوف كومنت addCity
addCity('gov-السويس', 'السويس البلد');
// العين السخنة — منطقة سياحية/عقارية رئيسية على البحر الأحمر، قريبة من
// القاهرة، فيها شاليهات وقرى سياحية بيع وإيجار.
addCity('gov-السويس', 'العين السخنة', ['بورتو السخنة', 'كيلو 43', 'كيلو 63']);

addCity('gov-القليوبية', 'بنها');
addCity('gov-القليوبية', 'شبرا الخيمة');
addCity('gov-القليوبية', 'القناطر الخيرية');
addCity('gov-القليوبية', 'قليوب');

addCity('gov-بورسعيد', 'حي الشرق');
addCity('gov-بورسعيد', 'حي المناخ');
addCity('gov-بورسعيد', 'حي الزهور');

addCity('gov-دمياط', 'دمياط الجديدة');
addCity('gov-دمياط', 'رأس البر');
addCity('gov-دمياط', 'فارسكور');

addCity('gov-الدقهلية', 'المنصورة');
addCity('gov-الدقهلية', 'طلخا');
addCity('gov-الدقهلية', 'ميت غمر');
addCity('gov-الدقهلية', 'دكرنس');

addCity('gov-الشرقية', 'الزقازيق');
addCity('gov-الشرقية', 'العاشر من رمضان');
addCity('gov-الشرقية', 'بلبيس');
addCity('gov-الشرقية', 'أبو كبير');

addCity('gov-الغربية', 'طنطا');
addCity('gov-الغربية', 'المحلة الكبرى');
addCity('gov-الغربية', 'كفر الزيات');
addCity('gov-الغربية', 'زفتى');

addCity('gov-المنوفية', 'شبين الكوم');
addCity('gov-المنوفية', 'منوف');
addCity('gov-المنوفية', 'السادات');
addCity('gov-المنوفية', 'أشمون');

addCity('gov-البحيرة', 'دمنهور');
addCity('gov-البحيرة', 'كفر الدوار');
addCity('gov-البحيرة', 'رشيد');

addCity('gov-كفر-الشيخ', 'كفر الشيخ');
addCity('gov-كفر-الشيخ', 'دسوق');
addCity('gov-كفر-الشيخ', 'بلطيم');

addCity('gov-الفيوم', 'الفيوم');
addCity('gov-الفيوم', 'إطسا');
addCity('gov-الفيوم', 'سنورس');

addCity('gov-بني-سويف', 'بني سويف');
addCity('gov-بني-سويف', 'الواسطى');
addCity('gov-بني-سويف', 'ناصر');

addCity('gov-المنيا', 'المنيا');
addCity('gov-المنيا', 'ملوي');
addCity('gov-المنيا', 'بني مزار');

addCity('gov-أسيوط', 'أسيوط');
addCity('gov-أسيوط', 'ديروط');
addCity('gov-أسيوط', 'منفلوط');

addCity('gov-سوهاج', 'سوهاج');
addCity('gov-سوهاج', 'جرجا');
addCity('gov-سوهاج', 'أخميم');

addCity('gov-قنا', 'قنا');
addCity('gov-قنا', 'نجع حمادي');
addCity('gov-قنا', 'دشنا');

addCity('gov-الأقصر', 'الأقصر');
addCity('gov-الأقصر', 'إسنا');
addCity('gov-الأقصر', 'الطود');

addCity('gov-أسوان', 'أسوان');
addCity('gov-أسوان', 'كوم أمبو');
addCity('gov-أسوان', 'إدفو');

addCity('gov-البحر-الأحمر', 'الغردقة');
addCity('gov-البحر-الأحمر', 'مرسى علم');
addCity('gov-البحر-الأحمر', 'رأس غارب');
addCity('gov-البحر-الأحمر', 'الجونة');
addCity('gov-البحر-الأحمر', 'سهل حشيش');

addCity('gov-الوادي-الجديد', 'الخارجة');
addCity('gov-الوادي-الجديد', 'الداخلة');
addCity('gov-الوادي-الجديد', 'الفرافرة');

addCity('gov-مطروح', 'مرسى مطروح');
addCity('gov-مطروح', 'الحمام');
addCity('gov-مطروح', 'سيدي براني');
// الساحل الشمالي — من أهم مناطق العقارات السياحية في مصر (شاليهات/فيلات
// بيع وإيجار)، لازم تكون منطقة حقيقية يقدر أي مستخدم يختارها ويضيف
// إعلانه فيها، مش بس "مرسى مطروح" كمدينة عامة.
addCity('gov-مطروح', 'الساحل الشمالي', ['مارينا', 'مراسي', 'سيدي عبد الرحمن', 'هاسيندا باي', 'العلمين الجديدة']);

addCity('gov-شمال-سيناء', 'العريش');
addCity('gov-شمال-سيناء', 'الشيخ زويد');
addCity('gov-شمال-سيناء', 'رفح');

addCity('gov-جنوب-سيناء', 'شرم الشيخ');
addCity('gov-جنوب-سيناء', 'دهب');
addCity('gov-جنوب-سيناء', 'نويبع');
addCity('gov-جنوب-سيناء', 'طابا');
addCity('gov-جنوب-سيناء', 'رأس سدر');

addCity('gov-الإسماعيلية', 'الإسماعيلية');
addCity('gov-الإسماعيلية', 'فايد');
addCity('gov-الإسماعيلية', 'القنطرة');

export function getGovernorates() {
  return locations.filter((l) => l.type === 'governorate');
}
export function getLocationChildren(parentId: string) {
  return locations.filter((l) => l.parentId === parentId);
}
export function getLocation(id: string) {
  return locations.find((l) => l.id === id);
}
export function locationLabel(id: string): string {
  return getLocation(id)?.name ?? id;
}
export function locationPathLabel(id: string): string {
  const parts: string[] = [];
  let current = getLocation(id);
  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? getLocation(current.parentId) : undefined;
  }
  return parts.join('، ');
}

/** بحث فعلي على مستوى محافظة/مدينة/منطقة كلهم مع بعض (زي مربع البحث في
 * OpenSooq — مش بس المحافظة الظاهرة على الشاشة). */
export function searchLocations(query: string, limit = 30) {
  const q = query.trim();
  if (!q) return [];
  return locations.filter((l) => l.name.includes(q)).slice(0, limit);
}

export default locations;
