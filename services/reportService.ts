/**
 * services/reportService.ts — Phase 2B Slice 3: الطبقة الوحيدة اللي
 * بتنادي souq_masr.api.v1.reports الحقيقي (report_listing/has_reported).
 * مفيش endpoint لقراءة تفاصيل البلاغات ولا لتعديلها — القسم 6/7 من الطلب:
 * "Do not expose reporter identity to other normal users"، والباك إند
 * نفسه بيمنع القراءة/التعديل حتى عن صاحب البلاغ (has_reported بيرجّع
 * boolean بس، مش أي محتوى)، مش بس الموبايل هنا بيتجاهلها.
 */
import { frappeGet, frappePost } from '@/lib/apiClient';
import type { ReportReason } from '@/store/useAppStore';
import type { ApiResult } from '@/types/frappeApi';

const NS = 'souq_masr.api.v1.reports';

export async function reportListing(listingId: string, reason: ReportReason, description?: string): Promise<ApiResult<{ id: string }>> {
  const r = await frappePost<{ reported: true; id: string }>(`${NS}.report_listing`, {
    listing_id: listingId,
    reason,
    description: description || undefined,
  });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { id: r.data.id } };
}

export async function hasReported(listingId: string): Promise<ApiResult<{ hasReported: boolean }>> {
  const r = await frappeGet<{ has_reported: boolean }>(`${NS}.has_reported`, { listing_id: listingId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { hasReported: r.data.has_reported } };
}
