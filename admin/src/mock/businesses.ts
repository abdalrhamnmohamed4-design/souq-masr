import type { BusinessAccount, BusinessPlan } from '@/types';
import { getTopLevel } from './taxonomy/categories';
import { daysAgo, intBetween, pick, pickWeighted, randomName, resetSeed } from './utils';

resetSeed(505);

const topLevelCategories = getTopLevel();

const NAMES = [
  'معرض النور للسيارات', 'العقارية الحديثة', 'موبايل تك', 'أثاث الأصالة', 'ستور الإلكترونيات',
  'بيت الأزياء', 'مركز الدراجات', 'عيادة الحيوانات الأليفة', 'مكتبة المعرفة', 'معرض المكاتب الذكية',
];

const PLAN_WEIGHTS: [BusinessPlan, number][] = [
  ['basic', 50],
  ['pro', 35],
  ['business', 15],
];

function makeBusiness(i: number): BusinessAccount {
  const plan = pickWeighted(PLAN_WEIGHTS);
  return {
    id: `biz-${i}`,
    name: pick(NAMES) + ` #${i}`,
    ownerName: randomName(),
    category: pick(topLevelCategories).name,
    verified: intBetween(0, 100) > 30,
    plan,
    subscriptionEndsAt: daysAgo(-intBetween(5, 120)),
    listingsCount: intBetween(3, 80),
    leadsCount: intBetween(0, 200),
    status: intBetween(0, 100) > 92 ? 'suspended' : 'active',
  };
}

export const businesses: BusinessAccount[] = Array.from({ length: 18 }, (_, i) => makeBusiness(i + 1));

export default businesses;
