import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, MapPin, User, LogOut, ShieldCheck, ChevronDown, Package, Sparkles, PhoneCall } from 'lucide-react';
import SearchBar from '../common/SearchBar';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useDelivery } from '../../context/DeliveryContext';
import client from '../../api/client';

export default function Header() {
  const { totalItems, setIsDrawerOpen } = useCart();
  const { user, logout, isAdmin } = useAuth();
  const { selectedLocality, setIsModalOpen } = useDelivery();
  const [categories, setCategories] = useState([]);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    client.get('/categories')
      .then((res) => setCategories(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      {/* Top Banner Bar */}
      <div className="bg-emerald-950 text-emerald-100 text-xs py-1.5 px-4 border-b border-emerald-900">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Location selector */}
          <div className="flex items-center space-x-2">
            <span className="text-emerald-400 font-medium hidden sm:inline">Delivering in:</span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-1 font-bold text-white hover:text-emerald-300 bg-emerald-900/60 hover:bg-emerald-900 px-2.5 py-0.5 rounded-full transition-colors"
            >
              <MapPin size={13} className="text-emerald-400" />
              <span className="truncate max-w-[200px]">{selectedLocality}</span>
              <ChevronDown size={12} className="text-emerald-400" />
            </button>
          </div>

          {/* Quick links & support */}
          <div className="flex items-center space-x-4">
            <span className="hidden md:flex items-center gap-1 text-emerald-300">
              <Sparkles size={12} /> Same-day delivery across Faisalabad
            </span>
            <Link to="/tracking" className="hover:text-white transition-colors flex items-center gap-1">
              <Package size={12} /> Track Order
            </Link>
            <span className="hidden lg:inline text-emerald-600">|</span>
            <span className="hidden lg:flex items-center gap-1 text-emerald-400 font-medium">
              <PhoneCall size={12} /> 041-8765432
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 md:gap-8">
        {/* Logo & Brand */}
        <Link to="/" className="flex items-center space-x-2.5 flex-shrink-0 group">
          <div className="w-10 h-10 bg-gradient-to-tr from-emerald-700 to-emerald-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform">
            <span className="font-extrabold text-xl tracking-tighter">LB</span>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-xl text-gray-900 tracking-tight leading-tight">
                Lyallpur<span className="text-emerald-600">Bazaar</span>
              </span>
            </div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Faisalabad Local Mart
            </p>
          </div>
        </Link>

        {/* Large Prominent Search Bar */}
        <div className="flex-1 max-w-2xl hidden md:block">
          <SearchBar />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 md:space-x-5 flex-shrink-0">
          {/* Admin shortcut if logged in as admin */}
          {isAdmin && (
            <Link
              to="/admin"
              className="hidden lg:flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg border border-purple-200 transition-colors"
            >
              <ShieldCheck size={14} />
              <span>Admin Panel</span>
            </Link>
          )}

          {/* User Account / Login */}
          <div className="relative">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-1.5 py-1.5 px-2.5 rounded-xl hover:bg-gray-100 text-gray-700 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                    {user.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-gray-900 truncate max-w-[100px]">
                      {user.full_name}
                    </p>
                    <p className="text-[10px] text-gray-500">My Account</p>
                  </div>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div
                    onClick={() => setIsUserMenuOpen(false)}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs"
                  >
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="font-bold text-gray-900">{user.full_name}</p>
                      <p className="text-gray-400 text-[11px] truncate">{user.phone_number}</p>
                    </div>

                    <Link to="/account" className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700">
                      <User size={14} />
                      <span>My Profile & Orders</span>
                    </Link>

                    <Link to="/tracking" className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700">
                      <Package size={14} />
                      <span>Track Active Order</span>
                    </Link>

                    {isAdmin && (
                      <Link to="/admin" className="flex items-center gap-2 px-3 py-2 hover:bg-purple-50 text-purple-700 font-semibold border-t border-gray-50">
                        <ShieldCheck size={14} />
                        <span>Admin Dashboard</span>
                      </Link>
                    )}

                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-rose-600 hover:bg-rose-50 border-t border-gray-100 font-medium"
                    >
                      <LogOut size={14} />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <Link
                  to="/login"
                  className="px-3 py-2 text-xs font-bold text-gray-700 hover:text-emerald-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Cart Icon & Button */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="relative p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl transition-all flex items-center gap-2 border border-emerald-200"
            aria-label="Shopping Cart"
          >
            <div className="relative">
              <ShoppingCart size={20} />
              {totalItems > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-rose-600 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-in zoom-in-50 duration-200">
                  {totalItems}
                </span>
              )}
            </div>
            <span className="hidden sm:inline text-xs font-bold">Cart</span>
          </button>
        </div>
      </div>

      {/* Mobile Search Bar Row */}
      <div className="p-3 border-t border-gray-100 md:hidden bg-gray-50">
        <SearchBar />
      </div>

      {/* Categories Navigation Bar */}
      <nav className="bg-gray-50 border-t border-gray-200/80 px-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center space-x-6 overflow-x-auto py-2 text-xs font-semibold text-gray-600 no-scrollbar">
          <Link
            to="/search"
            className="text-emerald-700 hover:text-emerald-800 font-bold whitespace-nowrap flex items-center gap-1"
          >
            <span>All Products</span>
          </Link>

          {categories.slice(0, 7).map((cat) => (
            <Link
              key={cat.id}
              to={`/search?category=${encodeURIComponent(cat.slug)}`}
              className="hover:text-emerald-600 whitespace-nowrap transition-colors"
            >
              {cat.name}
            </Link>
          ))}

          <Link
            to="/search?deals=true"
            className="text-rose-600 hover:text-rose-700 font-bold whitespace-nowrap ml-auto flex items-center gap-1"
          >
            <span>⚡ Flash Deals</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
