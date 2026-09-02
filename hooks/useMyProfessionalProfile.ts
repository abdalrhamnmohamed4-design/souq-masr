/**
 * hooks/useMyProfessionalProfile.ts — Services vertical: نفس فكرة
 * hooks/useMyCompany.ts بالظبط — "ملفي المهني" سواء محلي (mock قديم) أو
 * حقيقي.
 */
import { useEffect, useState } from 'react';
import { getMyProfile, type RealProfessionalProfile } from '@/services/professionalProfileService';
import { useJobsStore } from '@/store/useJobsStore';
import type { ProfessionalProfile } from '@/mock/jobs/types';

export type MyProfessionalProfileResult = {
  loading: boolean;
  mock: ProfessionalProfile | null;
  real: RealProfessionalProfile | null;
  any: ProfessionalProfile | RealProfessionalProfile | null;
};

export function useMyProfessionalProfile(): MyProfessionalProfileResult {
  const mock = useJobsStore((s) => s.professionalProfile);
  const [real, setReal] = useState<RealProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(!mock);

  useEffect(() => {
    if (mock) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getMyProfile().then((r) => {
      if (cancelled) return;
      if (r.status === 'success') setReal(r.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [mock]);

  return { loading, mock, real, any: mock ?? real };
}
