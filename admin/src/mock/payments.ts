import type { Payment, PaymentStatus, PaymentType } from '@/types';
import { getTopLevel } from './taxonomy/categories';
import { getGovernorates } from './taxonomy/locations';
import { daysAgo, intBetween, pick, pickWeighted, resetSeed } from './utils';
import { users } from './users';

resetSeed(404);

const topLevelCategories = getTopLevel();
const governorates = getGovernorates();

const TYPE_AMOUNT: Record<PaymentType, [number, number]> = {
  boost: [25, 120],
  featured: [60, 150],
  subscription: [200, 900],
  topup: [50, 500],
  refund: [-300, -25],
};

const STATUS_WEIGHTS: [PaymentStatus, number][] = [
  ['success', 78],
  ['pending', 8],
  ['failed', 10],
  ['refunded', 4],
];

const METHODS = ['فودافون كاش', 'بطاقة بنكية', 'انستاباي', 'محفظة سوق مصر'];

function makePayment(i: number): Payment {
  const type = pickWeighted<PaymentType>([
    ['boost', 35],
    ['featured', 20],
    ['subscription', 15],
    ['topup', 25],
    ['refund', 5],
  ]);
  const [min, max] = TYPE_AMOUNT[type];
  const user = pick(users);
  return {
    id: `pay-${i}`,
    userId: user.id,
    userName: user.name,
    amount: intBetween(min, max),
    type,
    status: pickWeighted(STATUS_WEIGHTS),
    method: pick(METHODS),
    createdAt: daysAgo(intBetween(0, 90)),
    category: pick(topLevelCategories).name,
    location: pick(governorates).name,
  };
}

export const payments: Payment[] = Array.from({ length: 140 }, (_, i) => makePayment(i + 1));

export default payments;
