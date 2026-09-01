/**
 * app/settings.tsx — يقابل #settings: تبديل لغة (شغّال فعليًا دلوقتي —
 * components/LanguageSwitcher.tsx) + مجموعات إعدادات (الوضع الليلي شغّال
 * فعليًا من هنا) + خروج.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/primitives/Button';
import { useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

function SettingsRow({
  icon,
  label,
  value,
  right,
  onPress,
}: {
  icon: IconName;
  label: string;
  value?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s3,
        paddingVertical: 14,
        paddingHorizontal: spacing.s4,
        borderBottomWidth: 1,
        borderBottomColor: colors.line2,
      }}
    >
      <Icon name={icon} color={colors.ink} />
      <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: colors.ink }}>{label}</Text>
      {value ? <Text style={{ fontSize: 11, color: colors.ink3 }}>{value}</Text> : null}
      {right ?? (onPress ? <Icon name="chev-r" size={16} color={colors.ink3} /> : null)}
    </Pressable>
  );
}

function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ marginHorizontal: spacing.s5, marginTop: spacing.s3, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, overflow: 'hidden' }}>
      {title ? <Text style={{ paddingHorizontal: spacing.s4, paddingTop: 10, paddingBottom: 6, fontSize: 9.5, fontWeight: '700', color: colors.ink3 }}>{title}</Text> : null}
      {children}
    </View>
  );
}

export default function Settings() {
  const router = useRouter();
  const t = useT();
  const { colors, spacing, mode, setMode, isDark } = useTheme();
  const { notificationsEnabled, setNotificationsEnabled, faceIdEnabled, setFaceIdEnabled, blockedSellerIds } = useAppStore();
  const blockedCount = blockedSellerIds.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title={t('settings.title')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={{ marginHorizontal: spacing.s5, marginTop: spacing.s3 }}>
          <LanguageSwitcher />
        </View>

        <Group>
          <SettingsRow icon="globe" label={t('settings.country')} value="مصر" />
          <SettingsRow
            icon="moon"
            label={t('settings.darkMode')}
            right={
              <Switch
                value={mode === 'dark' || (mode === 'system' && isDark)}
                onValueChange={(v) => setMode(v ? 'dark' : 'light')}
                trackColor={{ false: colors.line, true: colors.verify }}
              />
            }
          />
          <SettingsRow
            icon="face"
            label={t('settings.faceIdLogin')}
            right={<Switch value={faceIdEnabled} onValueChange={setFaceIdEnabled} trackColor={{ false: colors.line, true: colors.verify }} />}
          />
        </Group>

        <Group title={t('settings.accountGroup')}>
          <SettingsRow
            icon="bell"
            label={t('settings.notifications')}
            right={<Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: colors.line, true: colors.verify }} />}
          />
          <SettingsRow icon="user" label={t('settings.account')} onPress={() => router.push('/edit-profile')} />
          <SettingsRow icon="devices" label={t('settings.currentDevice')} value={t('settings.thisDeviceOnly')} />
          <SettingsRow icon="ban" label={t('settings.blockedUsers')} value={blockedCount > 0 ? String(blockedCount) : undefined} onPress={() => router.push('/blocked-users')} />
        </Group>

        <Group title={t('settings.aboutGroup')}>
          <SettingsRow icon="doc" label={t('settings.terms')} onPress={() => router.push('/legal/terms')} />
          <SettingsRow icon="shield" label={t('settings.privacy')} onPress={() => router.push('/legal/privacy')} />
          <SettingsRow icon="help" label={t('settings.support')} onPress={() => router.push('/support')} />
          <SettingsRow icon="info" label={t('settings.aboutApp')} value="1.0.0" />
        </Group>

        <View style={{ padding: spacing.s5 }}>
          <Button
            variant="danger"
            icon={<Icon name="logout" color={colors.danger} size={16} />}
            onPress={() =>
              Alert.alert(t('settings.logoutConfirmTitle'), t('settings.logoutConfirmMsg'), [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('settings.logoutConfirmAction'), style: 'destructive', onPress: () => router.replace('/welcome') },
              ])
            }
          >
            {t('settings.logout')}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
