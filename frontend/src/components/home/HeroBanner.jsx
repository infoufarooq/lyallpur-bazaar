import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, ShieldCheck, Zap, ArrowRight, Clock } from 'lucide-react';
import SearchBar from '../common/SearchBar';
import { POPULAR_SEARCH_TAGS } from '../../utils/constants';

export default function HeroBanner() {
  const navigate = useNavigate();

  return (
    <div className="relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white rounded-3xl overflow-hidden shadow-xl p-6 sm:p-10 my-4 border border-emerald-700/40">
      {/* Background glowing gradients */}
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
        {/* City Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-700/60 border border-emerald-500/40 text-emerald-200 text-xs font-semibold backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Delivering across Faisalabad City</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
          Everything you need, <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-300">
            delivered in Faisalabad.
          </span>
        </h1>

        <p className="text-emerald-100 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-normal">
          From fresh grocery staples and washing powders to electronics and authentic Faisalabad fabrics. Order today for doorstep delivery.
        </p>

        {/* Large Prominent Search in Hero */}
        <div className="max-w-2xl mx-auto pt-2">
          <SearchBar placeholder="Search 'Surf Excel 1kg', 'Dalda Oil', 'Milk', 'Mobile Charger'..." />
        </div>

        {/* Quick Search Tag Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
          <span className="text-emerald-300 font-semibold">Popular in FSD:</span>
          {POPULAR_SEARCH_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}
              className="bg-emerald-950/70 hover:bg-emerald-700/80 text-emerald-100 px-3 py-1 rounded-full border border-emerald-600/40 transition-all hover:scale-105 active:scale-95"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Key Features row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-6 max-w-2xl mx-auto text-left">
          <div className="bg-emerald-950/40 backdrop-blur-sm p-3 rounded-2xl border border-emerald-700/30 flex items-center space-x-3">
            <div className="p-2 bg-emerald-700/60 rounded-xl text-emerald-300">
              <Zap size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Same-Day Express</p>
              <p className="text-[10px] text-emerald-200">Order by 4:00 PM</p>
            </div>
          </div>

          <div className="bg-emerald-950/40 backdrop-blur-sm p-3 rounded-2xl border border-emerald-700/30 flex items-center space-x-3">
            <div className="p-2 bg-emerald-700/60 rounded-xl text-emerald-300">
              <Truck size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">FREE Delivery</p>
              <p className="text-[10px] text-emerald-200">On orders Rs. 2,500+</p>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-emerald-950/40 backdrop-blur-sm p-3 rounded-2xl border border-emerald-700/30 flex items-center space-x-3">
            <div className="p-2 bg-emerald-700/60 rounded-xl text-emerald-300">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Cash on Delivery</p>
              <p className="text-[10px] text-emerald-200">Check then pay</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
