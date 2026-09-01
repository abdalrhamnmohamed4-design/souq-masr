/**
 * components/BrandSplash.tsx — شاشة البداية لـ"سوق مصر".
 *
 * العلامة: وردمارك "SOUQ" اللاتيني (نفس الملف المستخدم في أيقونة
 * التطبيق، بس بنسخة بيضا شفافة بدل الأحمر — عشان يبان فوق خلفية
 * الـsplash الحمرا؛ الشكل/النسب/الحروف نفسها بالظبط، لون بس اتغيّر
 * لأسباب عرض. آخر تحديث: كان قوس رأسي، اتبدّل بالوردمارك العريض ده
 * ومقاساته اتظبطت تبعًا لنسبة العرض/الارتفاع الحقيقية لملف الصورة
 * (assets/splash-logo.png).
 *
 * التكوين: لوك-أب رأسي — الوردمارك فوق، الاسم العربي تحته (تعزيز
 * ثنائي اللغة، نفس نمط التطبيقات المصرية).
 *
 * الحركة — نفس تقنية "dynamic mask reveal" بتاعة GetYourGuide اللي
 * المستخدم بعت مرجعها:
 *   1) الوردمارك في نص الشاشة بالظبط، بنفس مقاس الـsplash الأصلية (صفر قفز).
 *   2) اللوك-أب كله بيطلع لفوق، وفي نفس اللحظة قناع بينفتح من اليمين
 *      للشمال كاشف "سوق مصر." — اتجاه القراءة العربي.
 *   3) السطر التعريفي يظهر آخر حاجة.
 * الوردمارك **مبيصغّرش** — التكوين الرأسي مش محتاج، فبيفضل بنفس المقاس
 * بالظبط طول الوقت.
 *
 * تقنية القناع من غير أي مكتبة زيادة: حاوية `overflow:'hidden'` عرضها
 * بيتحرك، والنص جوّاها مثبّت على الحافة اليمين بعرض ثابت — فالنص واقف
 * والقناع هو اللي بينكشف عنه. مستخدم `right`/`left` (فيزيائية،
 * **مبتتقلبش** مع RTL في React Native — بعكس start/end) عشان الاتجاه
 * يبقى مضمون تحت الـRTL المفروض في التطبيق.
 *
 * مفيش "توهّج" ورا العلامة: النسخة الأولى كان فيها دايرتين بيضا
 * بـopacity ثابت، وده **مش** glow — الدايرة الصلبة ليها حافة حادة
 * فبتطلع قرص فاتح باين. التدرّج الأحمر لوحده أنضف وأرقى.
 *
 * دي مش شاشة splash تانية: هي الحالة اللي StartupGate بيعرضها وهو
 * بيفحص. StartupGate فاضل مصدر الحقيقة الوحيد للبوابات؛ الملف ده
 * بيرسم بس.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** لازم يطابق app.json's expo-splash-screen.backgroundColor */
export const SPLASH_RED = '#C62828';
const SPLASH_RED_TOP = '#D8332F';
const SPLASH_RED_BOTTOM = '#9E1818';
const GOLD = '#FFC65C';

/** لازم يطابق app.json's expo-splash-screen.imageWidth بالظبط — أي فرق
 * هنا بيعمل قفزة في مقاس الوردمارك وقت التسليم من الـsplash الأصلية. */
const MARK_W = 220;
/** نسبة الصورة (assets/splash-logo.png = 1536×555 — وردمارك عريض) */
const MARK_ASPECT = 1536 / 555;
const MARK_H = Math.round(MARK_W / MARK_ASPECT); // 79

const NAME_FONT = 32;
const GAP_MARK_NAME = 26;
const NAME_H = 46;
const GAP_NAME_TAG = 12;
const TAG_H = 18;

/** ارتفاع كل اللي تحت الوردمارك — بنبدأ اللوك-أب مزاح لتحت بنصّه عشان
 * الوردمارك يقع في نص الشاشة بالظبط زي الـsplash الأصلية، وبعدين يستقر. */
const BELOW_BLOCK = GAP_MARK_NAME + NAME_H + GAP_NAME_TAG + TAG_H;
const START_OFFSET = BELOW_BLOCK / 2;

/** إجمالي زمن الحركة — StartupGate بيستخدمه كحد أدنى لعرض الشاشة عشان
 * الكشف ميتقطعش في نصه لما الفحص يخلص بسرعة. */
