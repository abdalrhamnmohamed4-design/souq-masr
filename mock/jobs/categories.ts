/**
 * mock/jobs/categories.ts — تصنيفات الوظائف والمهن (PART 24) — منفصلة
 * تمامًا عن mock/taxonomy (تصنيفات السوق العام: عربيات/عقارات...).
 */
import type { JobCategory, Profession } from './types';

export const jobCategories: JobCategory[] = [
  { id: 'jc-accounting', parentId: null, name: 'المحاسبة والمالية', nameEn: 'Accounting & Finance', icon: 'wallet', order: 1 },
  { id: 'jc-sales', parentId: null, name: 'المبيعات', nameEn: 'Sales', icon: 'rocket', order: 2 },
  { id: 'jc-marketing', parentId: null, name: 'التسويق', nameEn: 'Marketing', icon: 'flame', order: 3 },
  { id: 'jc-tech', parentId: null, name: 'التكنولوجيا والبرمجة', nameEn: 'Technology', icon: 'laptop', order: 4 },
  { id: 'jc-engineering', parentId: null, name: 'الهندسة', nameEn: 'Engineering', icon: 'tool', order: 5 },
  { id: 'jc-admin', parentId: null, name: 'الإدارة', nameEn: 'Administration', icon: 'office', order: 6 },
  { id: 'jc-hr', parentId: null, name: 'الموارد البشرية', nameEn: 'Human Resources', icon: 'user', order: 7 },
  { id: 'jc-support', parentId: null, name: 'خدمة العملاء', nameEn: 'Customer Service', icon: 'chat', order: 8 },
  { id: 'jc-medical', parentId: null, name: 'الطب والرعاية الصحية', nameEn: 'Medical', icon: 'shield', order: 9 },
  { id: 'jc-education', parentId: null, name: 'التعليم', nameEn: 'Education', icon: 'book', order: 10 },
  { id: 'jc-hospitality', parentId: null, name: 'الفنادق والضيافة', nameEn: 'Hospitality', icon: 'star', order: 11 },
  { id: 'jc-logistics', parentId: null, name: 'اللوجستيات والنقل', nameEn: 'Logistics', icon: 'car', order: 12 },
  { id: 'jc-legal', parentId: null, name: 'القانون', nameEn: 'Legal', icon: 'doc', order: 13 },
  { id: 'jc-media', parentId: null, name: 'الإعلام والإبداع', nameEn: 'Media & Creative', icon: 'cam', order: 14 },
];

let pid = 1;
const p = (categoryId: string, name: string, nameEn: string): Profession => ({ id: `pr-${pid++}`, categoryId, name, nameEn });

