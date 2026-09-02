/**
 * hooks/useMyCompany.ts — Jobs vertical: "شركتي" سواء محلية (mock، قديمة
 * من قبل التحديث ده) أو حقيقية (souq_masr.api.v1.companies) — بديل تكرار
 * نفس منطق "mock الأول، وإلا الحقيقي" في كل شاشة (post.tsx/my-jobs.tsx).
 * ملف منفصل عن services/companyService.ts نفسه لتفادي استيراد دائري
 * (companyService غالبًا مش محتاج useJobsStore، بس الملف ده بيحتاج
 * الاتنين مع بعض).
 */
import { useEffect, useState } from 'react';
import { getMyCompany, type RealCompany } from '@/services/companyService';
import { useJobsStore } from '@/store/useJobsStore';
import type { Company } from '@/mock/jobs/types';

export type MyCompanyResult = {
  loading: boolean;
  mock: Company | undefined;
  real: RealCompany | null;
  /** أول شيء موجود فعليًا — mock لو قديم موجود، وإلا real. */
  any: Company | RealCompany | undefined;
};

export function useMyCompany(): MyCompanyResult {
  const mock = useJobsStore((s) => s.userCompanies.find((c) => c.ownerSellerId === 'me'));
  const [real, setReal] = useState<RealCompany | null>(null);
  const [loading, setLoading] = useState(!mock);

  useEffect(() => {
    if (mock) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getMyCompany().then((r) => {
      if (cancelled) return;
      if (r.status === 'success') setReal(r.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [mock]);

  return { loading, mock, real, any: mock ?? real ?? undefined };
}
