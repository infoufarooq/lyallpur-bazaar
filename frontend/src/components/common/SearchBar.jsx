import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ShoppingBag, Tag, Sparkles } from 'lucide-react';
import client from '../../api/client';
import { formatPKR } from '../../utils/formatters';

export default function SearchBar({ placeholder = "Search for products, brands, groceries in Faisalabad...", className = "" }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef(null);

  // Debounced auto-suggestions
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await client.get(`/search/suggestions?q=${encodeURIComponent(query.trim())}`);
        setSuggestions(res.data);
      } catch (err) {
        console.error("Suggestion error", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setIsOpen(false);
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSuggestionClick = (item) => {
    setIsOpen(false);
    if (item.type === 'product' && item.slug) {
      navigate(`/product/${item.slug}`);
    } else if (item.type === 'category') {
      navigate(`/search?category=${encodeURIComponent(item.slug || item.title)}`);
    } else if (item.type === 'brand') {
      navigate(`/search?brand=${encodeURIComponent(item.slug || item.title)}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(item.title)}`);
    }
  };

  return (
    <div ref={searchRef} className={`relative w-full ${className}`}>
      <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-12 pr-28 py-3 bg-white text-gray-900 placeholder-gray-400 rounded-xl border-2 border-emerald-500/30 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm md:text-base shadow-sm font-normal"
        />
        <div className="absolute left-4 text-emerald-600">
          <Search size={20} />
        </div>

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSuggestions([]);
            }}
            className="absolute right-24 p-1 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}

        <button
          type="submit"
          className="absolute right-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
        >
          <span>Search</span>
        </button>
      </form>

      {/* Auto Suggestions Dropdown */}
      {isOpen && (query.trim().length >= 2 || suggestions.length > 0) && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {loading && (
            <div className="px-4 py-3 text-xs text-gray-400 flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
              Searching Faisalabad catalog...
            </div>
          )}

          {suggestions.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Suggestions & Products
              </div>
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSuggestionClick(item)}
                  className="px-4 py-2.5 hover:bg-emerald-50 cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-9 h-9 object-cover rounded-md border border-gray-100 flex-shrink-0"
                      />
                    ) : item.type === 'category' ? (
                      <div className="w-9 h-9 bg-emerald-100 rounded-md flex items-center justify-center text-emerald-700 flex-shrink-0">
                        <ShoppingBag size={16} />
                      </div>
                    ) : (
                      <div className="w-9 h-9 bg-orange-100 rounded-md flex items-center justify-center text-orange-700 flex-shrink-0">
                        <Tag size={16} />
                      </div>
                    )}
                    <div className="truncate">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-emerald-700 truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">
                        {item.category_name || item.type}
                      </p>
                    </div>
                  </div>
                  {item.price !== undefined && item.price !== null && (
                    <span className="text-xs font-bold text-emerald-700 whitespace-nowrap pl-2">
                      {formatPKR(item.price)}
                    </span>
                  )}
                </div>
              ))}
              <div
                onClick={handleSearchSubmit}
                className="px-4 py-2.5 bg-gray-50 hover:bg-emerald-100/50 cursor-pointer border-t border-gray-100 text-xs font-semibold text-emerald-700 flex items-center justify-between"
              >
                <span>View all results for "{query}"</span>
                <Search size={14} />
              </div>
            </div>
          ) : !loading && query.length >= 2 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500">
                Press Enter to search for <span className="font-semibold text-emerald-700">"{query}"</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                We'll match products or suggest smart alternatives available in Faisalabad.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
