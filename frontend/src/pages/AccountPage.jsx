import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, Package, MapPin, Plus, Clock, 
  CheckCircle2, LogOut, ChevronRight, ShieldCheck 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { formatPKR, formatDate } from '../utils/formatters';
import { FAISALABAD_LOCALITIES } from '../utils/constants';

export default function AccountPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'addresses', 'profile'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // New Address modal state
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addressTitle, setAddressTitle] = useState('Home');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [locality, setLocality] = useState(FAISALABAD_LOCALITIES[0]);
  const [fullAddress, setFullAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [isDefault, setIsDefault] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      client.get('/orders/my-orders')
        .then((res) => setOrders(res.data))
        .catch((err) => console.error("Error loading my orders", err))
        .finally(() => setLoadingOrders(false));
    }
  }, [user]);

  const handleCreateAddress = async (e) => {
    e.preventDefault();
    try {
      await client.post('/auth/addresses', {
        title: addressTitle,
        recipient_name: recipientName || user.full_name,
        phone_number: recipientPhone || user.phone_number,
        city: 'Faisalabad',
        locality: locality,
        full_address: fullAddress,
        nearby_landmark: landmark,
        is_default: isDefault
      });
      setShowAddAddress(false);
      // Reload profile to refresh addresses
      window.location.reload();
    } catch (err) {
      console.error("Address save error", err);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Account Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-700/80 border border-emerald-500/40 flex items-center justify-center text-2xl font-black text-white shadow-inner">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">{user.full_name}</h1>
            <p className="text-xs text-emerald-200">{user.phone_number} • {user.email || "Faisalabad Customer"}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="self-start sm:self-auto px-4 py-2 bg-emerald-950/60 hover:bg-rose-600 border border-emerald-700/60 hover:border-rose-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 text-xs font-bold text-gray-500 space-x-6">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'orders'
              ? 'border-emerald-600 text-emerald-700 font-extrabold'
              : 'border-transparent hover:text-gray-900'
          }`}
        >
          <Package size={16} />
          <span>My Orders ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('addresses')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'addresses'
              ? 'border-emerald-600 text-emerald-700 font-extrabold'
              : 'border-transparent hover:text-gray-900'
          }`}
        >
          <MapPin size={16} />
          <span>Saved Addresses ({user.addresses?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-emerald-600 text-emerald-700 font-extrabold'
              : 'border-transparent hover:text-gray-900'
          }`}
        >
          <User size={16} />
          <span>Profile Information</span>
        </button>
      </div>

      {/* TAB 1: ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {loadingOrders ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-100 rounded-3xl animate-pulse"></div>
              ))}
            </div>
          ) : orders.length > 0 ? (
            orders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-sm space-y-4 hover:border-emerald-500/40 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-gray-900">{ord.order_number}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                        ord.order_status === "Delivered"
                          ? 'bg-green-100 text-green-800'
                          : ord.order_status === "Cancelled"
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ord.order_status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Placed on {formatDate(ord.created_at)} • Destination: {ord.locality}
                    </p>
                  </div>

                  <Link
                    to={`/tracking?order=${ord.order_number}`}
                    className="self-start sm:self-auto px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-1 transition-colors"
                  >
                    <span>Track Status</span>
                    <ChevronRight size={13} />
                  </Link>
                </div>

                {/* Items in this order */}
                <div className="divide-y divide-gray-50 text-xs">
                  {ord.items?.map((item) => (
                    <div key={item.id} className="py-2 flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5 truncate">
                        {item.product_image && (
                          <img
                            src={item.product_image}
                            alt={item.product_name}
                            className="w-8 h-8 object-cover rounded-md border border-gray-200 flex-shrink-0"
                          />
                        )}
                        <span className="font-medium text-gray-800 truncate">{item.product_name}</span>
                        <span className="text-gray-400 text-[11px]">× {item.quantity}</span>
                      </div>
                      <span className="font-bold text-gray-900">{formatPKR(item.subtotal_pkr)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">{ord.payment_method}</span>
                  <div className="text-right">
                    <span className="text-gray-400 mr-1">Total:</span>
                    <span className="font-extrabold text-sm text-emerald-700">{formatPKR(ord.total_amount_pkr)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-3xl border border-gray-200/80 p-12 text-center space-y-3">
              <Package size={36} className="text-gray-300 mx-auto" />
              <h3 className="text-base font-bold text-gray-700">No Orders Yet</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                You haven't placed any orders yet. Start exploring groceries and electronics in Faisalabad!
              </p>
              <Link
                to="/"
                className="inline-block px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                Browse Marketplace
              </Link>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ADDRESSES */}
      {activeTab === 'addresses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-gray-900">Saved Faisalabad Addresses</h3>
            <button
              onClick={() => setShowAddAddress(!showAddAddress)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-colors shadow-sm"
            >
              <Plus size={14} />
              <span>Add New Address</span>
            </button>
          </div>

          {/* Add Address Form */}
          {showAddAddress && (
            <form onSubmit={handleCreateAddress} className="bg-emerald-50/60 border border-emerald-200 p-5 rounded-3xl space-y-4 animate-in fade-in">
              <h4 className="font-extrabold text-xs text-emerald-900 uppercase tracking-wider">
                New Address Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={addressTitle}
                    onChange={(e) => setAddressTitle(e.target.value)}
                    placeholder="Home / Office"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Recipient Name</label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder={user.full_name}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder={user.phone_number}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Faisalabad Locality</label>
                  <select
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold"
                  >
                    {FAISALABAD_LOCALITIES.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Full Street Address</label>
                  <input
                    type="text"
                    required
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    placeholder="House/Shop #, Street, Sector"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Nearby Landmark</label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="Near Chenab Club / D Ground / Chungi"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                >
                  Save Address
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAddress(false)}
                  className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Address Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {user.addresses && user.addresses.length > 0 ? (
              user.addresses.map((a) => (
                <div
                  key={a.id}
                  className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-sm space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider bg-gray-100 px-2.5 py-0.5 rounded-full">
                      {a.title}
                    </span>
                    {a.is_default && (
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Default Address
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-sm text-gray-900">{a.recipient_name} ({a.phone_number})</p>
                  <p className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
                    <MapPin size={13} /> {a.locality}, Faisalabad
                  </p>
                  <p className="text-xs text-gray-600">{a.full_address}</p>
                  {a.nearby_landmark && (
                    <p className="text-[11px] text-gray-400">Landmark: {a.nearby_landmark}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400">No saved addresses yet.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4 max-w-lg">
          <h3 className="text-sm font-extrabold text-gray-900">Personal Information</h3>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-gray-400 block font-bold">Full Name</span>
              <p className="text-gray-900 font-semibold">{user.full_name}</p>
            </div>
            <div>
              <span className="text-gray-400 block font-bold">Phone Number</span>
              <p className="text-gray-900 font-semibold">{user.phone_number}</p>
            </div>
            <div>
              <span className="text-gray-400 block font-bold">Email Address</span>
              <p className="text-gray-900 font-semibold">{user.email || "None provided"}</p>
            </div>
            <div>
              <span className="text-gray-400 block font-bold">Account Role</span>
              <p className="text-gray-900 font-semibold">{user.is_admin ? "Administrator" : "Customer"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
