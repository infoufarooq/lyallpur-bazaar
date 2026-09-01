import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import ProductCard from '../common/ProductCard';

export default function RecommendedGrid() {
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/products/recommended?limit=8')
      .then((res) => setRecommended(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || recommended.length === 0) return null;

  return (
    <section className="my-10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Recommended For You
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Handpicked top-rated products based on customer reviews
            </p>
          </div>
        </div>

        <Link
          to="/search"
          className="text-xs sm:text-sm font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1 hover:underline"
        >
          <span>Explore All</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-5">
        {recommended.map((prod) => (
          <ProductCard key={prod.id} product={prod} />
        ))}
      </div>
    </section>
  );
}
