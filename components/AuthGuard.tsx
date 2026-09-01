/**
 * components/AuthGuard.tsx — بوابة صفحة كاملة: للشاشات اللي كلها محتاجة
 * تسجيل دخول (إعلاناتي، المحفظة، الإشعارات، الملف المهني...) بدل ما كل
 * شاشة من دول تعمل `if (!isAuthenticated) return <EmptyState .../>` بنفسها
 * بنسخة مختلفة من نفس النص. الصفحات دي بتتوصلها عادةً من تاب/زرار، فمفيش
 * حاجة معقّدة لازم "ترجع لنفس المكان بعد الدخول" — المستخدم بيسجّل دخوله
 * وبيرجع يفتح نفس التاب تاني، والشاشة هتعرض المحتوى الحقيقي على طول.
 *
 * شكلين للاستخدام:
 *   1) hook — `const authBlock = useAuthGuard(); if (authBlock) return authBlock;`
 *      (السطرين دول جوه الكومبوننت، بعد باقي الـhooks مباشرة) — الشكل
 *      المستخدم في أغلب الشاشات، لأنه سطرين بس وميحتاجش تعديل الـJSX
 *      الموجود خالص.
 *   2) component — `<AuthGuard>{children}</AuthGuard>` — لما يكون أسهل
 *      تحيط بيه الـreturn كله.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/primitives/EmptyState';
import { useT } from '@/i18n';
import { useIsAuthenticated } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

type GuardOptions = {
  title?: string;
  description?: string;
};

/** لو المستخدم داخل حسابه بيرجّع null (كمّل عرض الشاشة عادي). لو ضيف،
 * بيرجّع الـJSX الجاهز لشاشة "تسجيل الدخول مطلوب" — حط الأول في الشاشة:
 *   const authBlock = useAuthGuard();
 *   if (authBlock) return authBlock;
 */
export function useAuthGuard(opts?: GuardOptions): React.ReactElement | null {
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();
  const t = useT();
  const { colors } = useTheme();

  if (isAuthenticated) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title={t('auth.signInRequired')} onBack={() => router.back()} />
      <EmptyState
        icon={<Icon name="user" color={colors.ink3} size={26} />}
        title={opts?.title ?? t('auth.signInRequiredTitle')}
        description={opts?.description ?? t('auth.signInRequiredDesc')}
        actionLabel={t('auth.signIn')}
        onAction={() => router.push('/signin')}
      />
    </View>
  );
}

export function AuthGuard({ children, title, description }: { children: React.ReactNode } & GuardOptions) {
  const block = useAuthGuard({ title, description });
  return block ?? <>{children}</>;
}

export default AuthGuard;
