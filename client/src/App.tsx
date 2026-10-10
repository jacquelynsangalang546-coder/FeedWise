import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import AddProductPage from './pages/AddProductPage';
import CategoriesPage from './pages/CategoriesPage';
import CustomersPage from './pages/CustomersPage';
import DashboardPage from './pages/DashboardPage';
import EditProductPage from './pages/EditProductPage';
import LandingPage from './pages/LandingPage';
import NewSalePage from './pages/NewSalePage';
import NotFoundPage from './pages/NotFoundPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import ProductsPage from './pages/ProductsPage';
import ReportsPage from './pages/ReportsPage';
import SaleDetailsPage from './pages/SaleDetailsPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import SuppliersPage from './pages/SuppliersPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      {/* Pages inside the store dashboard shell */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/new" element={<AddProductPage />} />
        <Route path="/products/:id" element={<ProductDetailsPage />} />
        <Route path="/products/:id/edit" element={<EditProductPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/sales/new" element={<NewSalePage />} />
        <Route path="/sales" element={<SalesHistoryPage />} />
        <Route path="/sales/:id" element={<SaleDetailsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
