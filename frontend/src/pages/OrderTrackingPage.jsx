import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Package, Search, CheckCircle2, Clock, 
  Truck, MapPin, ShieldCheck, AlertCircle, PhoneCall 
} from 'lucide-react';
import client from '../api/client';
import { formatPKR, formatDate } from '../utils/formatters';
import { ORDER_STATUS_STEPS } from '../utils/constants';

export default function OrderTrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const orderFromQuery = searchParams.get('order') || '';
  const [orderNumberInput, setOrderNumberInput] = useState(orderFromQuery);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTracking = async (numberToTrack) => {
    if (!numberToTrack) return;
    setLoading(true);
    setError('');
    try {
      const res = await client.get(`/orders/track/${encodeURIComponent(numberToTrack.trim())}`);
      setOrder(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || `Order "${numberToTrack}" not found.`);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderFromQuery) {
      setOrderNumberInput(orderFromQuery);
      fetchTracking(orderFromQuery);
    }
  }, [orderFromQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!orderNumberInput.trim()) return;
    setSearchParams({ order: orderNumberInput.trim() });
    fetchTracking(orderNumberInput.trim());
  };

  const getStepIndex = (status) => {
    if (status === "Cancelled") return -1;
    const idx = ORDER_STATUS_STEPS.findIndex(s => s.key === status);
    return idx >= 0 ? idx : 0;
  };

  const currentStep = order ? getStepIndex(order.order_status) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header & Lookup Bar */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
          <Package size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Track Your Faisalabad Order
          </h1>
          <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
            Enter your order tracking ID (e.g. <span className="font-mono font-bold text-emerald-700">FSD-2026-XXXX</span>) to check live status.
          </p>
        </div>

        <form onSubmit={handleSearch} className="max-w-md mx-auto flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              required
              placeholder="e.g. FSD-2026-1001"
              value={orderNumberInput}
              onChange={(e) => setOrderNumberInput(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-semibold uppercase tracking-wider focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            {loading ? "Tracking..." : "Track"}
          </button>
        </form>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold max-w-md mx-auto flex items-center justify-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Order Status Display */}
      {order && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-sm space-y-8 animate-in fade-in duration-200">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-bold">Order ID:</span>
                <span className="text-base font-mono font-extrabold text-emerald-800">
                  {order.order_number}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Placed on {formatDate(order.created_at)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">Status:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                order.order_status === "Delivered"
                  ? 'bg-green-100 text-green-800'
                  : order.order_status === "Cancelled"
                  ? 'bg-red-100 text-red-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {order.order_status}
              </span>
            </div>
          </div>

          {/* Stepper Timeline */}
          {order.order_status !== "Cancelled" ? (
            <div className="py-2">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 relative">
                {ORDER_STATUS_STEPS.map((step, idx) => {
                  const isDone = idx <= currentStep;
                  const isCurrent = idx === currentStep;
                  return (
                    <div key={step.key} className="flex flex-col items-center text-center relative z-10 space-y-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isDone
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                          : 'bg-gray-100 text-gray-400 border border-gray-200'
                      } ${isCurrent ? 'ring-4 ring-emerald-500/20' : ''}`}>
                        {isDone ? <CheckCircle2 size={18} /> : idx + 1}
                      </div>
                      <div>
                        <p className={`text-xs font-bold leading-tight ${isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                          {step.label}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5 hidden md:block">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-center text-xs text-red-800 font-bold">
              This order was cancelled. Please contact helpline at 041-8765432 if you have any questions.
            </div>
          )}

          {/* Delivery & Address Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-gray-50 rounded-2xl text-xs">
            <div className="space-y-1">
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                Faisalabad Destination
              </span>
              <p className="font-bold text-gray-900">{order.customer_name} ({order.customer_phone})</p>
              <p className="text-emerald-800 font-semibold flex items-center gap-1">
                <MapPin size={13} /> {order.locality}
              </p>
              <p className="text-gray-600">{order.full_address}</p>
            </div>

            <div className="space-y-1 sm:border-l sm:border-gray-200 sm:pl-4">
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                Fulfillment Hub & ETA
              </span>
              <p className="font-semibold text-gray-800 flex items-center gap-1">
                <Truck size={13} className="text-emerald-600" /> {order.delivery_speed}
              </p>
              <p className="text-gray-600">Expected: <strong>{order.estimated_delivery_date || "Within 24 hours"}</strong></p>
              <p className="text-gray-500 text-[11px]">Payment Method: {order.payment_method} ({formatPKR(order.total_amount_pkr)})</p>
            </div>
          </div>

          {/* Items in order */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              Order Contents
            </h3>
            <div className="divide-y divide-gray-100">
              {order.items?.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-3 truncate">
                    {item.product_image && (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-9 h-9 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                      />
                    )}
                    <div className="truncate">
                      <p className="font-bold text-gray-900 truncate">{item.product_name}</p>
                      <p className="text-gray-400">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-bold text-gray-900">
                    {formatPKR(item.subtotal_pkr)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Support Bar */}
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-emerald-900">
              <PhoneCall size={16} className="text-emerald-700" />
              <span>Need help with your Faisalabad delivery? Call <strong>041-8765432</strong></span>
            </div>
            <Link to="/" className="text-emerald-700 font-bold hover:underline">
              Shop More Items
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
