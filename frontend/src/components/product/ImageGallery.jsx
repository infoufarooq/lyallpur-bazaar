import React, { useState } from 'react';

export default function ImageGallery({ images = [], productName = "" }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const displayImages = images && images.length > 0
    ? images
    : [{ image_url: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600", alt_text: productName }];

  const activeImg = displayImages[selectedIdx] || displayImages[0];

  return (
    <div className="flex flex-col space-y-4">
      {/* Main Image View */}
      <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-200/80 group">
        <img
          src={activeImg.image_url}
          alt={activeImg.alt_text || productName}
          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Thumbnails */}
      {displayImages.length > 1 && (
        <div className="flex items-center space-x-2.5 overflow-x-auto pb-1">
          {displayImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIdx(idx)}
              className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 bg-gray-50 p-1 ${
                selectedIdx === idx
                  ? 'border-emerald-600 ring-2 ring-emerald-500/20'
                  : 'border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={img.image_url}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
