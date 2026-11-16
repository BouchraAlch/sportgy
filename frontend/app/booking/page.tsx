
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { Sport } from "@/types/booking";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?q=80&w=1200&auto=format&fit=crop";

function getSportImage(sport: Sport): string {
  return sport.images &&
    sport.images.length > 0 &&
    typeof sport.images[0] === "string" &&
    sport.images[0].trim() !== ""
    ? sport.images[0]
    : FALLBACK_IMAGE;
}

export default function BookingSportsPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState("");

  const supabase = createSupabaseBrowserClient();

  // ------------------------------------------------------------
  // Fetch sports
  // ------------------------------------------------------------

  useEffect(() => {
    async function fetchSports() {
      try {
        const { data, error } = await supabase
          .from("sports")
          .select("*")
          .order("name", { ascending: true });

        if (error) {
          console.error("Error fetching sports:", error);
        } else if (data) {
          setSports(data);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSports();
  }, [supabase]);

  const filteredSports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sports.filter((sport) =>
      sport.name.toLowerCase().includes(query)
    );
  }, [sports, search]);

  // ------------------------------------------------------------
  // Page
  // ------------------------------------------------------------

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-stone-900">
      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: none; }
        }

        .card-in {
          animation: cardIn 600ms cubic-bezier(.22,.61,.36,1) both;
        }

        @keyframes glow {
          0%, 100% { opacity: .16; transform: scale(1); }
          50% { opacity: .3; transform: scale(1.15); }
        }

        .glow {
          animation: glow 8s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .card-in, .glow {
            animation: none !important;
          }
        }
      `}</style>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="relative z-0 overflow-hidden bg-neutral-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8">
        <div className="glow pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-yellow-400 blur-[130px]" />

        <div className="relative mx-auto max-w-7xl">
          <h1 className="mt-8 text-3xl font-black tracking-tight sm:text-5xl">
            Available <span className="text-yellow-400">Sports</span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
            Choose your sport to explore facilities, clubs, and professional
            coaches near you.
          </p>
        </div>
      </header>

      <div className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* =====================================================
            SEARCH
        ===================================================== */}

        <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-lg shadow-stone-900/5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </span>

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a sport"
              aria-label="Search a sport"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-2 focus:ring-yellow-200"
            />
          </div>

          <p className="text-sm text-stone-500" aria-live="polite">
            {loading
              ? "Loading…"
              : `${filteredSports.length} ${
                  filteredSports.length === 1 ? "sport" : "sports"
                } available`}
          </p>
        </div>

        {/* =====================================================
            LOADING SKELETON
        ===================================================== */}

        {loading && (
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-2xl bg-stone-200"
              />
            ))}
          </div>
        )}

        {/* =====================================================
            SPORTS GRID
        ===================================================== */}

        {!loading && filteredSports.length > 0 && (
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {filteredSports.map((sport, index) => (
              <Link
                key={sport.id}
                href={`/booking/${sport.id}`}
                style={{
                  animationDelay: `${Math.min(index, 8) * 70}ms`,
                }}
                className="card-in group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-neutral-900 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-stone-900/20"
              >
                <Image
                  src={getSportImage(sport)}
                  alt={sport.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                  <h2 className="text-lg font-bold leading-tight tracking-tight drop-shadow-md sm:text-xl">
                    {sport.name}
                  </h2>

                  <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-white/70 transition-colors group-hover:text-yellow-300">
                    <span>Explore clubs & coaches</span>

                    <svg
                      className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 12h14M13 6l6 6-6 6"
                      />
                    </svg>
                  </div>
                </div>

                {/* Yellow bar that grows on hover */}
                <span className="absolute bottom-0 left-0 h-1 w-0 bg-yellow-400 transition-all duration-500 group-hover:w-full" />
              </Link>
            ))}
          </div>
        )}

        {/* =====================================================
            EMPTY STATES
        ===================================================== */}

        {!loading && filteredSports.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </span>

            <p className="mb-1 text-base font-bold text-stone-800">
              {sports.length === 0
                ? "No sports available"
                : "No sport matches your search"}
            </p>

            <p className="text-sm text-stone-500">
              {sports.length === 0
                ? "There are currently no sports available."
                : "Try a different name."}
            </p>

            {sports.length > 0 && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-6 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-yellow-300"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