export const SPLASH_MIN_DURATION = 1500;

export function BrandSplash() {
  const insets = useSafeAreaInsets();

  // عرض الاسم بيتقاس فعليًا من الجهاز (مش رقم مفترض بيتكسر مع اختلاف
  // الخط/الحجم) — الحركة مبتبدأش غير لما القياس يجي.
  const [nameW, setNameW] = useState<number | null>(null);

  const p = useSharedValue(0); // استقرار اللوك-أب + فتح القناع
  const tag = useSharedValue(0);
  const bar = useSharedValue(0);
  const barIn = useSharedValue(0);

  useEffect(() => {
    barIn.value = withDelay(1100, withTiming(1, { duration: 500 }));
    bar.value = withDelay(1100, withRepeat(withTiming(1, { duration: 1150, easing: Easing.inOut(Easing.quad) }), -1, false));
  }, [bar, barIn]);

  useEffect(() => {
    if (nameW === null) return;
    p.value = withDelay(300, withTiming(1, { duration: 760, easing: Easing.bezier(0.22, 0.9, 0.24, 1) }));
    tag.value = withDelay(1000, withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) }));
  }, [nameW, p, tag]);

  const stageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: START_OFFSET * (1 - p.value) }],
  }));
  const maskStyle = useAnimatedStyle(() => ({ width: (nameW ?? 0) * p.value }));
  const tagStyle = useAnimatedStyle(() => ({
    opacity: tag.value,
    transform: [{ translateY: (1 - tag.value) * 6 }],
  }));
  const trackStyle = useAnimatedStyle(() => ({ opacity: barIn.value * 0.9 }));
  const segStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -34 + bar.value * 68 }] }));

  return (
    <LinearGradient
      colors={[SPLASH_RED_TOP, SPLASH_RED, SPLASH_RED_BOTTOM]}
      locations={[0, 0.52, 1]}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <StatusBar style="light" />

      {/* نسخة مخفية بتقيس عرض الاسم الحقيقي مرة واحدة */}
      {nameW === null ? (
        <Text
          onLayout={(e) => setNameW(Math.ceil(e.nativeEvent.layout.width))}
          style={{ position: 'absolute', opacity: 0, fontFamily: 'Cairo_800ExtraBold', fontSize: NAME_FONT }}
        >
          سوق مصر.
        </Text>
      ) : null}

      <Animated.View style={[{ alignItems: 'center' }, stageStyle]}>
        <Image
          source={require('@/assets/splash-logo.png')}
          style={{ width: MARK_W, height: MARK_H }}
          resizeMode="contain"
          fadeDuration={0}
        />

        {/* الاسم: قناع بينفتح من اليمين للشمال.
            `left` فيزيائية ومبتتقلبش مع RTL. */}
        <View style={{ height: NAME_H, marginTop: GAP_MARK_NAME, justifyContent: 'center' }}>
          {nameW !== null ? (
            <Animated.View
              style={[
                { height: NAME_H, overflow: 'hidden', justifyContent: 'center' },
                maskStyle,
              ]}
            >
              <Text
                style={{
                  position: 'absolute',
                  right: 0,
                  width: nameW,
                  fontFamily: 'Cairo_800ExtraBold',
                  fontSize: NAME_FONT,
                  lineHeight: NAME_H,
                  color: '#fff',
                }}
              >
                سوق مصر<Text style={{ color: GOLD }}>.</Text>
              </Text>
            </Animated.View>
          ) : null}
        </View>

        <Animated.View style={[{ height: TAG_H, marginTop: GAP_NAME_TAG, justifyContent: 'center' }, tagStyle]}>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,.66)', letterSpacing: 0.3 }}>
            بيع واشترِ من غير وسيط
          </Text>
        </Animated.View>
      </Animated.View>

      {/* مؤشر تحميل رفيع — بيظهر بعد الحركة بس، ولو الفحص لسه شغّال
          (ممكن يوصل 8 ثواني حسب مهلة الشبكة في config/env.ts). */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: insets.bottom + 52,
            width: 68,
            height: 2,
            borderRadius: 1,
            backgroundColor: 'rgba(255,255,255,.20)',
            overflow: 'hidden',
          },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            { width: 34, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,.85)' },
            segStyle,
          ]}
        />
      </Animated.View>
    </LinearGradient>
  );
}

export default BrandSplash;
