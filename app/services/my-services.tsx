/**
 * app/services/my-services.tsx — إدارة خدماتي (QA fix): كانت مفقودة
 * تمامًا — الـstore عنده updateService/removeService حقيقيين من زمان
 * بس مفيش أي شاشة كانت بتستخدمهم، يعني عدّل/احذف/أوقف خدمة كانوا كلهم
 * مستحيلين فعليًا رغم إن المنطق جاهز. نفس نمط my-jobs.tsx بالظبط.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { EmptyState } from '@/components/primitives/EmptyState';
import { getServiceCategory } from '@/mock/jobs/trades';
import { useJobsStore } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function MyServices() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const userServices = useJobsStore((s) => s.userServices);
  const updateService = useJobsStore((s) => s.updateService);
  const removeService = useJobsStore((s) => s.removeService);
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تدير خدماتك', description: 'إدارة الخدمات اللي أضفتها متاحة بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  const visible = userServices.filter((sv) => sv.status !== 'deleted');

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
      {visible.length === 0 ? (
        <EmptyState
          icon={<Icon name="tool" color={colors.ink3} size={26} />}
          title="لسه معندكش خدمات منشورة"
          description="ضيف خدمتك الأولى وهتظهر لكل العملاء اللي بيدوروا عليها."
          actionLabel="أضف خدمة"
          onAction={() => router.push('/services/post')}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.s5, gap: spacing.s3 }}>
          {visible.map((sv) => (
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
                  {getServiceCategory(sv.categoryId)?.name ?? '—'}{sv.price ? ` · ${sv.price.toLocaleString('en-US')} ج.م` : ''}
                </Text>
              </Pressable>
              <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line2 }}>
                <RowAction icon="edit" label="عدّل" onPress={() => router.push(`/services/post?editId=${sv.id}`)} />
                <RowAction
                  icon="refresh"
                  label={sv.status === 'active' ? 'إيقاف' : 'تفعيل'}
                  onPress={() => updateService(sv.id, { status: sv.status === 'active' ? 'paused' : 'active' })}
                />
                <RowAction
                  icon="trash"
                  label="حذف"
                  tone="danger"
                  onPress={() =>
                    Alert.alert('حذف الخدمة', `متأكد إنك عايز تحذف "${sv.title}"؟`, [
                      { text: 'إلغاء', style: 'cancel' },
                      { text: 'حذف', style: 'destructive', onPress: () => removeService(sv.id) },
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
