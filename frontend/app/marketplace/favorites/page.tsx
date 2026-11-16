"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import ProductCard from "../_components/ProductCard";
import type { MarketplaceProduct } from "../_lib/marketplace";

export default function FavoritesPage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user?.id ?? null;
      setUserId(id);
      if (!id) {
        setProducts([]);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("marketplace_favorites")
        .select("product_id, marketplace_products!marketplace_favorites_product_id_fkey(*, profiles!marketplace_products_seller_id_fkey(id, full_name))")
        .eq("user_id", id);

      if (queryError) throw queryError;

      const saved = (data ?? [])
        .map((item: any) => item.marketplace_products)
        .filter((product: MarketplaceProduct | null) => product && product.status === "active") as MarketplaceProduct[];
      setProducts(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load favorites.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  async function removeFavorite(productId: string) {
    if (!userId) return;
    const previous = products;
    setProducts((items) => items.filter((p) => p.id !== productId));
    const { error: deleteError } = await supabase
      .from("marketplace_favorites")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId);
    if (deleteError) {
      setProducts(previous);
      setError(deleteError.message);
    }
  }

  return (
    <main className="min-h-screen bg-[#FAF7F0] px-4 pb-24 pt-28 text-stone-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Link href="/marketplace" className="text-sm font-semibold text-stone-500 hover:text-stone-900">← Back to marketplace</Link>
        <div className="mt-5"><p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">Your collection</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Saved products</h1><p className="mt-2 text-sm text-stone-500">Products you have bookmarked.</p></div>
        {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {loading ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map((n) => <div key={n} className="h-72 animate-pulse rounded-2xl bg-white" />)}</div>
        : !userId ? <div className="mt-8 rounded-2xl bg-white p-10 text-center"><h2 className="text-xl font-bold">Log in to see your favorites</h2></div>
        : products.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center"><div className="text-4xl">♡</div><h2 className="mt-4 text-lg font-bold">No saved products yet</h2><p className="mt-2 text-sm text-stone-500">Tap the heart on a product to save it here.</p><Link href="/marketplace" className="mt-6 inline-flex rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black">Explore products</Link></div>
        : <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} favorite onToggleFavorite={removeFavorite} />)}</div>}
      </div>
    </main>
  );
}
