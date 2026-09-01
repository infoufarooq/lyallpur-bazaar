import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Lock, Phone, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(phoneOrEmail.trim(), password);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Invalid login credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoType) => {
    if (demoType === 'admin') {
      setPhoneOrEmail('admin@lyallpurbazaar.pk');
      setPassword('Admin@123');
    } else {
      setPhoneOrEmail('03217654321');
      setPassword('Customer@123');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <LogIn size={22} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Sign In to Lyallpur Bazaar
          </h1>
          <p className="text-xs text-gray-500">
            Access your orders, saved addresses, and express checkout
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Mobile Number or Email
            </label>
            <div className="relative">
              <Phone size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
              <input
                type="text"
                required
                placeholder="e.g. 03217654321 or admin@lyallpurbazaar.pk"
                value={phoneOrEmail}
                onChange={(e) => setPhoneOrEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {/* Demo Accounts Quick-fill */}
        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/60 text-xs space-y-2">
          <div className="flex items-center gap-1 text-emerald-800 font-bold">
            <Sparkles size={14} />
            <span>Try Sample Demo Accounts:</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleQuickDemo('admin')}
              className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-900 transition-colors"
            >
              Fill Admin Demo
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('customer')}
              className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-900 transition-colors"
            >
              Fill Customer Demo
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span>Don't have an account? </span>
          <Link to="/register" className="text-emerald-700 font-bold hover:underline">
            Register for Free
          </Link>
        </div>
      </div>
    </div>
  );
}
