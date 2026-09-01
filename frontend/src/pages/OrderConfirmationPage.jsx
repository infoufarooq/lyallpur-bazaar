import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Package, MapPin, Truck, ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import client from '../api/client';
import { formatPKR, formatDate } from '../utils/formatters';

export default function OrderConfirmationPage() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get(`/orders/track/${orderNumber}`)
      .then((res) => setOrder(res.data))
      .catch((err) => console.error("Order lookup error", err))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm text-gray-500">Generating your Faisalabad delivery order receipt...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Order Not Found</h2>
        <p className="text-xs text-gray-500">We could not find details for order #{orderNumber}.</p>
        <Link to="/" className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      {/* Celebration Box */}
      <div className="bg-emerald-900 text-white rounded-3xl p-6 sm:p-8 text-center space-y-3 relative overflow-hidden shadow-xl">
        <div className="w-16 h-16 bg-emerald-700/80 rounded-full flex items-center justify-center mx-auto text-emerald-200">
          <CheckCircle2 size={36} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">Thank You! Order Confirmed</h1>
        <p className="text-xs sm:text-sm text-emerald-100 max-w-md mx-auto">
          Your order has been received and sent to our Faisalabad distribution hub for fulfillment.
        </p>

        {/* Order Number Box */}
        <div className="inline-block bg-emerald-950/80 border border-emerald-700/60 px-5 py-2.5 rounded-2xl">
          <span className="text-xs text-emerald-300 block">Your Tracking Order ID:</span>
          <span className="text-lg font-mono font-bold tracking-wider text-amber-300">
            {order.order_number}
          </span>
        </div>
      </div>

      {/* Delivery & Summary Card */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-gray-100 text-xs">
          <div className="space-y-1">
            <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Recipient Details</span>
            <p className="font-bold text-gray-900 text-sm">{order.customer_name}</p>
            <p className="text-gray-600">{order.customer_phone}</p>
            {order.customer_email && <p className="text-gray-500">{order.customer_email}</p>}
          </div>

          <div className="space-y-1">
            <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Faisalabad Delivery Location</span>
            <p className="font-bold text-emerald-800 flex items-center gap-1">
              <MapPin size={13} /> {order.locality}
            </p>
            <p className="text-gray-600">{order.full_address}</p>
            {order.nearby_landmark && (
              <p className="text-gray-400 text-[11px]">Landmark: {order.nearby_landmark}</p>
            )}
          </div>
        </div>

        {/* Estimated arrival & Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-gray-100 text-xs">
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center space-x-3">
            <Truck size={20} className="text-emerald-700" />
            <div>
              <span className="font-bold text-emerald-900">Estimated Delivery:</span>
              <p className="text-emerald-800 font-medium">{order.estimated_delivery_date || "Within 24 hours"}</p>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-center space-x-3">
            <ShieldCheck size={20} className="text-gray-700" />
            <div>
              <span className="font-bold text-gray-900">Payment:</span>
              <p className="text-gray-600">{order.payment_method} ({order.payment_status})</p>
            </div>
          </div>
        </div>

        {/* Ordered Items */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
            Items in This Order
          </h3>
          <div className="divide-y divide-gray-100">
            {order.items?.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3 truncate">
                  {item.product_image && (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-10 h-10 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                    />
                  )}
                  <div className="truncate">
                    <p className="font-bold text-gray-900 truncate">{item.product_name}</p>
                    <p className="text-gray-400">Qty: {item.quantity} × {formatPKR(item.unit_price_pkr)}</p>
                  </div>
                </div>
                <span className="font-bold text-gray-900 whitespace-nowrap">
                  {formatPKR(item.subtotal_pkr)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Financials */}
        <div className="pt-3 border-t border-gray-100 space-y-1.5 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="font-semibold text-gray-900">{formatPKR(order.subtotal_pkr)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Delivery Fee</span>
            <span className="font-semibold text-gray-900">
              {order.delivery_fee_pkr === 0 ? "FREE" : formatPKR(order.delivery_fee_pkr)}
            </span>
          </div>
          <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-gray-100">
            <span>Total Payable to Courier</span>
            <span className="text-emerald-700 text-base">{formatPKR(order.total_amount_pkr)}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
          <Link
            to={`/tracking?order=${order.order_number}`}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Package size={16} />
            <span>Track Order Status</span>
          </Link>

          <Link
            to="/"
            className="w-full py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
          >
            <span>Continue Shopping</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
