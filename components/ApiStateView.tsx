/**
 * components/ApiStateView.tsx — عرض موحّد لأي حالة UiState (hooks/useApiResult.ts)
 * غير "success" — loading/error/empty/no-internet/... (القسم 5 من طلب
 * Phase 2). أي شاشة بتستهلك API حقيقي بترندر الكومبوننت ده بدل ما تعمل
 * `if (loading) ... else if (error) ...` بنفسها كل مرة.
 */
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/primitives/EmptyState';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import type { UiState } from '@/hooks/useApiResult';

export function ApiStateView({ state, onRetry }: { state: Exclude<UiState<unknown>, { kind: 'success' }>; onRetry?: () => void }) {
  const t = useT();
  const { colors, spacing } = useTheme();

  if (state.kind === 'loading') {
    return (
      <View style={{ paddingVertical: 60, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={colors.signal} />
      </View>
    );
  }

  const configs: Record<Exclude<UiState<unknown>['kind'], 'loading' | 'success'>, { icon: React.ReactNode; title: string; desc: string; retryable: boolean }> = {
    empty: { icon: <Icon name="box" color={colors.ink3} size={26} />, title: t('apiState.emptyTitle'), desc: t('apiState.emptyDesc'), retryable: false },
    no_internet: { icon: <Icon name="globe" color={colors.ink3} size={26} />, title: t('apiState.noInternetTitle'), desc: t('apiState.noInternetDesc'), retryable: true },
    backend_unavailable: { icon: <Icon name="refresh" color={colors.ink3} size={26} />, title: t('apiState.backendUnavailableTitle'), desc: t('apiState.backendUnavailableDesc'), retryable: true },
    unauthorized: { icon: <Icon name="lock" color={colors.ink3} size={26} />, title: t('apiState.unauthorizedTitle'), desc: t('apiState.unauthorizedDesc'), retryable: false },
    forbidden: { icon: <Icon name="ban" color={colors.ink3} size={26} />, title: t('apiState.forbiddenTitle'), desc: t('apiState.forbiddenDesc'), retryable: false },
    not_found: { icon: <Icon name="search" color={colors.ink3} size={26} />, title: t('apiState.notFoundTitle'), desc: t('apiState.notFoundDesc'), retryable: false },
    timeout: { icon: <Icon name="clock" color={colors.ink3} size={26} />, title: t('apiState.timeoutTitle'), desc: t('apiState.timeoutDesc'), retryable: true },
    error: { icon: <Icon name="info" color={colors.ink3} size={26} />, title: t('apiState.genericErrorTitle'), desc: t('apiState.genericErrorDesc'), retryable: true },
  };

  const cfg = configs[state.kind];

  return (
    <View style={{ paddingHorizontal: spacing.s4 }}>
      <EmptyState
        icon={cfg.icon}
        title={cfg.title}
        description={cfg.desc}
        actionLabel={cfg.retryable && onRetry ? t('common.retry') : undefined}
        onAction={cfg.retryable ? onRetry : undefined}
      />
    </View>
  );
}

export default ApiStateView;
