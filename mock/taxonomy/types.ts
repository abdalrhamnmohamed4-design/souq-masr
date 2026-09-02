/**
 * mock/taxonomy/types.ts
 *
 * شكل البيانات هنا مصمّم عمدًا عشان يبقى نفس شكل استجابة REST API
 * مستقبلية (GET /categories, GET /categories/:id/fields, GET /brands...)
 * — لما يتوصّل باك إند حقيقي، الأنواع دي هي عقد الـ API، والتغيير هيبقى
 * في مصدر البيانات (fetch بدل import) مش في شكلها ولا في الشاشات اللي
 * بتستهلكها.
 */
import type { IconName } from '@/components/Icon';

export type FieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'date'
  | 'year'
  | 'location';

export type CategoryField = {
  key: string;
  label: string; // بالعربي — ده اللي بيظهر في نموذج النشر والفلاتر
  labelEn?: string;
  type: FieldType;
  required?: boolean;
  filterable?: boolean; // يظهر في شاشة الفلاتر
  searchable?: boolean; // يدخل في نص البحث العام
  options?: string[]; // لـ select / multiselect
  min?: number;
  max?: number;
  unit?: string;
};

export type SellingType =
  | 'sale'
  | 'rent'
  | 'wanted'
  | 'exchange'
  | 'free'
  | 'service'
  | 'job'
  | 'business_sale'
  | 'auction'
  | 'other';

export const SELLING_TYPE_LABELS: Record<SellingType, string> = {
  sale: 'للبيع',
  rent: 'للإيجار',
  wanted: 'مطلوب',
  exchange: 'تبديل',
  free: 'مجانًا',
  service: 'خدمة',
  job: 'وظيفة',
  business_sale: 'بيع نشاط تجاري',
  auction: 'مزاد',
  other: 'أخرى',
};

export const SELLING_TYPE_LABELS_EN: Record<SellingType, string> = {
  sale: 'For sale',
  rent: 'For rent',
  wanted: 'Wanted',
  exchange: 'Exchange',
  free: 'Free',
  service: 'Service',
  job: 'Job',
  business_sale: 'Business for sale',
  auction: 'Auction',
  other: 'Other',
};

export function sellingTypeLabel(type: SellingType, lang: 'ar' | 'en'): string {
  return lang === 'en' ? SELLING_TYPE_LABELS_EN[type] : SELLING_TYPE_LABELS[type];
}

export type Condition =
  | 'new'
  | 'brand_new'
  | 'like_new'
  | 'excellent'
  | 'very_good'
  | 'good'
  | 'fair'
  | 'used'
  | 'for_parts'
  | 'refurbished'
  | 'open_box';

export const CONDITION_LABELS: Record<Condition, string> = {
  new: 'جديد',
  brand_new: 'جديد بالكرتونة',
  like_new: 'كالجديد',
  excellent: 'ممتاز',
  very_good: 'جيد جدًا',
  good: 'جيد',
  fair: 'مقبول',
  used: 'مستعمل',
  for_parts: 'للقطع فقط',
  refurbished: 'مجدّد',
  open_box: 'مفتوح بدون استخدام',
};

export const CONDITION_LABELS_EN: Record<Condition, string> = {
  new: 'New',
  brand_new: 'Brand new (boxed)',
  like_new: 'Like new',
  excellent: 'Excellent',
  very_good: 'Very good',
  good: 'Good',
  fair: 'Fair',
  used: 'Used',
  for_parts: 'For parts only',
  refurbished: 'Refurbished',
  open_box: 'Open box, unused',
};

export function conditionLabel(cond: Condition, lang: 'ar' | 'en'): string {
  return lang === 'en' ? CONDITION_LABELS_EN[cond] : CONDITION_LABELS[cond];
}

export type PriceType =
  | 'fixed'
  | 'negotiable'
  | 'free'
  | 'contact'
  | 'on_request'
  | 'per_day'
  | 'per_month'
  | 'per_hour'
  | 'per_unit';

export const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  fixed: 'سعر ثابت',
  negotiable: 'قابل للتفاوض',
  free: 'مجاني',
  contact: 'تواصل للسعر',
  on_request: 'السعر عند الطلب',
  per_day: 'باليوم',
  per_month: 'بالشهر',
  per_hour: 'بالساعة',
  per_unit: 'بالوحدة',
};

export const PRICE_TYPE_LABELS_EN: Record<PriceType, string> = {
  fixed: 'Fixed price',
  negotiable: 'Negotiable',
  free: 'Free',
  contact: 'Contact for price',
  on_request: 'Price on request',
  per_day: 'Per day',
  per_month: 'Per month',
  per_hour: 'Per hour',
  per_unit: 'Per unit',
};

export function priceTypeLabel(type: PriceType, lang: 'ar' | 'en'): string {
  return lang === 'en' ? PRICE_TYPE_LABELS_EN[type] : PRICE_TYPE_LABELS[type];
}

export type Currency = 'EGP' | 'USD' | 'EUR';

export type Category = {
  id: string;
  parentId: string | null;
  name: string;
  nameEn: string;
  icon: IconName;
  order: number;
  hasBrands?: boolean; // بيفعّل خطوة اختيار براند/موديل في نموذج النشر
  /** ليها أبناء ولا لأ — جاي من Frappe's is_group على get_children بس
   * (Phase 2A). مش موجود لما المصدر mock (مفيش استخدام قديم بيعتمد عليه)
   * ولا لما الكائن جاي من get_category (تفاصيل تصنيف واحد، مش قايمة). */
  isGroup?: boolean;
  fields: CategoryField[];
  allowedConditions?: Condition[];
  allowedSellingTypes?: SellingType[];
  minPhotos?: number;
  maxPhotos?: number;
};

export type Brand = {
  id: string;
  name: string;
  categoryIds: string[]; // نفس البراند ممكن ينتمي لأكتر من تصنيف (PART 27)
};

export type Model = {
  id: string;
  brandId: string;
  name: string;
};

export type LocationType = 'governorate' | 'city' | 'district' | 'area';

export type LocationNode = {
  id: string;
  name: string;
  type: LocationType;
  parentId: string | null;
};
