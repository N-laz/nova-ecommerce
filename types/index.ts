// Serializable DTOs passed from server to client components. Money is a string (2dp) to keep precision.
export type ProductCardDTO = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  image: string | null;
  imageAlt: string;
  price: string;
  compareAtPrice: string | null;
  discountPercent: number;
  ratingAvg: number;
  ratingCount: number;
  stock: number;
  lowStockThreshold: number;
  featured: boolean;
  trending: boolean;
  isNew: boolean;
  colors: string[];
};

export type CartLineDTO = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  brand: string;
  image: string | null;
  color: string;
  quantity: number;
  unitPrice: string;
  compareAtPrice: string | null;
  lineTotal: string;
  stock: number;
  available: boolean;
  issue: string | null;
};

export type CartSummaryDTO = {
  id: string | null;
  lines: CartLineDTO[];
  itemCount: number;
  subtotal: string;
  savings: string;
  couponCode: string | null;
  couponDiscount: string;
  couponError: string | null;
  shipping: string;
  pointsDiscount: string;
  pointsRedeemed: number;
  tax: string;
  total: string;
  hasIssues: boolean;
};

export type NotificationDTO = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};
