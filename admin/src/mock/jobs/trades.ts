/**
 * src/mock/jobs/trades.ts — نسخة الأدمن من تصنيفات المهن والخدمات
 * (مطابقة لمحتوى mock/jobs/trades.ts في الموبايل).
 */
import type { ServiceCategory, Trade } from './types';

export const serviceCategories: ServiceCategory[] = [
  { id: 'sc-construction', parentId: null, name: 'أعمال البناء والتشطيب', nameEn: 'Construction', icon: 'HardHat', order: 1 },
  { id: 'sc-automotive', parentId: null, name: 'خدمات السيارات', nameEn: 'Automotive', icon: 'Car', order: 2 },
  { id: 'sc-home', parentId: null, name: 'خدمات منزلية', nameEn: 'Home Services', icon: 'Home', order: 3 },
  { id: 'sc-personal', parentId: null, name: 'خدمات شخصية', nameEn: 'Personal Services', icon: 'Scissors', order: 4 },
  { id: 'sc-technical', parentId: null, name: 'خدمات فنية', nameEn: 'Technical Services', icon: 'Cpu', order: 5 },
];

let tid = 1;
const t = (categoryId: string, name: string, nameEn: string): Trade => ({ id: `tr-${tid++}`, categoryId, name, nameEn });

export const trades: Trade[] = [
  t('sc-construction', 'سباك', 'Plumber'), t('sc-construction', 'كهربائي', 'Electrician'),
  t('sc-construction', 'نقّاش', 'Painter'), t('sc-construction', 'نجار', 'Carpenter'),
  t('sc-construction', 'بنّاء', 'Mason'), t('sc-construction', 'فني جيبس بورد', 'Gypsum Board'),
  t('sc-construction', 'فني ألوميتال', 'Aluminum Technician'), t('sc-construction', 'فني سيراميك', 'Tile Worker'),
  t('sc-construction', 'فني رخام', 'Marble Worker'), t('sc-construction', 'لحّام', 'Welder'),
  t('sc-construction', 'حداد', 'Metal Worker'),

  t('sc-automotive', 'ميكانيكي', 'Mechanic'), t('sc-automotive', 'كهربائي سيارات', 'Auto Electrician'),
  t('sc-automotive', 'بوّياجي سيارات', 'Car Painter'), t('sc-automotive', 'سمكري', 'Body Repair'),
  t('sc-automotive', 'فني إطارات', 'Tire Technician'), t('sc-automotive', 'فني تكييف سيارات', 'AC Technician'),
  t('sc-automotive', 'ميكانيكي موتوسيكلات', 'Motorcycle Mechanic'),

  t('sc-home', 'تنظيف', 'Cleaning'), t('sc-home', 'نقل عفش', 'Moving'), t('sc-home', 'تركيب أثاث', 'Furniture Assembly'),
  t('sc-home', 'صيانة أجهزة كهربائية', 'Appliance Repair'), t('sc-home', 'تركيب تكييفات', 'AC Installation'),
  t('sc-home', 'صيانة تكييفات', 'AC Maintenance'), t('sc-home', 'مكافحة حشرات', 'Pest Control'), t('sc-home', 'جناين', 'Gardening'),

  t('sc-personal', 'حلاق', 'Barber'), t('sc-personal', 'كوافير', 'Hairdresser'), t('sc-personal', 'مكياج', 'Makeup Artist'),
  t('sc-personal', 'مصوّر', 'Photographer'), t('sc-personal', 'مدرّب شخصي', 'Personal Trainer'),

  t('sc-technical', 'صيانة كمبيوتر', 'Computer Repair'), t('sc-technical', 'صيانة موبايل', 'Mobile Repair'),
  t('sc-technical', 'فني شبكات', 'Network Technician'), t('sc-technical', 'تركيب كاميرات مراقبة', 'CCTV Installation'),
  t('sc-technical', 'فني ستالايت', 'Satellite Technician'),
];

export function getServiceCategories() {
  return [...serviceCategories].sort((a, b) => a.order - b.order);
}
export function getTradesForCategory(categoryId: string) {
  return trades.filter((t) => t.categoryId === categoryId);
}
