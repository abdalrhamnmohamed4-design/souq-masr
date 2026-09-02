/**
 * services/contentReportService.ts — نظام بلاغات مشترك بين Jobs وServices
 * (souq_masr.api.v1.content_reports) — بديل تكرار Souq Masr Listing
 * Report's شكل 4 مرات، شوف content_reports.py's module docstring.
 */
import { frappePost } from '@/lib/apiClient';
import type { ApiResult } from '@/types/frappeApi';

const NS = 'souq_masr.api.v1.content_reports';

export type ContentReportTargetType = 'Souq Masr Job' | 'Souq Masr Company' | 'Souq Masr Service' | 'Souq Masr Professional Profile';
export type ContentReportReason = 'fake' | 'scam' | 'wrong_category' | 'duplicate' | 'prohibited' | 'spam' | 'abusive' | 'incorrect_info';

export async function reportContent(targetDoctype: ContentReportTargetType, targetName: string, reason: ContentReportReason, description?: string): Promise<ApiResult<{ id: string; already_reported: boolean }>> {
  return frappePost(`${NS}.report_content`, { target_doctype: targetDoctype, target_name: targetName, reason, description });
}

export async function hasReportedContent(targetDoctype: ContentReportTargetType, targetName: string): Promise<ApiResult<{ has_reported: boolean }>> {
  return frappePost(`${NS}.has_reported_content`, { target_doctype: targetDoctype, target_name: targetName });
}
