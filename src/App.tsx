import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Wrench, 
  RefreshCw, 
  ArrowUpDown, 
  AlertCircle, 
  ScanBarcode, 
  X,
  Plus,
  Bike
} from 'lucide-react';
import { Product, SAMPLE_PRODUCTS } from './data/products';
import { ProductCard } from './components/ProductCard';
import { Cart } from './components/Cart';
import { BarcodeScanner } from './components/BarcodeScanner';
import { motion, AnimatePresence } from 'motion/react';
import Fuse from 'fuse.js';
import Papa from 'papaparse';

interface CartItem extends Product {
  quantity: number;
}

export default function App() {
  // Localization state
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  // Products and loading states
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Shipping and WhatsApp configurations (re-fetched from dynamic Google Sheet link)
  const [whatsappNumber, setWhatsappNumber] = useState<string>('201155076155');
  const [deliveryFee, setDeliveryFee] = useState<number>(66);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('name-asc');

  // Shopping cart states
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Modals / Overlays
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Custom Toast state
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  });

  // --- Toast Trigger Helper ---
  const showToast = useCallback((msg: string) => {
    setToast({ message: msg, visible: true });
  }, []);

  // Dismiss toast after 3s
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // --- Load Cart from Local Storage ---
  useEffect(() => {
    const saved = localStorage.getItem('monsieurPartsCart') || localStorage.getItem('pharmaShopCart');
    if (saved) {
      try {
        setCartItems(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved cart:", e);
      }
    }
  }, []);

  // --- Save Cart to Local Storage ---
  const saveCart = (items: CartItem[]) => {
    setCartItems(items);
    localStorage.setItem('monsieurPartsCart', JSON.stringify(items));
  };

  // --- Shipping & Purchase Configuration Synchronization from Google Sheet ---
  const fetchShippingConfig = useCallback(() => {
    const configSheetId = '1H52Lt-vHk3OR04HR4VgD1QBwuQhProYrEraql2atD9o';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${configSheetId}/export?format=csv`;

    Papa.parse(csvUrl, {
      download: true,
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data as string[][];
          if (!rows || rows.length === 0) return;

          let detectedPhone: string | null = null;
          let detectedFee: number | null = null;

          // Flatten all non-empty cells
          const cellGrid: { row: number; col: number; val: string }[] = [];
          rows.forEach((r, rIdx) => {
            if (Array.isArray(r)) {
              r.forEach((c, cIdx) => {
                if (c !== undefined && c !== null && String(c).trim() !== '') {
                  cellGrid.push({ row: rIdx, col: cIdx, val: String(c).trim() });
                }
              });
            }
          });

          // 1. Search for phone number pattern across cells
          for (const cell of cellGrid) {
            const digitsOnly = cell.val.replace(/[^\d]/g, '');
            if (digitsOnly.length >= 10 && digitsOnly.length <= 14 && (digitsOnly.startsWith('20') || digitsOnly.startsWith('01'))) {
              detectedPhone = cell.val;
              break;
            }
          }

          // Fallback for phone: Row 1 Col B or Row 1 Col A
          if (!detectedPhone) {
            if (rows[0]?.[1]) detectedPhone = rows[0][1];
            else if (rows[0]?.[0]) detectedPhone = rows[0][0];
          }

          if (detectedPhone) {
            let digits = String(detectedPhone).trim().replace(/[^\d]/g, '');
            if (digits.startsWith('2001')) {
              digits = '20' + digits.slice(3);
            } else if (digits.startsWith('01')) {
              digits = '20' + digits.slice(1);
            }
            if (digits.length >= 10) {
              setWhatsappNumber(digits);
            }
          }

          // 2. Search for delivery fee / price
          for (const cell of cellGrid) {
            const lower = cell.val.toLowerCase();
            if (
              lower.includes('price') ||
              lower.includes('fee') ||
              lower.includes('delivery') ||
              lower.includes('شحن') ||
              lower.includes('رسوم') ||
              lower.includes('توصيل') ||
              lower.includes('سعر')
            ) {
              const neighbor = cellGrid.find(c => c.row === cell.row && c.col === cell.col + 1);
              if (neighbor) {
                const num = parseFloat(neighbor.val.replace(/[^\d.]/g, ''));
                if (!isNaN(num) && num >= 0) {
                  detectedFee = num;
                  break;
                }
              }
              const below = cellGrid.find(c => c.row === cell.row + 1 && c.col === cell.col);
              if (below) {
                const num = parseFloat(below.val.replace(/[^\d.]/g, ''));
                if (!isNaN(num) && num >= 0) {
                  detectedFee = num;
                  break;
                }
              }
            }
          }

          // Fallback for fee: Row 2 Col B or Row 2 Col A or Row 1 Col B
          if (detectedFee === null) {
            if (rows[1]?.[1]) {
              const num = parseFloat(String(rows[1][1]).replace(/[^\d.]/g, ''));
              if (!isNaN(num)) detectedFee = num;
            } else if (rows[1]?.[0]) {
              const num = parseFloat(String(rows[1][0]).replace(/[^\d.]/g, ''));
              if (!isNaN(num)) detectedFee = num;
            } else if (rows[0]?.[1]) {
              const num = parseFloat(String(rows[0][1]).replace(/[^\d.]/g, ''));
              if (!isNaN(num)) detectedFee = num;
            }
          }

          if (detectedFee !== null) {
            setDeliveryFee(detectedFee);
          }
        } catch (e) {
          console.error("Failed to process dynamic purchase configurations:", e);
        }
      },
      error: (err) => {
        console.error("PapaParse config sheet download error:", err);
      }
    });
  }, []);

  // --- Google Sheet Synchronization ---
  const fetchGoogleSheet = useCallback(async (isManual = false) => {
    setIsLoading(true);
    setError(null);
    fetchShippingConfig();
    const sheetId = '1cCcsp_SbVUdaXlmDUkarmH7_8RRE6vZKUwPpDcdOV7A';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    Papa.parse(csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (results.data.length === 0) {
            throw new Error("Roster spreadsheet is empty");
          }

          // Smart column finder helper
          const findKey = (keywords: string[]) => {
            const keys = Object.keys(results.data[0] || {});
            // 1. Prioritize exact case-insensitive match
            const exactMatch = keys.find(key => 
              keywords.some(k => key.toLowerCase().trim() === k.toLowerCase().trim())
            );
            if (exactMatch) return exactMatch;

            // 2. Fallback to contains check
            return keys.find(key => 
              keywords.some(k => key.toLowerCase().includes(k.toLowerCase().trim()))
            );
          };

          const idKey = findKey(['id', 'كود التعريف', 'الرمز']);
          const nameKey = findKey(['name', 'item', 'product', 'الاسم', 'english', 'قطع غيار']);
          const arabicNameKey = findKey(['arabicname', 'arabic_name', 'arabic', 'ar_name', 'عربي', 'الأسم العربي']);
          const activeKey = findKey(['activeingredient', 'active_ingredient', 'active', 'ingredient', 'composition', 'effect', 'المادة الفعالة', 'المواصفات', 'specs']);
          const companyKey = findKey(['company', 'manufacturer', 'brand', 'الشركة', 'الماركة']);
          const priceKey = findKey(['price', 'cost', 'السعر']);
          const stockKey = findKey(['stock', 'quantity', 'qty', 'count', 'الكمية', 'العدد', 'المخزون']);
          const barcodeKey = findKey(['barcode', 'code', 'ean', 'upc', 'باركود', 'كود']);
          const imageKey = findKey(['picture', 'image', 'photo', 'img', 'url', 'صورة', 'رابط']);
          const descKey = findKey(['description', 'desc', 'form', 'dosage', 'type', 'الوصف']);
          const catKey = findKey(['category', 'class', 'group', 'التصنيف', 'القسم']);

          if (!nameKey || !priceKey) {
            throw new Error("Required sheet columns 'Name' and 'Price' could not be found");
          }

          const parsedProducts: Product[] = results.data.map((row: any, index: number) => {
            const idValue = idKey && row[idKey] ? String(row[idKey]).trim() : `sheet-${index}`;
            const rawPrice = priceKey && row[priceKey] ? String(row[priceKey]).replace(/[^\d.]/g, '') : '0';
            const rawStock = stockKey && row[stockKey] ? String(row[stockKey]).replace(/[^\d]/g, '') : '100';

            return {
              id: idValue,
              name: row[nameKey] || "Unknown Product",
              arabicName: (arabicNameKey && row[arabicNameKey]) ? String(row[arabicNameKey]).trim() : "",
              activeIngredient: (activeKey && row[activeKey]) ? String(row[activeKey]).trim() : "N/A",
              company: (companyKey && row[companyKey]) ? String(row[companyKey]).trim() : "Generic Manufacturer",
              price: parseFloat(rawPrice) || 0,
              stock: rawStock ? (parseInt(rawStock, 10) || 0) : 100,
              barcode: (barcodeKey && row[barcodeKey]) ? String(row[barcodeKey]).trim() : "",
              image: (imageKey && row[imageKey]) ? String(row[imageKey]).trim() : "",
              description: (descKey && row[descKey]) ? String(row[descKey]).trim() : (row[nameKey] || ""),
              category: (catKey && row[catKey]) ? String(row[catKey]).trim() : "General"
            };
          }).filter((p: any) => p.name && p.price > 0);

          if (parsedProducts.length === 0) {
            throw new Error("No valid products were resolved from Sheet columns");
          }

          setProducts(parsedProducts);
          if (isManual) {
            showToast(lang === 'ar' ? 'تم تحديث قائمة قطع الغيار بنجاح!' : 'Spare parts catalog refreshed successfully!');
          }
        } catch (err: any) {
          console.error(err);
          setError(err.message || "Failed to process the spreadsheet roster rows");
          if (products.length === 0) {
            setProducts(SAMPLE_PRODUCTS);
          }
        } finally {
          setIsLoading(false);
        }
      },
      error: (err) => {
        console.error("PapaParse error:", err);
        setError(lang === 'ar' ? "فشل الاتصال بجدول المنتجات الرئيسي." : "Failed to connect to spreadsheet remote provider.");
        if (products.length === 0) {
          setProducts(SAMPLE_PRODUCTS);
        }
        setIsLoading(false);
      }
    });
  }, [lang, products.length, showToast, fetchShippingConfig]);

  // Fetch Google Sheet data automatically on startup
  useEffect(() => {
    fetchGoogleSheet();
    fetchShippingConfig();
  }, [fetchGoogleSheet, fetchShippingConfig]);

  // --- Dynamic unique categories array ---
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [products]);

  // --- Setup Fuse.js for smart fuzzy search ---
  const fuseSearchInstance = useMemo(() => {
    if (products.length === 0) return null;
    return new Fuse(products, {
      keys: ['name', 'arabicName', 'activeIngredient', 'company', 'barcode'],
      threshold: 0.35,
      distance: 100,
      minMatchCharLength: 2
    });
  }, [products]);

  // --- Filter and Sort Product Logic ---
  const processedProducts = useMemo(() => {
    let result = products;

    if (searchQuery.trim()) {
      if (fuseSearchInstance) {
        const matches = fuseSearchInstance.search(searchQuery);
        result = matches.map(match => match.item);
      } else {
        const query = searchQuery.toLowerCase();
        result = products.filter(p => 
          p.name.toLowerCase().includes(query) ||
          (p.arabicName && p.arabicName.toLowerCase().includes(query)) ||
          p.activeIngredient.toLowerCase().includes(query) ||
          p.company.toLowerCase().includes(query)
        );
      }
    }

    if (activeCategory) {
      result = result.filter(p => p.category === activeCategory);
    }

    return [...result].sort((a, b) => {
      const nameA = lang === 'ar' && a.arabicName ? a.arabicName : a.name;
      const nameB = lang === 'ar' && b.arabicName ? b.arabicName : b.name;

      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name-asc':
          return nameA.localeCompare(nameB, lang === 'ar' ? 'ar' : 'en');
        case 'name-desc':
          return nameB.localeCompare(nameA, lang === 'ar' ? 'ar' : 'en');
        case 'company-asc':
          return (a.company || '').localeCompare(b.company || '');
        default:
          return 0;
      }
    });
  }, [products, searchQuery, activeCategory, sortBy, fuseSearchInstance, lang]);

  // --- Adding to Shopping Cart with Limit Check ---
  const handleAddToCart = (product: Product) => {
    const existingIndex = cartItems.findIndex(item => item.id === product.id);
    const existingItem = existingIndex !== -1 ? cartItems[existingIndex] : null;
    const currentQty = existingItem ? existingItem.quantity : 0;

    if (product.stock !== undefined && currentQty >= product.stock) {
      showToast(
        lang === 'ar' 
          ? 'عفواً، تم الوصول للحد الأقصى المتوفر لهذه القطعة' 
          : 'Sorry, maximum available stock reached for this item'
      );
      return;
    }

    let updatedCart: CartItem[] = [];
    if (existingItem) {
      updatedCart = cartItems.map((item, idx) => 
        idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      updatedCart = [...cartItems, { ...product, quantity: 1 }];
    }

    saveCart(updatedCart);
    
    const localizedName = lang === 'ar' && product.arabicName ? product.arabicName : product.name;
    showToast(
      lang === 'ar'
        ? `تمت إضافة ${localizedName} إلى سلة المشتريات`
        : `Added ${localizedName} to your cart`
    );
  };

  const updateCartQuantity = (id: string, delta: number) => {
    const updated = cartItems.map(item => {
      if (item.id === id) {
        const nextQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: nextQty };
      }
      return item;
    });
    saveCart(updated);
  };

  const removeCartItem = (id: string) => {
    const updated = cartItems.filter(item => item.id !== id);
    saveCart(updated);
  };

  const clearCart = () => {
    saveCart([]);
  };

  // --- Barcode Scan Callback ---
  const handleBarcodeScanned = (code: string) => {
    setSearchQuery(code);
    setShowBarcodeScanner(false);

    const matched = products.find(p => p.barcode === code.trim());
    if (matched) {
      const matchName = lang === 'ar' && matched.arabicName ? matched.arabicName : matched.name;
      showToast(
        lang === 'ar' 
          ? `تم العثور على قطعة الغيار: ${matchName}` 
          : `Item identified: ${matchName}`
      );
    } else {
      showToast(
        lang === 'ar' 
          ? `غير متواجد رمز الباركود: ${code}` 
          : `Barcode ${code} not found in catalog`
      );
    }
  };

  // --- WhatsApp Request Callback for Out of Stock Products ---
  const handleRequestProduct = (product: Product) => {
    const phoneNumber = whatsappNumber;
    const name = lang === 'ar' && product.arabicName ? product.arabicName : product.name;
    
    let message = lang === 'ar'
      ? `*طلب قطعة غيار غير متوفرة - المسيو بارتس*\n\nالسلام عليكم، أود طلب توفير القطعة التالية:\n- *القطعة:* ${name}\n- *الماركة/الشركة:* ${product.company}\n`
      : `*Motorcycle Part Special Request - Monsieur parts*\n\nHello, I would like to request the following out-of-stock item:\n- *Item Name:* ${name}\n- *Brand:* ${product.company}\n`;
    
    if (product.barcode) {
      message += `- *الباركود:* ${product.barcode}\n`;
    }
    
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const cartTotalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div 
      className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col selection:bg-orange-100" 
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Dynamic Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo & Name */}
          <div 
            onClick={fetchGoogleSheet} 
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="bg-orange-600 group-hover:bg-orange-700 p-2.5 rounded-xl text-white shadow-md shadow-orange-100 transition-colors">
              <Bike className="w-6 h-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 truncate">
                {lang === 'ar' ? (
                  <>المسيو <span className="text-orange-600">بارتس</span></>
                ) : (
                  <>Monsieur <span className="text-orange-600">parts</span></>
                )}
              </h1>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {lang === 'ar' ? 'قطع غيار وإكسسوارات الدراجات النارية' : 'Motorcycle Spare Parts & Accessories'}
              </p>
            </div>
          </div>

          {/* Desktop Central Bar (Fuzzy Search bar) */}
          <div className="flex-1 max-w-xl mx-8 hidden md:block">
            <div className="relative flex items-center">
              <Search className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'ar' ? 'ابحث باسم قطعة الغيار أو الكود أو الماركة (مثل هوندا، باجاج)...' : 'Search parts, specs, brand (Honda, Yamaha, Bajaj)...'}
                className={`w-full ${lang === 'ar' ? 'pr-12 pl-12' : 'pl-12 pr-12'} py-2.5 bg-slate-100 border-2 border-transparent focus:bg-white focus:border-orange-500 rounded-2xl transition-all outline-none font-semibold text-slate-800 text-sm`}
              />
              <button
                onClick={() => setShowBarcodeScanner(true)}
                title={lang === 'ar' ? 'مسح باركود قطعة الغيار' : 'Scan Barcode Camera'}
                className={`absolute ${lang === 'ar' ? 'left-2.5' : 'right-2.5'} p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all active:scale-90`}
              >
                <ScanBarcode className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Control Triggers */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Tooltip action to toggle Arabic/English */}
            <button
              onClick={() => setLang(prev => prev === 'ar' ? 'en' : 'ar')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors uppercase cursor-pointer"
            >
              {lang === 'ar' ? 'English' : 'عربي'}
            </button>

            {/* Manual sheet synchronizer */}
            <button
              onClick={() => fetchGoogleSheet(true)}
              disabled={isLoading}
              className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-all shrink-0 active:scale-95 disabled:opacity-50 cursor-pointer"
              title={lang === 'ar' ? 'تحديث البيانات من السيرفر' : 'Refresh catalog from server'}
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-orange-600' : ''}`} />
            </button>

            {/* Shopping Cart Indicator */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-3 bg-slate-900 text-white hover:bg-orange-600 rounded-xl transition-all group active:scale-95 shrink-0 shadow-md shadow-slate-200 cursor-pointer"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartTotalItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-orange-600 text-white text-[10px] font-extrabold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900 shadow-md">
                  {cartTotalItemsCount}
                </span>
              )}
            </button>
            
          </div>
        </div>
      </header>

      {/* Main Container viewport */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Mobile Central Search */}
        <div className="md:hidden mb-6 flex gap-2">
          <div className="relative flex-1">
            <Search className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'ar' ? 'ابحث باسم القطعة أو الماركة...' : 'Find by brand or specifications...'}
              className={`w-full ${lang === 'ar' ? 'pr-11 pl-11' : 'pl-11 pr-11'} py-3 bg-white border border-slate-200 rounded-xl shadow-xs outline-none focus:border-orange-500 font-semibold text-slate-800 text-sm`}
            />
            <button
              onClick={() => setShowBarcodeScanner(true)}
              className={`absolute ${lang === 'ar' ? 'left-2.5' : 'right-2.5'} top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-orange-600 rounded-xl transition-all`}
            >
              <ScanBarcode className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Categories sliding panel */}
        {categories.length > 0 && (
          <div className="mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide shrink-0">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                  activeCategory === null
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                }`}
              >
                {lang === 'ar' ? 'كل أقسام قطع الغيار' : 'All Departments'}
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-100'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sorting header summary panel */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between bg-white/50 backdrop-blur-xs p-4 rounded-2xl border border-slate-100 shrink-0">
          <div className="text-xs font-semibold text-slate-500">
            {lang === 'ar' ? (
              <>يعرض <span className="text-slate-800 font-bold">{processedProducts.length}</span> قطعة غيار متوفرة حالياً</>
            ) : (
              <>Showing <span className="text-slate-800 font-bold">{processedProducts.length}</span> available spare parts</>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <label className="text-xs font-bold text-slate-400 gap-1 flex items-center">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'رتّب حسب:' : 'Sort:'}</span>
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-white border border-slate-200 text-slate-700 py-1.5 px-3 rounded-xl focus:outline-none focus:border-orange-500 select-none text-xs font-bold cursor-pointer"
            >
              <option value="name-asc">{lang === 'ar' ? 'الاسم (أ-ي)' : 'Name (A-Z)'}</option>
              <option value="name-desc">{lang === 'ar' ? 'الاسم (ي-أ)' : 'Name (Z-A)'}</option>
              <option value="price-asc">{lang === 'ar' ? 'السعر (من الأقل للأعلى)' : 'Price (Low to High)'}</option>
              <option value="price-desc">{lang === 'ar' ? 'السعر (من الأعلى للأقل)' : 'Price (High to Low)'}</option>
              <option value="company-asc">{lang === 'ar' ? 'الماركة المُصنعة' : 'Brand / Manufacturer A-Z'}</option>
            </select>
          </div>
        </div>

        {/* Loading Spinner Stage */}
        {isLoading ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-orange-600"></div>
            <p className="text-sm font-semibold text-slate-500">
              {lang === 'ar' ? 'جاري تحميل جدول قطع الغيار والأسعار الفورية...' : 'Syncing parts catalog index...'}
            </p>
          </div>
        ) : error && products.length === 0 ? (
          /* Error State View */
          <div className="min-h-[40vh] flex flex-col items-center justify-center text-center py-12 px-4">
            <div className="bg-red-50 p-4 rounded-full text-red-600 mb-4 border border-red-100">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {lang === 'ar' ? 'فشل تحميل كالوج قطع الغيار' : 'Resource Sync Failed'}
            </h3>
            <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
              {error}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => fetchGoogleSheet()}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
              >
                {lang === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
              </button>
              <button
                onClick={() => setProducts(SAMPLE_PRODUCTS)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all cursor-pointer"
              >
                {lang === 'ar' ? 'تحميل البيانات الاحتياطية' : 'Load Offline Samples'}
              </button>
            </div>
          </div>
        ) : (
          /* Core Grid View List */
          <AnimatePresence mode="wait">
            {processedProducts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-20 bg-white rounded-3xl border border-slate-100"
              >
                <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
                  <Wrench className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-850">
                  {lang === 'ar' ? 'لا توجد قطع غيار مطابقة للبحث' : 'No matching items identified'}
                </h3>
                <p className="text-sm text-slate-400 max-w-xs mx-auto mt-1">
                  {lang === 'ar' 
                    ? 'جرب تعديل الكلمات أو البحث باسم الماركة أو القسم' 
                    : 'Check spellings or try adjusting category filters.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-4 text-xs font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer"
                  >
                    {lang === 'ar' ? 'إعادة تعيين البحث' : 'Reset Search'}
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {processedProducts.map((product) => {
                  const cartItem = cartItems.find((ci) => ci.id === product.id);
                  const qty = cartItem ? cartItem.quantity : 0;
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      cartQty={qty}
                      lang={lang}
                      onAddToCart={handleAddToCart}
                      onZoomImage={setZoomedImage}
                      onRequestProduct={handleRequestProduct}
                    />
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Modern Minimalist Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 shrink-0">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-500 font-medium">
            {lang === 'ar' ? 'المسيو بارتس © ٢٠٢٦ - قطع غيار وإكسسوارات الدراجات النارية في خدمتكم' : 'Monsieur parts © 2026 - Premium Motorcycle Parts & Accessories'}
          </p>
        </div>
      </footer>

      {/* --- Overlay Barcode Scanner Modal --- */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onScanSuccess={handleBarcodeScanned}
          onClose={() => setShowBarcodeScanner(false)}
          lang={lang}
        />
      )}

      {/* --- Overlay Sliding Cart Drawer --- */}
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeCartItem}
        onClearCart={clearCart}
        lang={lang}
        onShowToast={showToast}
        phoneNumber={whatsappNumber}
        deliveryFee={deliveryFee}
      />

      {/* --- Image Zoom Lightbox Overlay Modal --- */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setZoomedImage(null)}
          >
            <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl bg-white p-2">
              <img 
                src={zoomedImage} 
                alt="Zoomed preview" 
                className="max-h-[80vh] max-w-full object-contain rounded-xl"
                onClick={(e) => e.stopPropagation()} 
              />
              <button
                onClick={() => setZoomedImage(null)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Dynamic Global Toast Banner --- */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 ${lang === 'ar' ? 'left-6' : 'right-6'} z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800`}
          >
            <div className="bg-orange-500 rounded-full p-1 shrink-0">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-xs sm:text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

