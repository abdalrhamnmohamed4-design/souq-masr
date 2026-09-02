/**
 * services/favoritesService.ts — Phase 2B Slice 3: الطبقة الوحيدة اللي
 * بتنادي souq_masr.api.v1.favorites الحقيقي (add_favorite/remove_favorite/
 * is_favorite/get_my_favorites — الـ4 كلهم موجودين ومُختبرين حي، شوف
 * MOBILE_BACKEND_INTEGRATION_REPORT.md's Phase 2B Slice 3 section).
 *
 * store/useAppStore.ts's toggleFavorite هي اللي فعليًا بتنادي
 * addFavorite/removeFavorite هنا لإعلان حقيقي (LST-#####)، مع
 * optimistic update + rollback بتاعتها هي — الملف ده مالوش أي منطق
 * optimistic بنفسه، بس نداءات API خام متكيّفة لشكل التطبيق (نفس فلسفة
 * باقي services/*.ts).
 */
import { frappeGet, frappePost } from '@/lib/apiClient';
import type { Listing } from '@/mock/listings';
import { adaptSummary } from '@/services/listingService';
import type { ApiResult } from '@/types/frappeApi';

const NS = 'souq_masr.api.v1.favorites';

type RawFavoritesPage = { items: Parameters<typeof adaptSummary>[0][]; total: number; page: number; limit: number };

export async function addFavorite(listingId: string): Promise<ApiResult<{ isFavorite: true }>> {
  const r = await frappePost<{ is_favorite: true; id: string }>(`${NS}.add_favorite`, { listing_id: listingId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { isFavorite: true } };
}

export async function removeFavorite(listingId: string): Promise<ApiResult<{ isFavorite: false }>> {
  const r = await frappePost<{ is_favorite: false }>(`${NS}.remove_favorite`, { listing_id: listingId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { isFavorite: false } };
}

/** allow_guest=True على الباك إند — Guest بترجع دايمًا false من غير
 * حاجة تتعمل. مش مستخدمة حاليًا من الشاشات (اللي بتعتمد على is_favorite
 * المتضمّن في ردود getListing/getPublicListings/searchListings/... بدل
 * نداء منفصل لكل إعلان)، مُصدَّرة هنا للاكتمال ولاستخدام مستقبلي. */
export async function isFavorite(listingId: string): Promise<ApiResult<boolean>> {
  const r = await frappeGet<{ is_favorite: boolean }>(`${NS}.is_favorite`, { listing_id: listingId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: r.data.is_favorite };
}

export async function getMyFavorites(page = 1, limit = 50): Promise<ApiResult<{ items: Listing[]; total: number; page: number }>> {
  const r = await frappeGet<RawFavoritesPage>(`${NS}.get_my_favorites`, { page, limit });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptSummary), total: r.data.total, page: r.data.page } };
}
