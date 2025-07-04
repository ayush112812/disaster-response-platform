import { Routes, Route, Outlet } from 'react-router-dom';
import Layout from './layouts/Layout';
import HomePage from './pages/HomePage';
import DisastersPage from './pages/DisastersPage';
import DisasterDetailPage from './pages/DisasterDetailPage';
import EditDisasterPage from './pages/EditDisasterPage';
import SocialMediaPage from './pages/SocialMediaPage';
import ResourcesPage from './pages/ResourcesPage';
import NewDisasterPage from './pages/NewDisasterPage';
import NewReportPage from './pages/NewReportPage';
import OfficialUpdatesPage from './pages/OfficialUpdatesPage';
import RealTimeDashboard from './pages/RealTimeDashboard';
import DataIngestionPage from './pages/DataIngestionPage';
import Geocoding from './pages/Geocoding';
import DisasterDetails from './pages/DisasterDetails';
import FeatureTestPage from './pages/FeatureTestPage';


function LayoutWrapper() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<LayoutWrapper />}>
        <Route path="/" element={<HomePage />} />
        <Route path="disasters" element={<DisastersPage />} />
        <Route path="disasters/new" element={<NewDisasterPage />} />
        <Route path="disasters/:id" element={<DisasterDetailPage />} />
        <Route path="disasters/:id/edit" element={<EditDisasterPage />} />
        <Route path="social-media" element={<SocialMediaPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="official-updates" element={<OfficialUpdatesPage />} />
        <Route path="realtime-dashboard" element={<RealTimeDashboard />} />
        <Route path="data-ingestion" element={<DataIngestionPage />} />
        <Route path="geocoding" element={<Geocoding />} />
        <Route path="test-features" element={<FeatureTestPage />} />

        <Route path="reports/new" element={<NewReportPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
