"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import type { MarketplaceProduct } from "../_lib/marketplace";
import { categoryLabel, conditionLabel, formatPrice, timeAgo, normalizePhone } from "../_lib/marketplace";

export default function ProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [product, setProduct] = useState<MarketplaceProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from("marketplace_products")
        .select("*, profiles!marketplace_products_seller_id_fkey(id, full_name)")
        .eq("id", productId)
        .eq("status", "active")
        .maybeSingle();

      if (cancelled) return;
      if (queryError) setError(queryError.message);
      else setProduct(data as unknown as MarketplaceProduct | null);
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [supabase, productId]);

  if (loading) return <main className="min-h-screen bg-[#FAF7F0] px-4 pt-32"><div className="mx-auto max-w-6xl animate-pulse rounded-2xl bg-white p-10">Loading product...</div></main>;

  if (error || !product) return (
    <main className="min-h-screen bg-[#FAF7F0] px-4 pt-32 text-stone-900">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-10 text-center">
        <h1 className="text-2xl font-black">Product unavailable</h1>
        <p className="mt-2 text-sm text-stone-500">{error || "This listing may have been removed, sold, or hidden."}</p>
        <Link href="/marketplace" className="mt-6 inline-flex rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black">Back to marketplace</Link>
      </div>
    </main>
  );

  const phone = product.contact_phone ? normalizePhone(product.contact_phone) : "";
  const whatsapp = product.contact_whatsapp ? normalizePhone(product.contact_whatsapp).replace(/^\+/, "") : "";
  const images = product.images || [];

  return (
    <main className="min-h-screen bg-[#FAF7F0] px-4 pb-24 pt-28 text-stone-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link href="/marketplace" className="text-sm font-semibold text-stone-500 hover:text-stone-900">← Back to marketplace</Link>
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,.8fr)]">
          <section>
            <div className="overflow-hidden rounded-2xl bg-white">
              <div className="flex aspect-[4/3] items-center justify-center bg-stone-100">
                {images[activeImage] ? <img src={images[activeImage]} alt={product.title} className="h-full w-full object-contain" /> : <span className="text-5xl">🏅</span>}
              </div>
            </div>
            {images.length > 1 && <div className="mt-3 grid grid-cols-5 gap-3">{images.map((src, index) => <button key={src} onClick={() => setActiveImage(index)} className={`aspect-square overflow-hidden rounded-xl border-2 ${activeImage === index ? "border-yellow-400" : "border-transparent"}`}><img src={src} alt={`${product.title} photo ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div>}
          </section>

          <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap gap-2"><span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">{categoryLabel(product.category)}</span><span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">{conditionLabel(product.condition)}</span></div>
            <h1 className="mt-4 text-3xl font-black leading-tight">{product.title}</h1>
            <p className="mt-4 text-3xl font-black text-stone-950">{formatPrice(product.price)}</p>
            <p className="mt-2 text-xs text-stone-400">Listed {timeAgo(product.created_at)}</p>

            <div className="my-6 border-t border-stone-100 pt-5">
              <h2 className="text-sm font-extrabold">Product details</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-stone-500">Quantity available</dt><dd className="font-bold">{product.quantity}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-stone-500">Location</dt><dd className="text-right font-bold">{product.location || "Not specified"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-stone-500">Delivery</dt><dd className="font-bold">{product.delivery_available ? "Can be discussed" : "Not specified"}</dd></div>
              </dl>
            </div>

            <div className="my-6 border-t border-stone-100 pt-5">
              <h2 className="text-sm font-extrabold">About this product</h2>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-stone-600">{product.description}</p>
            </div>

            <div className="rounded-xl bg-stone-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-stone-400">Seller</p>
              <p className="mt-1 font-bold">{product.profiles?.full_name || "SportGy member"}</p>
              <p className="mt-1 text-xs text-stone-500">{product.location || "Location not specified"}</p>
            </div>

            <div className="mt-5 grid gap-3">
              {whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-extrabold text-white transition hover:bg-emerald-700">Contact seller on WhatsApp</a>}
              {phone && <a href={`tel:${phone}`} className="rounded-xl border border-stone-200 px-5 py-3 text-center text-sm font-extrabold text-stone-800 transition hover:border-yellow-400">Call seller</a>}
              {!whatsapp && !phone && <p className="rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-800">The seller has not added contact details yet.</p>}
            </div>
            <p className="mt-4 text-center text-xs leading-5 text-stone-400">Contact the seller to agree on payment and delivery. SportGy does not collect payments or guarantee transactions.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
