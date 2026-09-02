/**
 * services/jobApplicationService.ts — Jobs vertical:
 * souq_masr.api.v1.job_applications. نفس نمط الملفين اللي معتمدين على
 * فحص صريح "طرفين" (candidate/employer) بدل صلاحيات DocType — زي
 * chat.py/calls.py بالظبط. الـCV بيتحمّل base64 عن طريق
 * getApplicationResume، مش رابط مباشر — شوف الملف الخلفي للتفاصيل.
 */
import { frappeGet, frappePost, frappeUploadFile, type LocalFileUpload } from '@/lib/apiClient';
import type { ApiResult } from '@/types/frappeApi';

const NS = 'souq_masr.api.v1.job_applications';

export type ApplicationStatus = 'applied' | 'viewed' | 'shortlisted' | 'interview' | 'offer' | 'accepted' | 'rejected' | 'withdrawn';

export type RealApplication = {
  id: string;
  job: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  hasResume: boolean;
  coverLetter: string;
  status: ApplicationStatus;
  appliedAt: string;
  isMine: boolean;
  /** بس لما getMyApplications هي اللي رجّعته — job/company enrichment
   * لتفادي client-side join لكل صف (applications.tsx كان بيعمل
   * useAllJobs()/useAllCompanies() قبل كده). jobTitle=null يعني الوظيفة
   * اتحذفت فعليًا (delete_job's force=1) — الشاشة لازم تعرض "وظيفة محذوفة". */
  jobTitle?: string | null;
  companyId?: string | null;
  companyName?: string | null;
};

function adapt(raw: any): RealApplication {
  return {
    id: raw.id, job: raw.job, fullName: raw.full_name, phone: raw.phone, email: raw.email,
    hasResume: raw.has_resume, coverLetter: raw.cover_letter, status: raw.status,
    appliedAt: raw.applied_at, isMine: raw.is_mine,
    ...(raw.job_title !== undefined ? { jobTitle: raw.job_title, companyId: raw.company_id, companyName: raw.company_name } : {}),
  };
}

/** تقديم حقيقي دايمًا APP-##### (autoname). */
export function isRealApplicationId(id: string | undefined | null): boolean {
  return !!id && /^APP-\d+$/.test(id);
}

/** رفع سيرة ذاتية — is_private=1 دايمًا (مش زي صور الإعلانات). */
export async function uploadResumeFile(file: LocalFileUpload): Promise<ApiResult<string>> {
  const r = await frappeUploadFile(file, 30000, { isPrivate: true });
  if (r.status !== 'success') return r;
  return { status: 'success', data: r.data.fileUrl };
}

export async function applyToJob(
  jobId: string,
  fullName: string,
  phone: string,
  email?: string,
  resumeFileUrl?: string,
  coverLetter?: string,
): Promise<ApiResult<RealApplication>> {
  const r = await frappePost<any>(`${NS}.apply_to_job`, { job_id: jobId, full_name: fullName, phone, email, resume_file_url: resumeFileUrl, cover_letter: coverLetter });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adapt(r.data) };
}

export async function hasApplied(jobId: string): Promise<ApiResult<{ has_applied: boolean }>> {
  return frappePost(`${NS}.has_applied`, { job_id: jobId });
}

export async function getMyApplications(status?: ApplicationStatus, page = 1, limit = 20): Promise<ApiResult<{ items: RealApplication[]; total: number }>> {
  const r = await frappeGet<{ items: any[]; total: number }>(`${NS}.get_my_applications`, { status, page, limit });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adapt), total: r.data.total } };
}

export async function withdrawApplication(applicationId: string): Promise<ApiResult<RealApplication>> {
  const r = await frappePost<any>(`${NS}.withdraw_application`, { application_id: applicationId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adapt(r.data) };
}

export async function getApplicationsForJob(jobId: string, page = 1, limit = 50): Promise<ApiResult<{ items: RealApplication[]; total: number }>> {
  const r = await frappeGet<{ items: any[]; total: number }>(`${NS}.get_applications_for_job`, { job_id: jobId, page, limit });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adapt), total: r.data.total } };
}

export async function setApplicationStatus(applicationId: string, status: ApplicationStatus): Promise<ApiResult<RealApplication>> {
  const r = await frappePost<any>(`${NS}.set_application_status`, { application_id: applicationId, status });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adapt(r.data) };
}

export async function getApplicationResume(applicationId: string): Promise<ApiResult<{ has_resume: boolean; filename?: string; content_base64?: string }>> {
  return frappePost(`${NS}.get_application_resume`, { application_id: applicationId });
}
