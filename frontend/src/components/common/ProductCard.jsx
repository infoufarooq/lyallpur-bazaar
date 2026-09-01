import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Check, Zap, Clock } from 'lucide-react';
import { formatPKR } from '../../utils/formatters';
import RatingStars from './RatingStars';
import { useCart } from '../../context/CartContext';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock_quantity <= 0) return;

    setAdding(true);
    try {
      await addToCart(product.id, 1, true);
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const isOutOfStock = product.stock_quantity <= 0;
  const isSameDay = product.estimated_delivery_days === 0;

  return (
    <div className="group bg-white rounded-xl border border-gray-200/80 hover:border-emerald-500/50 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden relative">
      {/* Top Badges */}
      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1">
        {product.discount_percent > 0 && (
          <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
            {product.discount_percent}% OFF
          </span>
        )}
        {isSameDay ? (
          <span className="bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-sm flex items-center gap-0.5">
            <Zap size={10} className="fill-current" /> Same Day FSD
          </span>
        ) : (
          <span className="bg-slate-700/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md backdrop-blur-sm flex items-center gap-0.5">
            <Clock size={10} /> 1-2 Days
          </span>
        )}
      </div>

      {/* Image */}
      <Link to={`/product/${product.slug}`} className="block relative aspect-square bg-gray-50 overflow-hidden">
        <img
          src={product.primary_image || "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Out of Stock
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand & Category */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
            <span className="font-semibold text-emerald-700 uppercase tracking-wider truncate">
              {product.brand_name || "Lyallpur Local"}
            </span>
            {product.pack_size && (
              <span className="text-gray-400 font-medium">{product.pack_size}</span>
            )}
          </div>

          {/* Product Name */}
          <Link
            to={`/product/${product.slug}`}
            className="block text-sm font-medium text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 mb-2 leading-snug"
            title={product.name}
          >
            {product.name}
          </Link>
        </div>

        <div>
          {/* Rating */}
          <div className="mb-2">
            <RatingStars rating={product.rating || 4.5} count={product.review_count || 12} size={12} />
          </div>

          {/* Price & Action */}
          <div className="flex items-end justify-between pt-1 border-t border-gray-100">
            <div>
              <div className="text-base font-bold text-gray-900 leading-none">
                {formatPKR(product.price)}
              </div>
              {product.original_price && product.original_price > product.price && (
                <div className="text-xs text-gray-400 line-through mt-0.5">
                  {formatPKR(product.original_price)}
                </div>
              )}
            </div>

            <button
              onClick={handleAdd}
              disabled={isOutOfStock || adding}
              className={`p-2 rounded-lg font-medium text-xs transition-all flex items-center gap-1 shadow-sm ${
                isOutOfStock
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : added
                  ? 'bg-green-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white'
              }`}
              title={isOutOfStock ? 'Currently unavailable' : 'Add to cart'}
            >
              {added ? (
                <>
                  <Check size={16} />
                  <span className="hidden sm:inline">Added</span>
                </>
              ) : (
                <>
                  <ShoppingCart size={16} />
                  <span className="hidden sm:inline">Add</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
