/**
 * mock/interests.ts — تفضيلات onboarding (شاشة interests)، نفس تصنيفات
 * mock/taxonomy/categories.ts الرئيسية (مفيش داعي نخترع قائمة تانية).
 */
import { getTopLevel } from './taxonomy/categories';

export const interests = getTopLevel().map((c) => ({ key: c.id, label: c.name, icon: c.icon }));

export default interests;
