import { Suspense } from "react";
import Link from "next/link";
import ProductForm from "../_components/ProductForm";

export default function SellProductPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F0] px-4 pb-24 pt-28 text-stone-900 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/marketplace" className="text-sm font-semibold text-stone-500 hover:text-stone-900">← Back to marketplace</Link>
        <div className="mb-7 mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">Seller centre</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">List your product</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">Create a clear listing so other athletes can discover your equipment and contact you directly.</p>
        </div>
        <Suspense fallback={<div className="rounded-2xl bg-white p-8 text-center">Loading form...</div>}>
          <ProductForm />
        </Suspense>
        <p className="mt-5 text-center text-xs leading-5 text-stone-400">SportGy does not process payments. Agree on payment, delivery and collection directly with the buyer.</p>
      </div>
    </main>
  );
}
