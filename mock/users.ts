/**
 * mock/users.ts — نموذج البائع (Seller). مفيش بائعين وهميين تاني: من غير
 * باك إند، البائع الحقيقي الوحيد المتاح في التطبيق هو المستخدم نفسه
 * (بعد ما يسجّل دخوله بالاسم والتليفون في onboarding). أي بائع تاني
 * (id غير 'me') مصدره الحقيقي هيبقى API المستخدمين لما يتوصّل باك إند
 * ERP — `sellers` فاضي عن قصد لحد ما ده يحصل.
 */
export type Seller = {
  id: string;
  name: string;
  initials: string;
  avatarColor?: string; // لو مش الافتراضي (ink)
  verified: boolean;
  memberSince: string; // "عضو من 2023"
  adsCount: number;
  rating: number;
  responseRate: number; // %
  phone: string;
};

// سجل بائعين حقيقيين (غير المستخدم الحالي) — هيتملى من API المستخدمين
// بعد ما يتوصّل باك إند حقيقي. فاضي دلوقتي عن قصد (مفيش بيانات وهمية).
export const sellers: Record<string, Seller> = {};

function initialsOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '؟';
  return trimmed.slice(0, 2);
}

/**
 * بيانات البائع "أنا" — مبنية فعليًا من اللي المستخدم كتبه في onboarding
 * (الاسم والتليفون)، مش قيم ثابتة. بتُستخدم في store/useAppStore عبر
 * useSeller('me') عشان أي مكان في التطبيق يشاور على إعلانات المستخدم
 * الحالي (تفاصيل، شات، بروفايل البائع) يعرض بياناته الحقيقية.
 */
export function buildCurrentSeller(params: { name: string; phone: string; adsCount: number; joinedLabel: string; rating: number }): Seller {
  return {
    id: 'me',
    name: params.name || 'مستخدم سوق مصر',
    initials: initialsOf(params.name || 'م'),
    verified: false, // التوثيق قيد المراجعة لأي حساب جديد
    memberSince: params.joinedLabel,
    adsCount: params.adsCount,
    rating: params.rating, // محسوبة من تقييمات حقيقية — 0 لو معندوش تقييمات لسه
    responseRate: 0,
    phone: params.phone,
  };
}

export default sellers;
