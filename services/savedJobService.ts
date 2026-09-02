/**
 * services/savedJobService.ts — Jobs vertical: souq_masr.api.v1.saved_jobs.
 */
import { frappeGet, frappePost } from '@/lib/apiClient';
import type { ApiResult } from '@/types/frappeApi';
import { adaptSummary, type RealJobSummary } from '@/services/jobService';

const NS = 'souq_masr.api.v1.saved_jobs';

export async function saveJob(jobId: string): Promise<ApiResult<{ id: string; job: string }>> {
  return frappePost(`${NS}.save_job`, { job_id: jobId });
}

export async function unsaveJob(jobId: string): Promise<ApiResult<{ removed: boolean }>> {
  return frappePost(`${NS}.unsave_job`, { job_id: jobId });
}

export async function isJobSaved(jobId: string): Promise<ApiResult<{ saved: boolean }>> {
  return frappeGet(`${NS}.is_job_saved`, { job_id: jobId });
}

/** كانت بترجّع {"items": ["JOB-1", ...]} (أسماء عارية) — دلوقتي كائنات
 * كاملة (نفس شكل search_jobs's items)، فـsaved.tsx مش محتاج يعمل fetch
 * لكل وظيفة محفوظة على حدة (N+1). */
export async function getMySavedJobs(): Promise<ApiResult<{ items: RealJobSummary[] }>> {
  const r = await frappeGet<{ items: any[] }>(`${NS}.get_my_saved_jobs`);
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptSummary) } };
}
