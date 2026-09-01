import React from 'react';

export default function Badge({ children, variant = 'primary', className = '' }) {
  const styles = {
    primary: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    accent: 'bg-orange-100 text-orange-800 border-orange-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    neutral: 'bg-gray-100 text-gray-800 border-gray-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    outline: 'bg-white text-gray-700 border-gray-300'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[variant] || styles.primary} ${className}`}>
      {children}
    </span>
  );
}
