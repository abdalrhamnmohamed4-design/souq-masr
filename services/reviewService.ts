/**
 * services/reviewService.ts — Reviews vertical (Phase 2B): الطبقة الوحيدة
 * اللي بتنادي souq_masr.api.v1.reviews الحقيقي. مقصورة على تقييمات
 * البائعين (Souq Masr Review) — تقييمات المحترفين/الشركات في Jobs/
 * Services ليها نظامها المنفصل في store/useJobsStore.ts، هتتوصّل بباك
 * إند حقيقي جوه slice كل قسم (Jobs/Services) نفسه لما يتبني، مش هنا.
 *
 * القاعدة (موثّقة بالتفصيل في reviews.py's module docstring): المُقيِّم
 * لازم يكون عنده محادثة حقيقية واحدة على الأقل مع البائع ده — نفس معيار
 * خصوصية رقم الهاتف بالظبط. `submit_review` بيعمل upsert (نفس المستخدم
 * بيقيّم تاني بيحدّث تقييمه القديم، مش يسجّل واحد جديد) — بديل بسيط
 * لواجهة "تعديل تقييم" منفصلة، ومطابق تمامًا لتجربة "قيّم البائع" الحالية
 * في app/seller/[id].tsx.
 */
import { frappeGet, frappePost } from '@/lib/apiClient';
import type { ApiResult } from '@/types/frappeApi';

const NS = 'souq_masr.api.v1.reviews';

export type RealReview = {
  id: string;
  seller: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  isMine: boolean;
};

type RawReview = {
  id: string;
  seller: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
  is_mine: boolean;
};

function adaptReview(raw: RawReview): RealReview {
  return {
    id: raw.id,
    seller: raw.seller,
    reviewerName: raw.reviewer_name,
    rating: raw.rating,
    comment: raw.comment,
    createdAt: raw.created_at,
    isMine: raw.is_mine,
  };
}

/** بائع حقيقي دايمًا Frappe User docname (مش 'me' ولا id محلي وهمي —
 * mock/users.ts's sellers دايمًا فاضي، الوحيد المحلي هو 'me'). */
export function isRealSellerId(id: string | undefined | null): boolean {
  return !!id && id !== 'me';
}

export async function submitReview(sellerId: string, rating: number, comment?: string): Promise<ApiResult<RealReview>> {
  const r = await frappePost<RawReview>(`${NS}.submit_review`, { seller_id: sellerId, rating, comment });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adaptReview(r.data) };
}

export async function getSellerReviews(sellerId: string, page = 1, limit = 20): Promise<ApiResult<{ items: RealReview[]; total: number }>> {
  const r = await frappeGet<{ items: RawReview[]; total: number }>(`${NS}.get_seller_reviews`, { seller_id: sellerId, page, limit });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptReview), total: r.data.total } };
}

export async function getSellerRatingSummary(sellerId: string): Promise<ApiResult<{ average: number; count: number }>> {
  return frappeGet(`${NS}.get_seller_rating_summary`, { seller_id: sellerId });
}

export async function hasReviewed(sellerId: string): Promise<ApiResult<{ has_reviewed: boolean; review_id?: string; rating?: number; comment?: string }>> {
  return frappePost(`${NS}.has_reviewed`, { seller_id: sellerId });
}

export async function deleteReview(sellerId: string): Promise<ApiResult<{ deleted: boolean }>> {
  return frappePost(`${NS}.delete_review`, { seller_id: sellerId });
}
