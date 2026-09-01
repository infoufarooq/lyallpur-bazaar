import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, Truck } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatPKR } from '../../utils/formatters';

export default function CartDrawer() {
  const { cart, isDrawerOpen, setIsDrawerOpen, updateQuantity, removeFromCart, totalItems, subtotal } = useCart();
  const navigate = useNavigate();

  if (!isDrawerOpen) return null;

  const freeProgress = Math.min(100, Math.round((subtotal / cart.free_delivery_threshold_pkr) * 100));
  const freeRemaining = Math.max(0, cart.free_delivery_threshold_pkr - subtotal);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsDrawerOpen(false)}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250">
        {/* Drawer Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-emerald-800 text-white">
          <div className="flex items-center space-x-2">
            <ShoppingBag size={20} className="text-emerald-300" />
            <h3 className="font-bold text-base">Your Shopping Cart ({totalItems})</h3>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-700 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Free Delivery Bar */}
        <div className="p-3 bg-emerald-50 border-b border-emerald-100">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5 text-emerald-900">
            <span className="flex items-center gap-1">
              <Truck size={14} className="text-emerald-600" />
              {freeRemaining > 0 ? (
                <>Add <span className="text-emerald-700 font-bold">{formatPKR(freeRemaining)}</span> for FREE Delivery</>
              ) : (
                <span className="text-emerald-700 font-bold">🎉 You unlocked FREE Delivery in Faisalabad!</span>
              )}
            </span>
            <span>{freeProgress}%</span>
          </div>
          <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${freeProgress}%` }}
            />
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-gray-100">
          {cart.items && cart.items.length > 0 ? (
            cart.items.map((item) => (
              <div key={item.id} className="pt-3 first:pt-0 flex items-start space-x-3">
                <img
                  src={item.product?.primary_image || "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600"}
                  alt={item.product?.name}
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">
                    {item.product?.name}
                  </h4>
                  <p className="text-xs font-bold text-emerald-700 mt-1">
                    {formatPKR(item.unit_price)}
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    {/* Quantity Selector */}
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-1 text-gray-500 hover:bg-gray-100 transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="px-2.5 py-0.5 text-xs font-bold text-gray-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-1 text-gray-500 hover:bg-gray-100 transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-3">
                <ShoppingBag size={28} />
              </div>
              <p className="text-sm font-semibold text-gray-700">Your cart is empty</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                Explore our catalog for daily grocery and household essentials in Faisalabad.
              </p>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Start Shopping
              </button>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        {cart.items && cart.items.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900">{formatPKR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery (Faisalabad)</span>
                <span className="font-semibold text-gray-900">
                  {cart.delivery_fee_pkr === 0 ? (
                    <span className="text-emerald-600 uppercase font-bold">FREE</span>
                  ) : (
                    formatPKR(cart.delivery_fee_pkr)
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total Amount</span>
                <span className="text-emerald-700 text-base">{formatPKR(cart.estimated_total_pkr)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  navigate('/cart');
                }}
                className="w-full py-2.5 border border-emerald-600 text-emerald-700 font-bold rounded-xl text-xs hover:bg-emerald-50 transition-colors"
              >
                View Full Cart
              </button>
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  navigate('/checkout');
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-colors"
              >
                <span>Checkout</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
