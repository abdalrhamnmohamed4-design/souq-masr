/**
 * services/listingService.ts — Phase 2B: الطبقة الوحيدة اللي بتنادي
 * souq_masr.api.v1.listings الحقيقي (12 endpoint، شوف
 * MOBILE_BACKEND_INTEGRATION_REPORT.md's Phase 2B section). بترجّع
 * دايمًا نفس شكل التطبيق الحالي (mock/listings.ts's Listing، mock/users.ts's
 * Seller) — مش شكل رد Frappe الخام — عشان app/detail/[id].tsx وباقي
 * الشاشات تقدر تستهلك بيانات حقيقية من غير أي تعديل UI، نفس فلسفة
 * services/taxonomyService.ts بالظبط.
 *
 * نطاق التغطية (Slice 1 + Slice 2 مع بعض): كل الـ12 endpoint متوصّلين
 * لشاشة UI حقيقية دلوقتي — create/get (post/index.tsx، detail/[id].tsx)،
 * update/delete/pause/activate/mark_sold/get_my_listings
 * (myads.tsx، post/index.tsx's edit path)، get_public_listings/
 * search_listings/get_listings_by_category/get_listings_by_location
 * (home.tsx، results.tsx). variants/sku لسه مش متمثّلين على الباك إند
 * خالص — إعلان فيه variants لسه بينشر/يتعدّل محليًا بس (mock)، مش هنا.
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

type RawSeller = { id: string; name: string; phone: string | null; member_since: string; ads_count: number };

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
  is_favorite: boolean;
};

/** الحالة الحقيقية زي ما هي على الباك إند بالظبط — مش mock/listings.ts's
 * saleStatus؟ (active|sold بس). Phase 2B Slice 2: app/(tabs)/myads.tsx
 * محتاج يفرّق Active عن Paused فعليًا، فـgetMyListings بيرجّع النوع ده
 * بدل ما يضغطها لـLegacy Listing type زي باقي دوال discovery. */
export type RealListingStatus = 'Draft' | 'Active' | 'Paused' | 'Sold' | 'Rejected';

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
  status: RealListingStatus;
  created_at: string;
  is_favorite: boolean;
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
    // القسم 6 من طلب Phase 2B Slice 4: الباك إند (listings.py's
    // _phone_visible_to_viewer) هو اللي يقرر لو الرقم يبان أصلًا —
    // null معناها "مش متاح للمشاهد ده"، مش قيمة ناقصة بالغلط. بنحوّله
    // لـ'' عشان يفضل متوافق مع Seller.phone: string (البائعين المحليين
    // دايمًا عندهم رقم)، وكل استهلاك للحقل ده بيتعامل مع '' كـ"مفيش رقم".
    phone: raw.phone ?? '',
  };
}

/** بيحوّل رد Frappe الخام لنفس شكل mock/listings.ts's Listing تمامًا —
 * category.fields بتتجاب مع بعض (getCategory من services/taxonomyService.ts
 * الموجودة بالفعل، مش نداء مكرر) عشان specs تتبني بنفس تسميات الحقول
 * الحقيقية، مش attr_key الخام. */
async function adaptListing(raw: RawListing): Promise<{ listing: Listing; seller: Seller; isOwner: boolean }> {
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
    isFavoriteOnServer: raw.is_favorite,
  };

  return { listing, seller: adaptSeller(raw.seller), isOwner: raw.is_owner };
}

/** مُصدَّرة (مش خاصة بالملف ده) — services/favoritesService.ts's
 * getMyFavorites بتعيد استخدامها بدل ما تكرر نفس التحويل، نفس شكل رد
 * get_my_favorites تمامًا (نفس RawListingSummary). */
export function adaptSummary(raw: RawListingSummary): Listing {
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
    isFavoriteOnServer: raw.is_favorite,
  };
}

/** إعلاناتي (My Ads) — بديل adaptSummary's المضغوطة لـactive|sold بس.
 * الحالة الحقيقية (Draft/Active/Paused/Sold/Rejected) لازم تفضل زي ما
 * هي عشان app/(tabs)/myads.tsx يقدر يعرض تاب "متوقفة" حقيقي، مش يخمّن. */
export type MyListingItem = {
  id: string;
  title: string;
  price: number;
  priceType: PriceType;
  status: RealListingStatus;
  thumb: string | null; // absolute URL أو null (لو الإعلان من غير صور)
  views: number;
  createdAt: string;
};

