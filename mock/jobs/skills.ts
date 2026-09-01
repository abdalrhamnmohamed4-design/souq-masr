/**
 * mock/jobs/skills.ts — مهارات مرجعية (PART 7) للاختيار السريع في بناء
 * الملف المهني — المستخدم يقدر يضيف مهارة مخصصة برضه (مش قايمة مغلقة).
 */
import type { Skill } from './types';

let sid = 1;
const tech = (name: string): Skill => ({ id: `sk-${sid++}`, name, category: 'technical' });
const soft = (name: string): Skill => ({ id: `sk-${sid++}`, name, category: 'soft' });

export const skills: Skill[] = [
  tech('Microsoft Excel'), tech('Advanced Excel'), tech('Power BI'), tech('SQL'), tech('Python'),
  tech('Photoshop'), tech('AutoCAD'), tech('SAP'), tech('Oracle'), tech('أنظمة ERP'),
  tech('JavaScript'), tech('React'), tech('Node.js'), tech('Java'), tech('Figma'),
  soft('التواصل'), soft('القيادة'), soft('العمل الجماعي'), soft('حل المشكلات'),
  soft('إدارة الوقت'), soft('التفاوض'),
];

export function getSkillsByCategory(category: 'technical' | 'soft') {
  return skills.filter((s) => s.category === category);
}
