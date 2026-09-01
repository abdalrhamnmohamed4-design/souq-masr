import type { MarketplaceUser, UserStatus } from '@/types';
import { getGovernorates } from './taxonomy/locations';
import { daysAgo, initialsOf, intBetween, pick, pickWeighted, randomName, randomPhone, resetSeed } from './utils';

resetSeed(101);

const governorates = getGovernorates();

const STATUS_WEIGHTS: [UserStatus, number][] = [
  ['active', 88],
  ['suspended', 7],
  ['banned', 5],
];

function makeUser(i: number): MarketplaceUser {
  const name = randomName();
  const status = pickWeighted(STATUS_WEIGHTS);
  const reportsAgainst = status === 'banned' ? intBetween(3, 9) : status === 'suspended' ? intBetween(1, 4) : intBetween(0, 2);
  const adsCount = intBetween(0, 40);
  return {
    id: `u-${i}`,
    name,
    phone: randomPhone(),
    email: `user${i}@mail.com`,
    city: pick(governorates).name,
    joinedAt: daysAgo(intBetween(3, 720)),
    lastActiveAt: daysAgo(intBetween(0, 30)),
    adsCount,
    viewsTotal: adsCount * intBetween(20, 400),
    reportsAgainst,
    verified: intBetween(0, 100) > 55,
    status,
    riskScore: Math.min(100, reportsAgainst * 14 + (status === 'banned' ? 30 : 0) + intBetween(0, 15)),
  };
}

export const users: MarketplaceUser[] = Array.from({ length: 64 }, (_, i) => makeUser(i + 1));

export function userLabel(id: string): string {
  return users.find((u) => u.id === id)?.name ?? id;
}

export function userInitials(id: string): string {
  const u = users.find((u) => u.id === id);
  return u ? initialsOf(u.name) : '؟؟';
}

export default users;
