import { Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AdminUsersPage } from '@/pages/AdminUsers';
import { AnalyticsPage } from '@/pages/Analytics';
import { BannersPage } from '@/pages/Banners';
import { BoostPage } from '@/pages/Boost';
import { BrandsPage } from '@/pages/Brands';
import { BusinessesPage } from '@/pages/Businesses';
import { CategoriesPage } from '@/pages/Categories';
import { ChatsPage } from '@/pages/Chats';
import { Dashboard } from '@/pages/Dashboard';
import { JobCategoriesPage } from '@/pages/JobCategories';
import { JobCompaniesPage } from '@/pages/JobCompanies';
import { JobsAdminPage } from '@/pages/JobsAdmin';
import { ListingsPage } from '@/pages/Listings';
import { LocationsPage } from '@/pages/Locations';
import { NotificationsPage } from '@/pages/Notifications';
import { PaymentsPage } from '@/pages/Payments';
import { PaymentNumbersPage } from '@/pages/PaymentNumbers';
import { ProfessionalsAdminPage } from '@/pages/ProfessionalsAdmin';
import { PromoCodesPage } from '@/pages/PromoCodes';
import { ReportsPage } from '@/pages/Reports';
import { ServiceCategoriesPage } from '@/pages/ServiceCategories';
import { SettingsPage } from '@/pages/Settings';
import { SkillsPage } from '@/pages/Skills';
import { UsersPage } from '@/pages/Users';

export default function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/listings" element={<ListingsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/chats" element={<ChatsPage />} />
        <Route path="/boost" element={<BoostPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/payment-numbers" element={<PaymentNumbersPage />} />
        <Route path="/businesses" element={<BusinessesPage />} />
        <Route path="/promocodes" element={<PromoCodesPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/brands" element={<BrandsPage />} />
        <Route path="/locations" element={<LocationsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/banners" element={<BannersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin-users" element={<AdminUsersPage />} />
        <Route path="/jobs-admin" element={<JobsAdminPage />} />
        <Route path="/job-companies" element={<JobCompaniesPage />} />
        <Route path="/professionals-admin" element={<ProfessionalsAdminPage />} />
        <Route path="/job-categories" element={<JobCategoriesPage />} />
        <Route path="/service-categories" element={<ServiceCategoriesPage />} />
        <Route path="/jobs-skills" element={<SkillsPage />} />
      </Route>
    </Routes>
  );
}