function adaptMyListingItem(raw: RawListingSummary): MyListingItem {
  return {
    id: raw.id,
    title: raw.title,
    price: raw.price,
    priceType: raw.price_type,
    status: raw.status,
    thumb: raw.thumb ? absoluteUrl(raw.thumb) : null,
    views: raw.views,
    createdAt: raw.created_at,
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

export async function createListing(input: CreateListingInput): Promise<ApiResult<{ listing: Listing; seller: Seller; isOwner: boolean }>> {
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
export async function getListing(listingId: string): Promise<ApiResult<{ listing: Listing; seller: Seller; isOwner: boolean }>> {
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

// ---- Phase 2B Slice 2: الدوال دي بقت متوصّلة فعليًا لـ myads.tsx
// وpost/index.tsx's edit path — شوف MOBILE_BACKEND_INTEGRATION_REPORT.md. ----

export async function updateListing(
  listingId: string,
  patch: Partial<Omit<CreateListingInput, 'attributes' | 'imageUrls'>> & { attributes?: Record<string, string>; imageUrls?: string[] },
): Promise<ApiResult<{ listing: Listing; seller: Seller; isOwner: boolean }>> {
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

export async function pauseListing(listingId: string): Promise<ApiResult<{ listing: Listing; seller: Seller; isOwner: boolean }>> {
  const r = await frappePost<RawListing>(`${NS}.pause_listing`, { listing_id: listingId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: await adaptListing(r.data) };
}

export async function activateListing(listingId: string): Promise<ApiResult<{ listing: Listing; seller: Seller; isOwner: boolean }>> {
  const r = await frappePost<RawListing>(`${NS}.activate_listing`, { listing_id: listingId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: await adaptListing(r.data) };
}

export async function markListingSold(listingId: string): Promise<ApiResult<{ listing: Listing; seller: Seller; isOwner: boolean }>> {
  const r = await frappePost<RawListing>(`${NS}.mark_listing_sold`, { listing_id: listingId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: await adaptListing(r.data) };
}

/** newest/cheapest/priciest/mostViewed — نفس ترتيب app/results.tsx's
 * SortKey (بدون nearest/favoritesFirst، اللي لسه client-side بس — شوف
 * MOBILE_BACKEND_INTEGRATION_REPORT.md's Phase 2B Slice 2). */
export type ListingSortKey = 'newest' | 'cheapest' | 'priciest' | 'mostViewed';

export async function getMyListings(status?: RealListingStatus, page = 1, limit = 20): Promise<ApiResult<{ items: MyListingItem[]; total: number; page: number }>> {
  const r = await frappeGet<RawListPage<RawListingSummary>>(`${NS}.get_my_listings`, { status, page, limit });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptMyListingItem), total: r.data.total, page: r.data.page } };
}

export async function getPublicListings(page = 1, limit = 20, sort?: ListingSortKey): Promise<ApiResult<{ items: Listing[]; total: number; page: number }>> {
  const r = await frappeGet<RawListPage<RawListingSummary>>(`${NS}.get_public_listings`, { page, limit, sort });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptSummary), total: r.data.total, page: r.data.page } };
}

export type SearchListingsInput = {
  q?: string;
  categoryKey?: string;
  condition?: Condition;
  fieldFilters?: Record<string, string>;
  cityGovernorate?: string;
  sort?: ListingSortKey;
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
    sort: input.sort,
    page: input.page ?? 1,
    limit: input.limit ?? 20,
  });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptSummary), total: r.data.total, page: r.data.page } };
}

export async function getListingsByCategory(categoryKey: string, page = 1, limit = 20, sort?: ListingSortKey): Promise<ApiResult<{ items: Listing[]; total: number; page: number }>> {
  const r = await frappeGet<RawListPage<RawListingSummary>>(`${NS}.get_listings_by_category`, { category_key: categoryKey, page, limit, sort });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptSummary), total: r.data.total, page: r.data.page } };
}

export async function getListingsByLocation(locationKey: string, page = 1, limit = 20, sort?: ListingSortKey): Promise<ApiResult<{ items: Listing[]; total: number; page: number }>> {
  const r = await frappeGet<RawListPage<RawListingSummary>>(`${NS}.get_listings_by_location`, { location_key: locationKey, page, limit, sort });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptSummary), total: r.data.total, page: r.data.page } };
}

export async function incrementListingViews(listingId: string): Promise<ApiResult<{ views: number }>> {
  return frappePost(`${NS}.increment_listing_views`, { listing_id: listingId });
}

/** إعلانات بائع حقيقي المُفعّلة بس — لصفحة بروفايل البائع (Reviews vertical). */
export async function getSellerListings(sellerId: string, page = 1, limit = 20, sort?: ListingSortKey): Promise<ApiResult<{ items: Listing[]; total: number; page: number }>> {
  const r = await frappeGet<RawListPage<RawListingSummary>>(`${NS}.get_seller_listings`, { seller_id: sellerId, page, limit, sort });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptSummary), total: r.data.total, page: r.data.page } };
}

export type { ProductVariant };
