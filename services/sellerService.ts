/**
 * services/sellerService.ts — Reviews vertical (Phase 2B): بروفايل بائع
 * حقيقي (souq_masr.api.v1.sellers.get_seller_profile) — الحلقة الناقصة
 * اللي كانت بتخلّي app/seller/[id].tsx شاشة ميتة لأي بائع حقيقي (كان
 * موجود زرار يودّي لها من app/detail/[id].tsx بالفعل، بس مفيش endpoint
 * يجيب بياناته).
 */
import { frappeGet } from '@/lib/apiClient';
import type { ApiResult } from '@/types/frappeApi';

export type RealSellerProfile = {
  id: string;
  name: string;
  phone: string | null; // null = مش متاح للمشاهد الحالي (نفس قاعدة خصوصية الإعلانات بالظبط)
  memberSince: string;
  adsCount: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  isMe: boolean;
};

type RawSellerProfile = {
  id: string;
  name: string;
  phone: string | null;
  member_since: string;
  ads_count: number;
  rating: number;
  review_count: number;
  verified: boolean;
  is_me: boolean;
};

export async function getSellerProfile(sellerId: string): Promise<ApiResult<RealSellerProfile>> {
  const r = await frappeGet<RawSellerProfile>('souq_masr.api.v1.sellers.get_seller_profile', { seller_id: sellerId });
  if (r.status !== 'success') return r;
  return {
    status: 'success',
    data: {
      id: r.data.id,
      name: r.data.name,
      phone: r.data.phone,
      memberSince: r.data.member_since,
      adsCount: r.data.ads_count,
      rating: r.data.rating,
      reviewCount: r.data.review_count,
      verified: r.data.verified,
      isMe: r.data.is_me,
    },
  };
}
