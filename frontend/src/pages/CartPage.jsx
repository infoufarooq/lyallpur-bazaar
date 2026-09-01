import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Plus, Minus, Trash2, ArrowRight, 
  ArrowLeft, Truck, ShieldCheck, Zap 
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPKR } from '../utils/formatters';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, totalItems, subtotal } = useCart();
  const navigate = useNavigate();

  const freeProgress = Math.min(100, Math.round((subtotal / cart.free_delivery_threshold_pkr) * 100));
  const freeRemaining = Math.max(0, cart.free_delivery_threshold_pkr - subtotal);

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <ShoppingBag size={36} />
        </div>
        <h2 className="text-2xl font-black text-gray-900">Your Cart is Empty</h2>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Looks like you haven't added any products to your cart yet. Discover groceries, appliances, and fashion in Faisalabad.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition-all"
        >
          <ArrowLeft size={16} />
          <span>Continue Shopping</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Shopping Cart</h1>
          <p className="text-xs text-gray-500">Review your selected products and checkout</p>
        </div>
        <Link to="/" className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Continue Shopping
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Cart Items Table */}
        <div className="lg:col-span-8 space-y-4">
          {/* Free Delivery Bar */}
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <div className="flex items-center justify-between text-xs font-semibold mb-2 text-emerald-900">
              <span className="flex items-center gap-1.5">
                <Truck size={16} className="text-emerald-600" />
                {freeRemaining > 0 ? (
                  <>Add <span className="text-emerald-700 font-bold">{formatPKR(freeRemaining)}</span> more for FREE Delivery in Faisalabad!</>
                ) : (
                  <span className="text-emerald-700 font-bold">🎉 FREE Delivery in Faisalabad Unlocked!</span>
                )}
              </span>
              <span>{freeProgress}%</span>
            </div>
            <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${freeProgress}%` }}
              />
            </div>
          </div>

          {/* Items Box */}
          <div className="bg-white rounded-3xl border border-gray-200/80 overflow-hidden shadow-sm divide-y divide-gray-100">
            {cart.items.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <img
                    src={item.product?.primary_image || "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600"}
                    alt={item.product?.name}
                    className="w-18 h-18 sm:w-20 sm:h-20 object-cover rounded-xl border border-gray-200 flex-shrink-0"
                  />
                  <div className="space-y-1">
                    <Link
                      to={`/product/${item.product?.slug}`}
                      className="text-sm font-bold text-gray-900 hover:text-emerald-700 line-clamp-2"
                    >
                      {item.product?.name}
                    </Link>
                    <p className="text-xs text-gray-400">
                      Unit Price: <span className="font-semibold text-gray-700">{formatPKR(item.unit_price)}</span>
                    </p>
                    {item.product?.pack_size && (
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {item.product?.pack_size}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center justify-between sm:justify-end space-x-6 w-full sm:w-auto">
                  {/* Quantity */}
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="px-3 py-1 text-xs font-bold text-gray-900 min-w-[28px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Total */}
                  <div className="text-right min-w-[90px]">
                    <span className="text-sm font-black text-gray-900">
                      {formatPKR(item.item_total)}
                    </span>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remove product"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-gray-900 pb-3 border-b border-gray-100">
              Order Summary
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({totalItems} items)</span>
                <span className="font-bold text-gray-900">{formatPKR(subtotal)}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Faisalabad Delivery</span>
                <span className="font-bold">
                  {cart.delivery_fee_pkr === 0 ? (
                    <span className="text-emerald-700 font-extrabold uppercase">FREE</span>
                  ) : (
                    formatPKR(cart.delivery_fee_pkr)
                  )}
                </span>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-between text-base font-black text-gray-900">
                <span>Estimated Total</span>
                <span className="text-emerald-700 text-lg">{formatPKR(cart.estimated_total_pkr)}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={16} />
            </button>

            <div className="pt-2 text-[11px] text-gray-400 space-y-1.5 text-center">
              <p className="flex items-center justify-center gap-1 text-emerald-700 font-semibold">
                <ShieldCheck size={14} /> Cash on Delivery Available
              </p>
              <p>Safe & contactless delivery right to your door</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
