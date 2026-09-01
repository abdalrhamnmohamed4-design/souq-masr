/**
 * app/index.tsx — مسار الدخول الافتراضي، بيحوّل على /welcome فورًا.
 *
 * كان قبل كده شاشة splash تانية (تدرّج غامق + وردمارك "سوق مصر." لمدة
 * 900ms). اتشالت لأنها كانت **تكرار**: شاشة البداية الحقيقية بقت
 * components/BrandSplash.tsx (حمرا، جوّه StartupGate)، فالمستخدم كان
 * بيشوف ٣ شاشات بداية ورا بعض — حمرا ← غامقة ← الترحيب — وده تضارب
 * لوني ووقت ضايع من غير أي فايدة.
 *
 * الملف فاضل موجود (مش متحذوف) لأن expo-router محتاج مسار index —
 * حذفه كان هيكسر التوجيه. <Redirect> مبيرسمش أي حاجة، فمفيش وميض.
 */
import { Redirect } from 'expo-router';
import React from 'react';

export default function Index() {
  return <Redirect href="/welcome" />;
}
