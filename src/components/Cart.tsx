import React, { useState, useEffect } from 'react';
import { Product } from '../data/products';
import { X, Trash2, ShoppingBag, MessageSquare, MapPin, Check, ArrowLeft, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CartItem extends Product {
  quantity: number;
}

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  lang: 'ar' | 'en';
  onShowToast: (message: string) => void;
  phoneNumber?: string;
  deliveryFee?: number;
}

export function Cart({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  lang,
  onShowToast,
  phoneNumber = "201155076155",
  deliveryFee = 66,
}: CartProps) {
  const [step, setStep] = useState<'review' | 'checkout'>('review');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerLandmark, setCustomerLandmark] = useState('');

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + (items.length > 0 ? deliveryFee : 0);

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen]);

  // Reset checkout step when modal is toggled
  useEffect(() => {
    if (!isOpen) {
      setStep('review');
    }
  }, [isOpen]);

  const handleUpdateQty = (id: string, currentQty: number, delta: number, maxStock?: number) => {
    const nextQty = currentQty + delta;
    if (maxStock !== undefined && nextQty > maxStock) {
      onShowToast(
        lang === 'ar'
          ? 'عفواً، الكمية المطلوبة غير متوفرة بالكامل في المخزن'
          : 'Sorry, the requested quantity is not fully available in stock'
      );
      return;
    }
    if (nextQty >= 1) {
      onUpdateQuantity(id, delta);
    }
  };

  const handeClearCartClick = () => {
    const confirmMsg =
      lang === 'ar'
        ? 'هل أنت متأكد أنك تريد إفراغ سلة المشتريات بالكامل؟'
        : 'Are you sure you want to clear your shopping cart?';
    if (window.confirm(confirmMsg)) {
      onClearCart();
    }
  };

  const handleConfirmOrder = () => {
    if (!customerName.trim() || !customerAddress.trim()) {
      onShowToast(
        lang === 'ar'
          ? 'الرجاء إدخال الاسم والعنوان لتأكيد الطلب'
          : 'Please enter both customer name and address to process your order'
      );
      return;
    }

    let message = lang === 'ar' 
      ? "*طلب جديد من المسيو بارتس*\n\n" 
      : "*New Order from Monsieur parts*\n\n";

    // Customer details
    message += `👤 *${customerName.trim()}*\n`;
    message += `📍 ${customerAddress.trim()}\n`;
    if (customerLandmark.trim()) {
      message += `🏢 ${customerLandmark.trim()}\n`;
    }
    message += "\n-------------------\n";

    // Order items
    items.forEach((item, index) => {
      const name = lang === 'ar' && item.arabicName ? item.arabicName : item.name;
      message += `${index + 1}. *${name}* (x${item.quantity})\n`;
      message += `   ${item.price.toFixed(2)} EGP\n`;
    });

    message += "-------------------\n\n";
    
    if (lang === 'ar') {
      message += `المجموع الفرعي: ${subtotal.toFixed(2)} EGP\n`;
      message += `خدمة التوصيل: ${deliveryFee.toFixed(2)} EGP\n`;
      message += `*الإجمالي: ${total.toFixed(2)} EGP*`;
    } else {
      message += `Subtotal: ${subtotal.toFixed(2)} EGP\n`;
      message += `Delivery Fee: ${deliveryFee.toFixed(2)} EGP\n`;
      message += `*Total: ${total.toFixed(2)} EGP*`;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    onShowToast(lang === 'ar' ? 'جاري فتح تطبيق واتساب لإتمام الطلب...' : 'Opening WhatsApp to complete your order...');

    // Save client info & refresh setup
    setTimeout(() => {
      onClearCart();
      setStep('review');
      onClose();
      setCustomerName('');
      setCustomerAddress('');
      setCustomerLandmark('');
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40"
          />

          {/* Drawer Container (Sliding in from left for Arabic / right for English) */}
          <motion.div
            initial={{ x: lang === 'ar' ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: lang === 'ar' ? '-100%' : '100%' }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className={`fixed ${lang === 'ar' ? 'left-0' : 'right-0'} top-0 bottom-0 h-full w-full sm:max-w-md bg-white shadow-2xl z-50 flex flex-col focus:outline-none`}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            
            {/* Header Area */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50 backdrop-blur-xs">
              <div className="flex items-center gap-2.5">
                {step === 'checkout' ? (
                  <button
                    onClick={() => setStep('review')}
                    className="p-1.5 hover:bg-slate-200/60 text-slate-600 rounded-xl transition-colors cursor-pointer"
                    title={lang === 'ar' ? 'عودة للسلة' : 'Back to Cart'}
                  >
                    <ArrowLeft className={`w-5 h-5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                  </button>
                ) : (
                  <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                )}
                
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-950">
                    {step === 'checkout' 
                      ? (lang === 'ar' ? 'بيانات التوصيل' : 'Delivery Details')
                      : (lang === 'ar' ? 'سلة المشتريات' : 'Your Shopping Cart')}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                    {lang === 'ar' ? 'خطوة ١ من ٢' : 'Step 1 of 2'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {items.length > 0 && step === 'review' && (
                  <button
                    onClick={handeClearCartClick}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-red-650 bg-red-50 hover:bg-red-100 rounded-lg transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'تفريغ' : 'Clear'}</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Core Dynamic Body Container */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* STAGE 1: Item review state */}
              {step === 'review' && (
                <>
                  {items.length === 0 ? (
                    <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-center p-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-350 border border-slate-100 mb-4">
                        <ShoppingBag className="w-8 h-8" />
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-base">
                        {lang === 'ar' ? 'السلة فارغة حالياً' : 'Your cart is empty'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1.5 max-w-[240px] leading-relaxed">
                        {lang === 'ar' 
                          ? 'تصفح قائمة قطع الغيار والإكسسوارات المتوفرة وأضف القطع المطلوبة.' 
                          : 'Explore our catalog of motorcycle parts and accessories.'}
                      </p>
                      <button
                        onClick={onClose}
                        className="mt-6 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-100 cursor-pointer"
                      >
                        {lang === 'ar' ? 'تصفح قطع الغيار ومتابعة التسوق' : 'Browse Motorcycle Parts'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item) => {
                        const localizedName = lang === 'ar' && item.arabicName ? item.arabicName : item.name;
                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-3 bg-white border border-slate-100 p-4 rounded-xl shadow-xs relative hover:border-slate-200 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">
                                  {localizedName}
                                </h4>
                                <button
                                  onClick={() => onRemoveItem(item.id)}
                                  className="text-slate-450 hover:text-red-505 transition-colors p-1 rounded-md hover:bg-slate-50 cursor-pointer"
                                  title={lang === 'ar' ? 'حذف' : 'Remove'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <p className="text-xs text-slate-450 mt-0.5 truncate">{item.company}</p>
                              
                              <div className="flex items-center justify-between mt-3.5">
                                <span className="font-mono text-xs sm:text-sm font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100">
                                  {(item.price * item.quantity).toFixed(2)} EGP
                                </span>
                                
                                {/* Responsive count selector stepper */}
                                <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-1 bg-slate-50/50">
                                  <button
                                    onClick={() => handleUpdateQty(item.id, item.quantity, -1, item.stock)}
                                    className="w-6 h-6 flex items-center justify-center hover:bg-white rounded hover:shadow-xs text-slate-700 transition-all font-extrabold text-sm select-none cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs sm:text-sm font-bold w-4 text-center text-slate-900 font-mono">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => handleUpdateQty(item.id, item.quantity, 1, item.stock)}
                                    className="w-6 h-6 flex items-center justify-center hover:bg-white rounded hover:shadow-xs text-slate-705 transition-all font-extrabold text-sm select-none cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* STAGE 2: Checkout details form */}
              {step === 'checkout' && (
                <motion.div
                  initial={{ opacity: 0, x: lang === 'ar' ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-orange-800">
                        {lang === 'ar' ? 'طلب آمن وسريع' : 'Secure Delivery'}
                      </h4>
                      <p className="text-[11px] text-orange-700 mt-0.5 leading-relaxed">
                        {lang === 'ar' 
                          ? 'يتم إرسال سلة طلباتك مباشرة إلى المسيو بارتس لإتمام الشحن الفوري والتوصيل لموقعك.' 
                          : 'Your request is sent directly to Monsieur parts for dispatch and immediate delivery.'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-xl p-4 space-y-3 shadow-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        {lang === 'ar' ? 'اسم المستلم بالكامل *' : 'Full Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={lang === 'ar' ? 'الأسم الأول والأخير' : 'First and last name'}
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all font-semibold text-slate-800 placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        {lang === 'ar' ? 'عنوان التوصيل بالتفصيل *' : 'Delivery Address *'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={lang === 'ar' ? 'المنطقة، الشارع، رقم المنزل/الشقة' : 'Street name, Apartment, Block/Building'}
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all font-semibold text-slate-800 placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        {lang === 'ar' ? 'علامة مميزة أو ملاحظة (اختياري)' : 'Landmark / Instructions (Optional)'}
                      </label>
                      <input
                        type="text"
                        placeholder={lang === 'ar' ? 'مثال: بجوار ورشة أو محطة وقود' : 'e.g. Near a specific landmark or store'}
                        value={customerLandmark}
                        onChange={(e) => setCustomerLandmark(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all font-semibold text-slate-800 placeholder-slate-400"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Static Action Footer Area */}
            {items.length > 0 && (
              <div className="p-5 border-t border-slate-100 bg-slate-50 shrink-0">
                
                {/* Cart Price Breakdown */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{lang === 'ar' ? 'مجموع المنتجات' : 'Products Subtotal'}</span>
                    <span className="font-mono font-bold text-slate-700">{subtotal.toFixed(2)} EGP</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-200/50">
                    <span>{lang === 'ar' ? 'تكلفة التوصيل التقديرية' : 'Estimated Delivery Fee'}</span>
                    <span className="font-mono font-bold text-slate-700">{deliveryFee.toFixed(2)} EGP</span>
                  </div>
                  <div className="flex items-center justify-between text-base sm:text-lg font-extrabold text-slate-950 pt-1">
                    <span>{lang === 'ar' ? 'الحساب الاجمالي' : 'Total Amount'}</span>
                    <span className="font-mono text-orange-600">{total.toFixed(2)} EGP</span>
                  </div>
                </div>

                {/* Primary Interaction Buttons */}
                {step === 'review' ? (
                  <button
                    onClick={() => setStep('checkout')}
                    className="w-full bg-slate-950 hover:bg-orange-600 text-white py-3 sm:py-3.5 rounded-xl font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{lang === 'ar' ? 'متابعة لتأكيد بيانات الشحن' : 'Proceed to Shipping'}</span>
                    <MessageSquare className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleConfirmOrder}
                      disabled={!customerName.trim() || !customerAddress.trim()}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 sm:py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-100 active:scale-[0.98] cursor-pointer"
                    >
                      <Check className="w-5 h-5" />
                      <span>{lang === 'ar' ? 'إرسال الطلب فورا لواتساب' : 'Submit Order on WhatsApp'}</span>
                    </button>
                    <button
                      onClick={() => setStep('review')}
                      className="w-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      {lang === 'ar' ? 'تعديل سلة المشتريات' : 'Go Back to Cart'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
