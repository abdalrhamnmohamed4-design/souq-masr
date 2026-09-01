/**
 * components/BottomNav.tsx
 *
 * شريط التنقل السفلي — تعليمة صريحة من المستخدم تخالف شكل .nav الفعلي في
 * الموك اب (اللي كان شريط مسطّح بخلفية بطاقة عادية): هنا كبسولة زجاجية
 * عائمة بـ expo-blur، والعنصر النشط عبارة عن عدسة شفافة بتنزلق فعليًا
 * (translateX متحرك بـ reanimated) بدل ما تظهر/تختفي فجأة زي toggle عادي.
 *
 * التبويبات الأربعة (الرئيسية/التصنيفات/الرسائل/حسابي) هي اللي بتشارك
 * في العدسة المنزلقة؛ زرار "نشر إعلان" في النص فقّاعة FAB مرفوعة فوق
 * الكبسولة زي .nav-fab الأصلي — مش جزء من التنقل بين تبويبات فعفعليًا،
 * فمالوش حالة "نشط" يتحرك ليها.
 *
 * لما المستخدم ينزل يتصفّح أي شاشة تاب (نفس سلوك السوق المفتوح — القيمة
 * جايّة من lib/scrollFab.ts's shared value العالمي، مش state محلي هنا):
 *   1) الكبسولة (التبويبات الأربعة) بتختفي بالكامل — يفضل زرار "أضف
 *      إعلان" بس ظاهر على الشاشة.
 *   2) الزرار نفسه بيتحوّل من دائرة أيقونة بس لكبسولة فيها أيقونة + نص
 *      "أضف إعلان" جنب الأيقونة.
 * لما يرجع فوق تاني، الكبسولة **ترجع تظهر فورًا من غير أنيميشن** (مش
 * fade تدريجي زي وقت الاختفاء — طلب صريح: يبان في نفس اللحظة)، والزرار
 * يرجع يقفل لدائرة صغيرة وتحتها نفس النص "أضف إعلان" ثابت (زي باقي
 * التبويبات اللي كل واحد فيهم كاتب اسمه تحت أيقونته).
 * الحاوية الخارجية عندها ارتفاع ثابت (104) عشان مكان الزرار العائم
 * ميتزحزحش لما الكبسولة تختفي/تظهر تحته — بس الكبسولة نفسها هي اللي
 * بتنكمش/تختفي (height + opacity)، مش الزرار.
 */
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '@/i18n';
import { fabExpanded } from '@/lib/scrollFab';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon, type IconName } from './Icon';

export type NavKey = 'home' | 'categories' | 'messages' | 'profile';

const TAB_DEFS: { key: NavKey; icon: IconName; physicalIndex: number }[] = [
  { key: 'home', icon: 'home', physicalIndex: 0 },
  { key: 'categories', icon: 'grid', physicalIndex: 1 },
  { key: 'messages', icon: 'chat', physicalIndex: 3 },
  { key: 'profile', icon: 'user', physicalIndex: 4 },
];

const SLOT_COUNT = 5; // 4 تبويبات + سلوت فاضي في النص لمكان الـ FAB

type Props = {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  onPost: () => void;
};

