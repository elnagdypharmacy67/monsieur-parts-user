export interface Product {
  id: string;
  name: string;
  arabicName?: string;
  activeIngredient: string; // Specs / Features / Material
  company: string; // Brand / Manufacturer
  price: number;
  description: string;
  category?: string;
  barcode?: string;
  stock?: number;
  image?: string;
}

export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Motul 7100 4T 10W40 Synthetic Oil",
    arabicName: "زيت موتيول 7100 تخليقي 10W40",
    activeIngredient: "100% Synthetic 4T Engine Oil - 1L",
    company: "Motul",
    price: 450,
    description: "High performance ester-based 4-stroke motorcycle engine oil.",
    category: "Oils & Lubricants"
  },
  {
    id: "2",
    name: "Brembo Front Brake Pads",
    arabicName: "تيل فرامل أمامي بريمبو",
    activeIngredient: "Sintered Compound High Friction",
    company: "Brembo",
    price: 850,
    description: "Premium stopping power and thermal resistance for sports bikes.",
    category: "Brakes"
  },
  {
    id: "3",
    name: "NGK Iridium Spark Plug CPR8EAIX-9",
    arabicName: "بوجيه ان جي كيه ايريديوم",
    activeIngredient: "Iridium IX Spark Plug",
    company: "NGK",
    price: 280,
    description: "Superior ignitability and engine responsiveness.",
    category: "Engine Parts"
  },
  {
    id: "4",
    name: "DID 520VX3 Gold Drive Chain",
    arabicName: "جنزير 520 ديد ذهبي",
    activeIngredient: "X-Ring Sealed 120 Links",
    company: "D.I.D",
    price: 1950,
    description: "Heavy duty performance drive chain for street and racing.",
    category: "Drive & Transmission"
  },
  {
    id: "5",
    name: "Michelin Pilot Street 2 Rear Tire",
    arabicName: "كاوتش ميشلان بايلوت ستريت خلفي",
    activeIngredient: "130/70-17 Tubeless Rubber Compound",
    company: "Michelin",
    price: 3200,
    description: "Excellent wet grip and long tread life.",
    category: "Tires & Tubes"
  },
  {
    id: "6",
    name: "K&N High-Flow Air Filter",
    arabicName: "فلتر هواء كي اند ان رياضي",
    activeIngredient: "Washable Oiled Cotton Media",
    company: "K&N",
    price: 1400,
    description: "Designed to increase horsepower and acceleration.",
    category: "Filters"
  }
];
