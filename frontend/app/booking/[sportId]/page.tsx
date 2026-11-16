
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { Sport, Club } from "@/types/booking";

function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center text-sm font-medium text-white/60 transition-colors hover:text-yellow-400"
    >
      <svg
        className="mr-2 h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {children}
    </Link>
  );
}

const PAGE_STYLES = `
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: none; }
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
`;

export default function SportDetailPage() {
  const params = useParams();
  const sportId = params.sportId as string;

  const [sport, setSport] = useState<Sport | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");

  const supabase = createSupabaseBrowserClient();

  // ------------------------------------------------------------
  // Fetch data
  // ------------------------------------------------------------

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
  // Cities
  // ------------------------------------------------------------

  const cities = useMemo(
    () =>
      Array.from(
        new Set(clubs.map((club) => club.city).filter((c): c is string => !!c))
      ).sort(),
    [clubs]
  );

  // ------------------------------------------------------------
  // Filter clubs
  // ------------------------------------------------------------

  const filteredClubs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return clubs.filter((club) => {
      const matchesCity = cityFilter === "all" || club.city === cityFilter;

      const matchesSearch = `${club.name} ${club.city ?? ""}`
        .toLowerCase()
        .includes(query);

      return matchesCity && matchesSearch;
    });
  }, [clubs, search, cityFilter]);

  // ------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF7F0] pb-24">
        <div className="bg-neutral-950 px-4 pb-24 pt-32 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="h-6 w-72 animate-pulse rounded bg-white/10" />
            <div className="h-10 w-64 animate-pulse rounded-lg bg-white/10" />
            <div className="h-4 w-96 max-w-full animate-pulse rounded bg-white/10" />
          </div>
        </div>

        <div className="relative z-10 mx-auto -mt-10 grid max-w-7xl grid-cols-2 gap-5 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-2xl bg-stone-200"
            />
          ))}
        </div>
      </main>
    );
  }

  // ------------------------------------------------------------
  // Sport not found
  // ------------------------------------------------------------

  if (!sport) {
    return (
      <main className="min-h-screen bg-[#FAF7F0] px-4 pb-20 pt-40 text-center text-stone-900">
        <h1 className="mb-4 text-2xl font-bold">Sport not found</h1>

        <Link
          href="/booking"
          className="inline-block rounded-xl bg-yellow-400 px-z py-2.5 text-sm font-bold text-black transition hover:bg-yellow-300"
        >
          Back to sports
        </Link>
      </main>
    );
  }

  const sportImage =
    Array.isArray(sport.images) &&
    typeof sport.images[0] === "string" &&
    sport.images[0].trim() !== ""
      ? sport.images[0]
      : null;

  // ------------------------------------------------------------
  // Page
  // ------------------------------------------------------------

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-stone-900">
      <style>{PAGE_STYLES}</style>

      {/* ----------------------------------------------------
          Header
      ---------------------------------------------------- */}

      <header className="relative z-0 overflow-hidden bg-neutral-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8">
        {sportImage && (
          <Image
            src={sportImage}
            alt=""
            fill
            sizes="100vw"
            priority
            className="object-cover opacity-20"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/85 to-neutral-950/40" />

        <div className="glow pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-yellow-400 blur-[130px]" />

        <div className="relative mx-auto max-w-7xl">
          <BackLink href="/booking">Back to sports</BackLink>

          <h1 className="mt-8 text-3xl font-black tracking-tight sm:text-5xl">
            {sport.name}{" "}
            <span className="text-yellow-400">Clubs</span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
            Explore participating clubs offering {sport.name} facilities.
          </p>
        </div>
      </header>

      <div className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ----------------------------------------------------
            Filters
        ---------------------------------------------------- */}

        {clubs.length > 0 && (
          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-4 shadow-lg shadow-stone-900/5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                  placeholder="Search a club"
                  aria-label="Search a club"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-2 focus:ring-yellow-200"
                />
              </div>

              <p className="text-sm text-stone-500" aria-live="polite">
                {filteredClubs.length}{" "}
                {filteredClubs.length === 1 ? "club" : "clubs"} found
              </p>
            </div>

            {cities.length > 1 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4">
                <span className="mr-1 text-xs font-medium text-stone-500">
                  City
                </span>

                {["all", ...cities].map((city) => {
                  const active = cityFilter === city;

                  return (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setCityFilter(city)}
                      aria-pressed={active}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-yellow-400 bg-yellow-400 text-black"
                          : "border-stone-200 bg-white text-stone-600 hover:border-yellow-400"
                      }`}
                    >
                      {city === "all" ? "All cities" : city}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --------------------------------------------------
            No clubs / Empty search
        -------------------------------------------------- */}

        {clubs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
            <p className="text-base text-stone-500">
              No active clubs found for {sport.name} yet.
            </p>
          </div>
        ) : filteredClubs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
            <p className="mb-1 text-base font-bold text-stone-800">
              No club matches your search
            </p>

            <p className="text-sm text-stone-500">
              Try another name or city.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCityFilter("all");
              }}
              className="mt-6 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-yellow-300"
            >
              Reset filters
            </button>
          </div>
        ) : (
          /* ------------------------------------------------
             Clubs Grid
          ------------------------------------------------ */

          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {filteredClubs.map((club, index) => {
              const clubImage =
                Array.isArray(club.image_url) &&
                club.image_url.length > 0 &&
                typeof club.image_url[0] === "string" &&
                club.image_url[0].trim() !== ""
                  ? club.image_url[0]
                  : null;

              const facilities = Array.isArray(club.facilities)
                ? club.facilities.slice(0, 2)
                : [];

              return (
                <Link
                  key={club.id}
                  href={`/booking/${sportId}/${club.id}`}
                  style={{
                    animationDelay: `${Math.min(index, 8) * 70}ms`,
                  }}
                  className="card-in group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-neutral-900 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-stone-900/20"
                >
                  {clubImage ? (
                    <Image
                      src={clubImage}
                      alt={club.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-900 to-slate-800">
                      <span className="text-sm text-white/40">
                        No image available
                      </span>
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                    <h3 className="text-lg font-bold leading-tight tracking-tight drop-shadow-md sm:text-xl">
                      {club.name}
                    </h3>

                    <div className="mt-2 flex items-center gap-1.5 text-white/85">
                      <svg
                        className="h-3.5 w-3.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z"
                        />
                        <circle cx="12" cy="9" r="2.2" />
                      </svg>

                      <span className="text-xs font-medium">
                        {club.city}
                      </span>
                    </div>

                    {facilities.length > 0 && (
                      <div className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
                        {facilities.map((facility) => (
                          <span
                            key={facility}
                            className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm"
                          >
                            {facility}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-white/70 transition-colors group-hover:text-yellow-300">
                      <span>Explore club</span>

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

                  <span className="absolute bottom-0 left-0 h-1 w-0 bg-yellow-400 transition-all duration-500 group-hover:w-full" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
