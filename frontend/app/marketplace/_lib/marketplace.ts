export type ProductStatus = "active" | "sold" | "hidden";
export type ProductCondition = "new" | "like_new" | "good" | "fair";
export type ProductCategory =
  | "equipment"
  | "clothing"
  | "footwear"
  | "accessories"
  | "fitness_technology"
  | "other";

export type SellerProfile = {
  id: string;
  full_name: string | null;
};

export type MarketplaceProduct = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  category: ProductCategory;
  condition: ProductCondition;
  images: string[];
  quantity: number;
  location: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  delivery_available: boolean;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
  profiles?: SellerProfile | null;
};

export const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "equipment", label: "Sports equipment" },
  { value: "clothing", label: "Sports clothing" },
  { value: "footwear", label: "Shoes & footwear" },
  { value: "accessories", label: "Accessories" },
  { value: "fitness_technology", label: "Fitness technology" },
  { value: "other", label: "Other" },
];

export const CONDITIONS: { value: ProductCondition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];

export function formatPrice(value: number | string) {
  return `${new Intl.NumberFormat("fr-DZ", {
    maximumFractionDigits: 0,
  }).format(Number(value))} DZD`;
}

export function categoryLabel(value: string) {
  return CATEGORIES.find((item) => item.value === value)?.label ?? "Other";
}

export function conditionLabel(value: string) {
  return CONDITIONS.find((item) => item.value === value)?.label ?? value;
}

export function timeAgo(value: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  );
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}
