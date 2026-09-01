import React from 'react';
import { MapPin, Truck, Zap, ShieldCheck, Clock } from 'lucide-react';
import { useDelivery } from '../../context/DeliveryContext';
import { formatPKR } from '../../utils/formatters';

export default function DeliveryEstimator({ productPrice = 0 }) {
  const { selectedLocality, setIsModalOpen, estimate } = useDelivery();

  const isSameDayAvailable = estimate?.is_same_day_available_now ?? true;
  const isFreeDelivery = productPrice >= 2500;
  const deliveryFee = isFreeDelivery ? 0 : (estimate?.base_fee_pkr || 120);

  return (
    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3.5 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
          Faisalabad Delivery Info
        </span>
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
        >
          <MapPin size={13} />
          <span>Change Location</span>
        </button>
      </div>

      {/* Selected location pill */}
      <div className="flex items-center space-x-2 text-slate-800 font-semibold bg-white p-2.5 rounded-xl border border-slate-200">
        <MapPin size={16} className="text-emerald-600 flex-shrink-0" />
        <span className="truncate">Delivering to: {selectedLocality}</span>
      </div>

      {/* Delivery speed & arrival estimates */}
      <div className="space-y-2 pt-1">
        <div className="flex items-start space-x-2.5">
          <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg mt-0.5">
            <Zap size={14} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900">
                {isSameDayAvailable ? "Same-Day Express Available" : "Standard Delivery (Next Day)"}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                {deliveryFee === 0 ? "FREE" : formatPKR(deliveryFee)}
              </span>
            </div>
            <p className="text-slate-500 text-[11px] mt-0.5">
              {estimate?.estimated_arrival || "Delivered within 24 hours across Faisalabad"}
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-2.5">
          <div className="p-1.5 bg-slate-200 text-slate-700 rounded-lg mt-0.5">
            <ShieldCheck size={14} />
          </div>
          <div>
            <span className="font-bold text-slate-900">Cash on Delivery (COD)</span>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Pay upon doorstep receipt after verifying items.
            </p>
          </div>
        </div>
      </div>

      {/* Free delivery hint */}
      {!isFreeDelivery && (
        <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-[11px] font-medium flex items-center gap-1.5">
          <Truck size={14} className="text-emerald-600 flex-shrink-0" />
          <span>Add items up to <strong>Rs. 2,500</strong> to get <strong>FREE delivery</strong> in Faisalabad!</span>
        </div>
      )}
    </div>
  );
}
