/**
 * services/jobService.ts — Jobs vertical: souq_masr.api.v1.jobs. نفس
 * معمارية services/listingService.ts بالظبط (نفس نوع النطاق — إعلان
 * حقيقي بيكتشفه مستخدمين تانيين).
 */
import { frappeGet, frappePost } from '@/lib/apiClient';
import type { ApiResult } from '@/types/frappeApi';

const NS = 'souq_masr.api.v1.jobs';

export type WorkType = 'full_time' | 'part_time' | 'remote' | 'hybrid' | 'freelance' | 'contract' | 'temporary' | 'internship';
export type CareerLevel = 'intern' | 'entry' | 'junior' | 'mid' | 'senior' | 'manager' | 'director' | 'executive';
export type JobStatus = 'draft' | 'published' | 'paused' | 'closed' | 'expired' | 'rejected';
export type ApplicationMethod = 'in_app' | 'external_url' | 'email';

export type RealJob = {
  id: string;
  company: string;
  title: string;
  categoryKey: string;
  professionKey: string | null;
  workType: WorkType;
  careerLevel: CareerLevel | null;
  city: string;
  area: string | null;
  locationKey: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryHidden: boolean;
  experienceYearsMin: number | null;
  experienceYearsMax: number | null;
  description: string;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  benefits: string[];
  applicationMethod: ApplicationMethod;
  applicationUrl: string | null;
  applicationEmail: string | null;
  deadline: string | null;
  status: JobStatus;
  isUrgent: boolean;
  views: number;
  applicationsCount: number;
  postedAt: string;
  isOwner: boolean;
};

export type RealJobSummary = {
  id: string;
  title: string;
  company: string;
  categoryKey: string;
  workType: WorkType;
  careerLevel: CareerLevel | null;
  city: string;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryHidden: boolean;
  isUrgent: boolean;
  status: JobStatus;
  views: number;
  applicationsCount: number;
  postedAt: string;
};

function adaptFull(raw: any): RealJob {
  return {
    id: raw.id, company: raw.company, title: raw.title, categoryKey: raw.category_key,
    professionKey: raw.profession_key, workType: raw.work_type, careerLevel: raw.career_level,
    city: raw.city, area: raw.area, locationKey: raw.location_key, remote: raw.remote,
    salaryMin: raw.salary_min, salaryMax: raw.salary_max, salaryHidden: raw.salary_hidden,
    experienceYearsMin: raw.experience_years_min, experienceYearsMax: raw.experience_years_max,
    description: raw.description, responsibilities: raw.responsibilities, requirements: raw.requirements,
    skills: raw.skills, benefits: raw.benefits, applicationMethod: raw.application_method,
    applicationUrl: raw.application_url, applicationEmail: raw.application_email, deadline: raw.deadline,
    status: raw.status, isUrgent: raw.is_urgent, views: raw.views, applicationsCount: raw.applications_count,
    postedAt: raw.posted_at, isOwner: raw.is_owner,
  };
}

function adaptSummary(raw: any): RealJobSummary {
  return {
    id: raw.id, title: raw.title, company: raw.company, categoryKey: raw.category_key,
    workType: raw.work_type, careerLevel: raw.career_level, city: raw.city, remote: raw.remote,
    salaryMin: raw.salary_min, salaryMax: raw.salary_max, salaryHidden: raw.salary_hidden,
    isUrgent: raw.is_urgent, status: raw.status, views: raw.views, applicationsCount: raw.applications_count,
    postedAt: raw.posted_at,
  };
}

/** وظيفة حقيقية دايمًا JOB-##### (autoname). */
export function isRealJobId(id: string | undefined | null): boolean {
  return !!id && /^JOB-\d+$/.test(id);
}

export type JobInput = {
  company: string;
  title: string;
  categoryKey: string;
  professionKey?: string;
  workType: WorkType;
  careerLevel?: CareerLevel;
  city?: string;
  area?: string;
  locationKey?: string;
  remote?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryHidden?: boolean;
  experienceYearsMin?: number;
  experienceYearsMax?: number;
  description?: string;
  responsibilities?: string[];
  requirements?: string[];
  skills?: string[];
  benefits?: string[];
  applicationMethod?: ApplicationMethod;
  applicationUrl?: string;
  applicationEmail?: string;
  deadline?: string;
  isUrgent?: boolean;
};

