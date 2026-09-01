import type { AdminAccount } from '@/types';
import { daysAgo } from './utils';

export const adminAccounts: AdminAccount[] = [
  { id: 'a-1', name: 'عبدالرحمن محمد', email: 'abdalrhamn@souqmasr.app', role: 'super_admin', initials: 'عم', active: true, lastLogin: daysAgo(0) },
  { id: 'a-2', name: 'ياسمين طارق', email: 'yasmin@souqmasr.app', role: 'moderator', initials: 'يط', active: true, lastLogin: daysAgo(0) },
  { id: 'a-3', name: 'كريم فتحي', email: 'karim@souqmasr.app', role: 'finance', initials: 'كف', active: true, lastLogin: daysAgo(1) },
  { id: 'a-4', name: 'نور الهدى', email: 'nour@souqmasr.app', role: 'support', initials: 'نه', active: true, lastLogin: daysAgo(2) },
  { id: 'a-5', name: 'مصطفى جلال', email: 'mostafa@souqmasr.app', role: 'marketing', initials: 'مج', active: false, lastLogin: daysAgo(9) },
];

export const ROLE_LABELS: Record<AdminAccount['role'], string> = {
  super_admin: 'مدير عام',
  moderator: 'مشرف محتوى',
  finance: 'مالية',
  support: 'دعم فني',
  marketing: 'تسويق',
};

// كل قسم في الداشبورد مرتبط بالأدوار المسموح لها تشوفه — Super Admin شايف كل حاجة دايمًا.
export const ROLE_SECTION_ACCESS: Record<AdminAccount['role'], string[]> = {
  super_admin: ['*'],
  moderator: ['dashboard', 'listings', 'reports', 'chats', 'categories', 'brands', 'locations', 'jobsadmin', 'jobcompanies', 'professionalsadmin', 'jobcategories', 'servicecategories', 'jobsskills'],
  finance: ['dashboard', 'payments', 'paymentnumbers', 'boost', 'businesses', 'promocodes'],
  support: ['dashboard', 'users', 'reports', 'chats', 'jobsadmin', 'jobcompanies', 'professionalsadmin'],
  marketing: ['dashboard', 'notifications', 'banners', 'promocodes', 'analytics'],
};

export default adminAccounts;
