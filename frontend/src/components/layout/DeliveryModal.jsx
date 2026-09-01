import React, { useState } from 'react';
import { MapPin, X, Check, Search, Sparkles } from 'lucide-react';
import { useDelivery } from '../../context/DeliveryContext';
import { FAISALABAD_LOCALITIES } from '../../utils/constants';

export default function DeliveryModal() {
  const { isModalOpen, setIsModalOpen, selectedLocality, changeLocality, zones } = useDelivery();
  const [filterText, setFilterText] = useState("");

  if (!isModalOpen) return null;

  const displayList = zones && zones.length > 0
    ? zones.map(z => z.name)
    : FAISALABAD_LOCALITIES;

  const filtered = displayList.filter(loc =>
    loc.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-800 rounded-lg">
              <MapPin size={20} className="text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base">Select Your Faisalabad Location</h3>
              <p className="text-xs text-emerald-100">Fast local delivery & same-day courier service</p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(false)}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search filter */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search area (e.g. D Ground, Madina Town, Kohinoor)..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Locality List */}
        <div className="p-4 max-h-72 overflow-y-auto space-y-1.5 divide-y divide-gray-50">
          {filtered.length > 0 ? (
            filtered.map((loc) => {
              const isSelected = selectedLocality === loc;
              return (
                <div
                  key={loc}
                  onClick={() => changeLocality(loc)}
                  className={`px-3 py-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-semibold'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <MapPin size={16} className={isSelected ? 'text-emerald-600' : 'text-gray-400'} />
                    <span className="text-sm">{loc}</span>
                  </div>
                  {isSelected && (
                    <span className="p-1 bg-emerald-600 text-white rounded-full">
                      <Check size={12} />
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-center py-6 text-sm text-gray-400">
              No matching Faisalabad area found. Please pick the closest sector.
            </p>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Sparkles size={13} className="text-emerald-600" /> Faisalabad city-wide delivery coverage
          </span>
          <button
            onClick={() => setIsModalOpen(false)}
            className="text-emerald-700 font-bold hover:underline"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
