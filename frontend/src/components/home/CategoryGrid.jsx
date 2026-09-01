import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingBag, Coffee, Sparkles, Heart, Baby, 
  Tv, Smartphone, Home, Shirt, Activity, Grid 
} from 'lucide-react';
import client from '../../api/client';

const ICON_MAP = {
  ShoppingBag,
  Coffee,
  Sparkles,
  Heart,
  Baby,
  Tv,
  Smartphone,
  Home,
  Shirt,
  Activity
};

export default function CategoryGrid() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/categories')
      .then((res) => setCategories(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="my-8">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="my-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Browse Categories
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            Explore everyday essentials and specialized products
          </p>
        </div>
        <Link
          to="/search"
          className="text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
        >
          <span>View All</span>
          <Grid size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        {categories.map((cat) => {
          const IconComponent = ICON_MAP[cat.icon_name] || ShoppingBag;
          return (
            <Link
              key={cat.id}
              to={`/search?category=${encodeURIComponent(cat.slug)}`}
              className="group p-4 bg-white rounded-2xl border border-gray-200/80 hover:border-emerald-500/60 hover:shadow-md transition-all duration-200 flex flex-col items-center text-center relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2.5 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200">
                <IconComponent size={22} />
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                {cat.name}
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {cat.product_count || 0} products
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
