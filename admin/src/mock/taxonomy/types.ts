/**
 * src/mock/taxonomy/types.ts
 *
 * نسخة الأدمن من عقد التصنيفات — نفس البنية بالظبط اللي في تطبيق
 * الموبايل (mock/taxonomy/types.ts)، الفرق الوحيد إن `icon` هنا اسم
 * أيقونة Lucide (نص) بدل IconName بتاعة نظام SVG المخصّص في الموبايل —
 * كل تطبيق عنده نظام أيقونات مختلف. القيم (id/name/fields) متطابقة.
 *
 * من غير باك إند، النسخة دي snapshot منفصل عن نسخة الموبايل — تعديلات
 * الأدمن هنا محلية بس (موضّح في PLAN). لما يتوصّل باك إند حقيقي، الملف
 * ده هيبقى شكل استجابة GET /categories بالظبط.
 */

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
  label: string;
  labelEn?: string;
  type: FieldType;
  required?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  unit?: string;
};

export type SellingType =
  | 'sale' | 'rent' | 'wanted' | 'exchange' | 'free' | 'service' | 'job' | 'business_sale' | 'auction' | 'other';

export const SELLING_TYPE_LABELS: Record<SellingType, string> = {
  sale: 'للبيع', rent: 'للإيجار', wanted: 'مطلوب', exchange: 'تبديل', free: 'مجانًا',
  service: 'خدمة', job: 'وظيفة', business_sale: 'بيع نشاط تجاري', auction: 'مزاد', other: 'أخرى',
};

export type Condition =
  | 'new' | 'brand_new' | 'like_new' | 'excellent' | 'very_good' | 'good' | 'fair' | 'used' | 'for_parts' | 'refurbished' | 'open_box';

export const CONDITION_LABELS: Record<Condition, string> = {
  new: 'جديد', brand_new: 'جديد بالكرتونة', like_new: 'كالجديد', excellent: 'ممتاز', very_good: 'جيد جدًا',
  good: 'جيد', fair: 'مقبول', used: 'مستعمل', for_parts: 'للقطع فقط', refurbished: 'مجدّد', open_box: 'مفتوح بدون استخدام',
};

export type PriceType =
  | 'fixed' | 'negotiable' | 'free' | 'contact' | 'on_request' | 'per_day' | 'per_month' | 'per_hour' | 'per_unit';

export const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  fixed: 'سعر ثابت', negotiable: 'قابل للتفاوض', free: 'مجاني', contact: 'تواصل للسعر', on_request: 'السعر عند الطلب',
  per_day: 'باليوم', per_month: 'بالشهر', per_hour: 'بالساعة', per_unit: 'بالوحدة',
};

export type Category = {
  id: string;
  parentId: string | null;
  name: string;
  nameEn: string;
  icon: string; // اسم أيقونة Lucide
  order: number;
  hasBrands?: boolean;
  fields: CategoryField[];
  allowedConditions?: Condition[];
  allowedSellingTypes?: SellingType[];
  active?: boolean; // الأدمن يقدر يخفي تصنيف من غير ما يحذفه
};

export type Brand = { id: string; name: string; categoryIds: string[] };
export type Model = { id: string; brandId: string; name: string };

export type LocationType = 'governorate' | 'city' | 'district' | 'area';
export type LocationNode = { id: string; name: string; type: LocationType; parentId: string | null };
