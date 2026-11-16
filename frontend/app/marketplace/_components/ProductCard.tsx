"use client";

import Link from "next/link";
import { useState } from "react";
import type { MarketplaceProduct } from "../_lib/marketplace";
import {
  categoryLabel,
  conditionLabel,
  formatPrice,
  timeAgo,
} from "../_lib/marketplace";

type Props = {
  product: MarketplaceProduct;
  favorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
  showSeller?: boolean;
};

export default function ProductCard({
  product,
  favorite = false,
  onToggleFavorite,
  showSeller = true,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = product.images?.[0];

  return (
    <article className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-yellow-300 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        {image && !imageFailed ? (
          <img
            src={image}
            alt={product.title}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-stone-400">
            <span className="text-4xl">🏅</span>
            <span className="text-xs font-medium">No product image</span>
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-stone-700 shadow-sm">
          {conditionLabel(product.condition)}
        </span>

        {onToggleFavorite && (
          <button
            type="button"
            onClick={() => onToggleFavorite(product.id)}
            aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={favorite}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-lg shadow-sm transition hover:scale-110"
          >
            <span className={favorite ? "text-red-500" : "text-stone-500"}>
              {favorite ? "♥" : "♡"}
            </span>
          </button>
        )}
      </div>

      <div className="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-yellow-700">
          {categoryLabel(product.category)}
        </p>
        <Link
          href={`/marketplace/${product.id}`}
          className="mt-1 block min-h-12 text-base font-bold leading-6 text-stone-900 hover:text-yellow-700"
        >
          {product.title}
        </Link>

        <p className="mt-2 text-lg font-black text-stone-950">
          {formatPrice(product.price)}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-stone-100 pt-3 text-xs text-stone-500">
          <span className="truncate">
            {showSeller
              ? product.profiles?.full_name || "SportGy member"
              : product.location || "Location not specified"}
          </span>
          <span className="shrink-0">{timeAgo(product.created_at)}</span>
        </div>
        {showSeller && product.location && (
          <p className="mt-1 truncate text-xs text-stone-400">
            {product.location}
          </p>
        )}
      </div>
    </article>
  );
}