function toWirePayload(input: Partial<JobInput>) {
  return {
    company: input.company, title: input.title, category_key: input.categoryKey, profession_key: input.professionKey,
    work_type: input.workType, career_level: input.careerLevel, city: input.city, area: input.area,
    location_key: input.locationKey, remote: input.remote ? 1 : 0, salary_min: input.salaryMin, salary_max: input.salaryMax,
    salary_hidden: input.salaryHidden ? 1 : 0, experience_years_min: input.experienceYearsMin, experience_years_max: input.experienceYearsMax,
    description: input.description,
    responsibilities: input.responsibilities ? JSON.stringify(input.responsibilities) : undefined,
    requirements: input.requirements ? JSON.stringify(input.requirements) : undefined,
    skills: input.skills ? JSON.stringify(input.skills) : undefined,
    benefits: input.benefits ? JSON.stringify(input.benefits) : undefined,
    application_method: input.applicationMethod,
    application_url: input.applicationUrl, application_email: input.applicationEmail, deadline: input.deadline,
    is_urgent: input.isUrgent ? 1 : 0,
  };
}

export async function createJob(input: JobInput): Promise<ApiResult<RealJob>> {
  const r = await frappePost<any>(`${NS}.create_job`, toWirePayload(input));
  if (r.status !== 'success') return r;
  return { status: 'success', data: adaptFull(r.data) };
}

export async function updateJob(jobId: string, patch: Partial<JobInput>): Promise<ApiResult<RealJob>> {
  const r = await frappePost<any>(`${NS}.update_job`, { job_id: jobId, ...toWirePayload(patch) });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adaptFull(r.data) };
}

export async function pauseJob(jobId: string): Promise<ApiResult<RealJob>> {
  const r = await frappePost<any>(`${NS}.pause_job`, { job_id: jobId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adaptFull(r.data) };
}

export async function activateJob(jobId: string): Promise<ApiResult<RealJob>> {
  const r = await frappePost<any>(`${NS}.activate_job`, { job_id: jobId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adaptFull(r.data) };
}

export async function closeJob(jobId: string): Promise<ApiResult<RealJob>> {
  const r = await frappePost<any>(`${NS}.close_job`, { job_id: jobId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adaptFull(r.data) };
}

export async function deleteJob(jobId: string): Promise<ApiResult<{ deleted: boolean }>> {
  return frappePost(`${NS}.delete_job`, { job_id: jobId });
}

export async function getJob(jobId: string): Promise<ApiResult<RealJob>> {
  const r = await frappeGet<any>(`${NS}.get_job`, { job_id: jobId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adaptFull(r.data) };
}

export async function getMyJobs(status?: JobStatus, page = 1, limit = 20): Promise<ApiResult<{ items: RealJobSummary[]; total: number }>> {
  const r = await frappeGet<{ items: any[]; total: number }>(`${NS}.get_my_jobs`, { status, page, limit });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptSummary), total: r.data.total } };
}

export type SearchJobsInput = {
  q?: string;
  categoryKey?: string;
  workType?: WorkType;
  careerLevel?: CareerLevel;
  city?: string;
  remote?: boolean;
  salaryMin?: number;
  page?: number;
  limit?: number;
};

export async function searchJobs(input: SearchJobsInput): Promise<ApiResult<{ items: RealJobSummary[]; total: number }>> {
  const r = await frappeGet<{ items: any[]; total: number }>(`${NS}.search_jobs`, {
    q: input.q, category_key: input.categoryKey, work_type: input.workType, career_level: input.careerLevel,
    city: input.city, remote: input.remote ? 1 : undefined, salary_min: input.salaryMin,
    page: input.page ?? 1, limit: input.limit ?? 20,
  });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptSummary), total: r.data.total } };
}

export async function getJobsByCompany(companyId: string, page = 1, limit = 20): Promise<ApiResult<{ items: RealJobSummary[]; total: number }>> {
  const r = await frappeGet<{ items: any[]; total: number }>(`${NS}.get_jobs_by_company`, { company_id: companyId, page, limit });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptSummary), total: r.data.total } };
}

export async function incrementJobViews(jobId: string): Promise<ApiResult<{ views: number }>> {
  return frappePost(`${NS}.increment_job_views`, { job_id: jobId });
}
