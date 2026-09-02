import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Store, Package, ShoppingCart, TrendingUp, AlertTriangle, 
  Search, Filter, Plus, Edit2, Trash2, CheckCircle2, Clock, 
  RefreshCw, X, DollarSign, ArrowUpRight, Box, Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { formatPKR, formatDate } from '../utils/formatters';

export default function SellerPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'orders'
  const [metrics, setMetrics] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state for products
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Filter for orders
  const [orderStatusFilter, setOrderStatusFilter] = useState('');

  // Add Product Modal state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCatId, setNewProdCatId] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdOrigPrice, setNewProdOrigPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('20');
  const [newProdPackSize, setNewProdPackSize] = useState('1 kg');
  const [newProdImageUrl, setNewProdImageUrl] = useState('');
  const [newProdKeywords, setNewProdKeywords] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [isSameDayExpress, setIsSameDayExpress] = useState(true);
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Inline Quick Edit Modal state
  const [editingProduct, setEditingProduct] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editOrigPrice, setEditOrigPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [updatingProduct, setUpdatingProduct] = useState(false);

  // Success / Error Feedback
  const [actionMessage, setActionMessage] = useState({ text: '', type: '' });

  const showNotification = (text, type = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage({ text: '', type: '' }), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [mRes, cRes] = await Promise.all([
        client.get('/seller/dashboard'),
        client.get('/categories')
      ]);
      setMetrics(mRes.data);
      setCategories(cRes.data);
      if (cRes.data && cRes.data.length > 0 && !newProdCatId) {
        setNewProdCatId(cRes.data[0].id);
      }

      await Promise.all([loadProducts(), loadOrders()]);
    } catch (err) {
      console.error("Seller portal data load error", err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const params = { limit: 100 };
      if (productSearch.trim()) params.search = productSearch.trim();
      if (categoryFilter) params.category_id = categoryFilter;

      const res = await client.get('/seller/products', { params });
      setProducts(res.data);
    } catch (err) {
      console.error("Failed to load seller products", err);
    }
  };

  const loadOrders = async () => {
    try {
      const params = { limit: 100 };
      if (orderStatusFilter) params.status = orderStatusFilter;

      const res = await client.get('/seller/orders', { params });
      setOrders(res.data);
    } catch (err) {
      console.error("Failed to load seller orders", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [productSearch, categoryFilter]);

  useEffect(() => {
    loadOrders();
  }, [orderStatusFilter]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdPrice || !newProdCatId) {
      showNotification("Please fill in required product fields.", "error");
      return;
    }

    setCreatingProduct(true);
    try {
      await client.post('/seller/products', {
        name: newProdName.trim(),
        category_id: Number(newProdCatId),
        price: parseFloat(newProdPrice),
        regular_price: newProdOrigPrice ? parseFloat(newProdOrigPrice) : null,
        stock_quantity: parseInt(newProdStock, 10) || 0,
        pack_size: newProdPackSize.trim() || '1 unit',
        description: newProdDesc.trim() || undefined,
        search_keywords: newProdKeywords.trim() || undefined,
        estimated_delivery_days: isSameDayExpress ? 0 : 1,
        images: newProdImageUrl.trim() ? [{ image_url: newProdImageUrl.trim(), is_primary: true }] : []
      });

      setShowAddProduct(false);
      // Reset form fields
      setNewProdName('');
      setNewProdPrice('');
      setNewProdOrigPrice('');
      setNewProdStock('20');
      setNewProdPackSize('1 kg');
      setNewProdImageUrl('');
      setNewProdKeywords('');
      setNewProdDesc('');
      showNotification("Product added to your catalog successfully!");
      
      // Refresh dashboard metrics and product list
      const mRes = await client.get('/seller/dashboard');
      setMetrics(mRes.data);
      loadProducts();
    } catch (err) {
      console.error("Failed to create product", err);
      showNotification(err.response?.data?.detail || "Failed to add product.", "error");
    } finally {
      setCreatingProduct(false);
    }
  };

  const openQuickEdit = (product) => {
    setEditingProduct(product);
    setEditPrice(product.price);
    setEditOrigPrice(product.original_price || '');
    setEditStock(product.stock_quantity);
  };

  const handleQuickEditSave = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    setUpdatingProduct(true);
    try {
      await client.put(`/seller/products/${editingProduct.id}`, {
        price: parseFloat(editPrice),
        original_price: editOrigPrice ? parseFloat(editOrigPrice) : null,
        stock_quantity: parseInt(editStock, 10)
      });

      setEditingProduct(null);
      showNotification(`Updated "${editingProduct.name}" stock & price!`);
      
      // Refresh dashboard metrics and product list
      const mRes = await client.get('/seller/dashboard');
      setMetrics(mRes.data);
      loadProducts();
    } catch (err) {
      console.error("Failed to update product", err);
      showNotification(err.response?.data?.detail || "Failed to update product.", "error");
    } finally {
      setUpdatingProduct(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    const confirmDelete = window.confirm(
      `Deactivate "${product.name}"? It will be marked inactive and hidden from the customer storefront.`
    );
    if (!confirmDelete) return;

    try {
      await client.delete(`/seller/products/${product.id}`);
      showNotification(`Product "${product.name}" deactivated.`);
      
      const mRes = await client.get('/seller/dashboard');
      setMetrics(mRes.data);
      loadProducts();
    } catch (err) {
      console.error("Failed to deactivate product", err);
      showNotification(err.response?.data?.detail || "Failed to deactivate product.", "error");
    }
  };

  if (loading && !metrics) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs font-bold text-gray-500">Loading Seller Hub Workspace...</p>
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

      {/* Seller Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/80 to-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl border border-amber-900/30">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 bg-amber-500 rounded-2xl text-slate-950 shadow-lg shadow-amber-500/20 font-black">
            <Store size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black">
                {user?.business_name || `${user?.full_name}'s Store`}
              </h1>
              <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-400/30 uppercase tracking-wider">
                Seller Hub
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Faisalabad Vendor Portal &bull; <span className="text-amber-200 font-medium">{user?.email}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={loadData}
            className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowAddProduct(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 hover:shadow-amber-500/25"
          >
            <Plus size={15} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400">Total Products</span>
              <div className="p-2 bg-slate-50 text-slate-700 rounded-xl">
                <Box size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-gray-900">{metrics.total_products}</p>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
              <CheckCircle2 size={11} /> In Active Catalog
            </span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-600">Low Stock Alerts</span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <AlertTriangle size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-rose-600">{metrics.low_stock_count}</p>
            <span className="text-[10px] text-rose-500 font-bold">
              &lt; 5 Units Available
            </span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400">Total Revenue</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <DollarSign size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-800">{formatPKR(metrics.total_revenue_pkr)}</p>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
              <TrendingUp size={11} /> Settled & In Transit
            </span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400">Store Orders</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <ShoppingCart size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-gray-900">{metrics.total_orders_count}</p>
            <span className="text-[10px] text-amber-600 font-bold">
              Customer Orders Placed
            </span>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 text-xs font-bold text-gray-500 space-x-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'inventory' 
              ? 'border-amber-600 text-amber-800 font-black' 
              : 'border-transparent hover:text-gray-900'
          }`}
        >
          <Layers size={15} />
          <span>Catalog & Inventory ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'orders' 
              ? 'border-amber-600 text-amber-800 font-black' 
              : 'border-transparent hover:text-gray-900'
          }`}
        >
          <ShoppingCart size={15} />
          <span>Store Orders ({orders.length})</span>
        </button>
      </div>

      {/* TAB 1: INVENTORY MANAGEMENT */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Search & Filter Controls */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search products by title or keywords..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>

            <div className="flex items-center space-x-2.5">
              <Filter size={15} className="text-gray-400 hidden sm:block" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {(productSearch || categoryFilter) && (
                <button
                  onClick={() => { setProductSearch(''); setCategoryFilter(''); }}
                  className="text-xs font-bold text-rose-600 hover:underline px-2 py-1"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 uppercase text-[10px] font-bold">
                    <th className="py-3.5 px-4">Product Info</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Price (PKR)</th>
                    <th className="py-3.5 px-4">Stock</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-gray-400">
                        <Package size={36} className="mx-auto mb-2 text-gray-300" />
                        <p className="font-bold text-gray-500">No products found in your catalog.</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Add a new product or adjust filters above.</p>
                      </td>
                    </tr>
                  ) : (
                    products.map((prod) => (
                      <tr key={prod.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={prod.primary_image || "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600"}
                              alt={prod.name}
                              className="w-10 h-10 object-cover rounded-xl border border-gray-200 flex-shrink-0 bg-gray-50"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 truncate max-w-xs sm:max-w-sm">{prod.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-gray-400 font-mono">SKU: {prod.sku}</span>
                                {prod.pack_size && (
                                  <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-medium">
                                    {prod.pack_size}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 font-semibold">{prod.category_name}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-black text-emerald-800">{formatPKR(prod.price)}</div>
                          {prod.original_price && prod.original_price > prod.price && (
                            <span className="text-[10px] text-gray-400 line-through">
                              {formatPKR(prod.original_price)}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`font-mono font-bold px-2 py-0.5 rounded-lg text-xs ${
                            prod.stock_quantity === 0 
                              ? 'bg-rose-100 text-rose-700' 
                              : prod.stock_quantity < 5 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            {prod.stock_quantity} units
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            !prod.is_active
                              ? 'bg-gray-100 text-gray-600'
                              : prod.stock_quantity > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {!prod.is_active ? "Inactive" : prod.stock_quantity > 0 ? "In Stock" : "Out of Stock"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => openQuickEdit(prod)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-200 transition-colors flex items-center gap-1"
                              title="Quick Stock & Price Edit"
                            >
                              <Edit2 size={12} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Deactivate Product"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Edit Modal */}
          {editingProduct && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900">Adjust Stock & Price</h3>
                    <p className="text-[11px] text-gray-400 truncate max-w-xs">{editingProduct.name}</p>
                  </div>
                  <button onClick={() => setEditingProduct(null)} className="p-1 text-gray-400 hover:text-gray-700">
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleQuickEditSave} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Selling Price (PKR) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Original Price (PKR) (Optional strike-through)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 550"
                      value={editOrigPrice}
                      onChange={(e) => setEditOrigPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Stock Quantity (Units) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editStock}
                      onChange={(e) => setEditStock(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updatingProduct}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md disabled:opacity-50"
                    >
                      {updatingProduct ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add Product Modal */}
          {showAddProduct && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <form onSubmit={handleCreateProduct} className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900">Add New Product to Your Store</h3>
                    <p className="text-[11px] text-gray-400">Created items are owned exclusively by your vendor account.</p>
                  </div>
                  <button type="button" onClick={() => setShowAddProduct(false)} className="p-1 text-gray-400 hover:text-gray-700">
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">Product Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lyallpur Special Basmati Rice 5kg"
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Category *</label>
                    <select
                      value={newProdCatId}
                      onChange={(e) => setNewProdCatId(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/40"
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
                      placeholder="e.g. 1 kg / 500ml / Pack of 2"
                      value={newProdPackSize}
                      onChange={(e) => setNewProdPackSize(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Selling Price (PKR) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 750"
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Original Price (PKR)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 850"
                      value={newProdOrigPrice}
                      onChange={(e) => setNewProdOrigPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Initial Stock Count *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newProdStock}
                      onChange={(e) => setNewProdStock(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Delivery Speed in Faisalabad</label>
                    <select
                      value={isSameDayExpress ? "same_day" : "standard"}
                      onChange={(e) => setIsSameDayExpress(e.target.value === "same_day")}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    >
                      <option value="same_day">Same-Day Express in FSD</option>
                      <option value="standard">Standard (1-2 Days)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">Image URL (Unsplash or direct image link)</label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={newProdImageUrl}
                      onChange={(e) => setNewProdImageUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">Search Keywords (for local search matching)</label>
                    <input
                      type="text"
                      placeholder="e.g. rice basmati daal grocer super kernel"
                      value={newProdKeywords}
                      onChange={(e) => setNewProdKeywords(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">Description & Quality Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Product highlights, quality guarantee, storage tips..."
                      value={newProdDesc}
                      onChange={(e) => setNewProdDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40"
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
                    disabled={creatingProduct}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md disabled:opacity-50"
                  >
                    {creatingProduct ? "Publishing..." : "Publish Product"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STORE ORDERS TABLE */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div>
              <h3 className="font-extrabold text-sm text-gray-900">Store Order Items</h3>
              <p className="text-[11px] text-gray-400">Showing order line items containing your vendor catalog products.</p>
            </div>

            {/* Filter by status */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-gray-400 font-medium">Order Status:</span>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
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
                <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 uppercase text-[10px] font-bold">
                  <th className="py-3 px-3">Order Number</th>
                  <th className="py-3 px-3">Product Name</th>
                  <th className="py-3 px-3">Quantity</th>
                  <th className="py-3 px-3">Unit Price</th>
                  <th className="py-3 px-3">Subtotal</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-400">
                      <ShoppingCart size={36} className="mx-auto mb-2 text-gray-300" />
                      <p className="font-bold text-gray-500">No order items found.</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">When customers order your products, line items will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  orders.map((ord, idx) => (
                    <tr key={`${ord.order_number}-${idx}`} className="hover:bg-amber-50/20 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-amber-950">
                        <Link to={`/tracking?order=${ord.order_number}`} className="hover:underline flex items-center gap-1">
                          <span>{ord.order_number}</span>
                          <ArrowUpRight size={11} className="text-gray-400" />
                        </Link>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-gray-900 max-w-xs truncate">{ord.product_name}</td>
                      <td className="py-3.5 px-3 font-mono font-bold text-gray-700">{ord.quantity}x</td>
                      <td className="py-3.5 px-3 text-gray-600">{formatPKR(ord.unit_price)}</td>
                      <td className="py-3.5 px-3 font-black text-emerald-800">{formatPKR(ord.total_pkr)}</td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          ord.status === "Delivered"
                            ? 'bg-green-100 text-green-800'
                            : ord.status === "Cancelled"
                            ? 'bg-rose-100 text-rose-800'
                            : ord.status === "Out for Delivery"
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right text-gray-400 text-[11px]">
                        {ord.created_at ? formatDate(ord.created_at) : '—'}
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
