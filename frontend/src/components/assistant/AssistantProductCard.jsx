import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatPKR } from '../../utils/formatters';

/**
 * Mini product card for voice assistant product recommendations carousel.
 *
 * @param {Object} props
 * @param {Object} props.product - ProductOut schema object from assistant response.
 */
export default function AssistantProductCard({ product }) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  if (!product) return null;

  const isOutOfStock =
    product.stock_quantity !== undefined && product.stock_quantity <= 0;

  const handleAdd = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isOutOfStock || isAdding) return;

    setIsAdding(true);
    try {
      const productId = product.id ?? product;
      // Add 1 unit to cart without automatically opening main cart drawer
      await addToCart(productId, 1, false);
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    } catch (err) {
      console.error('Failed to add product to cart from assistant card:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const imageSrc =
    product.primary_image ||
    product.images?.[0]?.image_url ||
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200';

  const priceFormatted = formatPKR(product.price);
  const stockLabel =
    product.availability_status || (isOutOfStock ? 'Out of Stock' : 'In Stock');
  const productPath = `/product/${product.slug || product.id}`;

  return (
    <div className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-gray-200/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all min-w-[220px] max-w-[245px] flex-shrink-0 group">
      <Link
        to={productPath}
        className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100 block"
        title={product.name}
      >
        <img
          src={imageSrc}
          alt={product.name || 'Product'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          loading="lazy"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-[9px] font-black text-red-700 uppercase tracking-tighter">
              Sold Out
            </span>
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <Link
          to={productPath}
          className="text-xs font-bold text-gray-900 truncate block group-hover:text-emerald-700 transition-colors"
          title={product.name}
        >
          {product.name}
        </Link>

        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              isOutOfStock
                ? 'bg-red-50 text-red-600'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {stockLabel}
          </span>
        </div>

        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs font-extrabold text-emerald-700 leading-none">
            {priceFormatted}
          </span>

          <button
            type="button"
            onClick={handleAdd}
            disabled={isOutOfStock || isAdding}
            className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
              added
                ? 'bg-emerald-600 text-white shadow-xs'
                : isOutOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200'
            }`}
            title={
              isOutOfStock
                ? 'Currently out of stock'
                : added
                ? 'Added to Cart'
                : 'Add to Cart'
            }
            aria-label={`Add ${product.name} to cart`}
          >
            {added ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <ShoppingBag className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
