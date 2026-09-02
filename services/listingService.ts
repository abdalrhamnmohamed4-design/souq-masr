/**
 * services/listingService.ts — Phase 2B: الطبقة الوحيدة اللي بتنادي
 * souq_masr.api.v1.listings الحقيقي (12 endpoint، شوف
 * MOBILE_BACKEND_INTEGRATION_REPORT.md's Phase 2B section). بترجّع
 * دايمًا نفس شكل التطبيق الحالي (mock/listings.ts's Listing، mock/users.ts's
 * Seller) — مش شكل رد Frappe الخام — عشان app/detail/[id].tsx وباقي
 * الشاشات تقدر تستهلك بيانات حقيقية من غير أي تعديل UI، نفس فلسفة
 * services/taxonomyService.ts بالظبط.
 *
 * نطاق Phase 2B (شريحة عمودية واحدة بس، مش هجرة كاملة — القسم 7/8 من
 * الطلب): create_listing + get_listing متصلين بالفعل (app/post/index.tsx،
 * app/detail/[id].tsx للإعلانات الحقيقية بس). باقي الدوال هنا (update/
 * delete/pause/activate/mark_sold/get_my_listings/get_public_listings/
 * search_listings/get_listings_by_category/get_listings_by_location) —
 * الباك إند مبني ومُختبر حي بالكامل (شوف MOBILE_BACKEND_INTEGRATION_REPORT.md)
 * بس **مش متوصّلة لأي شاشة UI لسه** (myads.tsx/results.tsx لسه mock بالكامل
 * — القسم 8: "Keep mock data where real backend is not ready"). مُصدَّرة
 * هنا جاهزة للربط في الخطوة الجاية.
 */
import { frappeGet, frappePost, frappeUploadFile, type LocalFileUpload } from '@/lib/apiClient';
import { API_BASE_URL } from '@/config/env';
import type { Listing, ProductVariant } from '@/mock/listings';
import { CONDITION_LABELS, type Condition, type PriceType, type SellingType } from '@/mock/taxonomy/types';
import { getCategory } from '@/services/taxonomyService';
import type { Seller } from '@/mock/users';
import type { ApiResult } from '@/types/frappeApi';

const NS = 'souq_masr.api.v1.listings';

// ============================================================ أشكال رد Frappe الخام

type RawSeller = { id: string; name: string; phone: string; member_since: string; ads_count: number };

type RawListing = {
  id: string;
  title: string;
  description: string;
  status: 'Draft' | 'Active' | 'Paused' | 'Sold' | 'Rejected';
  price: number;
  price_type: PriceType;
  selling_type: SellingType | null;
  condition: Condition | null;
  category_key: string;
  brand_id: string | null;
  model_id: string | null;
  location_id: string;
  governorate: string;
  district: string | null;
  views: number;
  seller_type: 'individual' | 'business';
  brand_name: string | null;
  wholesale_price: number | null;
  min_wholesale_qty: number | null;
  discount_price: number | null;
  discount_ends_at: string | null;
  images: string[];
  attributes: Record<string, string>;
  created_at: string;
  updated_at: string;
  seller: RawSeller;
  is_owner: boolean;
};

type RawListingSummary = {
  id: string;
  title: string;
  price: number;
  price_type: PriceType;
  condition: Condition | null;
  category_key: string;
  governorate: string;
  district: string | null;
  thumb: string | null;
  views: number;
  status: string;
  created_at: string;
};

type RawListPage<T> = { items: T[]; total: number; page: number; limit: number };

// ============================================================ محوّلات

function absoluteUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE_URL ?? ''}${url}`;
}

/** "من ساعة"/"من يوم"/... من تاريخ ISO حقيقي — نفس أسلوب mock/homeFeed.ts's
 * postedAt الجاهز، بس محسوب فعليًا من created_at الحقيقي مش نص ثابت. */
function relativeArabicTime(isoLike: string): string {
  const then = new Date(isoLike.replace(' ', 'T'));
  if (Number.isNaN(then.getTime())) return '';
  const diffMs = Date.now() - then.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `من ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `من ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `من ${days} يوم`;
  const months = Math.floor(days / 30);
  if (months < 12) return `من ${months} شهر`;
  return `من ${Math.floor(months / 12)} سنة`;
}

function adaptSeller(raw: RawSeller): Seller {
  const trimmed = (raw.name || '').trim();
  return {
    id: raw.id,
    name: trimmed || 'مستخدم سوق مصر',
    initials: trimmed ? trimmed.slice(0, 2) : '؟',
    verified: false, // التوثيق قيد المراجعة لأي حساب — نفس mock/users.ts's buildCurrentSeller بالظبط
    memberSince: raw.member_since ? `عضو من ${raw.member_since}` : '',
    adsCount: raw.ads_count,
    rating: 0, // مفيش نظام تقييمات حقيقي متصل لسه (Phase 2D، خارج نطاق الشريحة دي)
    responseRate: 0,
    phone: raw.phone,
  };
}

/** بيحوّل رد Frappe الخام لنفس شكل mock/listings.ts's Listing تمامًا —
 * category.fields بتتجاب مع بعض (getCategory من services/taxonomyService.ts
 * الموجودة بالفعل، مش نداء مكرر) عشان specs تتبني بنفس تسميات الحقول
 * الحقيقية، مش attr_key الخام. */
async function adaptListing(raw: RawListing): Promise<{ listing: Listing; seller: Seller }> {
  const categoryResult = await getCategory(raw.category_key);
  const fields = categoryResult.status === 'success' ? categoryResult.data.fields : [];

  const specs = fields
    .filter((f) => raw.attributes[f.key] !== undefined)
    .map((f) => ({ label: f.label, value: raw.attributes[f.key] }));

  const photoUris = raw.images.map(absoluteUrl);

  const listing: Listing = {
    id: raw.id,
    title: raw.title,
    price: raw.price,
    city: raw.governorate,
    district: raw.district ?? undefined,
    postedAt: relativeArabicTime(raw.created_at),
    views: raw.views,
    isFeatured: false, // مفيش نظام تمييز حقيقي متصل لسه (Phase 2D)
    isVerifiedSeller: false,
    condition: raw.condition ? CONDITION_LABELS[raw.condition] : '',
    categoryKey: raw.category_key,
    sellerId: raw.seller.id,
    thumb: 'a',
    images: photoUris.length || 1,
    description: raw.description,
    specs,
    attributes: raw.attributes,
    locationId: raw.location_id,
    photoUris: photoUris.length > 0 ? photoUris : undefined,
    brandId: raw.brand_id ?? undefined,
    modelId: raw.model_id ?? undefined,
    priceType: raw.price_type,
    sellingType: raw.selling_type ?? undefined,
    sellerType: raw.seller_type,
    brandName: raw.brand_name ?? undefined,
    wholesalePrice: raw.wholesale_price ?? undefined,
    minWholesaleQty: raw.min_wholesale_qty ?? undefined,
    discountPrice: raw.discount_price ?? undefined,
    discountEndsAt: raw.discount_ends_at ?? undefined,
    saleStatus: raw.status === 'Sold' ? 'sold' : 'active',
  };

  return { listing, seller: adaptSeller(raw.seller) };
}

function adaptSummary(raw: RawListingSummary): Listing {
  return {
    id: raw.id,
    title: raw.title,
    price: raw.price,
    city: raw.governorate,
    district: raw.district ?? undefined,
    postedAt: relativeArabicTime(raw.created_at),
    views: raw.views,
    isFeatured: false,
    isVerifiedSeller: false,
    condition: raw.condition ? CONDITION_LABELS[raw.condition] : '',
    categoryKey: raw.category_key,
    sellerId: '',
    thumb: 'a',
    images: raw.thumb ? 1 : 0,
    description: '',
    specs: [],
    photoUris: raw.thumb ? [absoluteUrl(raw.thumb)] : undefined,
    priceType: raw.price_type,
    saleStatus: raw.status === 'Sold' ? 'sold' : 'active',
  };
}

// ============================================================ id يبان عليه إنه حقيقي مش mock

/** كل معرّفات الإعلانات المحلية (mock/store) شكلها my-new-N أو mock IDs
 * تانية — الحقيقية دايمًا LST-##### (Souq Masr Listing's autoname، شوف
 * souq_masr_listing.json). التمييز ده هو اللي app/detail/[id].tsx بيستخدمه
 * يقرر يجيب من الباك إند الحقيقي ولا من الـstore المحلي، من غير أي route
 * إضافي أو query param. */
export function isRealListingId(id: string | undefined | null): boolean {
  return !!id && /^LST-\d+$/.test(id);
}

// ============================================================ دوال الخدمة

export type CreateListingInput = {
  title: string;
  description: string;
  category: string;
  location: string;
  price: number;
  priceType: PriceType;
  brand?: string | null;
  model?: string | null;
  sellingType?: SellingType | null;
  condition?: Condition | null;
  sellerType?: 'individual' | 'business';
  brandName?: string | null;
  wholesalePrice?: number | null;
  minWholesaleQty?: number | null;
  discountPrice?: number | null;
  discountEndsAt?: string | null;
  attributes: Record<string, string>;
  imageUrls: string[];
};

export async function createListing(input: CreateListingInput): Promise<ApiResult<{ listing: Listing; seller: Seller }>> {
  const r = await frappePost<RawListing>(`${NS}.create_listing`, {
    title: input.title,
    description: input.description,
    category: input.category,
    location: input.location,
    price: input.price,
    price_type: input.priceType,
    brand: input.brand ?? undefined,
    model: input.model ?? undefined,
    selling_type: input.sellingType ?? undefined,
    condition: input.condition ?? undefined,
    seller_type: input.sellerType ?? 'individual',
    brand_name: input.brandName ?? undefined,
    wholesale_price: input.wholesalePrice ?? undefined,
    min_wholesale_qty: input.minWholesaleQty ?? undefined,
    discount_price: input.discountPrice ?? undefined,
    discount_ends_at: input.discountEndsAt ?? undefined,
    attributes: JSON.stringify(input.attributes ?? {}),
    image_urls: JSON.stringify(input.imageUrls ?? []),
  });
  if (r.status !== 'success') return r;
  return { status: 'success', data: await adaptListing(r.data) };
}

/** إعلان واحد كامل + تفاصيل التصنيف مع بعض (Promise.all + combineApiResultsTuple
 * — نفس نمط app/category/[id].tsx بالظبط) — get_listing وget_category
 * بيتجابوا مع بعض هنا، مش نداءين متتاليين. */
export async function getListing(listingId: string): Promise<ApiResult<{ listing: Listing; seller: Seller }>> {
  const r = await frappeGet<RawListing>(`${NS}.get_listing`, { listing_id: listingId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: await adaptListing(r.data) };
}

/** رفع صورة إعلان واحدة (multipart، is_private=0) — بترجّع الـfile_url
 * النسبي زي ما الباك إند رجّعه (مش absolute)، عشان create_listing's
 * image_urls تتقارن بالضبط مع اللي متخزّن في File.file_url. تحويلها
 * لرابط كامل للعرض بيحصل بس وقت adaptListing/adaptSummary. */
export async function uploadListingImage(file: LocalFileUpload): Promise<ApiResult<string>> {
  const r = await frappeUploadFile(file);
  if (r.status !== 'success') return r;
  return { status: 'success', data: r.data.fileUrl };
}

// ---- الدوال دي مبنية ومُختبرة حي بالكامل (شوف §Phase 2B's live HTTP
// tests) بس مش متوصّلة لأي شاشة UI في الشريحة العمودية دي — جاهزة
// لما myads.tsx/results.tsx يتهاجروا في خطوة جاية (القسم 8 من الطلب). ----

export async function updateListing(
  listingId: string,
  patch: Partial<Omit<CreateListingInput, 'attributes' | 'imageUrls'>> & { attributes?: Record<string, string>; imageUrls?: string[] },
): Promise<ApiResult<{ listing: Listing; seller: Seller }>> {
  const r = await frappePost<RawListing>(`${NS}.update_listing`, {
    listing_id: listingId,
    title: patch.title,
    description: patch.description,
    category: patch.category,
    location: patch.location,
    price: patch.price,
    price_type: patch.priceType,
    brand: patch.brand ?? undefined,
    model: patch.model ?? undefined,
    selling_type: patch.sellingType ?? undefined,
    condition: patch.condition ?? undefined,
    brand_name: patch.brandName ?? undefined,
    wholesale_price: patch.wholesalePrice ?? undefined,
    min_wholesale_qty: patch.minWholesaleQty ?? undefined,
    discount_price: patch.discountPrice ?? undefined,
    discount_ends_at: patch.discountEndsAt ?? undefined,
    attributes: patch.attributes !== undefined ? JSON.stringify(patch.attributes) : undefined,
    image_urls: patch.imageUrls !== undefined ? JSON.stringify(patch.imageUrls) : undefined,
  });
  if (r.status !== 'success') return r;
  return { status: 'success', data: await adaptListing(r.data) };
}

export async function deleteListing(listingId: string): Promise<ApiResult<{ deleted: true; id: string }>> {
  return frappePost(`${NS}.delete_listing`, { listing_id: listingId });
}

export async function pauseListing(listingId: string): Promise<ApiResult<{ listing: Listing; seller: Seller }>> {
  const r = await frappePost<RawListing>(`${NS}.pause_listing`, { listing_id: listingId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: await adaptListing(r.data) };
}

export async function activateListing(listingId: string): Promise<ApiResult<{ listing: Listing; seller: Seller }>> {
  const r = await frappePost<RawListing>(`${NS}.activate_listing`, { listing_id: listingId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: await adaptListing(r.data) };
}

export async function markListingSold(listingId: string): Promise<ApiResult<{ listing: Listing; seller: Seller }>> {
  const r = await frappePost<RawListing>(`${NS}.mark_listing_sold`, { listing_id: listingId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: await adaptListing(r.data) };
}

export async function getMyListings(status?: string, page = 1, limit = 20): Promise<ApiResult<{ items: Listing[]; total: number; page: number }>> {
  const r = await frappeGet<RawListPage<RawListingSummary>>(`${NS}.get_my_listings`, { status, page, limit });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptSummary), total: r.data.total, page: r.data.page } };
}

export async function getPublicListings(page = 1, limit = 20): Promise<ApiResult<{ items: Listing[]; total: number; page: number }>> {
  const r = await frappeGet<RawListPage<RawListingSummary>>(`${NS}.get_public_listings`, { page, limit });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptSummary), total: r.data.total, page: r.data.page } };
}

export type SearchListingsInput = {
  q?: string;
  categoryKey?: string;
  condition?: Condition;
  fieldFilters?: Record<string, string>;
  cityGovernorate?: string;
  page?: number;
  limit?: number;
};

export async function searchListings(input: SearchListingsInput): Promise<ApiResult<{ items: Listing[]; total: number; page: number }>> {
  const r = await frappeGet<RawListPage<RawListingSummary>>(`${NS}.search_listings`, {
    q: input.q,
    category_key: input.categoryKey,
    condition: input.condition,
    field_filters: input.fieldFilters ? JSON.stringify(input.fieldFilters) : undefined,
    city_governorate: input.cityGovernorate,
    page: input.page ?? 1,
    limit: input.limit ?? 20,
  });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptSummary), total: r.data.total, page: r.data.page } };
}

export async function getListingsByCategory(categoryKey: string, page = 1, limit = 20): Promise<ApiResult<{ items: Listing[]; total: number; page: number }>> {
  const r = await frappeGet<RawListPage<RawListingSummary>>(`${NS}.get_listings_by_category`, { category_key: categoryKey, page, limit });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptSummary), total: r.data.total, page: r.data.page } };
}

export async function getListingsByLocation(locationKey: string, page = 1, limit = 20): Promise<ApiResult<{ items: Listing[]; total: number; page: number }>> {
  const r = await frappeGet<RawListPage<RawListingSummary>>(`${NS}.get_listings_by_location`, { location_key: locationKey, page, limit });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptSummary), total: r.data.total, page: r.data.page } };
}

export async function incrementListingViews(listingId: string): Promise<ApiResult<{ views: number }>> {
  return frappePost(`${NS}.increment_listing_views`, { listing_id: listingId });
}

export type { ProductVariant };
