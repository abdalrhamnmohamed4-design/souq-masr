/**
 * mock/plans.ts — باقات تمييز الإعلان، نفس القيم في mazad-v2.html.
 */
export type PromotePlan = {
  id: string;
  duration: string;
  price: number;
  multiplier: string; // "×2 مشاهدات"
  description: string;
  best?: boolean;
};

export const promotePlans: PromotePlan[] = [
  {
    id: '24h',
    duration: '24 ساعة',
    price: 25,
    multiplier: '×2',
    description: 'مناسب لمن يحتاج تبيع بسرعة الموارد — متوسط الزيادة ×2 مشاهدات.',
  },
  {
    id: '3d',
    duration: '3 أيام',
    price: 60,
    multiplier: '×4',
    description: 'يغطي عطلة نهاية الأسبوع، وقت ما الناس بتتفرج أكتر — متوسط ×4 مشاهدات.',
    best: true,
  },
  {
    id: '7d',
    duration: 'أسبوع',
    price: 120,
    multiplier: '×6',
    description: 'للحاجات غالية الثمن اللي بتاخد وقت في البيع زي العربيات والعقارات.',
  },
];

export function getPlan(id: string) {
  return promotePlans.find((p) => p.id === id);
}

export default promotePlans;
