import { Product } from '../data/products';
import { ShoppingCart, Plus, Info, MessageCircle, ZoomIn } from 'lucide-react';
import { motion } from 'framer-motion';
import React, { useState } from 'react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  cartQty: number;
  lang: 'ar' | 'en';
  onZoomImage: (url: string) => void;
  onRequestProduct: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  cartQty,
  lang,
  onZoomImage,
  onRequestProduct,
}) => {
  const [imgError, setImgError] = useState(false);
  
  const isOutOfStock = (product.stock !== undefined && product.stock <= 0);
  const isLimitReached = (product.stock !== undefined && cartQty >= product.stock);

  const getLocalizedName = () => {
    if (lang === 'ar' && product.arabicName) {
      return product.arabicName;
    }
    return product.name;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4, transition: { duration: 0.15 } }}
      className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full"
    >
      {/* Product Image Stage */}
      {product.image && !imgError && (
        <div 
          onClick={() => product.image && onZoomImage(product.image)}
          className="relative w-full h-44 bg-slate-50 relative overflow-hidden border-b border-slate-100 shrink-0 cursor-zoom-in"
        >
          <img 
            src={product.image} 
            alt={getLocalizedName()} 
            onError={() => setImgError(true)} 
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur-xs text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomIn className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Main Detail Context */}
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="flex flex-wrap gap-1.5">
            <span className="bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {product.category || (lang === 'ar' ? 'عام' : 'General')}
            </span>
            {isOutOfStock && (
              <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {lang === 'ar' ? 'نفذت الكمية' : 'Out of Stock'}
              </span>
            )}
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono shrink-0">
            {product.price.toFixed(2)} <span className="text-xs text-slate-500 font-sans">EGP</span>
          </div>
        </div>

        <h3 className="text-lg font-bold text-slate-900 mb-1 leading-tight group-hover:text-orange-600 transition-colors">
          {product.arabicName && product.arabicName.trim() ? (
            <span className="flex flex-col gap-0.5">
              <span className="text-base font-extrabold text-slate-900 block" dir="rtl">
                {product.arabicName}
              </span>
              <span className="text-xs font-medium text-slate-400 block" dir="ltr">
                {product.name}
              </span>
            </span>
          ) : (
            <span className="text-base font-extrabold text-slate-900 block">
              {product.name}
            </span>
          )}
        </h3>
        
        <div className="text-xs text-slate-400 mb-3 font-medium">
          {product.company}
        </div>

        {/* Specifications and features */}
        <div className="mt-auto space-y-3">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-1">
              <Info className="w-3 h-3 text-orange-500" />
              {lang === 'ar' ? 'المواصفات / المادة' : 'Specifications / Material'}
            </div>
            <p className="text-sm font-semibold text-slate-700 line-clamp-1">
              {product.activeIngredient || 'N/A'}
            </p>
          </div>

          {product.description && (
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Current Stock warning (if low and of course in stock) */}
          {product.stock !== undefined && product.stock > 0 && product.stock <= 5 && (
            <div className="text-[10px] text-amber-600 font-semibold mt-1">
              • {lang === 'ar' ? `متبقي ${product.stock} قطع فقط في المخزن!` : `Only ${product.stock} items left in stock!`}
            </div>
          )}
        </div>
      </div>

      {/* Button Tray */}
      <div className="p-4 pt-0 mt-auto">
        {!isOutOfStock ? (
          <button
            onClick={() => onAddToCart(product)}
            disabled={isLimitReached}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm active:scale-95 cursor-pointer ${
              isLimitReached 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                : 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm hover:shadow-md'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>
              {isLimitReached 
                ? (lang === 'ar' ? 'تم الوصول للحد الأقصى' : 'Limit Reached') 
                : (lang === 'ar' ? 'أضف للسلة' : 'Add to Cart')}
            </span>
          </button>
        ) : (
          <button
            onClick={() => onRequestProduct(product)}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm active:scale-95 shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            <span>
              {lang === 'ar' ? 'اطلب توفيره' : 'Request More'}
            </span>
          </button>
        )}
      </div>
    </motion.div>
  );
};
