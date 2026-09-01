/**
 * mock/listings.ts — سجل الإعلانات الحقيقي. من غير باك إند، المصدر
 * الوحيد للإعلانات هو اللي المستخدم نفسه بينشره من شاشة "نشر إعلان"
 * (بيتخزن في store/useAppStore → userListings، ويترّجم لعنصر من نوع
 * Listing زي الموجود هنا بالظبط). الـ array فاضي عن قصد — مفيش إعلانات
 * وهمية / تجريبية؛ ده التطبيق بشكله اللي هيتنشر بيه، جاهز لما يتوصّل
 * بباك إند (ERP) حقيقي يغذّي الإعلانات بدل المستخدم لوحده.
 */
import type { ThumbVariant } from '@/theme/decorative';
import type { PriceType, SellingType } from '@/mock/taxonomy';

/**
 * ProductVariant — نسخة من نفس المنتج بمقاس/لون مختلف، بمخزون وسعر
 * مستقل (PART "Business/Product Listing": SKU → Variants → Size →
 * Color → Stock). فردي بيبيع "قطعة واحدة" فمالوش variants؛ حساب تجاري
 * ببيع "منتج" ممكن يبقى له أكتر من نسخة. مفيش UI لعربة شراء حقيقية
 * لسه — ده جاهز كبنية بيانات للمرحلة الجاية (orders/checkout).
 */
export type ProductVariant = {
  id: string;
  sku?: string;
  size?: string;
  color?: string;
  stock: number;
  priceOverride?: number; // لو سعر المقاس/اللون ده مختلف عن Listing.price
};

export type Listing = {
  id: string;
  title: string;
  price: number;
  priceSuffix?: string; // "شهر" مثلاً
  city: string;
  district?: string;
  postedAt: string; // نص جاهز زي الموك اب ("من ساعة")
  views: number;
  isFeatured: boolean;
  isVerifiedSeller: boolean;
  condition: string;
  categoryKey: string;
  sellerId: string;
  thumb: ThumbVariant;
  images: number;
  description: string;
  specs: { label: string; value: string }[];
  attributes?: Record<string, string>; // قيم category.fields الفعلية (للإعلانات المنشورة من التطبيق)
  locationId?: string; // من mock/taxonomy/locations، للإعلانات الجديدة
  photoUris?: string[]; // صور حقيقية من معرض الجهاز (expo-image-picker) — لو فاضية بيترجع ThumbPlaceholder الزخرفي
  brandId?: string; // من mock/taxonomy/brands — للتصنيفات اللي بتدعم براندات (موبايلات/سيارات...)
  modelId?: string; // من mock/taxonomy/models
  priceType?: PriceType; // fixed | negotiable | contact | free — بيتحكم في عرض السعر (كان بيضيع قبل كده)
  sellingType?: SellingType; // sale | rent وغيرها — فرق أساسي في عقارات/سيارات (كان بيضيع قبل كده)

  // ---- حقول "Business/Product Listing" — اختيارية، فردي مبيستخدمهاش خالص ----
  sellerType?: 'individual' | 'business'; // بيتحدد من وجود business account وقت النشر
  brandName?: string; // اسم البراند التجاري (نص حر من صاحب الحساب)
  sku?: string; // كود المنتج الأساسي (لو من غير variants)
  variants?: ProductVariant[]; // مقاسات/ألوان — لو موجودة، المشتري بيختار نسخة قبل ما يتواصل
  wholesalePrice?: number; // سعر الجملة (اختياري، للحسابات التجارية)
  minWholesaleQty?: number; // أقل كمية للسعر الجملة
  discountPrice?: number; // سعر عرض/خصم مؤقت — لو موجود بيتعرض بدل price
  discountEndsAt?: string; // ISO — نهاية العرض

  // ---- حالة البيع (تدفق تأكيد البيع من الشات) ----
  // undefined = نشط/متاح للاكتشاف (نفس معنى القيمة الغائبة زي isFeatured).
  // 'sold' = اتباع فعليًا (بعد تأكيد صريح من البائع، شوف store/useAppStore.ts's
  // confirmListingSold) — لازم يختفي من كل مسارات الاكتشاف العامة
  // (useDiscoverableListings) بس يفضل موجود في الداتا نفسها لسجل
  // مبيعات البائع/الأدمن. مش بيتحذف أبدًا.
  saleStatus?: 'active' | 'sold';
};

export const listings: Listing[] = [];

export function getListing(id: string) {
  return listings.find((l) => l.id === id);
}

export function getFeaturedListings() {
  return listings.filter((l) => l.isFeatured);
}

export function getListingsBySeller(sellerId: string) {
  return listings.filter((l) => l.sellerId === sellerId);
}

export default listings;
