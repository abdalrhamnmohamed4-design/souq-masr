/**
 * app/services/my-services.tsx — إدارة خدماتي (QA fix): كانت مفقودة
 * تمامًا — الـstore عنده updateService/removeService حقيقيين من زمان
 * بس مفيش أي شاشة كانت بتستخدمهم، يعني عدّل/احذف/أوقف خدمة كانوا كلهم
 * مستحيلين فعليًا رغم إن المنطق جاهز. نفس نمط my-jobs.tsx بالظبط.
 *
 * Phase 2B — Jobs + Services Mobile Wiring: دمج حقيقي — خدمات حقيقية من
 * get_my_services (souq_masr.api.v1.services) + خدمات mock محلية لسه
 * موجودة، بنفس نمط app/jobs/my-jobs.tsx (وapp/(tabs)/myads.tsx) بالظبط.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { ApiStateView } from '@/components/ApiStateView';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { useRequireOnline } from '@/lib/connectivityGuard';
import { EmptyState } from '@/components/primitives/EmptyState';
import { useApiResult } from '@/hooks/useApiResult';
import { getServiceCategory } from '@/mock/jobs/trades';
import { activateService as activateServiceReal, deleteService as deleteServiceReal, getMyServices, pauseService as pauseServiceReal } from '@/services/serviceListingService';
import { useJobsStore } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

type DisplayService = { id: string; title: string; status: 'active' | 'paused'; categoryLabel: string; price: number | null; isReal: boolean };

export default function MyServices() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const userServicesMock = useJobsStore((s) => s.userServices);
  const updateServiceMock = useJobsStore((s) => s.updateService);
  const removeServiceMock = useJobsStore((s) => s.removeService);
  const requireOnline = useRequireOnline();

  const { state: realState, refetch: refetchReal } = useApiResult(() => getMyServices(undefined, 1, 100), []);
  const realItems = realState.kind === 'success' ? realState.data.items : [];

  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تدير خدماتك', description: 'إدارة الخدمات اللي أضفتها متاحة بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  const mockVisible = userServicesMock.filter((sv) => sv.status !== 'deleted');

  const displayServices: DisplayService[] = [
    ...realItems
      .filter((r) => r.status === 'active' || r.status === 'paused')
      .map((r): DisplayService => ({
        id: r.id, title: r.title, status: r.status as 'active' | 'paused',
        categoryLabel: getServiceCategory(r.categoryKey)?.name ?? '—', price: r.price, isReal: true,
      })),
    ...mockVisible.map((sv): DisplayService => ({
      id: sv.id, title: sv.title, status: sv.status as 'active' | 'paused',
      categoryLabel: getServiceCategory(sv.categoryId)?.name ?? '—', price: sv.price ?? null, isReal: false,
    })),
  ];

  const mutateReal = async (action: () => Promise<{ status: string }>, failTitle: string) => {
    const r = await action();
    if (r.status !== 'success') {
      Alert.alert(failTitle, 'حصلت مشكلة، جرّب تاني.');
      return;
    }
    refetchReal();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader
        title="خدماتي"
        right={
          <Pressable onPress={() => router.push('/services/post')}>
            <Icon name="plus" color={colors.ink} />
          </Pressable>
        }
      />

      {realState.kind !== 'success' && realState.kind !== 'loading' && realState.kind !== 'empty' ? (
        <View style={{ paddingHorizontal: spacing.s5, marginTop: spacing.s3 }}>
          <ApiStateView state={realState} onRetry={refetchReal} />
        </View>
      ) : null}

      {realState.kind === 'loading' && displayServices.length === 0 ? (
        <ApiStateView state={realState} />
      ) : displayServices.length === 0 ? (
        <EmptyState
          icon={<Icon name="tool" color={colors.ink3} size={26} />}
          title="لسه معندكش خدمات منشورة"
          description="ضيف خدمتك الأولى وهتظهر لكل العملاء اللي بيدوروا عليها."
          actionLabel="أضف خدمة"
          onAction={() => router.push('/services/post')}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.s5, gap: spacing.s3 }}>
          {displayServices.map((sv) => (
            <View key={sv.id} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, overflow: 'hidden' }}>
              <Pressable onPress={() => router.push(`/services/${sv.id}`)} style={{ padding: spacing.s3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{sv.title}</Text>
                  <View style={{ backgroundColor: sv.status === 'active' ? colors.signalWash : colors.paper, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: sv.status === 'active' ? colors.signal2 : colors.ink3 }}>
                      {sv.status === 'active' ? 'نشطة' : 'موقوفة'}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: colors.ink3, marginTop: 3 }}>
                  {sv.categoryLabel}{sv.price ? ` · ${sv.price.toLocaleString('en-US')} ج.م` : ''}
                </Text>
              </Pressable>
              <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line2 }}>
                <RowAction icon="edit" label="عدّل" onPress={() => router.push(`/services/post?editId=${sv.id}`)} />
                <RowAction
                  icon="refresh"
                  label={sv.status === 'active' ? 'إيقاف' : 'تفعيل'}
                  onPress={() =>
                    sv.isReal
                      ? requireOnline(() =>
                          mutateReal(
                            () => (sv.status === 'active' ? pauseServiceReal(sv.id) : activateServiceReal(sv.id)).then((r) => ({ status: r.status })),
                            sv.status === 'active' ? 'تعذّر إيقاف الخدمة' : 'تعذّر تفعيل الخدمة',
                          ),
                        )
                      : updateServiceMock(sv.id, { status: sv.status === 'active' ? 'paused' : 'active' })
                  }
                />
                <RowAction
                  icon="trash"
                  label="حذف"
                  tone="danger"
                  onPress={() =>
                    Alert.alert('حذف الخدمة', `متأكد إنك عايز تحذف "${sv.title}"؟`, [
                      { text: 'إلغاء', style: 'cancel' },
                      {
                        text: 'حذف',
                        style: 'destructive',
                        onPress: () =>
                          sv.isReal
                            ? requireOnline(() => mutateReal(() => deleteServiceReal(sv.id).then((r) => ({ status: r.status })), 'تعذّر حذف الخدمة'))
                            : removeServiceMock(sv.id),
                      },
                    ])
                  }
                />
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function RowAction({ icon, label, onPress, tone }: { icon: 'edit' | 'refresh' | 'trash'; label: string; onPress: () => void; tone?: 'danger' }) {
  const { colors } = useTheme();
  const fg = tone === 'danger' ? colors.danger : colors.ink2;
  return (
    <Pressable onPress={onPress} style={{ flex: 1, paddingVertical: 11, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5, borderLeftWidth: 1, borderLeftColor: colors.line2 }}>
      <Icon name={icon} size={14} color={fg} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: fg }}>{label}</Text>
    </Pressable>
  );
}
