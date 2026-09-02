/**
 * services/savedSearchService.ts — Phase 2B Slice 3: الطبقة الوحيدة اللي
 * بتنادي souq_masr.api.v1.saved_searches الحقيقي (create/get_my/delete —
 * الـ3 كلهم موجودين ومُختبرين حي). بترجّع نفس شكل التطبيق الموجود أصلًا
 * (store/useAppStore.ts's SavedSearch type) — مش شكل رد Frappe الخام —
 * عشان app/results.tsx وapp/saved-searches.tsx يستهلكوها من غير تعديل UI.
 */
import { frappeGet, frappePost } from '@/lib/apiClient';
import type { Condition } from '@/mock/taxonomy/types';
import type { SavedSearch } from '@/store/useAppStore';
import type { ApiResult } from '@/types/frappeApi';

const NS = 'souq_masr.api.v1.saved_searches';

type RawSavedSearch = {
  id: string;
  label: string;
  query: string;
  category_key: string | null;
  condition: Condition | null;
  field_filters: Record<string, string>;
  location_id: string | null;
  min_price: number | null;
  max_price: number | null;
  sort: string | null;
  created_at: string;
};

function adapt(raw: RawSavedSearch): SavedSearch {
  return {
    id: raw.id,
    label: raw.label,
    categoryId: raw.category_key,
    query: raw.query,
    conditionFilter: raw.condition,
    fieldFilters: raw.field_filters,
    createdAt: raw.created_at,
  };
}

export type CreateSavedSearchInput = {
  label: string;
  query?: string;
  category?: string | null;
  condition?: Condition | null;
  fieldFilters?: Record<string, string>;
};

export async function createSavedSearch(input: CreateSavedSearchInput): Promise<ApiResult<SavedSearch>> {
  const r = await frappePost<RawSavedSearch>(`${NS}.create_saved_search`, {
    label: input.label,
    query: input.query ?? undefined,
    category: input.category ?? undefined,
    condition: input.condition ?? undefined,
    field_filters: input.fieldFilters && Object.keys(input.fieldFilters).length > 0 ? JSON.stringify(input.fieldFilters) : undefined,
  });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adapt(r.data) };
}

export async function getMySavedSearches(): Promise<ApiResult<SavedSearch[]>> {
  const r = await frappeGet<{ items: RawSavedSearch[] }>(`${NS}.get_my_saved_searches`);
  if (r.status !== 'success') return r;
  return { status: 'success', data: r.data.items.map(adapt) };
}

export async function deleteSavedSearch(savedSearchId: string): Promise<ApiResult<{ deleted: true; id: string }>> {
  return frappePost(`${NS}.delete_saved_search`, { saved_search_id: savedSearchId });
}