export function BottomNav({ active, onNavigate, onPost }: Props) {
  const { colors, isDark } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const translateX = useSharedValue(0);

  const NAV_LABELS: Record<NavKey, string> = {
    home: t('nav.home'),
    categories: t('nav.categories'),
    messages: t('nav.messages'),
    profile: t('nav.profile'),
  };
  const TABS = TAB_DEFS.map((d) => ({ ...d, label: NAV_LABELS[d.key] }));

  const activePhysicalIndex = TABS.find((tab) => tab.key === active)?.physicalIndex ?? 0;
  const itemWidth = width / SLOT_COUNT;

  useEffect(() => {
    if (width > 0) {
      translateX.value = withTiming(activePhysicalIndex * itemWidth, { duration: 260 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePhysicalIndex, width]);

  const lensStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: itemWidth || 0,
  }));

  // الـFAB: دائرة 56×56 (أيقونة بس) لما نكون فوق، وكبسولة 166×56 (أيقونة +
  // "أضف إعلان") لما fabExpanded يبقى true (شوف lib/scrollFab.ts). النص
  // نفسه متولّد دايمًا بس متلفوف في View بعرض متحرّك 0→94 مع overflow:
  // hidden — بديل عن إخفاء/إظهار الكومبوننت (اللي كان محتاج React state
  // + runOnJS)، وبيضمن مفيش مساحة فاضية أو انزياح للأيقونة وهو مقفول.
  const fabStyle = useAnimatedStyle(() => ({
    width: withTiming(fabExpanded.value ? 166 : 56, { duration: 260 }),
    borderRadius: withTiming(fabExpanded.value ? 28 : 18, { duration: 260 }),
  }));
  const labelWrapStyle = useAnimatedStyle(() => ({
    width: withTiming(fabExpanded.value ? 94 : 0, { duration: 260 }),
    marginStart: withTiming(fabExpanded.value ? 8 : 0, { duration: 260 }),
    opacity: withTiming(fabExpanded.value ? 1 : 0, { duration: fabExpanded.value ? 300 : 120 }),
  }));
  // النص الثابت تحت الدائرة (الحالة الافتراضية فوق) — بيختفي وهو بيتوسّع
  // لكبسولة (النص وقتها بقى جنب الأيقونة جوّه labelWrapStyle فوق، مش
  // محتاجين الاتنين مع بعض).
  const belowLabelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(fabExpanded.value ? 0 : 1, { duration: fabExpanded.value ? 120 : 200 }),
  }));

  // الكبسولة (التبويبات) بتختفي بالكامل لما fabExpanded يبقى true — بحركة
  // (260ms) زي الاختفاء العادي. لما ترجع تظهر تاني (fabExpanded=false،
  // يعني المستخدم رجع يسكرول لفوق)، بترجع فورًا من غير أنيميشن (مفيش
  // withTiming) — طلب صريح: "أول ما يطلع لفوق ع طول في نفس الثانية تظهر
  // البار"، مش fade تدريجي زي وقت الاختفاء. height برضه بترجع لصفر وقت
  // الاختفاء (مش بس opacity) عشان تخرج فعليًا من مسار اللمس.
  const capsuleStyle = useAnimatedStyle(() => {
    if (fabExpanded.value) {
      return {
        height: withTiming(0, { duration: 260 }),
        opacity: withTiming(0, { duration: 140 }),
      };
    }
    return { height: 76, opacity: 1 };
  });

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 12, height: 104, justifyContent: 'flex-end' }}
    >
      {/* FAB — مكانها ثابت دايمًا، مبتتحركش لما الكبسولة تحتها تختفي/تظهر */}
      <Pressable onPress={onPost} style={{ position: 'absolute', alignSelf: 'center', top: 0, zIndex: 5, alignItems: 'center' }}>
        <Animated.View
          style={[
            {
              height: 56,
              backgroundColor: colors.signal,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 4,
              borderColor: colors.paper,
              shadowColor: colors.signal,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.45,
              shadowRadius: 22,
              elevation: 8,
            },
            fabStyle,
          ]}
        >
          <Icon name="plus" color="#fff" size={22} />
          <Animated.View style={[{ overflow: 'hidden' }, labelWrapStyle]}>
            <Text numberOfLines={1} style={{ color: '#fff', fontFamily: 'Cairo_800ExtraBold', fontSize: 12.5 }}>
              {t('nav.postAd')}
            </Text>
          </Animated.View>
        </Animated.View>
        <Animated.Text
          style={[
            { marginTop: 4, fontSize: 9.5, fontWeight: '600', color: colors.signal, textAlign: 'center' },
            belowLabelStyle,
          ]}
        >
          {t('nav.postAd')}
        </Animated.Text>
      </Pressable>

      <Animated.View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[{ borderRadius: 26, overflow: 'hidden' }, capsuleStyle]}
      >
        <BlurView
          intensity={54}
          tint={isDark ? 'dark' : 'light'}
          style={{
            flex: 1,
            flexDirection: 'row',
            backgroundColor: isDark ? 'rgba(24,32,47,0.55)' : 'rgba(255,255,255,0.6)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,26,46,0.06)',
          }}
        >
          {/* العدسة المنزلقة */}
          {width > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: 10,
                  bottom: 10,
                  borderRadius: 18,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,26,46,0.07)',
                },
                lensStyle,
              ]}
            />
          ) : null}

          {[0, 1, 2, 3, 4].map((slot) => {
            if (slot === 2) return <View key="fab-slot" style={{ flex: 1 }} />;
            const tab = TABS.find((t) => t.physicalIndex === slot)!;
            const isActive = tab.key === active;
            return (
              <Pressable
                key={tab.key}
                onPress={() => onNavigate(tab.key)}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}
              >
                <Icon name={tab.icon} size={22} color={isActive ? colors.signal : colors.ink3} />
                <Text
                  style={{
                    fontSize: 9.5,
                    fontWeight: '600',
                    color: isActive ? colors.signal : colors.ink3,
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </BlurView>
      </Animated.View>
    </View>
  );
}

export default BottomNav;
