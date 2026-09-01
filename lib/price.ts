/**
 * lib/price.ts — عرض سعر موحّد لكل بطاقات/تفاصيل الإعلان. قبل كده priceType
 * (مجاني/تواصل للسعر/قابل للتفاوض) كان بيتحفظ في postDraft بس بيضيع وقت
 * النشر، فإعلان "مجاني" أو "تواصل للسعر" كان بيظهر "٠ ج.م" في كل مكان —
 * القيمة الحقيقية بقت متسجّلة على الـListing نفسه (mock/listings.ts)،
 * ودالة واحدة هنا بتترجمها بدل ما كل بطاقة تكرر نفس الشرط.
 *
 * دالة برّه أي كومبوننت (زي t() العادية) — بتقرأ اللغة الحالية من
 * store/useLanguageStore.ts مباشرة، فمش hook ومش محتاجة useT().
 */
import { t } from '@/i18n';
import type { Listing } from '@/mock/listings';

export type FormattedPrice = { text: string; isPlaceholder: boolean };

export function formatListingPrice(listing: Pick<Listing, 'price' | 'priceType' | 'priceSuffix'>): FormattedPrice {
  if (listing.priceType === 'free') return { text: t('common.free'), isPlaceholder: true };
  if (listing.priceType === 'contact') return { text: t('common.contactForPrice'), isPlaceholder: true };
  const amount = `${listing.price.toLocaleString('en-US')} ${t('common.currency')}${listing.priceSuffix ? `/${listing.priceSuffix}` : ''}`;
  return { text: amount, isPlaceholder: false };
}
