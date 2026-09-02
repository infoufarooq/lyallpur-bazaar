import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DeliveryProvider } from './context/DeliveryContext';
import { CartProvider } from './context/CartContext';

import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import DeliveryModal from './components/layout/DeliveryModal';
import CartDrawer from './components/layout/CartDrawer';
import ProtectedRoute from './components/auth/ProtectedRoute';

import HomePage from './pages/HomePage';
import SearchResultsPage from './pages/SearchResultsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import AccountPage from './pages/AccountPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import SellerPage from './pages/SellerPage';
import RiderPage from './pages/RiderPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DeliveryProvider>
          <CartProvider>
            <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
              <ScrollToTop />
              <Header />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/search" element={<SearchResultsPage />} />
                  <Route path="/product/:identifier" element={<ProductDetailPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmationPage />} />
                  <Route path="/tracking" element={<OrderTrackingPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route
                    path="/seller"
                    element={
                      <ProtectedRoute allowedRoles={['seller', 'admin']}>
                        <SellerPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/rider"
                    element={
                      <ProtectedRoute allowedRoles={['rider', 'admin']}>
                        <RiderPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<HomePage />} />
                </Routes>
              </main>
              <Footer />
              <DeliveryModal />
              <CartDrawer />
            </div>
          </CartProvider>
        </DeliveryProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
