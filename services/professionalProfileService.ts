/**
 * services/professionalProfileService.ts — Services vertical:
 * souq_masr.api.v1.professional_profiles. ملف محترف واحد بس لكل مستخدم
 * (upsert)، رقم هاتفه عام عمدًا (مش محجوب زي رقم إعلان/ملف مهني — نفس
 * سلوك بطاقة عمل عامة زي Souq Masr Company بالظبط).
 */
import { frappeGet, frappePost } from '@/lib/apiClient';
import type { ApiResult } from '@/types/frappeApi';

const NS = 'souq_masr.api.v1.professional_profiles';

export type ProfessionalVerification = 'unverified' | 'pending' | 'verified' | 'rejected';

export type RealProfessionalProfile = {
  id: string;
  owner: string;
  name: string;
  tradeKey: string | null;
  photo: string | null;
  description: string;
  yearsExperience: number | null;
  skills: string[];
  serviceAreas: string[];
  priceStartingFrom: number | null;
  availability: string;
  workingHours: string;
  phone: string;
  whatsapp: string;
  verification: ProfessionalVerification;
  isOwner: boolean;
};

function adapt(raw: any): RealProfessionalProfile {
  return {
    id: raw.id, owner: raw.owner, name: raw.name, tradeKey: raw.trade_key, photo: raw.photo,
    description: raw.description, yearsExperience: raw.years_experience, skills: raw.skills,
    serviceAreas: raw.service_areas, priceStartingFrom: raw.price_starting_from, availability: raw.availability,
    workingHours: raw.working_hours, phone: raw.phone, whatsapp: raw.whatsapp, verification: raw.verification,
    isOwner: raw.is_owner,
  };
}

/** ملف محترف حقيقي — id عشوائي (autoname: hash)، مش بننشئه محليًا خالص
 * فأي id راجع من الباك إند حقيقي. بديل التفرقة: نتأكد إنه اتجاب فعليًا
 * من نداء حقيقي، مش نخمّن الشكل زي بقية الـisReal*Id (hash ids مالهاش
 * prefix ثابت زي LST-/JOB- يتفرّق بيه). الشاشات بتفرّق بدل كده على
 * أساس "الid ده = 'me' ولا لأ" (نفس منطق mock القديم بالظبط). */
export function isMockProfessionalId(id: string | undefined | null): boolean {
  return id === 'me';
}

export type ProfessionalProfileInput = {
  name: string;
  description: string;
  tradeKey?: string;
  photo?: string;
  yearsExperience?: number;
  skills?: string[];
  serviceAreas?: string[];
  priceStartingFrom?: number;
  availability?: string;
  workingHours?: string;
  phone?: string;
  whatsapp?: string;
};

export async function createOrUpdateMyProfile(input: ProfessionalProfileInput): Promise<ApiResult<RealProfessionalProfile>> {
  const r = await frappePost<any>(`${NS}.create_or_update_my_profile`, {
    name: input.name, description: input.description, trade_key: input.tradeKey, photo: input.photo,
    years_experience: input.yearsExperience,
    skills: input.skills ? JSON.stringify(input.skills) : undefined,
    service_areas: input.serviceAreas ? JSON.stringify(input.serviceAreas) : undefined,
    price_starting_from: input.priceStartingFrom, availability: input.availability, working_hours: input.workingHours,
    phone: input.phone, whatsapp: input.whatsapp,
  });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adapt(r.data) };
}

export async function getMyProfile(): Promise<ApiResult<RealProfessionalProfile | null>> {
  const r = await frappeGet<{ profile: any | null }>(`${NS}.get_my_profile`);
  if (r.status !== 'success') return r;
  return { status: 'success', data: r.data.profile ? adapt(r.data.profile) : null };
}

export async function getProfessionalProfile(profileId: string): Promise<ApiResult<RealProfessionalProfile>> {
  const r = await frappeGet<any>(`${NS}.get_professional_profile`, { profile_id: profileId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adapt(r.data) };
}

export async function getProfessionalProfileByOwner(owner: string): Promise<ApiResult<RealProfessionalProfile>> {
  const r = await frappeGet<any>(`${NS}.get_professional_profile_by_owner`, { owner });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adapt(r.data) };
}
