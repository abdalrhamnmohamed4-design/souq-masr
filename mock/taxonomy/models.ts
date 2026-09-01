/**
 * mock/taxonomy/models.ts — موديلات لكل براند. عمق كامل لسيناريوهات
 * الاختبار (Apple/iPhone الكاملة، Samsung، Toyota/Hyundai/Kia/BMW/
 * Mercedes بالظبط زي المواصفة) — باقي البراندات بموديلات أساسية واقعية،
 * وقابلة للتوسيع من الأدمن.
 */
import type { Model } from './types';

let n = 1;
const m = (brandId: string, name: string): Model => ({ id: `md-${n++}`, brandId, name });

export const models: Model[] = [
  // ============ Apple — iPhone (القائمة كاملة من المواصفة) ============
  ...[
    'iPhone 6', 'iPhone 6 Plus', 'iPhone 6s', 'iPhone 6s Plus', 'iPhone 7', 'iPhone 7 Plus',
    'iPhone 8', 'iPhone 8 Plus', 'iPhone X', 'iPhone XR', 'iPhone XS', 'iPhone XS Max',
    'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max', 'iPhone SE', 'iPhone 12', 'iPhone 12 mini',
    'iPhone 12 Pro', 'iPhone 12 Pro Max', 'iPhone 13', 'iPhone 13 mini', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
    'iPhone SE 2', 'iPhone SE 3', 'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
    'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max', 'iPhone 16', 'iPhone 16 Plus',
    'iPhone 16 Pro', 'iPhone 16 Pro Max', 'iPhone 16e', 'iPhone 17', 'iPhone 17 Air', 'iPhone 17 Pro',
    'iPhone 17 Pro Max', 'أخرى',
  ].map((name) => m('phone-apple', name)),
  // Apple ⊂ تابلت ولابتوب برضه (نفس البراند PART 27)
  ...['iPad', 'iPad mini', 'iPad Air', 'iPad Pro 11"', 'iPad Pro 13"'].map((name) => m('phone-apple', name)),
  ...['MacBook Air M2', 'MacBook Air M3', 'MacBook Pro 14"', 'MacBook Pro 16"', 'MacBook (Intel قديم)'].map((name) => m('phone-apple', name)),

  // ============ Samsung ============
  ...['Galaxy S22', 'Galaxy S22 Ultra', 'Galaxy S23', 'Galaxy S23 Ultra', 'Galaxy S24', 'Galaxy S24 Ultra',
    'Galaxy S25', 'Galaxy S25 Ultra', 'Galaxy Note 20', 'Galaxy Note 20 Ultra', 'Galaxy Z Fold5',
    'Galaxy Z Fold6', 'Galaxy Z Flip5', 'Galaxy Z Flip6', 'Galaxy A54', 'Galaxy A55', 'Galaxy A14',
    'Galaxy A34', 'Galaxy M54', 'Galaxy M34', 'أخرى',
  ].map((name) => m('phone-samsung', name)),

  // ============ Xiaomi / Redmi / Poco ============
  ...['Xiaomi 13', 'Xiaomi 14', 'Xiaomi 13T', 'Xiaomi 14T', 'أخرى'].map((name) => m('phone-xiaomi', name)),
  ...['Redmi Note 12', 'Redmi Note 13', 'Redmi 12', 'Redmi 13C', 'أخرى'].map((name) => m('phone-redmi', name)),
  ...['Poco X6', 'Poco F6', 'Poco M6', 'أخرى'].map((name) => m('phone-poco', name)),

  // ============ Toyota (المواصفة بالظبط) ============
  ...['Corolla', 'Camry', 'Yaris', 'RAV4', 'Fortuner', 'Land Cruiser', 'Hilux', 'Rush', 'أخرى'].map((name) => m('car-toyota', name)),
  // ============ Hyundai (المواصفة بالظبط) ============
  ...['Elantra', 'Tucson', 'Accent', 'Creta', 'i10', 'i20', 'Sonata', 'Santa Fe', 'H-1', 'أخرى'].map((name) => m('car-hyundai', name)),
  // ============ Kia (المواصفة بالظبط) ============
  ...['Sportage', 'Cerato', 'Rio', 'Sorento', 'Picanto', 'Carens', 'K5', 'أخرى'].map((name) => m('car-kia', name)),
  // ============ BMW (المواصفة بالظبط) ============
  ...['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '7 Series', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'iX', 'i4', 'i5', 'i7', 'أخرى'].map((name) => m('car-bmw', name)),
  // ============ Mercedes-Benz (المواصفة بالظبط) ============
  ...['A-Class', 'B-Class', 'C-Class', 'E-Class', 'S-Class', 'CLA', 'CLS', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'G-Class', 'أخرى'].map((name) => m('car-mercedes', name)),

  // ============ باقي البراندات الشائعة — موديلات أساسية ============
  ...['Sunny', 'Sentra', 'Qashqai', 'X-Trail', 'Patrol', 'أخرى'].map((name) => m('car-nissan', name)),
  ...['Logan', 'Sandero', 'Duster', 'Megane', 'أخرى'].map((name) => m('car-renault', name)),
  ...['301', '2008', '3008', '508', 'أخرى'].map((name) => m('car-peugeot', name)),
  ...['Tipo', '500', 'Punto', 'أخرى'].map((name) => m('car-fiat', name)),
  ...['Golf', 'Passat', 'Tiguan', 'Jetta', 'أخرى'].map((name) => m('car-volkswagen', name)),
  ...['Optra', 'Cruze', 'Spark', 'Captiva', 'أخرى'].map((name) => m('car-chevrolet', name)),
  ...['Civic', 'Accord', 'CR-V', 'أخرى'].map((name) => m('car-honda', name)),

  // ============ لابتوب — موديلات عامة تمثيلية ============
  ...['XPS 13', 'XPS 15', 'Inspiron 15', 'Latitude', 'أخرى'].map((name) => m('laptop-dell', name)),
  ...['Pavilion', 'EliteBook', 'Omen', 'ProBook', 'أخرى'].map((name) => m('laptop-hp', name)),
  ...['ThinkPad', 'IdeaPad', 'Legion', 'Yoga', 'أخرى'].map((name) => m('laptop-lenovo', name)),
  ...['ROG', 'ZenBook', 'VivoBook', 'TUF', 'أخرى'].map((name) => m('laptop-asus', name)),
];

export function getModelsForBrand(brandId: string) {
  return models.filter((mo) => mo.brandId === brandId);
}
export function getModel(id: string) {
  return models.find((mo) => mo.id === id);
}

export default models;
