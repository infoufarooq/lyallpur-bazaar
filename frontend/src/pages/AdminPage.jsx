import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, LayoutDashboard, Package, ShoppingCart, 
  MapPin, Plus, Edit2, CheckCircle2, Clock, 
  AlertTriangle, DollarSign, RefreshCw, X, TrendingUp 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { formatPKR, formatDate } from '../utils/formatters';

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'products', 'orders', 'categories', 'zones'
  const [metrics, setMetrics] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Product Modal state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdSlug, setNewProdSlug] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdCatId, setNewProdCatId] = useState(1);
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdOrigPrice, setNewProdOrigPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('20');
  const [newProdPackSize, setNewProdPackSize] = useState('1 kg');
  const [newProdImageUrl, setNewProdImageUrl] = useState('');
  const [newProdKeywords, setNewProdKeywords] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [isSameDayExpress, setIsSameDayExpress] = useState(true);

  // Status Filter for Orders
  const [orderStatusFilter, setOrderStatusFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [mRes, pRes, oRes, cRes, zRes] = await Promise.all([
        client.get('/admin/dashboard'),
        client.get('/admin/products?limit=100'),
        client.get(`/admin/orders${orderStatusFilter ? `?status=${orderStatusFilter}` : ''}`),
        client.get('/categories'),
        client.get('/admin/zones')
      ]);
      setMetrics(mRes.data);
      setProducts(pRes.data);
      setOrders(oRes.data);
      setCategories(cRes.data);
      setZones(zRes.data);
    } catch (err) {
      console.error("Admin data load error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin) {
        navigate('/login');
      } else {
        loadData();
      }
    }
  }, [user, isAdmin, authLoading, orderStatusFilter]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const slug = newProdSlug || newProdName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const sku = newProdSku || `FSD-${Math.floor(1000 + Math.random() * 9000)}`;

      await client.post('/admin/products', {
        name: newProdName,
        slug: slug,
        sku: sku,
        category_id: Number(newProdCatId),
        price: parseFloat(newProdPrice),
        original_price: newProdOrigPrice ? parseFloat(newProdOrigPrice) : null,
        discount_percent: newProdOrigPrice && parseFloat(newProdOrigPrice) > parseFloat(newProdPrice)
          ? Math.round(((parseFloat(newProdOrigPrice) - parseFloat(newProdPrice)) / parseFloat(newProdOrigPrice)) * 100)
          : 0,
        stock_quantity: parseInt(newProdStock, 10),
        pack_size: newProdPackSize,
        unit: 'unit',
        search_keywords: newProdKeywords,
        description: newProdDesc,
        estimated_delivery_days: isSameDayExpress ? 0 : 1,
        images: newProdImageUrl ? [{ image_url: newProdImageUrl, is_primary: true }] : [],
        specifications: [
          { spec_key: "Origin", spec_value: "Faisalabad, Pakistan" },
          { spec_key: "Pack Size", spec_value: newProdPackSize }
        ]
      });

      setShowAddProduct(false);
      // Reset form
      setNewProdName('');
      setNewProdPrice('');
      loadData();
    } catch (err) {
      console.error("Failed to create product", err);
      alert(err.response?.data?.detail || "Failed to create product");
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await client.put(`/admin/orders/${orderId}/status`, {
        order_status: newStatus,
        payment_status: newStatus === "Delivered" ? "Paid" : "Pending"
      });
      loadData();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleUpdateProductStock = async (productId, currentStock) => {
    const newQty = prompt("Enter updated stock quantity for this product:", currentStock);
    if (newQty !== null && !isNaN(newQty)) {
      try {
        await client.put(`/admin/products/${productId}`, {
          stock_quantity: parseInt(newQty, 10)
        });
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs font-bold text-gray-500">Loading Lyallpur Bazaar Admin Hub...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Admin Top Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg border border-slate-800">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-purple-600 rounded-2xl text-white shadow-md shadow-purple-600/30">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black">Marketplace Admin Portal</h1>
              <span className="bg-purple-500/30 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-400/30">
                Faisalabad Region
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Logged in as <strong className="text-white">{user.full_name}</strong> ({user.email})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <Link
            to="/"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            View Live Store
          </Link>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-gray-200 text-xs font-bold text-gray-500 space-x-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'dashboard' ? 'border-purple-600 text-purple-700 font-extrabold' : 'border-transparent hover:text-gray-900'
          }`}
        >
          <LayoutDashboard size={15} />
          <span>Dashboard Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'orders' ? 'border-purple-600 text-purple-700 font-extrabold' : 'border-transparent hover:text-gray-900'
          }`}
        >
          <ShoppingCart size={15} />
          <span>Manage Orders ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'products' ? 'border-purple-600 text-purple-700 font-extrabold' : 'border-transparent hover:text-gray-900'
          }`}
        >
          <Package size={15} />
          <span>Catalog & Stock ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('zones')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'zones' ? 'border-purple-600 text-purple-700 font-extrabold' : 'border-transparent hover:text-gray-900'
          }`}
        >
          <MapPin size={15} />
          <span>FSD Delivery Zones ({zones.length})</span>
        </button>
      </div>

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && metrics && (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-sm space-y-1">
              <span className="text-xs font-bold text-gray-400">Total Sales</span>
              <p className="text-xl font-black text-gray-900">{formatPKR(metrics.total_sales_pkr)}</p>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                <TrendingUp size={10} /> Local COD & Express
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-sm space-y-1">
              <span className="text-xs font-bold text-gray-400">Total Orders</span>
              <p className="text-xl font-black text-gray-900">{metrics.total_orders}</p>
              <span className="text-[10px] text-gray-400">Faisalabad residents</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-sm space-y-1">
              <span className="text-xs font-bold text-amber-600">Pending Orders</span>
              <p className="text-xl font-black text-amber-600">{metrics.pending_orders}</p>
              <span className="text-[10px] text-amber-600 font-bold">Needs Dispatch</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-sm space-y-1">
              <span className="text-xs font-bold text-gray-400">Total Products</span>
              <p className="text-xl font-black text-gray-900">{metrics.total_products}</p>
              <span className="text-[10px] text-emerald-600 font-bold">Active in Catalog</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-sm space-y-1">
              <span className="text-xs font-bold text-rose-600">Low Stock Alert</span>
              <p className="text-xl font-black text-rose-600">{metrics.low_stock_products}</p>
              <span className="text-[10px] text-rose-600 font-bold">&lt; 5 Units Remaining</span>
            </div>
          </div>

          {/* Recent Orders in Dashboard */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-gray-900">Recent Customer Orders</h3>
              <button
                onClick={() => setActiveTab('orders')}
                className="text-xs font-bold text-purple-700 hover:underline"
              >
                View All Orders →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] font-bold">
                    <th className="pb-3">Order ID</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Locality</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {metrics.recent_orders?.map((ord) => (
                    <tr key={ord.id} className="hover:bg-gray-50/60">
                      <td className="py-3 font-mono font-bold text-purple-900">{ord.order_number}</td>
                      <td className="py-3 font-semibold text-gray-800">{ord.customer_name}</td>
                      <td className="py-3 text-gray-600">{ord.locality}</td>
                      <td className="py-3 font-bold text-gray-900">{formatPKR(ord.total_amount_pkr)}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          ord.order_status === "Delivered" ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ord.order_status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/tracking?order=${ord.order_number}`}
                          className="font-bold text-purple-700 hover:underline"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <h3 className="font-extrabold text-sm text-gray-900">Orders Lifecycle Management</h3>

            {/* Filter by status */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-gray-400 font-medium">Filter Status:</span>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none"
              >
                <option value="">All Orders</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Processing">Processing</option>
                <option value="Packed">Packed</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] font-bold">
                  <th className="pb-3">Order Number</th>
                  <th className="pb-3">Date & Recipient</th>
                  <th className="pb-3">Destination</th>
                  <th className="pb-3">Total (PKR)</th>
                  <th className="pb-3">Current Status</th>
                  <th className="pb-3">Update Pipeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-gray-50/60">
                    <td className="py-3 font-mono font-bold text-purple-900">{ord.order_number}</td>
                    <td className="py-3">
                      <p className="font-bold text-gray-900">{ord.customer_name}</p>
                      <p className="text-gray-400 text-[11px]">{ord.customer_phone}</p>
                    </td>
                    <td className="py-3">
                      <p className="font-semibold text-emerald-800">{ord.locality}</p>
                      <p className="text-gray-400 text-[11px] truncate max-w-xs">{ord.full_address}</p>
                    </td>
                    <td className="py-3 font-bold text-gray-900">{formatPKR(ord.total_amount_pkr)}</td>
                    <td className="py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        ord.order_status === "Delivered"
                          ? 'bg-green-100 text-green-800'
                          : ord.order_status === "Cancelled"
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ord.order_status}
                      </span>
                    </td>
                    <td className="py-3">
                      <select
                        value={ord.order_status}
                        onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                        className="px-2.5 py-1 bg-white border border-purple-300 rounded-lg text-xs font-bold text-purple-900 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Processing">Processing</option>
                        <option value="Packed">Packed</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCTS & CATALOG */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-sm text-gray-900">Catalog & Inventory Management</h3>
            <button
              onClick={() => setShowAddProduct(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={15} />
              <span>Add New Product</span>
            </button>
          </div>

          {/* Add Product Modal */}
          {showAddProduct && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <form onSubmit={handleCreateProduct} className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="font-extrabold text-base text-gray-900">Add New Product to Catalog</h3>
                  <button type="button" onClick={() => setShowAddProduct(false)} className="p-1 text-gray-400 hover:text-gray-700">
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">Product Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shan Tikka Boti Masala 50g"
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Category *</label>
                    <select
                      value={newProdCatId}
                      onChange={(e) => setNewProdCatId(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Pack Size</label>
                    <input
                      type="text"
                      placeholder="e.g. 500g / 1 Litre / Pack of 3"
                      value={newProdPackSize}
                      onChange={(e) => setNewProdPackSize(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Selling Price (PKR) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 450"
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-emerald-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Original Market Price (PKR)</label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={newProdOrigPrice}
                      onChange={(e) => setNewProdOrigPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Initial Stock Quantity *</label>
                    <input
                      type="number"
                      required
                      value={newProdStock}
                      onChange={(e) => setNewProdStock(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Delivery Speed</label>
                    <select
                      value={isSameDayExpress ? "same_day" : "standard"}
                      onChange={(e) => setIsSameDayExpress(e.target.value === "same_day")}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold"
                    >
                      <option value="same_day">Same-Day Express in FSD</option>
                      <option value="standard">Standard (1-2 Days)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">Image URL (Unsplash or direct URL)</label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={newProdImageUrl}
                      onChange={(e) => setNewProdImageUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">Search Keywords (for fuzzy & Urdu queries)</label>
                    <input
                      type="text"
                      placeholder="e.g. tikka masala shan spices chicken bbq packet"
                      value={newProdKeywords}
                      onChange={(e) => setNewProdKeywords(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Product details, ingredients, usage..."
                      value={newProdDesc}
                      onChange={(e) => setNewProdDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                  >
                    Save Product
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Products Table */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] font-bold">
                  <th className="pb-3">Product Name</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Price (PKR)</th>
                  <th className="pb-3">Stock Count</th>
                  <th className="pb-3">Availability</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60">
                    <td className="py-3">
                      <div className="flex items-center space-x-2.5">
                        <img
                          src={p.primary_image || "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600"}
                          alt={p.name}
                          className="w-8 h-8 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                        />
                        <div>
                          <p className="font-bold text-gray-900 truncate max-w-xs">{p.name}</p>
                          <p className="text-gray-400 text-[10px]">SKU: {p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-gray-600 font-medium">{p.category_name}</td>
                    <td className="py-3 font-bold text-emerald-800">{formatPKR(p.price)}</td>
                    <td className="py-3">
                      <span className={`font-mono font-bold ${p.stock_quantity < 5 ? 'text-rose-600' : 'text-gray-800'}`}>
                        {p.stock_quantity} units
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.stock_quantity > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {p.stock_quantity > 0 ? "In Stock" : "Out of Stock"}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <button
                        onClick={() => handleUpdateProductStock(p.id, p.stock_quantity)}
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg border border-purple-200 transition-colors"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DELIVERY ZONES */}
      {activeTab === 'zones' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-gray-900">Configured Faisalabad Delivery Zones</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map((z) => (
              <div key={z.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    {z.sector_code || "FSD-ZONE"}
                  </span>
                  <span className="text-emerald-700 font-bold">Base: {formatPKR(z.base_delivery_fee_pkr)}</span>
                </div>
                <h4 className="font-extrabold text-sm text-gray-900">{z.name}</h4>
                <p className="text-gray-500 text-[11px]">{z.description}</p>
                <div className="pt-2 border-t border-gray-200 flex justify-between text-[11px] text-gray-600">
                  <span>Same Day Cutoff: <strong>{z.same_day_cutoff_hour}:00 PM</strong></span>
                  <span className="text-emerald-600 font-bold">Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
