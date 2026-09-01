import type { Report, ReportStatus, ReportType } from '@/types';
import { listings } from './listings';
import { daysAgo, intBetween, pick, pickWeighted, randomName, resetSeed } from './utils';
import { users } from './users';

resetSeed(303);

const TYPES: ReportType[] = [
  'scam', 'fake_listing', 'fake_price', 'prohibited_item', 'inappropriate_images', 'duplicate', 'spam', 'suspicious_account',
];

const STATUS_WEIGHTS: [ReportStatus, number][] = [
  ['pending', 35],
  ['investigating', 20],
  ['resolved', 35],
  ['dismissed', 10],
];

function makeReport(i: number): Report {
  const targetType = pickWeighted<'listing' | 'user' | 'chat'>([
    ['listing', 60],
    ['user', 30],
    ['chat', 10],
  ]);
  const target = targetType === 'listing' ? pick(listings) : pick(users);
  return {
    id: `r-${i}`,
    type: pick(TYPES),
    targetType,
    targetId: target.id,
    targetLabel: 'title' in target ? target.title : target.name,
    reporterName: randomName(),
    createdAt: daysAgo(intBetween(0, 60)),
    status: pickWeighted(STATUS_WEIGHTS),
  };
}

export const reports: Report[] = Array.from({ length: 42 }, (_, i) => makeReport(i + 1));

export default reports;
