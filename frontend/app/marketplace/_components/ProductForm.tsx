"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import {
  CATEGORIES,
  CONDITIONS,
  type MarketplaceProduct,
  type ProductCategory,
  type ProductCondition,
} from "../_lib/marketplace";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 5;

export default function ProductForm() {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [userId, setUserId] = useState<string | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("equipment");
  const [condition, setCondition] = useState("good");
  const [quantity, setQuantity] = useState("1");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [delivery, setDelivery] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user?.id ?? null;
      if (cancelled) return;
      setUserId(id);

      if (!id) {
        setLoadingProduct(false);
        return;
      }

      if (!editId) return;

      const { data, error: fetchError } = await supabase
        .from("marketplace_products")
        .select("*")
        .eq("id", editId)
        .eq("seller_id", id)
        .maybeSingle();

      if (cancelled) return;

      if (fetchError || !data) {
        setError(fetchError?.message || "Listing not found or you do not own it.");
        setLoadingProduct(false);
        return;
      }

      const product = data as MarketplaceProduct;
      setTitle(product.title);
      setDescription(product.description);
      setPrice(String(product.price));
      setCategory(product.category);
      setCondition(product.condition);
      setQuantity(String(product.quantity));
      setLocation(product.location || "");
      setPhone(product.contact_phone || "");
      setWhatsapp(product.contact_whatsapp || "");
      setDelivery(product.delivery_available);
      setExistingImages(product.images || []);
      setLoadingProduct(false);
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [supabase, editId]);

  function chooseImages(files: FileList | null) {
    if (!files) return;
    setError("");
    const selected = Array.from(files);

    if (selected.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setError("Only JPG, PNG and WebP images are supported.");
      return;
    }
    if (selected.some((file) => file.size > MAX_IMAGE_SIZE)) {
      setError("Each image must be smaller than 5 MB.");
      return;
    }
    if (existingImages.length + newImages.length + selected.length > MAX_IMAGES) {
      setError(`You can add up to ${MAX_IMAGES} images per listing.`);
      return;
    }

    setNewImages((current) => [...current, ...selected]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!userId) {
      setError("Please log in before creating a listing.");
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError("Please complete the product title and description.");
      return;
    }
    if (!Number.isFinite(Number(price)) || Number(price) < 0 || !price.trim()) {
      setError("Enter a valid price in DZD.");
      return;
    }
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 0) {
      setError("Quantity must be a whole number of zero or more.");
      return;
    }
    if (existingImages.length + newImages.length === 0) {
      setError("Please add at least one product photo.");
      return;
    }

    setSaving(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of newImages) {
        const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
        const path = `${userId}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("marketplace-products")
          .upload(path, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("marketplace-products")
          .getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }

      const payload = {
        seller_id: userId,
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        category: category as ProductCategory,
        condition: condition as ProductCondition,
        images: [...existingImages, ...uploadedUrls],
        quantity: Number(quantity),
        location: location.trim() || null,
        contact_phone: phone.trim() || null,
        contact_whatsapp: whatsapp.trim() || null,
        delivery_available: delivery,
      };

      const result = editId
        ? await supabase
            .from("marketplace_products")
            .update(payload)
            .eq("id", editId)
            .eq("seller_id", userId)
        : await supabase
            .from("marketplace_products")
            .insert(payload);

      if (result.error) throw result.error;

      router.push("/marketplace/my-listings");
      router.refresh();
    } catch (err) {
      console.error("Marketplace save error:", err);
      setError(err instanceof Error ? err.message : "Could not save your listing.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingProduct) {
    return <div className="rounded-2xl bg-white p-8 text-center text-stone-500">Loading listing...</div>;
  }

  if (!userId) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
        <h2 className="text-xl font-bold">Log in to sell on SportGy</h2>
        <p className="mt-2 text-sm text-stone-500">You need an account to publish and manage products.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <section>
        <h2 className="text-lg font-extrabold">Product information</h2>
        <p className="mt-1 text-sm text-stone-500">Give buyers the details they need to make a decision.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold">Product title *</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="e.g. Wilson tennis racket" className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold">Description *</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={5} maxLength={5000} placeholder="Describe the product, its features, size, brand, and any signs of use..." className="w-full resize-y rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" />
            <span className="mt-1 block text-right text-xs text-stone-400">{description.length}/5000</span>
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">Price (DZD) *</span>
            <input type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="4500" className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">Quantity *</span>
            <input type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">Category *</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400">
              {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">Condition *</span>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400">
              {CONDITIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        </div>
      </section>

      <div className="border-t border-stone-100 pt-6">
        <h2 className="text-lg font-extrabold">Product photos</h2>
        <p className="mt-1 text-sm text-stone-500">Upload up to {MAX_IMAGES} clear photos. JPG, PNG or WebP, max 5 MB each.</p>

        {(existingImages.length > 0 || newImages.length > 0) && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {existingImages.map((src, index) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-xl bg-stone-100">
                <img src={src} alt={`Existing product photo ${index + 1}`} className="h-full w-full object-cover" />
                <button type="button" onClick={() => setExistingImages((items) => items.filter((_, i) => i !== index))} aria-label="Remove photo" className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white">✕</button>
              </div>
            ))}
            {newImages.map((file, index) => (
              <div key={`${file.name}-${index}`} className="relative aspect-square overflow-hidden rounded-xl bg-stone-100">
                <img src={URL.createObjectURL(file)} alt={`New product photo ${index + 1}`} className="h-full w-full object-cover" />
                <button type="button" onClick={() => setNewImages((items) => items.filter((_, i) => i !== index))} aria-label="Remove photo" className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white">✕</button>
              </div>
            ))}
          </div>
        )}

        {existingImages.length + newImages.length < MAX_IMAGES && (
          <label className="mt-4 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-stone-300 px-4 py-7 text-center transition hover:border-yellow-400 hover:bg-yellow-50/40">
            <span className="text-2xl">📷</span>
            <span className="mt-2 text-sm font-bold">Choose product photos</span>
            <span className="mt-1 text-xs text-stone-500">You can select multiple images</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { chooseImages(e.target.files); e.currentTarget.value = ""; }} />
          </label>
        )}
      </div>

      <section className="border-t border-stone-100 pt-6">
        <h2 className="text-lg font-extrabold">Location & contact</h2>
        <p className="mt-1 text-sm text-stone-500">Buyers contact you directly to arrange the sale.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-semibold">City / location</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Constantine" className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-yellow-400" />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold">Phone number</span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0550 00 00 00" className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-yellow-400" />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold">WhatsApp number</span>
            <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="213550000000" className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-yellow-400" />
            <span className="mt-1 block text-xs text-stone-400">Use international format, e.g. 213550000000, without spaces or +.</span>
          </label>
        </div>
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-stone-50 p-4">
          <input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} className="mt-1 h-4 w-4 accent-yellow-400" />
          <span><span className="block text-sm font-semibold">Delivery available</span><span className="mt-0.5 block text-xs text-stone-500">I can discuss delivery arrangements with the buyer.</span></span>
        </label>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-6 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => router.push("/marketplace/my-listings")} className="rounded-xl border border-stone-200 px-6 py-3 text-sm font-bold text-stone-600 hover:bg-stone-50">Cancel</button>
        <button type="submit" disabled={saving} className="rounded-xl bg-yellow-400 px-7 py-3 text-sm font-extrabold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving..." : editId ? "Save changes" : "Publish listing"}</button>
      </div>
    </form>
  );
}
