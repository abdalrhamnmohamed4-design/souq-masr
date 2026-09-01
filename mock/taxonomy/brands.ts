/**
 * mock/taxonomy/brands.ts — نفس البراند ممكن ينتمي لأكتر من تصنيف
 * (PART 27: Apple ⊂ موبايلات + تابلت + لابتوب) — مفيش تكرار.
 */
import type { Brand } from './types';

const car = (id: string, name: string): Brand => ({ id: `car-${id}`, name, categoryIds: ['cars'] });
const bike = (id: string, name: string): Brand => ({ id: `bike-${id}`, name, categoryIds: ['motorcycles'] });
const phone = (id: string, name: string): Brand => ({ id: `phone-${id}`, name, categoryIds: ['mobiles'] });
const laptop = (id: string, name: string): Brand => ({ id: `laptop-${id}`, name, categoryIds: ['laptops'] });
const appliance = (id: string, name: string, cats: string[]): Brand => ({ id: `app-${id}`, name, categoryIds: cats });

export const brands: Brand[] = [
  // ---- سيارات (PART 1 — القائمة كاملة) ----
  car('toyota', 'Toyota'), car('hyundai', 'Hyundai'), car('kia', 'Kia'), car('chevrolet', 'Chevrolet'),
  car('nissan', 'Nissan'), car('renault', 'Renault'), car('peugeot', 'Peugeot'), car('citroen', 'Citroën'),
  car('fiat', 'Fiat'), car('volkswagen', 'Volkswagen'), car('skoda', 'Skoda'), car('mg', 'MG'),
  car('chery', 'Chery'), car('geely', 'Geely'), car('byd', 'BYD'), car('jetour', 'Jetour'),
  car('haval', 'Haval'), car('mitsubishi', 'Mitsubishi'), car('honda', 'Honda'), car('mazda', 'Mazda'),
  car('suzuki', 'Suzuki'), car('subaru', 'Subaru'), car('ford', 'Ford'), car('jeep', 'Jeep'),
  car('dodge', 'Dodge'), car('ram', 'RAM'), car('bmw', 'BMW'), car('mercedes', 'Mercedes-Benz'),
  car('audi', 'Audi'), car('porsche', 'Porsche'), car('volvo', 'Volvo'), car('lexus', 'Lexus'),
  car('jaguar', 'Jaguar'), car('landrover', 'Land Rover'), car('tesla', 'Tesla'), car('maserati', 'Maserati'),
  car('ferrari', 'Ferrari'), car('lamborghini', 'Lamborghini'), car('bentley', 'Bentley'),
  car('rollsroyce', 'Rolls-Royce'), car('astonmartin', 'Aston Martin'), car('mclaren', 'McLaren'),
  car('genesis', 'Genesis'), car('cupra', 'Cupra'), { id: 'car-other', name: 'أخرى', categoryIds: ['cars'] },

  // ---- دراجات نارية ----
  bike('honda', 'Honda'), bike('yamaha', 'Yamaha'), bike('bajaj', 'Bajaj'), bike('vespa', 'Vespa'),
  bike('ktm', 'KTM'), bike('kawasaki', 'Kawasaki'), bike('other', 'أخرى'),

  // ---- موبايلات (PART 2) ----
  { id: 'phone-apple', name: 'Apple', categoryIds: ['mobiles', 'tablets', 'laptops'] },
  phone('samsung', 'Samsung'), phone('xiaomi', 'Xiaomi'), phone('redmi', 'Redmi'), phone('poco', 'Poco'),
  phone('oppo', 'Oppo'), phone('realme', 'Realme'), phone('oneplus', 'OnePlus'), phone('huawei', 'Huawei'),
  phone('honor', 'Honor'), phone('vivo', 'Vivo'), phone('infinix', 'Infinix'), phone('tecno', 'Tecno'),
  phone('nokia', 'Nokia'), phone('motorola', 'Motorola'), phone('sony', 'Sony'), phone('googlepixel', 'Google Pixel'),
  phone('asus', 'Asus'), phone('zte', 'ZTE'), phone('nothing', 'Nothing'), phone('lenovo', 'Lenovo'),
  { id: 'phone-other', name: 'أخرى', categoryIds: ['mobiles'] },

  // ---- لابتوب (Apple موجودة فوق وبتشمل اللابتوبات كمان) ----
  laptop('dell', 'Dell'), laptop('hp', 'HP'), laptop('lenovo', 'Lenovo'), laptop('asus', 'Asus'),
  laptop('acer', 'Acer'), laptop('msi', 'MSI'), laptop('microsoft', 'Microsoft'), laptop('huawei', 'Huawei'),
  laptop('samsung', 'Samsung'), laptop('razer', 'Razer'), laptop('gigabyte', 'Gigabyte'), { id: 'laptop-other', name: 'أخرى', categoryIds: ['laptops'] },

  // ---- تلفزيونات / أجهزة منزلية ----
  appliance('samsung-tv', 'Samsung', ['tvs']), appliance('lg', 'LG', ['tvs', 'ac', 'refrigerators', 'washing_machines']),
  appliance('sony-tv', 'Sony', ['tvs']), appliance('tcl', 'TCL', ['tvs']), appliance('hisense', 'Hisense', ['tvs']),
  appliance('philips', 'Philips', ['tvs']),
  appliance('sharp', 'Sharp', ['ac', 'refrigerators']), appliance('carrier', 'Carrier', ['ac']),
  appliance('fresh', 'Fresh', ['ac', 'refrigerators', 'washing_machines']), appliance('toshiba', 'Toshiba', ['refrigerators', 'washing_machines']),
  appliance('bosch', 'Bosch', ['washing_machines']), appliance('miele', 'Miele', ['washing_machines']),
];

export function getBrandsForCategory(categoryId: string) {
  return brands.filter((b) => b.categoryIds.includes(categoryId));
}
export function getBrand(id: string) {
  return brands.find((b) => b.id === id);
}

export default brands;
