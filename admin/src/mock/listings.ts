import type { AdminListing, ListingStatus } from '@/types';
import { categories } from './taxonomy/categories';
import { getGovernorates } from './taxonomy/locations';
import { daysAgo, intBetween, pick, pickWeighted, resetSeed } from './utils';
import { users } from './users';

resetSeed(202);

const STATUS_WEIGHTS: [ListingStatus, number][] = [
  ['approved', 55],
  ['pending', 14],
  ['sold', 15],
  ['expired', 9],
  ['rejected', 5],
  ['deleted', 2],
];

// إعلانات هتتوزّع على تصنيفات فرعية حقيقية (leaf) من شجرة mock/taxonomy —
// نفس مصدر تصنيفات تطبيق الموبايل، مفيش قايمة منفصلة.
const leafCategories = categories.filter((c) => !categories.some((child) => child.parentId === c.id));

const TITLE_BY_CATEGORY: Record<string, string[]> = {
  cars: ['هيونداي إلنترا 2019', 'تويوتا كورولا 2021', 'كيا سيراتو 2020', 'شيفروليه أوبترا 2018'],
  realestate_sale: ['شقة للبيع تشطيب سوبر لوكس', 'فيلا دوبلكس للبيع', 'شاليه للبيع بالساحل'],
  realestate_rent: ['شقة للإيجار 120م', 'محل تجاري للإيجار', 'مكتب للإيجار مدينة نصر'],
  mobiles: ['آيفون 13 برو 256 جيجا', 'سامسونج S22', 'آيفون 11 - 64 جيجا', 'شاومي Redmi Note 12'],
  furniture: ['أوتومان مودرن 7 قطع', 'غرفة نوم كلاسيك', 'كنبة 3 مقاعد'],
  laptops: ['لابتوب ديل i7', 'لابتوب HP i5', 'ماك بوك برو 14"'],
  fashion_women: ['فستان سهرة', 'شنطة جلد طبيعي'],
  fashion_men: ['جاكيت جلد رجالي', 'حذاء رياضي أصلي'],
  motorcycles: ['دراجة نارية 200cc موديل 2021', 'فيسبا 150cc'],
  pets: ['قطة شيرازي للبيع', 'كلب جولدن ريتريفر'],
  services_home: ['خدمة سباكة منازل', 'صيانة تكييفات معتمدة'],
  jobs: ['محاسب أول مطلوب', 'مطور تطبيقات Flutter'],
  misc: ['شهد عسل طبيعي', 'أدوات مطبخ ستانلس'],
};

function makeListing(i: number): AdminListing {
  const category = pick(leafCategories);
  const titles = TITLE_BY_CATEGORY[category.id] ?? [`${category.name} — إعلان تجريبي`];
  const seller = pick(users);
  const status = pickWeighted(STATUS_WEIGHTS);
  const reportsCount = intBetween(0, 100) > 88 ? intBetween(1, 5) : 0;

  return {
    id: `l-${i}`,
    title: pick(titles),
    description: 'وصف تجريبي للإعلان — حالة ممتازة، البيع لعدم الاستخدام، المعاينة متاحة أي وقت.',
    price: intBetween(300, 650000),
    categoryId: category.id,
    location: pick(getGovernorates()).name,
    sellerId: seller.id,
    sellerName: seller.name,
    status,
    createdAt: daysAgo(intBetween(0, 200)),
    views: intBetween(5, 900),
    favorites: intBetween(0, 60),
    messagesCount: intBetween(0, 30),
    reportsCount,
    imagesCount: intBetween(1, 8),
    featured: intBetween(0, 100) > 80,
  };
}

export const listings: AdminListing[] = Array.from({ length: 96 }, (_, i) => makeListing(i + 1));

export function listingLabel(id: string): string {
  return listings.find((l) => l.id === id)?.title ?? id;
}

export default listings;
