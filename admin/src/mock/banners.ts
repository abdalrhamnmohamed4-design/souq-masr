import type { Banner } from '@/types';

export const banners: Banner[] = [
  { id: 'b-1', placement: 'home', title: 'وثّق حسابك', subtitle: 'علامة موثّق + ترتيب أعلى لإعلاناتك', ctaLabel: 'ابدأ التوثيق', colorFrom: '#0F1A2E', colorTo: '#22375C', active: true },
  { id: 'b-2', placement: 'home', title: 'ميّز إعلانك', subtitle: 'يوصل لضعف عدد المشترين تقريبًا', ctaLabel: 'شوف الباقات', colorFrom: '#0F1A2E', colorTo: '#22375C', active: true },
  { id: 'b-3', placement: 'popup', title: 'خصم 50% على التمييز', subtitle: 'العرض لفترة محدودة', ctaLabel: 'استخدم العرض', colorFrom: '#F4511E', colorTo: '#D93F10', active: true },
  { id: 'b-4', placement: 'category', title: 'موسم العربيات', subtitle: 'أفضل عروض السيارات المستعملة', ctaLabel: 'تصفح دلوقتي', colorFrom: '#2E4A70', colorTo: '#4E7A93', active: false },
  { id: 'b-5', placement: 'sponsored', title: 'معرض النور للسيارات', subtitle: 'إعلان ممول', ctaLabel: 'زور المتجر', colorFrom: '#8A6300', colorTo: '#E0A106', active: true },
];

export default banners;
