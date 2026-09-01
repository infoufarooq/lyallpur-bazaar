import React from 'react';
import { Truck, ShieldCheck, Banknote, MapPin, CheckCircle2 } from 'lucide-react';

export default function TrustSection() {
  return (
    <section className="my-12 bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm">
      <div className="text-center max-w-xl mx-auto mb-8">
        <span className="text-emerald-700 font-bold text-xs uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Why Shop on Lyallpur Bazaar?
        </span>
        <h2 className="text-2xl font-extrabold text-gray-900 mt-2">
          Tailored exclusively for Faisalabad
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Enjoy rapid local fulfillment without the long waiting times of nationwide couriers.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
            <Truck size={24} />
          </div>
          <h3 className="font-bold text-sm text-gray-900">Same-Day Local Delivery</h3>
          <p className="text-xs text-gray-500 mt-1">
            Orders placed before 4:00 PM are dispatched from our local D Ground hub for evening delivery.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
            <Banknote size={24} />
          </div>
          <h3 className="font-bold text-sm text-gray-900">Cash on Delivery (COD)</h3>
          <p className="text-xs text-gray-500 mt-1">
            Zero prepayment required. Inspect your parcel at your doorstep and pay cash to the courier.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
            <ShieldCheck size={24} />
          </div>
          <h3 className="font-bold text-sm text-gray-900">100% Genuine Products</h3>
          <p className="text-xs text-gray-500 mt-1">
            Sourced directly from authorized distributors (Unilever, Reckitt, National, Shan, Olpers).
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
            <MapPin size={24} />
          </div>
          <h3 className="font-bold text-sm text-gray-900">Dedicated FSD Support</h3>
          <p className="text-xs text-gray-500 mt-1">
            Local customer service helpline and quick address coordination for all 8 Bazaars & colonies.
          </p>
        </div>
      </div>
    </section>
  );
}
