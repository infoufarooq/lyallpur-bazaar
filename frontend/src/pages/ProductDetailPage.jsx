import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, Zap, Heart, Share2, Check, 
  Truck, ShieldCheck, ChevronRight, AlertCircle, Plus, Minus 
} from 'lucide-react';
import client from '../api/client';
import ImageGallery from '../components/product/ImageGallery';
import DeliveryEstimator from '../components/product/DeliveryEstimator';
import AlternativesList from '../components/product/AlternativesList';
import RatingStars from '../components/common/RatingStars';
import { formatPKR } from '../utils/formatters';
import { useCart } from '../context/CartContext';

export default function ProductDetailPage() {
  const { identifier } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    client.get(`/products/${identifier}`)
      .then((res) => {
        setProduct(res.data);
        setQuantity(1);
      })
      .catch((err) => console.error("Product load error", err))
      .finally(() => setLoading(false));
  }, [identifier]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="aspect-square bg-gray-100 rounded-3xl animate-pulse"></div>
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Product Not Found</h2>
        <p className="text-sm text-gray-500">The product you are looking for does not exist or has been removed.</p>
        <Link to="/" className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm">
          Return to Homepage
        </Link>
      </div>
    );
  }

  const isOutOfStock = product.stock_quantity <= 0;

  const handleAddToCart = async (openDrawer = true) => {
    if (isOutOfStock) return;
    setAdding(true);
    try {
      await addToCart(product.id, quantity, openDrawer);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (isOutOfStock) return;
    try {
      await addToCart(product.id, quantity, false);
      navigate('/checkout');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-xs text-gray-400 mb-6 overflow-x-auto whitespace-nowrap pb-1">
        <Link to="/" className="hover:text-emerald-700">Home</Link>
        <ChevronRight size={12} />
        {product.category_name && (
          <>
            <Link to={`/search?category=${encodeURIComponent(product.category_slug)}`} className="hover:text-emerald-700">
              {product.category_name}
            </Link>
            <ChevronRight size={12} />
          </>
        )}
        <span className="text-gray-700 font-semibold truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 shadow-sm">
        {/* Left Column: Image Gallery */}
        <div className="lg:col-span-5">
          <ImageGallery images={product.images} productName={product.name} />
        </div>

        {/* Center Column: Product Info & Actions */}
        <div className="lg:col-span-4 space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Brand & Pack size */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                {product.brand_name || "Lyallpur Local"}
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                isOutOfStock ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {product.availability_status || (isOutOfStock ? "Out of Stock" : "In Stock")}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">
              {product.name}
            </h1>

            {/* Rating & SKU */}
            <div className="flex items-center space-x-4 text-xs">
              <RatingStars rating={product.rating || 4.5} count={product.review_count || 12} size={14} />
              <span className="text-gray-300">|</span>
              <span className="text-gray-400 font-mono">SKU: {product.sku}</span>
            </div>

            {/* Price Box */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-baseline space-x-3">
              <span className="text-3xl font-black text-gray-900 tracking-tight">
                {formatPKR(product.price)}
              </span>
              {product.original_price && product.original_price > product.price && (
                <>
                  <span className="text-sm text-gray-400 line-through">
                    {formatPKR(product.original_price)}
                  </span>
                  <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-md">
                    {product.discount_percent}% OFF
                  </span>
                </>
              )}
            </div>

            {/* Short Description */}
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              {product.description}
            </p>

            {/* Pack Size / Variant Pill */}
            {product.pack_size && (
              <div className="pt-2">
                <span className="text-xs text-gray-400 block mb-1.5 font-medium">Pack / Unit Size:</span>
                <span className="inline-block px-3 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl">
                  {product.pack_size}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons & Quantity Selector */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            {/* Quantity */}
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-gray-700">Quantity:</span>
              <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-gray-50">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="px-4 py-2 text-sm font-bold text-gray-900 min-w-[36px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                  disabled={quantity >= product.stock_quantity}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-200 disabled:opacity-30 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
              <span className="text-[11px] text-gray-400">
                ({product.stock_quantity} available in Faisalabad stock)
              </span>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleAddToCart(true)}
                disabled={isOutOfStock || adding}
                className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
                  isOutOfStock
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : added
                    ? 'bg-green-600 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white'
                }`}
              >
                {added ? (
                  <>
                    <Check size={18} />
                    <span>Added to Cart!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>

              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-orange-600/20 transition-all"
              >
                <Zap size={18} />
                <span>Buy Now</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Faisalabad Delivery Estimator Widget */}
        <div className="lg:col-span-3">
          <DeliveryEstimator productPrice={product.price * quantity} />
        </div>
      </div>

      {/* Specifications Table Section */}
      {product.specifications && product.specifications.length > 0 && (
        <div className="mt-8 bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 shadow-sm">
          <h3 className="text-base font-extrabold text-gray-900 mb-4 uppercase tracking-wider text-xs">
            Product Specifications
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
            {product.specifications.map((spec) => (
              <div key={spec.id} className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500 font-medium">{spec.spec_key}</span>
                <span className="text-gray-900 font-bold text-right">{spec.spec_value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smart Alternative Products & Similar Items List */}
      <AlternativesList
        alternatives={product.alternative_products}
        similar={product.similar_products}
        currentPrice={product.price}
      />
    </div>
  );
}
