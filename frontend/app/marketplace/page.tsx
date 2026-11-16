"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import ProductCard from "./_components/ProductCard";
import {
  CATEGORIES,
  type MarketplaceProduct,
  type ProductCategory,
} from "./_lib/marketplace";

export default function MarketplacePage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [sort, setSort] = useState("newest");
  const [maxPrice, setMaxPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user?.id ?? null;
      setUserId(id);

      const { data, error: productsError } = await supabase
        .from("marketplace_products")
        .select(`
          id, seller_id, title, description, price, category, condition,
          images, quantity, location, contact_phone, contact_whatsapp,
          delivery_available, status, created_at, updated_at,
          profiles!marketplace_products_seller_id_fkey ( id, full_name )
        `)
        .eq("status", "active")
        .gt("quantity", 0)
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;
      setProducts((data ?? []) as unknown as MarketplaceProduct[]);

      if (id) {
        const { data: favoriteData, error: favoriteError } = await supabase
          .from("marketplace_favorites")
          .select("product_id")
          .eq("user_id", id);
        if (favoriteError) throw favoriteError;
        setFavorites((favoriteData ?? []).map((item) => item.product_id));
      } else {
        setFavorites([]);
      }
    } catch (err) {
      console.error("Marketplace load error:", err);
      setError(err instanceof Error ? err.message : "Could not load marketplace.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  async function toggleFavorite(productId: string) {
    if (!userId) {
      setError("Please log in to save favorites.");
      return;
    }

    const isFavorite = favorites.includes(productId);
    setFavorites((current) =>
      isFavorite ? current.filter((id) => id !== productId) : [...current, productId]
    );

    const result = isFavorite
      ? await supabase.from("marketplace_favorites").delete().eq("user_id", userId).eq("product_id", productId)
      : await supabase.from("marketplace_favorites").insert({ user_id: userId, product_id: productId });

    if (result.error) {
      setFavorites((current) =>
        isFavorite ? [...current, productId] : current.filter((id) => id !== productId)
      );
      setError(result.error.message);
    }
  }

  const visibleProducts = useMemo(() => {
    let result = products.filter((product) => {
      const term = search.trim().toLowerCase();
      const matchesSearch = !term || `${product.title} ${product.description} ${product.location ?? ""}`.toLowerCase().includes(term);
      const matchesCategory = category === "all" || product.category === category;
      const matchesPrice = !maxPrice || product.price <= Number(maxPrice);
      return matchesSearch && matchesCategory && matchesPrice;
    });

    if (sort === "price-low") result = [...result].sort((a, b) => a.price - b.price);
    if (sort === "price-high") result = [...result].sort((a, b) => b.price - a.price);
    if (sort === "oldest") result = [...result].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    return result;
  }, [products, search, category, sort, maxPrice]);

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-stone-900">
      <header className="relative isolate overflow-hidden bg-neutral-950 px-4 pb-24 pt-28 text-white sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-96 w-96 rounded-full bg-yellow-400/20 blur-[120px]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">Buy • Sell • Connect</p>
          <div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight sm:text-6xl">SportGy <span className="text-yellow-400">Marketplace</span></h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">Discover sports gear, find great deals, and give quality equipment a second life.</p>
            </div>
            <Link href="/marketplace/sell" className="inline-flex w-fit items-center justify-center rounded-xl bg-yellow-400 px-6 py-3 text-sm font-extrabold text-black transition hover:bg-yellow-300">＋ Sell a product</Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto -mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-lg shadow-stone-900/5 sm:p-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_190px]">
            <label className="relative">
              <span className="sr-only">Search products</span>
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">⌕</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search equipment, clothing, shoes..." className="w-full rounded-xl border border-stone-200 bg-stone-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-yellow-400 focus:bg-white" />
            </label>
            <select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory | "all")} className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400">
              <option value="all">All categories</option>
              {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </select>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-sm text-stone-600">
              <span className="font-semibold">Maximum price</span>
              <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Any price" className="w-36 rounded-lg border border-stone-200 px-3 py-2 outline-none focus:border-yellow-400" />
              <span className="text-xs text-stone-400">DZD</span>
            </label>
            <button type="button" onClick={() => { setSearch(""); setCategory("all"); setSort("newest"); setMaxPrice(""); }} className="text-left text-xs font-bold text-stone-500 hover:text-stone-900">Clear filters</button>
          </div>
        </section>

        <div className="mb-5 mt-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Explore products</h2>
            <p className="mt-1 text-sm text-stone-500">{loading ? "Loading listings..." : `${visibleProducts.length} product${visibleProducts.length === 1 ? "" : "s"} found`}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/marketplace/favorites" className="rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 hover:border-yellow-400">♡ Favorites</Link>
            <Link href="/marketplace/my-listings" className="rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 hover:border-yellow-400">My listings</Link>
          </div>
        </div>

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="overflow-hidden rounded-2xl bg-white"><div className="aspect-[4/3] animate-pulse bg-stone-200" /><div className="space-y-3 p-4"><div className="h-3 w-1/3 animate-pulse rounded bg-stone-200" /><div className="h-5 w-4/5 animate-pulse rounded bg-stone-200" /><div className="h-4 w-1/2 animate-pulse rounded bg-stone-100" /></div></div>)}
          </div>
        ) : visibleProducts.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((product) => <ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} onToggleFavorite={toggleFavorite} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
            <div className="text-4xl">🏃</div>
            <h3 className="mt-4 text-lg font-bold">No products found</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-stone-500">Try changing your search or filters, or be the first to publish a listing.</p>
            <Link href="/marketplace/sell" className="mt-6 inline-flex rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black hover:bg-yellow-300">List a product</Link>
          </div>
        )}
      </div>
    </main>
  );
}
