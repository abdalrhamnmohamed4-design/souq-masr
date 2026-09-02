/**
 * services/jobInterviewService.ts — Jobs vertical: souq_masr.api.v1.job_interviews.
 */
import { frappeGet, frappePost } from '@/lib/apiClient';
import type { ApiResult } from '@/types/frappeApi';

const NS = 'souq_masr.api.v1.job_interviews';

export type InterviewMode = 'online' | 'in_person';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled';

export type RealInterview = {
  id: string;
  application: string;
  job: string;
  date: string;
  time: string;
  location: string;
  mode: InterviewMode;
  notes: string;
  status: InterviewStatus;
};

function adapt(raw: any): RealInterview {
  return {
    id: raw.id, application: raw.application, job: raw.job, date: raw.date, time: raw.time,
    location: raw.location, mode: raw.mode, notes: raw.notes, status: raw.status,
  };
}

export async function scheduleInterview(applicationId: string, date: string, time: string, mode: InterviewMode, location?: string, notes?: string): Promise<ApiResult<RealInterview>> {
  const r = await frappePost<any>(`${NS}.schedule_interview`, { application_id: applicationId, date, time, mode, location, notes });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adapt(r.data) };
}

export async function getInterviewForApplication(applicationId: string): Promise<ApiResult<RealInterview | null>> {
  const r = await frappeGet<{ interview: any | null }>(`${NS}.get_interview_for_application`, { application_id: applicationId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: r.data.interview ? adapt(r.data.interview) : null };
}

export async function getMyInterviews(page = 1, limit = 20): Promise<ApiResult<{ items: RealInterview[]; total: number }>> {
  const r = await frappeGet<{ items: any[]; total: number }>(`${NS}.get_my_interviews`, { page, limit });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adapt), total: r.data.total } };
}