export const professions: Profession[] = [
  // المحاسبة والمالية
  p('jc-accounting', 'محاسب', 'Accountant'),
  p('jc-accounting', 'محاسب أول', 'Senior Accountant'),
  p('jc-accounting', 'محاسب عام', 'General Accountant'),
  p('jc-accounting', 'محاسب تكاليف', 'Cost Accountant'),
  p('jc-accounting', 'محاسب مالي', 'Financial Accountant'),
  p('jc-accounting', 'مراجع حسابات', 'Auditor'),
  p('jc-accounting', 'مراجع داخلي', 'Internal Auditor'),
  p('jc-accounting', 'محلل مالي', 'Financial Analyst'),
  p('jc-accounting', 'خزينة', 'Treasury'),
  p('jc-accounting', 'حسابات دائنة', 'Accounts Payable'),
  p('jc-accounting', 'حسابات مدينة', 'Accounts Receivable'),
  p('jc-accounting', 'مرتبات', 'Payroll'),
  p('jc-accounting', 'ضرائب', 'Tax'),
  p('jc-accounting', 'كبير محاسبين', 'Chief Accountant'),
  p('jc-accounting', 'مدير مالي', 'Finance Manager'),

  // المبيعات
  p('jc-sales', 'مندوب مبيعات', 'Sales Representative'),
  p('jc-sales', 'أخصائي مبيعات', 'Sales Executive'),
  p('jc-sales', 'مدير مبيعات', 'Sales Manager'),
  p('jc-sales', 'مدير حسابات', 'Account Manager'),
  p('jc-sales', 'تطوير أعمال', 'Business Development'),
  p('jc-sales', 'مبيعات تليفونية', 'Telesales'),
  p('jc-sales', 'مبيعات خارجية', 'Outdoor Sales'),
  p('jc-sales', 'مبيعات داخلية', 'Indoor Sales'),
  p('jc-sales', 'مبيعات عقارية', 'Real Estate Sales'),
  p('jc-sales', 'مندوب مبيعات طبية', 'Medical Sales'),

  // التسويق
  p('jc-marketing', 'أخصائي تسويق', 'Marketing Specialist'),
  p('jc-marketing', 'تسويق رقمي', 'Digital Marketing'),
  p('jc-marketing', 'سوشيال ميديا', 'Social Media'),
  p('jc-marketing', 'SEO', 'SEO'),
  p('jc-marketing', 'صانع محتوى', 'Content Creator'),
  p('jc-marketing', 'كاتب محتوى', 'Copywriter'),
  p('jc-marketing', 'شراء إعلانات', 'Media Buyer'),
  p('jc-marketing', 'مدير علامة تجارية', 'Brand Manager'),
  p('jc-marketing', 'مدير تسويق', 'Marketing Manager'),

  // التكنولوجيا
  p('jc-tech', 'مهندس برمجيات', 'Software Engineer'),
  p('jc-tech', 'مطوّر واجهات أمامية', 'Frontend Developer'),
  p('jc-tech', 'مطوّر باك إند', 'Backend Developer'),
  p('jc-tech', 'مطوّر Full Stack', 'Full Stack Developer'),
  p('jc-tech', 'مطوّر موبايل', 'Mobile Developer'),
  p('jc-tech', 'مطوّر Flutter', 'Flutter Developer'),
  p('jc-tech', 'مطوّر React', 'React Developer'),
  p('jc-tech', 'مصمم UI/UX', 'UI/UX Designer'),
  p('jc-tech', 'مهندس اختبار جودة', 'QA Engineer'),
  p('jc-tech', 'DevOps', 'DevOps'),
  p('jc-tech', 'محلل بيانات', 'Data Analyst'),
  p('jc-tech', 'عالم بيانات', 'Data Scientist'),
  p('jc-tech', 'أمن معلومات', 'Cybersecurity'),

  // الهندسة
  p('jc-engineering', 'مهندس مدني', 'Civil Engineer'),
  p('jc-engineering', 'مهندس ميكانيكا', 'Mechanical Engineer'),
  p('jc-engineering', 'مهندس كهرباء', 'Electrical Engineer'),
  p('jc-engineering', 'معماري', 'Architecture'),
  p('jc-engineering', 'مهندس صناعي', 'Industrial Engineer'),
  p('jc-engineering', 'مهندس صيانة', 'Maintenance Engineer'),

  // الإدارة
  p('jc-admin', 'مساعد إداري', 'Administrative Assistant'),
  p('jc-admin', 'مدير مكتب', 'Office Manager'),
  p('jc-admin', 'إدخال بيانات', 'Data Entry'),
  p('jc-admin', 'موظف استقبال', 'Receptionist'),
  p('jc-admin', 'سكرتير', 'Secretary'),
  p('jc-admin', 'مساعد موارد بشرية', 'HR Assistant'),

  // الموارد البشرية
  p('jc-hr', 'أخصائي موارد بشرية', 'HR Specialist'),
  p('jc-hr', 'توظيف', 'Recruitment'),
  p('jc-hr', 'استقطاب المواهب', 'Talent Acquisition'),
  p('jc-hr', 'مرتبات', 'Payroll'),
  p('jc-hr', 'مدير موارد بشرية', 'HR Manager'),

  // خدمة العملاء
  p('jc-support', 'خدمة عملاء', 'Customer Service'),
  p('jc-support', 'كول سنتر', 'Call Center'),
  p('jc-support', 'دعم فني', 'Technical Support'),
  p('jc-support', 'نجاح العملاء', 'Customer Success'),

  // الطب
  p('jc-medical', 'طبيب', 'Doctor'),
  p('jc-medical', 'طبيب أسنان', 'Dentist'),
  p('jc-medical', 'تمريض', 'Nurse'),
  p('jc-medical', 'صيدلي', 'Pharmacist'),
  p('jc-medical', 'مندوب طبي', 'Medical Representative'),
  p('jc-medical', 'فني معمل', 'Lab Technician'),
  p('jc-medical', 'علاج طبيعي', 'Physiotherapist'),

  // التعليم
  p('jc-education', 'مدرّس', 'Teacher'),
  p('jc-education', 'مدرّس إنجليزي', 'English Teacher'),
  p('jc-education', 'مدرّس رياضيات', 'Math Teacher'),
  p('jc-education', 'مدرّس علوم', 'Science Teacher'),
  p('jc-education', 'مدرّس جامعي', 'University Instructor'),
  p('jc-education', 'مدرّس خصوصي', 'Private Tutor'),

  // الفنادق والضيافة
  p('jc-hospitality', 'شيف', 'Chef'),
  p('jc-hospitality', 'جرسون', 'Waiter'),
  p('jc-hospitality', 'موظف استقبال فندقي', 'Receptionist'),
  p('jc-hospitality', 'مدير فندق', 'Hotel Manager'),
  p('jc-hospitality', 'تدبير منزلي', 'Housekeeping'),
  p('jc-hospitality', 'باريستا', 'Barista'),

  // اللوجستيات
  p('jc-logistics', 'سائق', 'Driver'),
  p('jc-logistics', 'توصيل', 'Delivery'),
  p('jc-logistics', 'مخازن', 'Warehouse'),
  p('jc-logistics', 'منسّق لوجستيات', 'Logistics Coordinator'),
  p('jc-logistics', 'سلسلة إمداد', 'Supply Chain'),
  p('jc-logistics', 'مشتريات', 'Procurement'),

  // القانون
  p('jc-legal', 'محامي', 'Lawyer'),
  p('jc-legal', 'باحث قانوني', 'Legal Researcher'),
  p('jc-legal', 'مساعد قانوني', 'Legal Assistant'),

  // الإعلام والإبداع
  p('jc-media', 'مصوّر فوتوغرافي', 'Photographer'),
  p('jc-media', 'مصوّر فيديو', 'Videographer'),
  p('jc-media', 'مصمم جرافيك', 'Graphic Designer'),
  p('jc-media', 'مونتير فيديو', 'Video Editor'),
  p('jc-media', 'أنيميتور', 'Animator'),
  p('jc-media', 'صانع محتوى', 'Content Creator'),
];

export function getJobCategories() {
  return jobCategories.sort((a, b) => a.order - b.order);
}
export function getJobCategory(id: string) {
  return jobCategories.find((c) => c.id === id);
}
export function getProfessionsForCategory(categoryId: string) {
  return professions.filter((p) => p.categoryId === categoryId);
}
export function getProfession(id: string) {
  return professions.find((p) => p.id === id);
}
