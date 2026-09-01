import type { ReportedChat, ReportStatus } from '@/types';
import { listings } from './listings';
import { daysAgo, intBetween, pick, pickWeighted, randomName, resetSeed } from './utils';

resetSeed(606);

const REASONS = [
  'كلمات مشبوهة تدل على نصب', 'طلب تحويل فلوس مقدمًا', 'رابط خارجي مشبوه', 'محاولة بيع خارج التطبيق', 'إزعاج متكرر',
];
const KEYWORDS_POOL = ['حوّل الفلوس الأول', 'واتساب بس', 'رابط الدفع', 'بيانات البطاقة', 'خارج التطبيق'];

const STATUS_WEIGHTS: [ReportStatus, number][] = [
  ['pending', 40],
  ['investigating', 25],
  ['resolved', 30],
  ['dismissed', 5],
];

function makeChat(i: number): ReportedChat {
  return {
    id: `chat-${i}`,
    buyerName: randomName(),
    sellerName: randomName(),
    listingTitle: pick(listings).title,
    reason: pick(REASONS),
    reportedAt: daysAgo(intBetween(0, 40)),
    status: pickWeighted(STATUS_WEIGHTS),
    flaggedKeywords: Array.from({ length: intBetween(1, 3) }, () => pick(KEYWORDS_POOL)),
  };
}

export const reportedChats: ReportedChat[] = Array.from({ length: 16 }, (_, i) => makeChat(i + 1));

export default reportedChats;
