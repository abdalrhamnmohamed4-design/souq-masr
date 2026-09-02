/**
 * services/careerProfileService.ts — Jobs vertical: souq_masr.api.v1.career_profile.
 * مقصور على الحقول الأساسية بس (مش الـCV builder العميق بتاع
 * app/jobs/profile.tsx — تعليم/خبرة/شهادات/كورسات/مشاريع/بورتفوليو لسه
 * محلي بالكامل، قرار موثّق في التقرير).
 */
import { frappeGet, frappePost, frappeUploadFile, type LocalFileUpload } from '@/lib/apiClient';
import type { ApiResult } from '@/types/frappeApi';
import type { CareerLevel, WorkType } from './jobService';

const NS = 'souq_masr.api.v1.career_profile';

export type RealCareerProfile = {
  fullName: string;
  phone: string;
  email: string;
  currentJobTitle: string;
  desiredJobTitle: string;
  yearsExperience: number | null;
  careerLevel: CareerLevel | null;
  expectedSalaryMin: number | null;
  expectedSalaryMax: number | null;
  preferredWorkTypes: WorkType[];
  hasResume: boolean;
  visibility: 'public' | 'employers_only' | 'private';
  showPhone: boolean;
  showEmail: boolean;
  showCv: boolean;
};

function adapt(raw: any): RealCareerProfile {
  return {
    fullName: raw.full_name, phone: raw.phone, email: raw.email, currentJobTitle: raw.current_job_title,
    desiredJobTitle: raw.desired_job_title, yearsExperience: raw.years_experience, careerLevel: raw.career_level,
    expectedSalaryMin: raw.expected_salary_min, expectedSalaryMax: raw.expected_salary_max,
    preferredWorkTypes: raw.preferred_work_types, hasResume: raw.has_resume, visibility: raw.visibility,
    showPhone: raw.show_phone, showEmail: raw.show_email, showCv: raw.show_cv,
  };
}

export async function getMyCareerProfile(): Promise<ApiResult<RealCareerProfile | null>> {
  const r = await frappeGet<{ profile: any | null }>(`${NS}.get_my_career_profile`);
  if (r.status !== 'success') return r;
  return { status: 'success', data: r.data.profile ? adapt(r.data.profile) : null };
}

export type CareerProfileInput = Partial<{
  fullName: string; phone: string; email: string; currentJobTitle: string; desiredJobTitle: string;
  yearsExperience: number; careerLevel: CareerLevel; expectedSalaryMin: number; expectedSalaryMax: number;
  preferredWorkTypes: WorkType[]; visibility: 'public' | 'employers_only' | 'private';
  showPhone: boolean; showEmail: boolean; showCv: boolean; resumeFileUrl: string;
}>;

export async function updateMyCareerProfile(input: CareerProfileInput): Promise<ApiResult<RealCareerProfile>> {
  const r = await frappePost<any>(`${NS}.update_my_career_profile`, {
    full_name: input.fullName, phone: input.phone, email: input.email, current_job_title: input.currentJobTitle,
    desired_job_title: input.desiredJobTitle, years_experience: input.yearsExperience, career_level: input.careerLevel,
    expected_salary_min: input.expectedSalaryMin, expected_salary_max: input.expectedSalaryMax,
    preferred_work_types: input.preferredWorkTypes ? JSON.stringify(input.preferredWorkTypes) : undefined,
    visibility: input.visibility,
    show_phone: input.showPhone === undefined ? undefined : input.showPhone ? 1 : 0,
    show_email: input.showEmail === undefined ? undefined : input.showEmail ? 1 : 0,
    show_cv: input.showCv === undefined ? undefined : input.showCv ? 1 : 0,
    resume_file_url: input.resumeFileUrl,
  });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adapt(r.data) };
}

export async function uploadResumeFile(file: LocalFileUpload): Promise<ApiResult<string>> {
  const r = await frappeUploadFile(file, 30000, { isPrivate: true });
  if (r.status !== 'success') return r;
  return { status: 'success', data: r.data.fileUrl };
}

export async function getMyResume(): Promise<ApiResult<{ has_resume: boolean; filename?: string; content_base64?: string }>> {
  return frappePost(`${NS}.get_my_resume`);
}
