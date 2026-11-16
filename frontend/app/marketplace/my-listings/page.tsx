"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import ProductCard from "../_components/ProductCard";
import type { MarketplaceProduct, ProductStatus } from "../_lib/marketplace";

export default function MyListingsPage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

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
        .from("marketplace_products")
        .select("*, profiles!marketplace_products_seller_id_fkey(id, full_name)")
        .eq("seller_id", id)
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;
      setProducts((data ?? []) as unknown as MarketplaceProduct[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your listings.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  async function updateStatus(productId: string, status: ProductStatus) {
    if (!userId) return;
    const previous = products;
    setProducts((items) => items.map((p) => p.id === productId
      ? { ...p, status, quantity: status === "sold" ? 0 : status === "active" && p.quantity === 0 ? 1 : p.quantity }
      : p));
    const { error: updateError } = await supabase
      .from("marketplace_products")
      .update({
        status,
        ...(status === "sold" ? { quantity: 0 } : {}),
        ...(status === "active" && previous.find((p) => p.id === productId)?.quantity === 0
          ? { quantity: 1 }
          : {}),
      })
      .eq("id", productId)
      .eq("seller_id", userId);

    if (updateError) {
      setProducts(previous);
      setError(updateError.message);
    }
  }

  async function deleteProduct(product: MarketplaceProduct) {
    if (!userId || !window.confirm(`Delete "${product.title}" permanently?`)) return;
    const { error: deleteError } = await supabase
      .from("marketplace_products")
      .delete()
      .eq("id", product.id)
      .eq("seller_id", userId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setProducts((items) => items.filter((p) => p.id !== product.id));
  }

  return (
    <main className="min-h-screen bg-[#FAF7F0] px-4 pb-24 pt-28 text-stone-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Link href="/marketplace" className="text-sm font-semibold text-stone-500 hover:text-stone-900">← Back to marketplace</Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">Seller centre</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">My listings</h1>
            <p className="mt-2 text-sm text-stone-500">Manage the products you have published.</p>
          </div>
          <Link href="/marketplace/sell" className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-black hover:bg-yellow-300">＋ Add product</Link>
        </div>

        {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {!loading && !userId ? (
          <div className="mt-8 rounded-2xl bg-white p-10 text-center"><h2 className="text-xl font-bold">Log in to manage listings</h2></div>
        ) : loading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map((n) => <div key={n} className="h-72 animate-pulse rounded-2xl bg-white" />)}</div>
        ) : products.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
            <div className="text-4xl">📦</div><h2 className="mt-4 text-lg font-bold">You have no listings yet</h2>
            <p className="mt-2 text-sm text-stone-500">Publish your first sports product to reach the SportGy community.</p>
            <Link href="/marketplace/sell" className="mt-6 inline-flex rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black">Create a listing</Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <div key={product.id} className="overflow-hidden rounded-2xl">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${product.status === "active" ? "bg-emerald-100 text-emerald-700" : product.status === "sold" ? "bg-stone-200 text-stone-700" : "bg-amber-100 text-amber-700"}`}>{product.status.toUpperCase()}</span>
                  <span className="text-xs text-stone-500">Qty: {product.quantity}</span>
                </div>
                <ProductCard product={product} showSeller={false} />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link href={`/marketplace/sell?id=${product.id}`} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-center text-xs font-bold hover:border-yellow-400">Edit</Link>
                  {product.status === "active" ? (
                    <button onClick={() => void updateStatus(product.id, "sold")} className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-bold text-white hover:bg-stone-700">Mark sold</button>
                  ) : (
                    <button onClick={() => void updateStatus(product.id, "active")} className="rounded-lg bg-yellow-400 px-3 py-2 text-xs font-bold text-black hover:bg-yellow-300">Reactivate</button>
                  )}
                  <button onClick={() => void updateStatus(product.id, "hidden")} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50">Hide listing</button>
                  <button onClick={() => void deleteProduct(product)} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
