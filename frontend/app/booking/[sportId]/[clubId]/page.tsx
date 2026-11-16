"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { Club, Sport } from "@/types/booking";

interface CoachDisplayData {
  id: string;
  full_name: string;
  title: string;
  bio?: string | null;
  hourly_rate: number;
  image_url?: string | null;
  sport_id: string;
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d={direction === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

export default function ClubDetailPage() {
  const params = useParams();

  const sportId = params.sportId as string;
  const clubId = params.clubId as string;

  const [club, setClub] = useState<Club | null>(null);
  const [sport, setSport] = useState<Sport | null>(null);
  const [coaches, setCoaches] = useState<CoachDisplayData[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  const supabase = createSupabaseBrowserClient();

  // ---------------------------------------------------------
  // Fetch data
  // ---------------------------------------------------------

  useEffect(() => {
    async function fetchData() {
      if (!clubId || !sportId) return;

      try {
        setLoading(true);

        // Fetch club
        const { data: clubData, error: clubError } = await supabase
          .from("clubs")
          .select("*")
          .eq("id", clubId)
          .single();

        if (clubError) {
          console.error("Error fetching club:", clubError);
        } else {
          setClub(clubData);
          setCurrentImageIndex(0);
        }

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

        // Fetch coaches assigned to this club
        const { data: junctionData, error: junctionError } = await supabase
          .from("club_coaches")
          .select("coach_id")
          .eq("club_id", clubId);

        if (junctionError) {
          console.error("Error fetching club_coaches:", junctionError);
          setCoaches([]);
          return;
        }

        const coachIds = junctionData?.map((item) => item.coach_id) ?? [];

        if (coachIds.length === 0) {
          setCoaches([]);
          return;
        }

        // Fetch coach information directly from coaches table
        const { data: coachesData, error: coachesError } = await supabase
          .from("coaches")
          .select(`
            id,
            full_name,
            sport_id,
            title,
            bio,
            hourly_rate,
            image_url
          `)
          .in("id", coachIds)
          .eq("sport_id", sportId);

        if (coachesError) {
          console.error("Error fetching coaches details:", coachesError);
          setCoaches([]);
        } else if (coachesData) {
          const formattedCoaches: CoachDisplayData[] = coachesData.map(
            (coach) => ({
              id: coach.id,
              full_name: coach.full_name || "Unnamed Coach",
              title: coach.title,
              bio: coach.bio,
              hourly_rate: coach.hourly_rate,
              image_url: coach.image_url,
              sport_id: coach.sport_id,
            })
          );

          setCoaches(formattedCoaches);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [clubId, sportId, supabase]);

  // ---------------------------------------------------------
  // Prepare images
  // ---------------------------------------------------------

  const clubImages =
    club && Array.isArray(club.image_url)
      ? club.image_url.filter(
          (image): image is string =>
            typeof image === "string" && image.trim().length > 0
        )
      : [];

  const imageCount = clubImages.length;

  // Keyboard navigation for the gallery
  useEffect(() => {
    if (imageCount <= 1) return;

    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;

      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }

      if (e.key === "ArrowLeft") {
        setCurrentImageIndex((i) => (i === 0 ? imageCount - 1 : i - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentImageIndex((i) => (i === imageCount - 1 ? 0 : i + 1));
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [imageCount]);

  // ---------------------------------------------------------
  // Loading
  // ---------------------------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF7F0] pb-24">
        <div className="bg-neutral-950 px-4 pb-24 pt-32 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
            <div className="space-y-5">
              <div className="h-6 w-72 animate-pulse rounded bg-white/10" />
              <div className="h-10 w-64 animate-pulse rounded-lg bg-white/10" />
              <div className="h-20 w-full animate-pulse rounded bg-white/10" />
            </div>
            <div className="h-72 animate-pulse rounded-2xl bg-white/10" />
          </div>
        </div>

        <div className="relative z-10 mx-auto -mt-10 grid max-w-7xl grid-cols-1 gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-80 animate-pulse rounded-2xl bg-stone-200"
            />
          ))}
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------
  // Club not found
  // ---------------------------------------------------------

  if (!club) {
    return (
      <main className="min-h-screen bg-[#FAF7F0] px-4 pb-20 pt-40 text-center text-stone-900">
        <h1 className="mb-4 text-2xl font-bold">Club not found</h1>

        <Link
          href={`/booking/${sportId}`}
          className="inline-block rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-yellow-300"
        >
          Back to clubs list
        </Link>
      </main>
    );
  }

  const hasImages = clubImages.length > 0;

  const currentImage = hasImages
    ? clubImages[currentImageIndex] || clubImages[0]
    : null;

  // ---------------------------------------------------------
  // Main image navigation
  // ---------------------------------------------------------

  const goToPreviousImage = () => {
    if (clubImages.length <= 1) return;

    setCurrentImageIndex((previousIndex) =>
      previousIndex === 0 ? clubImages.length - 1 : previousIndex - 1
    );
  };

  const goToNextImage = () => {
    if (clubImages.length <= 1) return;

    setCurrentImageIndex((previousIndex) =>
      previousIndex === clubImages.length - 1 ? 0 : previousIndex + 1
    );
  };

  // ---------------------------------------------------------
  // Select thumbnail
  // ---------------------------------------------------------

  const selectImage = (index: number) => {
    setCurrentImageIndex(index);

    setTimeout(() => {
      const container = thumbnailsRef.current;
      if (!container) return;

      const selectedThumbnail = container.children[index] as HTMLElement;

      selectedThumbnail?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }, 0);
  };

  // ---------------------------------------------------------
  // Scroll thumbnail bar
  // ---------------------------------------------------------

  const scrollThumbnailsLeft = () => {
    thumbnailsRef.current?.scrollBy({ left: -180, behavior: "smooth" });
  };

  const scrollThumbnailsRight = () => {
    thumbnailsRef.current?.scrollBy({ left: 180, behavior: "smooth" });
  };

  // ---------------------------------------------------------
  // Page
  // ---------------------------------------------------------

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-stone-900">
      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: none; }
        }
        .card-in { animation: cardIn 600ms cubic-bezier(.22,.61,.36,1) both; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .fade-in { animation: fadeIn 400ms ease both; }

        @keyframes glow {
          0%, 100% { opacity: .16; transform: scale(1); }
          50%      { opacity: .3;  transform: scale(1.15); }
        }
        .glow { animation: glow 8s ease-in-out infinite; }

        .no-scrollbar { scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }

        @media (prefers-reduced-motion: reduce) {
          .card-in, .fade-in, .glow { animation: none !important; }
        }
      `}</style>

      {/* CLUB HEADER + GALLERY */}

      <header className="relative z-0 overflow-hidden bg-neutral-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8">
        <div className="glow pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-yellow-400 blur-[130px]" />

        <div className="relative mx-auto max-w-7xl">
          <Link
            href={`/booking/${sportId}`}
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to {sport?.name || "sport"} clubs
          </Link>

          <div className="mt-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            {/* LEFT: CLUB INFORMATION */}

            <div className="space-y-6">
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {club.city && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-black">
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
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
                      {club.city}
                    </span>
                  )}

                  <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/80">
                    {coaches.length}{" "}
                    {coaches.length === 1 ? "coach" : "coaches"} available
                  </span>
                </div>

                <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                  {club.name}
                </h1>
              </div>

              <p className="max-w-xl text-sm leading-7 text-white/65 sm:text-base">
                {club.description}
              </p>

              {club.facilities && club.facilities.length > 0 && (
                <div>
                  <h2 className="mb-3 text-sm font-semibold text-white/80">
                    Available facilities
                  </h2>

                  <div className="flex flex-wrap gap-2">
                    {club.facilities.map((facility, index) => (
                      <span
                        key={`${facility}-${index}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/80"
                      >
                        <svg
                          className="h-3.5 w-3.5 text-yellow-400"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M4 12.5l5 5L20 6.5" />
                        </svg>
                        {facility}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: IMAGE GALLERY */}

            <div className="w-full min-w-0">
              <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl sm:h-80 lg:h-96">
                {currentImage ? (
                  <>
                    <Image
                      key={currentImage}
                      src={currentImage}
                      alt={`${club.name} image ${currentImageIndex + 1}`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority={currentImageIndex === 0}
                      className="fade-in object-cover"
                    />

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />

                    {clubImages.length > 1 && (
                      <>
                        <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                          {currentImageIndex + 1} / {clubImages.length}
                        </div>

                        <button
                          type="button"
                          onClick={goToPreviousImage}
                          aria-label="Previous image"
                          className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-950 shadow-lg transition-all hover:scale-105 hover:bg-yellow-400"
                        >
                          <Chevron direction="left" />
                        </button>

                        <button
                          type="button"
                          onClick={goToNextImage}
                          aria-label="Next image"
                          className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-950 shadow-lg transition-all hover:scale-105 hover:bg-yellow-400"
                        >
                          <Chevron direction="right" />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/40">
                    <span className="text-sm">No images available</span>
                  </div>
                )}
              </div>

              {clubImages.length > 1 && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={scrollThumbnailsLeft}
                    aria-label="Scroll thumbnails left"
                    className="flex h-10 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition-all hover:border-yellow-400/50 hover:text-yellow-400"
                  >
                    <Chevron direction="left" />
                  </button>

                  <div
                    ref={thumbnailsRef}
                    className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-smooth"
                  >
                    {clubImages.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => selectImage(index)}
                        aria-label={`View image ${index + 1}`}
                        aria-current={index === currentImageIndex}
                        className={`relative h-10 w-16 flex-shrink-0 overflow-hidden rounded-lg transition-all duration-200 sm:h-12 sm:w-20 ${
                          index === currentImageIndex
                            ? "opacity-100 ring-2 ring-yellow-400 ring-offset-2 ring-offset-neutral-950"
                            : "border border-white/10 opacity-50 hover:opacity-100"
                        }`}
                      >
                        <Image
                          src={image}
                          alt={`${club.name} thumbnail ${index + 1}`}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={scrollThumbnailsRight}
                    aria-label="Scroll thumbnails right"
                    className="flex h-10 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition-all hover:border-yellow-400/50 hover:text-yellow-400"
                  >
                    <Chevron direction="right" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* COACHES SECTION */}

      <section className="relative z-10 mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
            Select a <span className="text-yellow-600">Coach</span>
          </h2>

          <p className="mt-2 text-sm text-stone-500 sm:text-base">
            Book training sessions with coaches available at {club.name}.
          </p>
        </div>

        {coaches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
            <p className="text-base text-stone-500">
              No active coaches registered at {club.name} for{" "}
              {sport?.name || "this sport"} yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {coaches.map((coach, index) => {
              const coachAvatar =
                typeof coach.image_url === "string" &&
                coach.image_url.trim() !== ""
                  ? coach.image_url
                  : null;

              return (
                <Link
                  key={coach.id}
                  href={`/booking/${sportId}/${clubId}/${coach.id}`}
                  style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
                  className="card-in group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-yellow-400 hover:shadow-xl hover:shadow-stone-900/10"
                >
                  {/* COACH IMAGE */}

                  <div className="relative aspect-[4/3] overflow-hidden bg-neutral-950">
                    {coachAvatar ? (
                      <Image
                        src={coachAvatar}
                        alt={coach.full_name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-900 to-slate-800">
                        <svg
                          className="h-16 w-16 text-white/25"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.3}
                            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 0115 0zM4.5 20.25a8 8 0 0115 0"
                          />
                        </svg>
                      </div>
                    )}

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />

                    <span className="absolute bottom-3 left-3 rounded-full bg-yellow-400 px-3 py-1 text-xs font-extrabold text-black">
                      {Number(coach.hourly_rate).toLocaleString()} DZD
                      <span className="font-semibold text-black/60"> / hr</span>
                    </span>
                  </div>

                  {/* COACH INFORMATION */}

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-lg font-bold leading-tight tracking-tight text-stone-900">
                      {coach.full_name}
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-yellow-700">
                      {coach.title}
                    </p>

                    <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-stone-500">
                      {coach.bio || "Book a session and train with this coach."}
                    </p>

                    <span className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-bold text-white transition-colors group-hover:bg-yellow-400 group-hover:text-black">
                      Book session
                      <svg
                        className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
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
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}