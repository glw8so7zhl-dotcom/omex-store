import phone from "@/assets/product-phone.png";
import headphones from "@/assets/product-headphones.png";
import watch from "@/assets/product-watch.png";
import laptop from "@/assets/product-laptop.png";
import sneakers from "@/assets/product-sneakers.png";
import drill from "@/assets/product-drill.png";
import speaker from "@/assets/product-speaker.png";

export type Product = {
  id: string;
  /** Database UUID (present on catalog-loaded products; used by reviews). */
  dbId?: string;
  /** ISO timestamp (catalog-loaded products; powers the "جديد" badge). */
  createdAt?: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  /** Additional gallery images (admin-managed); main image is separate. */
  galleryImages?: string[];
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  sales: number;
  stock: number;
  featured?: boolean;
  flashSale?: boolean;
  /** ISO deadline for the flash sale; undefined/null = no deadline. */
  flashEndsAt?: string;
  description: string;
  features: string[];
};

/** Flash offer is live: flagged AND (no deadline OR deadline in the future). */
export function isFlashActive(p: Pick<Product, "flashSale" | "flashEndsAt">): boolean {
  if (!p.flashSale) return false;
  if (!p.flashEndsAt) return true;
  return new Date(p.flashEndsAt).getTime() > Date.now();
}

export type Category = {
  id: string;
  name: string;
  icon: string;
  gradient: string;
};

export const categories: Category[] = [
  { id: "electronics", name: "الكترونيات", icon: "⚡", gradient: "from-blue-500 to-cyan-500" },
  { id: "phones", name: "هواتف", icon: "📱", gradient: "from-indigo-500 to-blue-500" },
  { id: "smart", name: "أجهزة ذكية", icon: "⌚", gradient: "from-violet-500 to-purple-500" },
  { id: "car", name: "قطع سيارات", icon: "🚗", gradient: "from-slate-500 to-zinc-500" },
  { id: "home", name: "أدوات منزلية", icon: "🏠", gradient: "from-amber-500 to-orange-500" },
  { id: "tools", name: "عدد وأدوات", icon: "🔧", gradient: "from-yellow-500 to-amber-500" },
  { id: "sports", name: "رياضة", icon: "⚽", gradient: "from-emerald-500 to-teal-500" },
  { id: "health", name: "صحة", icon: "💊", gradient: "from-rose-500 to-pink-500" },
  { id: "kids", name: "أطفال", icon: "🧸", gradient: "from-pink-500 to-fuchsia-500" },
  { id: "fashion", name: "أزياء", icon: "👕", gradient: "from-fuchsia-500 to-purple-500" },
  { id: "beauty", name: "العناية والجمال", icon: "💄", gradient: "from-pink-400 to-rose-500" },
  { id: "accessories", name: "إكسسوارات", icon: "💎", gradient: "from-cyan-500 to-sky-500" },
];

export const products: Product[] = [
  {
    id: "phone-x-pro",
    name: "هاتف OMEX X Pro الذكي",
    brand: "OMEX",
    category: "phones",
    image: phone,
    price: 189000,
    oldPrice: 245000,
    rating: 4.8,
    reviews: 1284,
    sales: 3210,
    stock: 24,
    featured: true,
    flashSale: true,
    description:
      "هاتف OMEX X Pro بشاشة AMOLED مقاس 6.7 بوصة، معالج ثماني النواة، كاميرا 108 ميجابكسل، وبطارية 5000 مللي أمبير. تصميم فاخر وأداء استثنائي.",
    features: [
      "شاشة AMOLED 120Hz",
      "معالج ثماني النواة",
      "كاميرا 108MP + عدسة ماكرو",
      "بطارية 5000mAh مع شحن سريع 65W",
      "ذاكرة 256GB / 12GB RAM",
    ],
  },
  {
    id: "headphones-air",
    name: "سماعات OMEX Air اللاسلكية",
    brand: "OMEX",
    category: "electronics",
    image: headphones,
    price: 42000,
    oldPrice: 65000,
    rating: 4.7,
    reviews: 892,
    sales: 2140,
    stock: 58,
    featured: true,
    flashSale: true,
    description: "سماعات لاسلكية بعزل ضوضاء نشط، جودة صوت هاي فاي، وبطارية تدوم 40 ساعة.",
    features: ["عزل ضوضاء ANC", "بلوتوث 5.3", "بطارية 40 ساعة", "شحن سريع USB-C"],
  },
  {
    id: "watch-galaxy",
    name: "ساعة OMEX Galaxy الذكية",
    brand: "OMEX",
    category: "smart",
    image: watch,
    price: 58000,
    oldPrice: 79000,
    rating: 4.6,
    reviews: 512,
    sales: 1420,
    stock: 33,
    featured: true,
    flashSale: true,
    description: "ساعة ذكية بشاشة AMOLED دائرية، قياس معدل ضربات القلب، ونسبة الأكسجين.",
    features: ["شاشة AMOLED دائرية", "قياس ECG و SpO2", "GPS مدمج", "مقاومة ماء 5ATM"],
  },
  {
    id: "laptop-pro",
    name: "لابتوب OMEX Studio Pro",
    brand: "OMEX",
    category: "electronics",
    image: laptop,
    price: 620000,
    oldPrice: 745000,
    rating: 4.9,
    reviews: 341,
    sales: 890,
    stock: 12,
    featured: true,
    description: "لابتوب احترافي بمعالج قوي، شاشة 14 بوصة عالية الدقة، وبطارية تدوم طوال اليوم.",
    features: ["معالج M-Series", "شاشة Retina 14 بوصة", "SSD 512GB", "بطارية 18 ساعة"],
  },
  {
    id: "sneakers-flux",
    name: "حذاء OMEX Flux الرياضي",
    brand: "OMEX",
    category: "sports",
    image: sneakers,
    price: 32000,
    oldPrice: 45000,
    rating: 4.5,
    reviews: 623,
    sales: 1780,
    stock: 71,
    flashSale: true,
    description: "حذاء رياضي بتصميم مستقبلي وإضاءة LED، مريح للاستخدام اليومي والجري.",
    features: ["إضاءة LED", "نعل مرن مبتكر", "خامة تسمح بالتهوية", "خفيف الوزن"],
  },
  {
    id: "drill-power",
    name: "مثقاب OMEX Power الكهربائي",
    brand: "OMEX",
    category: "tools",
    image: drill,
    price: 28500,
    oldPrice: 39000,
    rating: 4.7,
    reviews: 210,
    sales: 540,
    stock: 45,
    description: "مثقاب كهربائي قوي بسرعتين متغيرتين، مناسب للاستخدام المنزلي والاحترافي.",
    features: ["قوة 850W", "سرعتان متغيرتان", "قبضة مطاطية مريحة", "مع طقم لقم"],
  },
  {
    id: "speaker-boom",
    name: "مكبر صوت OMEX Boom",
    brand: "OMEX",
    category: "electronics",
    image: speaker,
    price: 18500,
    oldPrice: 27000,
    rating: 4.4,
    reviews: 456,
    sales: 1120,
    stock: 89,
    description: "مكبر صوت بلوتوث محمول بجودة صوت غامرة ومقاومة للماء.",
    features: ["بلوتوث 5.2", "مقاوم للماء IPX7", "بطارية 24 ساعة", "صوت 360°"],
  },
];

export const getProduct = (id: string) => products.find((p) => p.id === id);
export const getFlashSale = () => products.filter((p) => p.flashSale);
export const getFeatured = () => products.filter((p) => p.featured);

export const formatPrice = (v: number) => `${v.toLocaleString("en-US")} ر.ي`;
