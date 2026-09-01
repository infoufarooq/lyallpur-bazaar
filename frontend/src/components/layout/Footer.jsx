import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, ShieldCheck, Truck, RefreshCw, Clock } from 'lucide-react';
import { FAISALABAD_LOCALITIES } from '../../utils/constants';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 text-xs mt-16 border-t border-slate-800">
      {/* Value props strip */}
      <div className="border-b border-slate-800 bg-slate-950/60 py-6">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-900">
              <Truck size={22} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Same-Day Faisalabad</h4>
              <p className="text-slate-400">Order by 4 PM for express delivery</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-900">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Cash on Delivery</h4>
              <p className="text-slate-400">Pay cash upon parcel inspection</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-900">
              <RefreshCw size={22} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Easy Local Returns</h4>
              <p className="text-slate-400">Hassle-free 3-day local exchange</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-900">
              <Clock size={22} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Customer Helpline</h4>
              <p className="text-slate-400">Available 9 AM - 10 PM daily</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Col 1: About */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-extrabold">
              LB
            </div>
            <span className="font-extrabold text-lg text-white">
              Lyallpur<span className="text-emerald-400">Bazaar</span>
            </span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Faisalabad's dedicated online marketplace connecting local residents to grocery, household essentials, appliances, and authentic Faisalabad fabrics.
          </p>
          <div className="pt-2 text-slate-400 space-y-1">
            <p className="flex items-center gap-2">
              <MapPin size={14} className="text-emerald-400 flex-shrink-0" />
              <span>D Ground Hub, Peoples Colony No. 1, Faisalabad</span>
            </p>
            <p className="flex items-center gap-2">
              <Phone size={14} className="text-emerald-400 flex-shrink-0" />
              <span>041-8765432 / 0300-1234567</span>
            </p>
            <p className="flex items-center gap-2">
              <Mail size={14} className="text-emerald-400 flex-shrink-0" />
              <span>support@lyallpurbazaar.pk</span>
            </p>
          </div>
        </div>

        {/* Col 2: Quick Links */}
        <div>
          <h4 className="font-bold text-white uppercase tracking-wider mb-3 text-xs">Customer Care</h4>
          <ul className="space-y-2 text-slate-400">
            <li><Link to="/tracking" className="hover:text-emerald-400 transition-colors">Track Your Order</Link></li>
            <li><Link to="/search" className="hover:text-emerald-400 transition-colors">Browse All Products</Link></li>
            <li><Link to="/search?deals=true" className="hover:text-emerald-400 transition-colors">Flash Deals & Discounts</Link></li>
            <li><Link to="/account" className="hover:text-emerald-400 transition-colors">My Customer Account</Link></li>
            <li><Link to="/login" className="hover:text-emerald-400 transition-colors">Sign In / Register</Link></li>
          </ul>
        </div>

        {/* Col 3: Localities Covered */}
        <div className="md:col-span-2">
          <h4 className="font-bold text-white uppercase tracking-wider mb-3 text-xs">Faisalabad Delivery Sectors</h4>
          <div className="flex flex-wrap gap-1.5">
            {FAISALABAD_LOCALITIES.map((loc) => (
              <span
                key={loc}
                className="bg-slate-800/80 text-slate-300 px-2.5 py-1 rounded-md text-[11px] border border-slate-700/60"
              >
                {loc}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            *Delivery within municipal boundaries of Faisalabad. Free delivery on orders over Rs. 2,500.
          </p>
        </div>
      </div>

      {/* Bottom copyright */}
      <div className="border-t border-slate-800/80 py-4 text-center text-slate-500 text-[11px]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Lyallpur Bazaar. Built for Faisalabad, Pakistan.</p>
          <p className="text-emerald-500 font-medium">Fast Local Commerce • Cash on Delivery • 100% Genuine</p>
        </div>
      </div>
    </footer>
  );
}
