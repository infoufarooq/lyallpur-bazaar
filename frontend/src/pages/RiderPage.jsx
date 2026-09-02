import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bike, Clock, CheckCircle2, DollarSign, MapPin, Phone, 
  Navigation, Check, RefreshCw, X, AlertCircle, Calendar, 
  Layers, ArrowUpRight, FileText, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { formatPKR, formatDate } from '../utils/formatters';

export default function RiderPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('active'); // 'active', 'history'
  const [dashboard, setDashboard] = useState(null);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [deliveryHistory, setDeliveryHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Delivery Notes / Complete Modal
  const [completingDelivery, setCompletingDelivery] = useState(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Action message / toast feedback
  const [actionMessage, setActionMessage] = useState({ text: '', type: '' });

  const showNotification = (text, type = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage({ text: '', type: '' }), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, activeRes, histRes] = await Promise.all([
        client.get('/rider/dashboard'),
        client.get('/rider/deliveries'),
        client.get('/rider/history')
      ]);
      setDashboard(dashRes.data);
      setActiveDeliveries(activeRes.data);
      setDeliveryHistory(histRes.data);
    } catch (err) {
      console.error("Rider portal data load error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkOutForDelivery = async (order) => {
    try {
      await client.put(`/rider/deliveries/${order.order_id}/status`, {
        status: "Out for Delivery"
      });
      showNotification(`Order #${order.order_number} marked as Out for Delivery!`);
      loadData();
    } catch (err) {
      console.error("Failed to update status", err);
      showNotification(err.response?.data?.detail || "Failed to update delivery status.", "error");
    }
  };

  const openDeliveredModal = (order) => {
    setCompletingDelivery(order);
    setDeliveryNotes('');
  };

  const handleConfirmDelivered = async (e) => {
    e.preventDefault();
    if (!completingDelivery) return;

    setSubmittingStatus(true);
    try {
      await client.put(`/rider/deliveries/${completingDelivery.order_id}/status`, {
        status: "Delivered",
        delivery_notes: deliveryNotes.trim() || undefined
      });
      showNotification(`Order #${completingDelivery.order_number} marked Delivered! COD settled.`);
      setCompletingDelivery(null);
      setDeliveryNotes('');
      loadData();
    } catch (err) {
      console.error("Failed to complete delivery", err);
      showNotification(err.response?.data?.detail || "Failed to complete delivery.", "error");
    } finally {
      setSubmittingStatus(false);
    }
  };

  if (loading && !dashboard) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs font-bold text-gray-500">Loading Rider Delivery Portal...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Alert */}
      {actionMessage.text && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md transition-all ${
          actionMessage.type === 'error' 
            ? 'bg-rose-50 text-rose-800 border border-rose-200' 
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage({ text: '', type: '' })} className="text-gray-400 hover:text-gray-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Rider Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl border border-blue-900/30">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-600/30 font-black">
            <Bike size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black">
                {user?.full_name}
              </h1>
              <span className="bg-blue-400/20 text-blue-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-400/30 uppercase tracking-wider">
                Active Rider
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 flex flex-wrap items-center gap-2">
              <span>{user?.vehicle_type || 'Express Motorbike'} &bull; <strong className="text-white font-mono">{user?.vehicle_number || 'FSD-RIDER'}</strong></span>
              <span className="text-slate-500">|</span>
              <span className="text-blue-200">{user?.email}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={loadData}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700 shadow-sm"
          >
            <RefreshCw size={14} />
            <span>Refresh Run</span>
          </button>
        </div>
      </div>

      {/* Shift Summary / KPI Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700">Pending Deliveries</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Clock size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-blue-900">{dashboard.pending_deliveries}</p>
            <span className="text-[10px] text-gray-500 font-medium">
              Awaiting dispatch & drop-off
            </span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700">Delivered Today</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-800">{dashboard.delivered_today}</p>
            <span className="text-[10px] text-emerald-600 font-bold">
              Successful Faisalabad drop-offs
            </span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700">COD Cash Collected</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <DollarSign size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-amber-900">{formatPKR(dashboard.cod_cash_collected_pkr)}</p>
            <span className="text-[10px] text-amber-600 font-bold">
              Cash to reconcile at hub
            </span>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 text-xs font-bold text-gray-500 space-x-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'active' 
              ? 'border-blue-600 text-blue-800 font-black' 
              : 'border-transparent hover:text-gray-900'
          }`}
        >
          <Navigation size={15} />
          <span>Active Delivery Run ({activeDeliveries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'history' 
              ? 'border-blue-600 text-blue-800 font-black' 
              : 'border-transparent hover:text-gray-900'
          }`}
        >
          <CheckCircle2 size={15} />
          <span>Completed History ({deliveryHistory.length})</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE DELIVERIES */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeDeliveries.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-200/80 p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bike size={32} />
              </div>
              <h3 className="text-base font-extrabold text-gray-900">No Active Deliveries Assigned</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                You're all caught up! New customer orders dispatched to you by marketplace admins will appear here instantly.
              </p>
              <button
                onClick={loadData}
                className="mt-4 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors inline-flex items-center gap-1.5"
              >
                <RefreshCw size={13} />
                <span>Check for New Runs</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {activeDeliveries.map((delivery) => {
                const isCOD = delivery.payment_method === "Cash on Delivery";
                const isOutForDelivery = delivery.order_status === "Out for Delivery";

                return (
                  <div 
                    key={delivery.order_id} 
                    className="bg-white rounded-3xl border border-gray-200/90 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                  >
                    {/* Header: Order # & Status */}
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Order</span>
                          <p className="font-mono font-black text-sm text-blue-950">
                            #{delivery.order_number}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            isOutForDelivery 
                              ? 'bg-blue-100 text-blue-800 animate-pulse' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {delivery.order_status}
                          </span>
                        </div>
                      </div>

                      {/* Recipient Details */}
                      <div className="pt-3 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-extrabold text-sm text-gray-900">
                              {delivery.recipient_name || delivery.customer_name}
                            </p>
                            <p className="text-gray-400 text-[11px]">
                              {delivery.recipient_phone || delivery.customer_phone}
                            </p>
                          </div>

                          {(delivery.recipient_phone || delivery.customer_phone) && (
                            <a
                              href={`tel:${delivery.recipient_phone || delivery.customer_phone}`}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                              <Phone size={13} className="text-emerald-600" />
                              <span>Call Customer</span>
                            </a>
                          )}
                        </div>

                        {/* Address & Locality */}
                        <div className="bg-slate-50 rounded-2xl p-3.5 space-y-1.5 border border-slate-100">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                            <MapPin size={14} className="text-emerald-600 flex-shrink-0" />
                            <span>{delivery.locality}</span>
                          </div>
                          <p className="text-gray-700 text-xs leading-relaxed pl-5">
                            {delivery.full_address}
                          </p>
                          {delivery.nearby_landmark && (
                            <p className="text-gray-500 text-[11px] pl-5 flex items-center gap-1">
                              <span className="font-semibold text-gray-600">Landmark:</span> {delivery.nearby_landmark}
                            </p>
                          )}
                        </div>

                        {/* Payment & COD Badge */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-gray-500">Payment:</span>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              isCOD 
                                ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            }`}>
                              {delivery.payment_method}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-gray-400 block">
                              {isCOD ? 'Cash to Collect' : 'Order Total'}
                            </span>
                            <span className={`text-base font-black ${isCOD ? 'text-amber-800' : 'text-gray-900'}`}>
                              {formatPKR(delivery.total_amount_pkr)}
                            </span>
                          </div>
                        </div>

                        {delivery.delivery_notes && (
                          <div className="bg-blue-50/60 p-2.5 rounded-xl text-[11px] text-blue-900 border border-blue-100">
                            <strong>Note:</strong> {delivery.delivery_notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                      {!isOutForDelivery && (
                        <button
                          onClick={() => handleMarkOutForDelivery(delivery)}
                          className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Navigation size={14} />
                          <span>Out for Delivery</span>
                        </button>
                      )}

                      <button
                        onClick={() => openDeliveredModal(delivery)}
                        className={`flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm ${
                          !isOutForDelivery ? 'border border-emerald-600' : 'w-full'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        <span>Confirm Delivered</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Delivery Notes / Complete Modal */}
          {completingDelivery && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900">Complete Delivery</h3>
                    <p className="text-[11px] text-gray-400 font-mono">Order #{completingDelivery.order_number}</p>
                  </div>
                  <button 
                    onClick={() => setCompletingDelivery(null)} 
                    className="p-1 text-gray-400 hover:text-gray-700"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleConfirmDelivered} className="space-y-4 text-xs">
                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 space-y-1">
                    <p className="font-bold text-emerald-900 text-xs">
                      Recipient: {completingDelivery.recipient_name || completingDelivery.customer_name}
                    </p>
                    <p className="text-emerald-700 text-[11px]">
                      {completingDelivery.locality} &bull; {completingDelivery.full_address}
                    </p>
                    {completingDelivery.payment_method === "Cash on Delivery" && (
                      <div className="pt-2 mt-1 border-t border-emerald-200/60 flex items-center justify-between">
                        <span className="font-bold text-emerald-900">Cash Collected:</span>
                        <span className="font-black text-sm text-emerald-900">
                          {formatPKR(completingDelivery.total_amount_pkr)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Delivery Confirmation Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Received by customer in person, gate security handed over, cash paid in full..."
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCompletingDelivery(null)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingStatus}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      <span>{submittingStatus ? "Finalizing..." : "Confirm & Complete"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DELIVERY HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4">
          <div className="pb-3 border-b border-gray-100">
            <h3 className="font-extrabold text-sm text-gray-900">Completed Drop-offs History</h3>
            <p className="text-[11px] text-gray-400">All successful deliveries completed on your rider account.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 uppercase text-[10px] font-bold">
                  <th className="py-3 px-3">Order Number</th>
                  <th className="py-3 px-3">Recipient & Phone</th>
                  <th className="py-3 px-3">Locality</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Completed At</th>
                  <th className="py-3 px-3">Delivery Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deliveryHistory.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-400">
                      <CheckCircle2 size={36} className="mx-auto mb-2 text-gray-300" />
                      <p className="font-bold text-gray-500">No completed deliveries yet.</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">As you complete runs, delivery receipts will be logged here.</p>
                    </td>
                  </tr>
                ) : (
                  deliveryHistory.map((item) => (
                    <tr key={item.order_id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-blue-950">
                        <Link to={`/tracking?order=${item.order_number}`} className="hover:underline flex items-center gap-1">
                          <span>#{item.order_number}</span>
                          <ArrowUpRight size={11} className="text-gray-400" />
                        </Link>
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="font-bold text-gray-900">{item.recipient_name || item.customer_name}</p>
                        <p className="text-[11px] text-gray-400">{item.recipient_phone || item.customer_phone}</p>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-emerald-800">{item.locality}</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.payment_method === "Cash on Delivery"
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {item.payment_method}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-black text-gray-900">
                        {formatPKR(item.total_amount_pkr)}
                      </td>
                      <td className="py-3.5 px-3 text-gray-500 text-[11px]">
                        {item.delivered_at ? formatDate(item.delivered_at) : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-gray-600 text-[11px] max-w-xs truncate">
                        {item.delivery_notes || <span className="text-gray-400 italic">None</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
