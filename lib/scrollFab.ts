/**
 * lib/scrollFab.ts — زرار "نشر إعلان" العائم (FAB) بيتحوّل من دائرة أيقونة
 * بس لكبسولة فيها أيقونة + نص "أضف إعلان" لما المستخدم ينزل يتصفّح
 * (زي سلوك السوق المفتوح اللي طُلب نقلّده). لازم القيمة تكون shared value
 * حقيقي عبر الشجرة كلها — مش React state/context — لأن BottomNav.tsx
 * عايش في app/(tabs)/_layout.tsx، منفصل تمامًا عن كل شاشة تاب (اللي فيها
 * الـScrollView الحقيقي اللي بيولّد أحداث السكرول). makeMutable() بيعمل
 * shared value "عالمي" بره أي كومبوننت، بيتقرأ ويتكتب من أي مكان في
 * التطبيق من غير re-render React ولا Context provider.
 */
import { makeMutable, useAnimatedScrollHandler } from 'react-native-reanimated';

/** true = المستخدم نزل تحت كفاية إن الزرار يتوسّع. مشترك بين كل تابات
 * (الرئيسية/التصنيفات/الرسائل/حسابي/إعلاناتي) — كل واحدة فيهم بتكتب فيه
 * بنفس المنطق، وBottomNav بيقرأه واحد بس. */
export const fabExpanded = makeMutable(false);

const EXPAND_THRESHOLD = 40; // px من أعلى السكرول — نفس قيمة بسيطة وثابتة لكل الشاشات

/** حطّها على `onScroll` بتاع الـAnimated.ScrollView الرئيسي لأي شاشة تاب:
 * `<Animated.ScrollView onScroll={useFabScrollHandler()} scrollEventThrottle={16}>`.
 * لازم Animated.ScrollView من react-native-reanimated (مش ScrollView
 * العادية من react-native) عشان useAnimatedScrollHandler يشتغل كـworklet
 * حقيقي على الـUI thread من غير أي جسر لـJS. */
export function useFabScrollHandler() {
  return useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      fabExpanded.value = event.contentOffset.y > EXPAND_THRESHOLD;
    },
  });
}
