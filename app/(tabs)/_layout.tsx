/**
 * app/(tabs)/_layout.tsx
 *
 * الشاشات الخمس اللي بتظهر فيها الكبسولة العائمة: الرئيسية، التصنيفات،
 * الرسائل، حسابي — زائد "إعلاناتي" اللي في الموك اب بتفضل حاطّة .nav
 * برضه (بتبان فيها "حسابي" هي النشطة لأنها فرع من قسم الحساب).
 */
import { Stack, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { BottomNav, type NavKey } from '@/components/BottomNav';
import { useTheme } from '@/theme/ThemeProvider';

function resolveActive(pathname: string): NavKey {
  if (pathname.startsWith('/categories')) return 'categories';
  if (pathname.startsWith('/messages')) return 'messages';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/myads')) return 'profile';
  return 'home';
}

export default function TabsLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }} />
      <BottomNav
        active={resolveActive(pathname)}
        onNavigate={(key) => router.push(key === 'home' ? '/home' : `/${key}`)}
        onPost={() => router.push('/post')}
      />
    </View>
  );
}
