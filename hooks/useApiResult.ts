/**
 * hooks/useApiResult.ts — hook عام واحد لأي نداء API غير-متزامن في
 * التطبيق (Phase 2A فصاعدًا) — بديل عن كل شاشة تكتب useState+useEffect
 * لوحدها بمنطق مختلف شوية كل مرة. بيرجّع حالة UI واحدة واضحة
 * (loading/success/empty/no_internet/backend_unavailable/error) بدل ما كل
 * شاشة تفسّر ApiResult بنفسها (القسم 5 من طلب Phase 2: loading/error/
 * empty/timeout/no-internet states لازم تكون موجودة في كل مكان بيستهلك
 * API حقيقي).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiResult } from '@/types/frappeApi';

export type UiState<T> =
  | { kind: 'loading' }
  | { kind: 'success'; data: T }
  | { kind: 'empty' }
  | { kind: 'no_internet' }
  | { kind: 'backend_unavailable'; detail?: string }
  | { kind: 'unauthorized' }
  | { kind: 'forbidden' }
  | { kind: 'not_found' }
  | { kind: 'timeout' }
  | { kind: 'error'; detail?: string };

function toUiState<T>(r: ApiResult<T>, isEmpty?: (data: T) => boolean): UiState<T> {
  switch (r.status) {
    case 'success':
      if (isEmpty?.(r.data)) return { kind: 'empty' };
      return { kind: 'success', data: r.data };
    case 'no_internet':
      return { kind: 'no_internet' };
    case 'backend_unavailable':
      return { kind: 'backend_unavailable', detail: r.detail };
    case 'unauthorized':
      return { kind: 'unauthorized' };
    case 'forbidden':
      return { kind: 'forbidden' };
    case 'not_found':
      return { kind: 'not_found' };
    case 'timeout':
      return { kind: 'timeout' };
    case 'validation_error':
      return { kind: 'error', detail: r.detail };
    case 'rate_limited':
      return { kind: 'error', detail: 'rate_limited' };
    case 'server_error':
      return { kind: 'error', detail: `HTTP ${r.httpStatus}` };
  }
}

/**
 * الاستخدام: `const state = useApiResult(() => getChildren(parent), [parent]);`
 * بيعيد الجلب تلقائيًا لما أي قيمة في deps تتغيّر. `isEmpty` اختياري —
 * بيحدد إمتى النتيجة الناجحة (array فاضي عادةً) تتحسب "empty" بدل "success".
 */
export function useApiResult<T>(
  fetcher: () => Promise<ApiResult<T>>,
  deps: React.DependencyList,
  isEmpty?: (data: T) => boolean,
): { state: UiState<T>; refetch: () => void } {
  const [state, setState] = useState<UiState<T>>({ kind: 'loading' });
  const requestId = useRef(0);

  const run = useCallback(() => {
    const id = ++requestId.current;
    setState({ kind: 'loading' });
    fetcher().then((r) => {
      // لو fetch أقدم رجع بعد واحد أحدث (deps اتغيّرت تاني قبل ما يخلص)،
      // نتجاهله — منمنعش نتيجة قديمة تكتب فوق نتيجة أحدث.
      if (id !== requestId.current) return;
      setState(toUiState(r, isEmpty));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { state, refetch: run };
}
