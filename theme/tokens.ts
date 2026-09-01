/**
 * theme/tokens.ts
 *
 * استخراج حرفي لكل قيم التصميم من :root و .phone.dark في mazad-v2.html.
 * ما فيش أي قيمة مخترعة هنا — كل رقم/لون موجود بنفس الاسم والقيمة في
 * الملف الأصلي. القيم التزيينية (ألوان الـ thumbnails وأيقونات
 * التصنيفات) منفصلة في theme/decorative.ts لأنها مش جزء من نظام
 * التوكنز الأساسي في :root.
 */

// ============================================================
// ألوان — من :root (light) و .phone.dark (dark overrides)
// المصدر: mazad-v2.html :root { ... } و .phone.dark { ... }
// ============================================================

export type ColorTokens = {
  ink: string; // deep blue-black: headings, nav, trust
  ink2: string; // secondary text
  ink3: string; // tertiary / captions
  signal: string; // the ONE action color
  signal2: string;
  signalWash: string;
  gold: string; // featured listings only
  goldWash: string;
  verify: string; // verified / success only
  verifyWash: string;
  danger: string;
  dangerWash: string;
  paper: string; // app background
  card: string;
  line: string;
  line2: string;
};

export const lightColors: ColorTokens = {
  ink: '#0F1A2E',
  ink2: '#3A4557',
  ink3: '#8A93A3',
  signal: '#F4511E',
  signal2: '#D93F10',
  signalWash: '#FFF0EA',
  gold: '#E0A106',
  goldWash: '#FFF8E4',
  verify: '#0E9469',
  verifyWash: '#E6F5EF',
  danger: '#D2372A',
  dangerWash: '#FCEDEB',
  paper: '#EEEEE9',
  card: '#FFFFFF',
  line: '#E2E2DC',
  line2: '#F0F0EB',
};

// تعديل بعد مراجعة: المستخدم شاف الوضع الغامق على جهازه ولقى الألوان
// "كئيبة" — الوضع الفاتح متفق عليه زي ما هو من غير أي تغيير. القيم تحت
// دي مش من mazad-v2.html حرفيًا زي باقي الملف؛ هي تعديل مقصود ومتفق
// عليه مع المستخدم بعد المراجعة: نفس البنية والانضباط (الذهبي للمميز
// بس، الأخضر للتوثيق بس، برتقالي واحد للأكشن) بس بعمق وتباين أعلى بين
// الخلفية والبطاقات عشان الوضع الغامق يحس بيه "premium" مش مسطّح.
export const darkColors: ColorTokens = {
  ...lightColors,
  ink: '#F2F4F8',
  ink2: '#B7BECB',
  ink3: '#7D8695',
  paper: '#0B1220', // أعمق شوية من قبل (#0E1420) — نفس عمق شاشة المكالمة
  card: '#1C2740', // بدل #18202F — تباين أوضح مع الخلفية عشان البطاقات تبان "طافية" مش دايبة
  line: '#31405C',
  line2: '#232F45',
  signalWash: '#4A2415', // أدفى وأغنى من #3A1B10 عشان شرايح الأكشن تلفت النظر أكتر
  goldWash: '#3D3210', // أغنى من #31280C
  verifyWash: '#123527', // أغنى من #0E2B22
  dangerWash: '#3D1D19', // أغنى من #331714
};

// سطح غامق ثابت — نفس --ink بتاع الوضع الفاتح (#0F1A2E)، بيتستخدم في
// العناصر اللي المفروض تفضل غامقة "بالتصميم" في الوضعين (خلفية شاشات
// الترحيب/البداية المتدرجة، بطاقة المحفظة) — مش تابعة لتبديل النهار/
// الليل زي --ink العادي. ده تصحيح لعيب كان موجود أصلاً في CSS الملف
// الأصلي: --ink بمعنيين مختلفين (لون نص متبدّل + سطح غامق ثابت) وده كان
// بيكسر عناصر زي .wallet في الوضع الغامق (نص أبيض على خلفية بيضاء تقريبًا).
export const brandDark = '#0F1A2E';
export const heroGradient = ['#0F1A2E', '#1B2C4B', '#24405F'] as const;

// ============================================================
// مقياس المسافات — من :root { --s1..--s8 }
// ============================================================
export const spacing = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s8: 32,
} as const;

// ============================================================
// أنصاف الأقطار — من :root { --r1..--r4, --rf }
// ============================================================
export const radius = {
  r1: 8,
  r2: 12,
  r3: 16,
  r4: 20,
  rf: 999, // fully rounded (pills, avatars الدائرية، إلخ)
} as const;

// ============================================================
// مقياس أحجام الخط — من :root { --t-cap..--t-dp }
// الأسماء زي ما هي في CSS (cap = caption, sm = small, bd = body,
// ti = title, dp = display) عشان تفضل قابلة للتتبع مقابل الأصل.
// ============================================================
export const typeScale = {
  cap: 11,
  sm: 12.5,
  bd: 14,
  ti: 16,
  dp: 20,
} as const;

// ============================================================
// عائلات الخطوط — من link href Google Fonts في <head>
// Cairo: 600/700/800/900 (font-family:'Cairo',sans-serif) — للعناوين
//   (كل عنصر h1/h2/h3 والأزرار وأي عنصر font-family:'Cairo' في الملف)
// IBM Plex Sans Arabic: 400/500/600/700 — للنص الأساسي (body{...})
// أسماء الملفات الفعلية (لتحميلها في Phase 2 عبر @expo-google-fonts)
// هتتحدد وقت التركيب، هنا بس توثيق الأوزان المطلوبة.
// ============================================================
export const fontFamilies = {
  heading: 'Cairo',
  headingWeights: [600, 700, 800, 900] as const,
  body: 'IBM Plex Sans Arabic',
  bodyWeights: [400, 500, 600, 700] as const,
} as const;

// ============================================================
// الارتفاعات (elevation) — من :root { --e1, --e2, --e3 }
// القيم الأصلية box-shadow (CSS) اتحطت كتعليق فوق كل مستوى، والتحويل
// لـ React Native (iOS shadow* + Android elevation) تقريبي بالضرورة
// لأن box-shadow مالوش معادل 1:1 في RN — رقم elevation اتاختار
// تصاعديًا بما يتناسب مع شدة الظل الأصلي (blur/spread) مش بمعادلة دقيقة.
// ============================================================

type ElevationToken = {
  ios: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
  };
  android: { elevation: number };
};

export const elevation: Record<'e1' | 'e2' | 'e3', ElevationToken> = {
  // CSS الأصلي: 0 1px 3px rgba(15,26,46,.06)
  e1: {
    ios: {
      shadowColor: '#0F1A2E',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: { elevation: 2 },
  },
  // CSS الأصلي: 0 4px 14px rgba(15,26,46,.08)
  e2: {
    ios: {
      shadowColor: '#0F1A2E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
    },
    android: { elevation: 6 },
  },
  // CSS الأصلي: 0 12px 32px rgba(15,26,46,.14)
  e3: {
    ios: {
      shadowColor: '#0F1A2E',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.14,
      shadowRadius: 32,
    },
    android: { elevation: 14 },
  },
};

// ============================================================
// تجميع كل حاجة في theme واحد لسهولة الاستيراد (هيتلف بـ ThemeProvider
// في Phase 2 عشان يتابع light/dark).
// ============================================================
export const tokens = {
  light: lightColors,
  dark: darkColors,
  spacing,
  radius,
  typeScale,
  fontFamilies,
  elevation,
  brandDark,
  heroGradient,
} as const;

export default tokens;
