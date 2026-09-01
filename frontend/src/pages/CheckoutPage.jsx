import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, MapPin, Truck, Zap, Banknote, 
  CreditCard, CheckCircle2, ShieldCheck, ArrowLeft 
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useDelivery } from '../context/DeliveryContext';
import client from '../api/client';
import { formatPKR } from '../utils/formatters';
import { FAISALABAD_LOCALITIES } from '../utils/constants';

export default function CheckoutPage() {
  const { cart, subtotal, clearCartState } = useCart();
  const { user } = useAuth();
  const { selectedLocality } = useDelivery();
  const navigate = useNavigate();

  // Form State
  const [customerName, setCustomerName] = useState(user?.full_name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone_number || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [locality, setLocality] = useState(selectedLocality || FAISALABAD_LOCALITIES[0]);
  const [fullAddress, setFullAddress] = useState('');
  const [nearbyLandmark, setNearbyLandmark] = useState('');
  const [deliverySpeed, setDeliverySpeed] = useState('Standard Delivery');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill from user's saved default address
  React.useEffect(() => {
    if (user && user.addresses && user.addresses.length > 0) {
      const def = user.addresses.find(a => a.is_default) || user.addresses[0];
      if (def) {
        setCustomerName(def.recipient_name || user.full_name);
        setCustomerPhone(def.phone_number || user.phone_number);
        setLocality(def.locality || locality);
        setFullAddress(def.full_address || '');
        setNearbyLandmark(def.nearby_landmark || '');
      }
    }
  }, [user]);

  const sameDayExtra = deliverySpeed === 'Same-Day Express' ? 80 : 0;
  const isFreeDelivery = subtotal >= 2500;
  const deliveryFee = isFreeDelivery ? sameDayExtra : (120 + sameDayExtra);
  const finalTotal = subtotal + deliveryFee;

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setError('');

    if (!customerName.trim() || !customerPhone.trim() || !fullAddress.trim()) {
      setError('Please fill in all required fields (Name, Phone number, Full address).');
      return;
    }

    if (!cart.items || cart.items.length === 0) {
      setError('Your cart is empty.');
      return;
    }

    setLoading(true);
    try {
      const sessionToken = localStorage.getItem('lyallpur_cart_session');
      const payload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || null,
        city: 'Faisalabad',
        locality: locality,
        full_address: fullAddress.trim(),
        nearby_landmark: nearbyLandmark.trim() || null,
        delivery_speed: deliverySpeed,
        payment_method: paymentMethod,
        delivery_notes: deliveryNotes.trim() || null,
        cart_session_token: sessionToken
      };

      const res = await client.post('/orders', payload);
      const order = res.data;

      // Clear cart
      clearCartState();
      localStorage.removeItem('lyallpur_cart_session');

      // Navigate to confirmation page
      navigate(`/order-confirmation/${order.order_number}`);
    } catch (err) {
      console.error("Order submission failed", err);
      setError(err.response?.data?.detail || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Your Cart is Empty</h2>
        <p className="text-xs text-gray-500">Please add items to your cart before proceeding to checkout.</p>
        <Link to="/" className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs">
          Return to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Checkout</h1>
          <p className="text-xs text-gray-500">Fast doorstep delivery across Faisalabad</p>
        </div>
        <Link to="/cart" className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Cart
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-800 animate-in fade-in">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 4-Step Checkout Form */}
        <div className="lg:col-span-8 space-y-6">
          {/* STEP 1: Customer Info */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                1
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-900">Customer Information</h3>
                <p className="text-[11px] text-gray-400">Contact person for delivery coordination</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Usman"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mobile Phone Number (Pakistan) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="0321-1234567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* STEP 2: Delivery Address */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                2
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-900">Faisalabad Delivery Address</h3>
                <p className="text-[11px] text-gray-400">Strictly within Faisalabad municipal limits</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Faisalabad"
                    className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Faisalabad Area / Locality *
                  </label>
                  <select
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {FAISALABAD_LOCALITIES.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Full Street Address (House/Shop #, Street, Block) *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. House 42-B, Street 7, Near Chenab Club, Peoples Colony No. 1"
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nearby Famous Landmark
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Chenab Club / D Ground / Susan Road Chungi"
                  value={nearbyLandmark}
                  onChange={(e) => setNearbyLandmark(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* STEP 3: Delivery Speed */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                3
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-900">Choose Delivery Speed</h3>
                <p className="text-[11px] text-gray-400">Configured based on your Faisalabad zone</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setDeliverySpeed('Standard Delivery')}
                className={`p-4 rounded-2xl border-2 cursor-pointer flex items-start space-x-3 transition-all ${
                  deliverySpeed === 'Standard Delivery'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                }`}
              >
                <input
                  type="radio"
                  name="delivery_speed"
                  checked={deliverySpeed === 'Standard Delivery'}
                  onChange={() => setDeliverySpeed('Standard Delivery')}
                  className="mt-1 text-emerald-600"
                />
                <div>
                  <p className="text-xs font-extrabold text-gray-900">Standard Delivery (1-2 Days)</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {isFreeDelivery ? "FREE Delivery in FSD" : "Base fee: Rs. 120"}
                  </p>
                </div>
              </label>

              <label
                onClick={() => setDeliverySpeed('Same-Day Express')}
                className={`p-4 rounded-2xl border-2 cursor-pointer flex items-start space-x-3 transition-all ${
                  deliverySpeed === 'Same-Day Express'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                }`}
              >
                <input
                  type="radio"
                  name="delivery_speed"
                  checked={deliverySpeed === 'Same-Day Express'}
                  onChange={() => setDeliverySpeed('Same-Day Express')}
                  className="mt-1 text-emerald-600"
                />
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-extrabold text-gray-900">Same-Day Express</p>
                    <span className="p-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                      <Zap size={10} className="inline fill-current" /> Express
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Delivered today by 8:00 PM (+Rs. 80 express fee)
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* STEP 4: Payment Method */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                4
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-900">Payment Option</h3>
                <p className="text-[11px] text-gray-400">Pay safely upon arrival in Faisalabad</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <label
                onClick={() => setPaymentMethod('Cash on Delivery')}
                className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                  paymentMethod === 'Cash on Delivery'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                    <Banknote size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-gray-900">Cash on Delivery (COD)</p>
                    <p className="text-[11px] text-gray-500">Pay with exact cash when courier arrives</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'Cash on Delivery'}
                  onChange={() => setPaymentMethod('Cash on Delivery')}
                  className="text-emerald-600"
                />
              </label>

              {/* Digital Wallets placeholder (JazzCash/Easypaisa) */}
              <div className="p-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 flex items-center justify-between opacity-70">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 text-orange-800 rounded-xl">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700">JazzCash / Easypaisa / Cards</p>
                    <p className="text-[11px] text-gray-400">Coming soon in Phase 2 gateway rollout</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                  Soon
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Order Review & Place Order Button */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4 sticky top-24">
            <h3 className="text-base font-extrabold text-gray-900 pb-3 border-b border-gray-100">
              Items in Your Order ({cart.total_items})
            </h3>

            <div className="max-h-52 overflow-y-auto space-y-2.5 pr-1 divide-y divide-gray-50 text-xs">
              {cart.items.map((item) => (
                <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                  <div className="truncate flex-1">
                    <p className="font-semibold text-gray-800 truncate">{item.product?.name}</p>
                    <p className="text-gray-400 text-[10px]">Qty: {item.quantity} × {formatPKR(item.unit_price)}</p>
                  </div>
                  <span className="font-bold text-gray-900 whitespace-nowrap">
                    {formatPKR(item.item_total)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-xs pt-3 border-t border-gray-100">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-bold text-gray-900">{formatPKR(subtotal)}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee ({locality})</span>
                <span className="font-bold">
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-700 uppercase font-bold">FREE</span>
                  ) : (
                    formatPKR(deliveryFee)
                  )}
                </span>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-between text-base font-black text-gray-900">
                <span>Order Total</span>
                <span className="text-emerald-700 text-xl">{formatPKR(finalTotal)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold rounded-xl text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Placing your order...</span>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Confirm Order ({formatPKR(finalTotal)})</span>
                </>
              )}
            </button>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-[11px] text-emerald-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-600" /> Lyallpur Buyer Protection
              </p>
              <p className="text-emerald-800">
                Pay upon physical inspection. No advance payment required.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
