import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from './components/Chrome';
import { useApp } from './context/AppContext';
import { useBusiness } from './context/BusinessContext';
import { DemoChrome } from './demo-tour/DemoChrome';
import { CatalogPage } from './pages/CatalogPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { ListingDetailsPage } from './pages/ListingDetailsPage';
import { ListingAdminDetailsPage, ListingsAdminPage } from './pages/ListingsAdminPage';
import { MyListingDetailsPage, MyListingsPage } from './pages/MyListingsPage';
import { ListingEditorPage } from './pages/ListingEditorPage';
import { DemoPaymentPage } from './pages/DemoPaymentPage';
import { PaymentAdminDetailsPage, PaymentsAdminPage } from './pages/PaymentsAdminPage';

export default function App() {
  const location = useLocation();
  const { isDemo, isTelegram } = useApp();
  const business = useBusiness();
  const isAdmin = location.pathname.startsWith('/admin') || location.pathname.startsWith('/demo/admin');
  const showDemoChrome = isDemo && !isTelegram && business.demoMode && !isAdmin;
  return (
    <div className={isAdmin ? undefined : 'app-shell'}>
      {showDemoChrome && <DemoChrome showTour={false} showAdmin={business.features.demoAdminPreview} onStartTour={() => undefined} />}
      {!isAdmin && <header className="site-header"><Link to="/" className="site-brand"><span>AM</span>{business.appTitle}</Link><nav className="header-links"><Link to="/favorites">♡ Избранное</Link><Link to="/my/listings">Мои объявления</Link></nav></header>}
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/listings/:id" element={<ListingDetailsPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/my/listings" element={<MyListingsPage />} />
        <Route path="/my/listings/new" element={<ListingEditorPage />} />
        <Route path="/my/listings/:id/edit" element={<ListingEditorPage />} />
        <Route path="/my/listings/:id" element={<MyListingDetailsPage />} />
        <Route path="/payments/:id/demo" element={<DemoPaymentPage />} />
        <Route path="/admin" element={<ListingsAdminPage />} />
        <Route path="/admin/listings" element={<ListingsAdminPage />} />
        <Route path="/admin/listings/:id" element={<ListingAdminDetailsPage />} />
        <Route path="/admin/payments" element={<PaymentsAdminPage />} />
        <Route path="/admin/payments/:id" element={<PaymentAdminDetailsPage />} />
        <Route path="/demo/admin" element={<ListingsAdminPage />} />
        <Route path="/demo/admin/listings" element={<ListingsAdminPage />} />
        <Route path="/demo/admin/listings/:id" element={<ListingAdminDetailsPage />} />
        <Route path="/demo/admin/payments" element={<PaymentsAdminPage />} />
        <Route path="/demo/admin/payments/:id" element={<PaymentAdminDetailsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isAdmin && <BottomNav />}
    </div>
  );
}
