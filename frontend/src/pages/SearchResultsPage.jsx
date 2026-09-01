import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Filter, SlidersHorizontal, ArrowUpDown, X, 
  HelpCircle, ArrowLeftRight, Check, Zap, ShoppingBag 
} from 'lucide-react';
import client from '../api/client';
import ProductCard from '../components/common/ProductCard';
import { formatPKR } from '../utils/formatters';

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';
  const brandParam = searchParams.get('brand') || '';
  const isDeals = searchParams.get('deals') === 'true';

  const [data, setData] = useState({
    items: [],
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 1,
    is_exact_match: true,
    alternative_suggestions: [],
    categories: [],
    brands: []
  });
  const [loading, setLoading] = useState(true);

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedBrand, setSelectedBrand] = useState(brandParam);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sameDayOnly, setSameDayOnly] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useEffect(() => {
    setSelectedCategory(categoryParam);
  }, [categoryParam]);

  useEffect(() => {
    setSelectedBrand(brandParam);
  }, [brandParam]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedBrand) params.append('brand', selectedBrand);
      if (inStockOnly) params.append('in_stock', 'true');
      if (sameDayOnly) params.append('same_day', 'true');
      if (isDeals) params.append('best_deals', 'true');
      if (sortBy) params.append('sort_by', sortBy);
      if (minPrice) params.append('min_price', minPrice);
      if (maxPrice) params.append('max_price', maxPrice);

      const endpoint = query ? `/search?${params.toString()}` : `/products?${params.toString()}`;
      const res = await client.get(endpoint);
      setData(res.data);
    } catch (err) {
      console.error("Search error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [query, selectedCategory, selectedBrand, inStockOnly, sameDayOnly, sortBy, isDeals]);

  const handleApplyPriceFilter = (e) => {
    e.preventDefault();
    fetchResults();
  };

  const handleClearFilters = () => {
    setSelectedCategory('');
    setSelectedBrand('');
    setInStockOnly(false);
    setSameDayOnly(false);
    setMinPrice('');
    setMaxPrice('');
    setSortBy('relevance');
    setSearchParams(query ? { q: query } : {});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header breadcrumb & summary */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            {query ? (
              <>Results for <span className="text-emerald-700">"{query}"</span></>
            ) : selectedCategory ? (
              <>Category: <span className="text-emerald-700 capitalize">{selectedCategory.replace(/-/g, ' ')}</span></>
            ) : isDeals ? (
              <>⚡ Flash Deals & Top Discounts</>
            ) : (
              <>All Products in Faisalabad</>
            )}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Showing {data.items?.length || 0} of {data.total || 0} products available for delivery
          </p>
        </div>

        {/* Controls: Sort and Mobile filter toggle */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="md:hidden flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 shadow-sm"
          >
            <Filter size={14} />
            <span>Filters</span>
          </button>

          <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 text-xs shadow-sm">
            <span className="text-gray-400 font-medium whitespace-nowrap">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent font-bold text-gray-800 focus:outline-none cursor-pointer"
            >
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest Added</option>
              <option value="discount">Best Discount %</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Sidebar Filters */}
        <aside className={`md:block ${mobileFilterOpen ? 'block' : 'hidden'} space-y-6 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm self-start`}>
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
              <SlidersHorizontal size={15} className="text-emerald-700" />
              <span>Filter Products</span>
            </h3>
            {(selectedCategory || selectedBrand || inStockOnly || sameDayOnly || minPrice || maxPrice) && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold"
              >
                Reset All
              </button>
            )}
          </div>

          {/* Delivery & Stock Toggles */}
          <div className="space-y-2.5">
            <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-gray-700 hover:text-emerald-700">
              <input
                type="checkbox"
                checked={sameDayOnly}
                onChange={(e) => setSameDayOnly(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
              />
              <span className="flex items-center gap-1">
                <Zap size={13} className="text-amber-500 fill-current" /> Same-Day Delivery in FSD
              </span>
            </label>

            <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-gray-700 hover:text-emerald-700">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
              />
              <span>In Stock Only</span>
            </label>
          </div>

          {/* Categories Filter */}
          {data.categories && data.categories.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400">Categories</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {data.categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(selectedCategory === cat.slug ? '' : cat.slug)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      selectedCategory === cat.slug
                        ? 'bg-emerald-50 text-emerald-800 font-bold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">({cat.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Brands Filter */}
          {data.brands && data.brands.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400">Brands</h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {data.brands.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBrand(selectedBrand === b.slug ? '' : b.slug)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      selectedBrand === b.slug
                        ? 'bg-emerald-50 text-emerald-800 font-bold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{b.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">({b.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price Range Filter */}
          <div className="space-y-2.5 pt-2 border-t border-gray-100">
            <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400">Price Range (PKR)</h4>
            <form onSubmit={handleApplyPriceFilter} className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors"
              >
                Apply Price
              </button>
            </form>
          </div>
        </aside>

        {/* Right Main Results Grid */}
        <main className="md:col-span-3">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-72 bg-gray-100 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : data.items && data.items.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4">
              {data.items.map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          ) : (
            /* NO EXACT MATCH FALLBACK WITH ALTERNATIVE PRODUCTS */
            <div className="space-y-8">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                  <ArrowLeftRight size={24} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-amber-900">
                  We could not find an exact match for "{query}".
                </h3>
                <p className="text-xs sm:text-sm text-amber-800 max-w-md mx-auto">
                  The exact pack size or brand may be temporarily unavailable. Here are similar products and alternative choices available for delivery in Faisalabad:
                </p>
              </div>

              {/* Display Smart Alternatives */}
              {data.alternative_suggestions && data.alternative_suggestions.length > 0 && (
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="p-1 bg-emerald-100 text-emerald-700 rounded-md">
                      <ShoppingBag size={16} />
                    </span>
                    <span>Recommended Alternative Products</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4">
                    {data.alternative_suggestions.map((prod) => (
                      <ProductCard key={prod.id} product={prod} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
