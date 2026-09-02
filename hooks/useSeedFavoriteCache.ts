/**
 * hooks/useSeedFavoriteCache.ts — Phase 2B Slice 3: بيزرع/يصحّح
 * store/useAppStore.ts's favorites cache المحلي من is_favorite الحقيقي
 * الراجع مع أي إعلان (services/listingService.ts's isFavoriteOnServer).
 *
 * ليه مش جوه services/listingService.ts نفسها؟ عشان لو الخدمات كتبت في
 * الـstore مباشرة، كانت هتبقى دورة استيراد فعلية (useAppStore.ts →
 * services/favoritesService.ts → services/listingService.ts →
 * useAppStore.ts) — نفس مشكلة الدورة الموثّقة في lib/apiClient.ts's أول
 * تعليق بالظبط. الحل هنا مطابق: hook منفصل بيقرأ من نتيجة الجلب اللي
 * الشاشة أصلًا عندها، ويكتب في الـstore، من غير أي استيراد عكسي.
 *
 * استخدام: `useSeedFavoriteCache(listings)` في أي شاشة بتعرض Listing[]
 * حقيقية (home.tsx, results.tsx, favorites.tsx) — لإعلان mock،
 * isFavoriteOnServer بيبقى undefined فبيتجاهل بأمان.
 */
import { useEffect } from 'react';
import type { Listing } from '@/mock/listings';
import { useAppStore } from '@/store/useAppStore';

export function useSeedFavoriteCache(listings: Listing[]) {
  const setFavoriteCache = useAppStore((s) => s.setFavoriteCache);
  useEffect(() => {
    for (const l of listings) {
      if (l.isFavoriteOnServer !== undefined) setFavoriteCache(l.id, l.isFavoriteOnServer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings]);
}
