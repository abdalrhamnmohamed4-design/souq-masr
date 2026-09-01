import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CircleDollarSign,
  GraduationCap,
  HardHat,
  Image,
  LayoutDashboard,
  MapPin,
  MessageSquareWarning,
  Package,
  Rocket,
  Settings as SettingsIcon,
  Shield,
  Tag,
  Ticket,
  Users,
  Wallet,
  FolderTree,
  Flag,
} from 'lucide-react';

export type NavItem = {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    title: 'نظرة عامة',
    items: [
      { key: 'dashboard', label: 'الرئيسية', path: '/', icon: LayoutDashboard },
      { key: 'analytics', label: 'التحليلات', path: '/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'السوق',
    items: [
      { key: 'users', label: 'المستخدمون', path: '/users', icon: Users },
      { key: 'listings', label: 'الإعلانات', path: '/listings', icon: Package },
      { key: 'reports', label: 'البلاغات', path: '/reports', icon: Flag },
      { key: 'chats', label: 'مراقبة المحادثات', path: '/chats', icon: MessageSquareWarning },
    ],
  },
  {
    title: 'الأموال',
    items: [
      { key: 'boost', label: 'الإعلانات المدفوعة', path: '/boost', icon: Rocket },
      { key: 'payments', label: 'المدفوعات والإيرادات', path: '/payments', icon: Wallet },
      { key: 'paymentnumbers', label: 'أرقام الدفع', path: '/payment-numbers', icon: CircleDollarSign },
      { key: 'businesses', label: 'الحسابات التجارية', path: '/businesses', icon: Building2 },
      { key: 'promocodes', label: 'أكواد الخصم', path: '/promocodes', icon: Ticket },
    ],
  },
  {
    title: 'الوظائف والمهن',
    items: [
      { key: 'jobsadmin', label: 'الوظائف والتقديمات', path: '/jobs-admin', icon: Briefcase },
      { key: 'jobcompanies', label: 'الشركات (الوظائف)', path: '/job-companies', icon: Building2 },
      { key: 'professionalsadmin', label: 'المحترفون والخدمات', path: '/professionals-admin', icon: HardHat },
      { key: 'jobcategories', label: 'تصنيفات الوظائف', path: '/job-categories', icon: GraduationCap },
      { key: 'servicecategories', label: 'تصنيفات المهن والخدمات', path: '/service-categories', icon: HardHat },
      { key: 'jobsskills', label: 'المهارات', path: '/jobs-skills', icon: Tag },
    ],
  },
  {
    title: 'المحتوى',
    items: [
      { key: 'categories', label: 'الأقسام', path: '/categories', icon: FolderTree },
      { key: 'brands', label: 'البراندات والموديلات', path: '/brands', icon: Tag },
      { key: 'locations', label: 'المواقع', path: '/locations', icon: MapPin },
      { key: 'notifications', label: 'الإشعارات', path: '/notifications', icon: Bell },
      { key: 'banners', label: 'البانرات', path: '/banners', icon: Image },
    ],
  },
  {
    title: 'النظام',
    items: [
      { key: 'settings', label: 'الإعدادات', path: '/settings', icon: SettingsIcon },
      { key: 'adminusers', label: 'المشرفون والصلاحيات', path: '/admin-users', icon: Shield },
    ],
  },
];

export const allNavItems = navGroups.flatMap((g) => g.items);
