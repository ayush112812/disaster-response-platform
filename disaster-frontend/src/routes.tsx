import { Routes, Route, Outlet } from 'react-router-dom';
import Layout from './layouts/Layout';
import HomePage from './pages/HomePage';
import DisastersPage from './pages/DisastersPage';
import DisasterDetailPage from './pages/DisasterDetailPage';

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
        <Route path="disasters/:id" element={<DisasterDetailPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
