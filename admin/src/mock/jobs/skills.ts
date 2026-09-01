/**
 * src/mock/jobs/skills.ts — نسخة الأدمن من مهارات مرجعية (PART 7/38).
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
