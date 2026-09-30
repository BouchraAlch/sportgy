"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { Sport, Club } from "@/types/booking";

export default function SportDetailPage() {
  const params = useParams();
  const sportId = params.sportId as string;

  const [sport, setSport] = useState<Sport | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function fetchData() {
      if (!sportId) return;

      try {
        setLoading(true);

        // Fetch sport
        const { data: sportData, error: sportError } = await supabase
          .from("sports")
          .select("*")
          .eq("id", sportId)
          .single();

        if (sportError) {
          console.error("Error fetching sport:", sportError);
        } else {
          setSport(sportData);
        }

        // Fetch clubs
        const { data: clubsData, error: clubsError } = await supabase
          .from("clubs")
          .select("*")
          .eq("sport_id", sportId);

        if (clubsError) {
          console.error("Error fetching clubs:", clubsError);
        } else {
          setClubs(clubsData || []);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [sportId, supabase]);

  // ------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-56 bg-slate-100 rounded-lg animate-pulse mb-8" />

          <div className="h-7 w-48 bg-slate-100 rounded-lg animate-pulse mb-2" />

          <div className="h-4 w-80 max-w-full bg-slate-100 rounded-lg animate-pulse mb-8" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="aspect-[3/4] bg-slate-100 rounded-2xl animate-pulse" />
            <div className="aspect-[3/4] bg-slate-100 rounded-2xl animate-pulse" />
            <div className="aspect-[3/4] bg-slate-100 rounded-2xl animate-pulse" />
            <div className="aspect-[3/4] bg-slate-100 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // Sport not found
  // ------------------------------------------------------------

  if (!sport) {
    return (
      <div className="min-h-screen bg-white text-slate-900 pt-32 pb-20 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">
          Sport Not Found
        </h1>

        <Link
          href="/booking"
          className="text-yellow-500 hover:underline"
        >
          ← Back to Sports
        </Link>
      </div>
    );
  }

  // ------------------------------------------------------------
  // Page
  // ------------------------------------------------------------

  return (
    <div className="min-h-screen bg-white text-slate-900 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* ----------------------------------------------------
            Header
        ---------------------------------------------------- */}

        <div className="mb-8">
          <Link
            href="/booking"
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-yellow-500 transition-colors mb-5"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>

            Back to Sports Selection
          </Link>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            {sport.name}
          </h1>
        </div>

        {/* ----------------------------------------------------
            Available Clubs
        ---------------------------------------------------- */}

        <div className="space-y-7">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Available{" "}
              <span className="text-yellow-500">
                Clubs
              </span>
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Explore participating clubs offering {sport.name} facilities.
            </p>
          </div>

          {/* --------------------------------------------------
              No clubs
          -------------------------------------------------- */}

          {clubs.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 border border-slate-200 rounded-2xl">
              <p className="text-slate-500 text-base">
                No active clubs found for {sport.name} yet.
              </p>
            </div>
          ) : (

            /* ------------------------------------------------
               Clubs Grid
            ------------------------------------------------ */

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {clubs.map((club) => {
                const clubImage =
                  Array.isArray(club.image_url) &&
                  club.image_url.length > 0 &&
                  typeof club.image_url[0] === "string" &&
                  club.image_url[0].trim() !== ""
                    ? club.image_url[0]
                    : null;

                return (
                  <Link
                    key={club.id}
                    href={`/booking/${sportId}/${club.id}`}
                    className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-slate-100 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                  >
                    {/* ------------------------------------------------
                        Club Image
                    ------------------------------------------------- */}

                    {clubImage ? (
                      <Image
                        src={clubImage}
                        alt={club.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                        <span className="text-sm text-slate-400">
                          No image available
                        </span>
                      </div>
                    )}

                    {/* ------------------------------------------------
                        General dark overlay
                    ------------------------------------------------- */}

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

                    {/* ------------------------------------------------
                        Saved button
                    ------------------------------------------------- */}

                    <button
                      type="button"
                      aria-label={`Save ${club.name}`}
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

                    {/* ------------------------------------------------
                        Bottom gradient
                    ------------------------------------------------- */}

                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/45 to-transparent pointer-events-none" />

                    {/* ------------------------------------------------
                        Club information
                    ------------------------------------------------- */}

                    <div className="absolute left-0 right-0 bottom-0 p-4 text-white">

                      {/* Club name */}

                      <h3 className="text-lg sm:text-xl font-bold tracking-tight leading-tight drop-shadow-md">
                        {club.name}
                      </h3>

                      {/* Location */}

                      <div className="flex items-center gap-1.5 mt-2 text-white/85">
                        <svg
                          className="w-3.5 h-3.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z"
                          />

                          <circle
                            cx="12"
                            cy="9"
                            r="2.2"
                          />
                        </svg>

                        <span className="text-xs font-medium">
                          {club.city}
                        </span>
                      </div>

                      {/* Small explore indicator */}

                      <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-white/70 group-hover:text-yellow-300 transition-colors">
                        <span>
                          Explore club
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
        </div>
      </div>
    </div>
  );
}