import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Clock, ArrowRight } from 'lucide-react';
import client from '../../api/client';
import ProductCard from '../common/ProductCard';

export default function FlashDeals() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 7, minutes: 42, seconds: 18 });

  useEffect(() => {
    client.get('/products/best-deals?limit=4')
      .then((res) => setDeals(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Countdown timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading || deals.length === 0) return null;

  return (
    <section className="my-10 bg-gradient-to-r from-orange-500/10 via-rose-500/10 to-amber-500/10 p-5 sm:p-7 rounded-3xl border border-orange-200/60">
      {/* Header with Countdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-md shadow-rose-600/20">
            <Flame size={22} className="animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Flash Deals & Best Discounts
              </h2>
              <span className="bg-rose-100 text-rose-700 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-rose-200 uppercase">
                Limited Time
              </span>
            </div>
            <p className="text-xs text-gray-500">Unbeatable prices on grocery, electronics and home essentials</p>
          </div>
        </div>

        {/* Countdown Pill */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
            <Clock size={13} /> Ends in:
          </span>
          <div className="flex items-center space-x-1 font-mono text-xs font-bold">
            <span className="bg-gray-900 text-white px-2 py-1 rounded-md">
              {String(timeLeft.hours).padStart(2, '0')}h
            </span>
            <span className="text-gray-900 font-bold">:</span>
            <span className="bg-gray-900 text-white px-2 py-1 rounded-md">
              {String(timeLeft.minutes).padStart(2, '0')}m
            </span>
            <span className="text-gray-900 font-bold">:</span>
            <span className="bg-rose-600 text-white px-2 py-1 rounded-md">
              {String(timeLeft.seconds).padStart(2, '0')}s
            </span>
          </div>
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {deals.map((prod) => (
          <ProductCard key={prod.id} product={prod} />
        ))}
      </div>

      {/* Footer link */}
      <div className="mt-5 text-center">
        <Link
          to="/search?deals=true"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-rose-700 hover:text-rose-800 bg-white hover:bg-rose-50 px-5 py-2.5 rounded-xl border border-rose-200 shadow-sm transition-all"
        >
          <span>View All Discounted Items in Faisalabad</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}
