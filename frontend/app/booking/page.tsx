"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { Sport } from "@/types/booking";

export default function BookingSportsPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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

  // ------------------------------------------------------------
  // Page
  // ------------------------------------------------------------

  return (
    <div className="min-h-screen bg-white text-slate-900 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-9">
          {/* Small label */}


          {/* Main title */}
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Available{" "}
            <span className="text-yellow-500">
              Sports
            </span>
          </h1>

          {/* Description */}
          <p className="text-sm sm:text-base text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
            Choose your sport to explore facilities, clubs, and professional
            coaches near you.
          </p>
        </div>

        {/* =====================================================
            LOADING SKELETON
        ===================================================== */}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-2xl bg-slate-100 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* =====================================================
            SPORTS GRID
        ===================================================== */}

        {!loading && sports.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            {sports.map((sport) => {
              const sportImage =
                sport.images &&
                sport.images.length > 0 &&
                typeof sport.images[0] === "string" &&
                sport.images[0].trim() !== ""
                  ? sport.images[0]
                  : "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?q=80&w=1200&auto=format&fit=crop";

              return (
                <Link
                  key={sport.id}
                  href={`/booking/${sport.id}`}
                  className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-slate-100 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                >

                  {/* =================================================
                      SPORT IMAGE
                  ================================================= */}

                  <Image
                    src={sportImage}
                    alt={sport.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />

                  {/* =================================================
                      GENERAL OVERLAY
                  ================================================= */}

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

                  {/* =================================================
                      SAVE BUTTON
                  ================================================= */}

                  <button
                    type="button"
                    aria-label={`Save ${sport.name}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    className="absolute top-3 left-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-700 hover:bg-white hover:text-yellow-500 shadow-md transition-all duration-200 cursor-pointer"
                  >
                    <svg
                      className="w-[18px] h-[18px]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"
                      />
                    </svg>
                  </button>

                  {/* =================================================
                      BOTTOM GRADIENT
                  ================================================= */}

                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none" />

                  {/* =================================================
                      SPORT INFORMATION
                  ================================================= */}

                  <div className="absolute left-0 right-0 bottom-0 p-4 text-white">

                    {/* Sport name */}
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight leading-tight drop-shadow-md">
                      {sport.name}
                    </h2>

                    {/* Explore */}
                    <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-white/70 group-hover:text-yellow-300 transition-colors">
                      <span>
                        Explore Clubs & Coaches
                      </span>

                      <svg
                        className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 12h14M13 6l6 6-6 6"
                        />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* =====================================================
            NO SPORTS
        ===================================================== */}

        {!loading && sports.length === 0 && (
          <div className="text-center py-16 bg-slate-50 border border-slate-200 rounded-2xl">

            <div className="text-3xl mb-3">
              ⌕
            </div>

            <p className="text-slate-700 text-base font-semibold mb-1">
              No sports available
            </p>

            <p className="text-slate-400 text-sm">
              There are currently no sports available.
            </p>

          </div>
        )}
      </div>
    </div>
  );
}