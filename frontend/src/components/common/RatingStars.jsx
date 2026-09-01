import React from 'react';
import { Star } from 'lucide-react';

export default function RatingStars({ rating = 4.5, count = null, size = 14 }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.4;

  return (
    <div className="flex items-center space-x-1">
      <div className="flex items-center text-amber-400">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={size}
            className={`${
              i < fullStars || (i === fullStars && hasHalf)
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-gray-700 ml-1">
        {rating.toFixed(1)}
      </span>
      {count !== null && (
        <span className="text-xs text-gray-400">({count})</span>
      )}
    </div>
  );
}
