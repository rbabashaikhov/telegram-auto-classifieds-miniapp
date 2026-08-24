import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from './components/Chrome';
import { DemoChrome } from './demo-tour/DemoChrome';
import { isSalesDemoAdminPath } from './demo-tour/eligibility';
import { useDemoTour } from './demo-tour/context';
import { HomePage } from './pages/HomePage';
import { QualifyPage } from './pages/QualifyPage';
import { MatchesPage } from './pages/MatchesPage';
import { PropertyPage } from './pages/PropertyPage';
import { ViewingPage } from './pages/ViewingPage';
import { MePage, PrivacyPage } from './pages/MePage';
import { SellPage } from './pages/SellPage';
import {
  AdminAnalyticsPage,
  AdminLeadPage,
  AdminLeadsPage,
  AdminPage,
  AdminPropertiesPage,
  AdminSellersPage,
  AdminViewingsPage,
} from './pages/AdminPage';

export default function App() {
  const location = useLocation();
  const isAdmin = isSalesDemoAdminPath(location.pathname);
  const tour = useDemoTour();

  return (
    <div className={isAdmin ? undefined : 'app-shell'}>
      {tour.showChrome && (
        <DemoChrome
          showTour={tour.demoTourEnabled}
          showAdmin={tour.demoAdminPreviewEnabled}
          onStartTour={tour.start}
        />
      )}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/qualify" element={<QualifyPage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/properties/:id" element={<PropertyPage />} />
        <Route path="/properties/:id/viewing" element={<ViewingPage />} />
        <Route path="/me" element={<MePage />} />
        <Route path="/favorites" element={<MePage />} />
        <Route path="/sell" element={<SellPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/demo/admin" element={<AdminPage readOnly />} />
        <Route path="/demo/admin/leads" element={<AdminLeadsPage readOnly />} />
        <Route path="/demo/admin/leads/:id" element={<AdminLeadPage readOnly />} />
        <Route path="/demo/admin/properties" element={<AdminPropertiesPage readOnly />} />
        <Route path="/demo/admin/viewings" element={<AdminViewingsPage readOnly />} />
        <Route path="/demo/admin/sellers" element={<AdminSellersPage readOnly />} />
        <Route path="/demo/admin/analytics" element={<AdminAnalyticsPage readOnly />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/leads" element={<AdminLeadsPage />} />
        <Route path="/admin/leads/:id" element={<AdminLeadPage />} />
        <Route path="/admin/properties" element={<AdminPropertiesPage />} />
        <Route path="/admin/viewings" element={<AdminViewingsPage />} />
        <Route path="/admin/sellers" element={<AdminSellersPage />} />
        <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isAdmin && <BottomNav />}
    </div>
  );
}
