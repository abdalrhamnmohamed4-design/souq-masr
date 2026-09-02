/**
 * services/companyService.ts — Jobs vertical: souq_masr.api.v1.companies.
 * شركة واحدة بس لكل مستخدم (upsert — نفس افتراض app/jobs/my-company.tsx).
 */
import { frappeGet, frappePost } from '@/lib/apiClient';
import type { ApiResult } from '@/types/frappeApi';

const NS = 'souq_masr.api.v1.companies';

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+';
export type CompanyVerification = 'unverified' | 'pending' | 'verified' | 'rejected';

export type RealCompany = {
  id: string;
  name: string;
  description: string;
  industry: string;
  size: CompanySize;
  city: string;
  website: string;
  phone: string;
  email: string;
  workingHours: string;
  logo: string | null;
  cover: string | null;
  verification: CompanyVerification;
  isOwner: boolean;
};

type RawCompany = {
  id: string;
  name: string;
  description: string;
  industry: string;
  size: CompanySize;
  city: string;
  website: string;
  phone: string;
  email: string;
  working_hours: string;
  logo: string | null;
  cover: string | null;
  verification: CompanyVerification;
  is_owner: boolean;
};

function adapt(raw: RawCompany): RealCompany {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    industry: raw.industry,
    size: raw.size,
    city: raw.city,
    website: raw.website,
    phone: raw.phone,
    email: raw.email,
    workingHours: raw.working_hours,
    logo: raw.logo,
    cover: raw.cover,
    verification: raw.verification,
    isOwner: raw.is_owner,
  };
}

/** شركة حقيقية دايمًا COMP-##### (autoname). */
export function isRealCompanyId(id: string | undefined | null): boolean {
  return !!id && /^COMP-\d+$/.test(id);
}

export type CompanyInput = {
  name: string;
  description: string;
  industry?: string;
  size?: CompanySize;
  city?: string;
  website?: string;
  phone?: string;
  email?: string;
  workingHours?: string;
  logo?: string;
  cover?: string;
};

export async function createOrUpdateMyCompany(input: CompanyInput): Promise<ApiResult<RealCompany>> {
  const r = await frappePost<RawCompany>(`${NS}.create_or_update_my_company`, {
    name: input.name,
    description: input.description,
    industry: input.industry,
    size: input.size,
    city: input.city,
    website: input.website,
    phone: input.phone,
    email: input.email,
    working_hours: input.workingHours,
    logo: input.logo,
    cover: input.cover,
  });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adapt(r.data) };
}

export async function getMyCompany(): Promise<ApiResult<RealCompany | null>> {
  const r = await frappeGet<{ company: RawCompany | null }>(`${NS}.get_my_company`);
  if (r.status !== 'success') return r;
  return { status: 'success', data: r.data.company ? adapt(r.data.company) : null };
}

export async function getCompany(companyId: string): Promise<ApiResult<RealCompany>> {
  const r = await frappeGet<RawCompany>(`${NS}.get_company`, { company_id: companyId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adapt(r.data) };
}
