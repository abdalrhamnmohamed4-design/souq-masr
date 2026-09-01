/**
 * mock/homeFeed.ts — مساعدين الرئيسية. مفيش أي id إعلان أو بائع وهمي
 * تاني هنا: كل قسم في الرئيسية بيتحسب ديناميكيًا من الإعلانات الحقيقية
 * (useAllListings) وقت الريندر، مش من قايمة id ثابتة زي قبل كده. الملف
 * ده بقى بس دوال استعلام بسيطة + التصنيفات السبعة الأولى (بيانات حقيقية
 * من الشجرة، مش وهمية).
 */
import type { Listing } from './listings';
import { getTopLevel } from './taxonomy/categories';
import type { Category } from './taxonomy/types';

// أول 7 تصنيفات رئيسية من شجرة mock/taxonomy — نفس المصدر بتاع شاشة
// التصنيفات الكاملة، بس عرض مصغّر للرئيسية (PART 20: "متعملش overload
// للرئيسية بكل تصنيف"). الكائن الكامل (مش label جاهز) عشان الشاشة تقدر
// تختار name/nameEn حسب اللغة الحالية عبر categoryLabel().
export const homeCategories: Category[] = getTopLevel().slice(0, 7);

/** أحدث الإعلانات — ترتيب الـ array نفسه بيعكس الأحدث الأول لأن
 * publishListing بيحطّ كل إعلان جديد في أول userListings. */
export function newestListings(all: Listing[], limit = 8): Listing[] {
  return all.slice(0, limit);
}

/** المميزة فقط — لو مفيش، الراجع array فاضي (مش هنلفّق تمييز). */
export function featuredListings(all: Listing[], limit = 8): Listing[] {
  return all.filter((l) => l.isFeatured).slice(0, limit);
}

/** الأرخص — ترتيب تصاعدي بالسعر، مفيد بس لو فيه عدد كافي يقارَن. */
export function cheapestListings(all: Listing[], limit = 6): Listing[] {
  return [...all].sort((a, b) => a.price - b.price).slice(0, limit);
}

/** "قريب منك" — بمعناها الحقيقي المتاح من غير GPS: نفس مدينة المستخدم
 * (onboarding.city)، مش مسافة مُلفّقة بالكيلومتر. */
export function listingsInCity(all: Listing[], city: string, limit = 8): Listing[] {
  if (!city) return [];
  return all.filter((l) => l.city === city).slice(0, limit);
}

/** إعلانات تحت مجموعة تصنيفات فرعية (لأسواق السيارات/العقارات المصغّرة
 * في الرئيسية) — بيستخدم getAllDescendantIds من طبقة التصنيفات. */
export function listingsInCategoryIds(all: Listing[], categoryIds: string[], limit = 8): Listing[] {
  const set = new Set(categoryIds);
  return all.filter((l) => set.has(l.categoryKey)).slice(0, limit);
}
