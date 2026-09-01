import { ROLE_SECTION_ACCESS } from '@/mock/adminAccounts';
import type { AdminRole } from '@/types';

export function canAccess(role: AdminRole, sectionKey: string): boolean {
  const allowed = ROLE_SECTION_ACCESS[role];
  return allowed.includes('*') || allowed.includes(sectionKey);
}
