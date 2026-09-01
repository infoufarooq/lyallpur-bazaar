import React from 'react';
import { ArrowLeftRight, Sparkles } from 'lucide-react';
import ProductCard from '../common/ProductCard';
import { formatPKR } from '../../utils/formatters';

export default function AlternativesList({ alternatives = [], similar = [], currentPrice = 0 }) {
  if ((!alternatives || alternatives.length === 0) && (!similar || similar.length === 0)) {
    return null;
  }

  const minComp = Math.round(currentPrice * 0.7);
  const maxComp = Math.round(currentPrice * 1.3);

  return (
    <div className="mt-12 space-y-10">
      {/* 1. Alternative Products Section */}
      {alternatives && alternatives.length > 0 && (
        <section className="bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-amber-50/50 p-5 sm:p-7 rounded-3xl border border-emerald-200/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-600/20">
                <ArrowLeftRight size={20} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                  Alternative Choices & Comparable Options
                </h3>
                <p className="text-xs text-gray-500">
                  Alternative brands, different pack sizes, and options within comparable price range ({formatPKR(minComp)} - {formatPKR(maxComp)})
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-white px-3 py-1 rounded-full border border-emerald-200 shadow-sm self-start sm:self-auto">
              Smart Alternative Matching
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {alternatives.slice(0, 4).map((alt) => (
              <ProductCard key={alt.id} product={alt} />
            ))}
          </div>
        </section>
      )}

      {/* 2. Similar Products Section */}
      {similar && similar.length > 0 && (
        <section>
          <div className="flex items-center space-x-2.5 mb-5">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                Similar Products You May Like
              </h3>
              <p className="text-xs text-gray-500">
                Customers who viewed this item also looked at these
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-5">
            {similar.slice(0, 4).map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
