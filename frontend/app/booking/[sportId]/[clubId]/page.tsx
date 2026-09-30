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

export default function ClubDetailPage() {
  const params = useParams();

  const sportId = params.sportId as string;
  const clubId = params.clubId as string;

  const [club, setClub] = useState<Club | null>(null);
  const [sport, setSport] = useState<Sport | null>(null);
  const [coaches, setCoaches] = useState<CoachDisplayData[]>([]);
  const [loading, setLoading] = useState(true);

  // Main selected image
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Thumbnail container
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

        // ---------------------------------------------------------
        // Fetch club
        // ---------------------------------------------------------

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

        // ---------------------------------------------------------
        // Fetch sport
        // ---------------------------------------------------------

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

        // ---------------------------------------------------------
        // Fetch coaches assigned to this club
        // ---------------------------------------------------------

        const { data: junctionData, error: junctionError } =
          await supabase
            .from("club_coaches")
            .select("coach_id")
            .eq("club_id", clubId);

        if (junctionError) {
          console.error(
            "Error fetching club_coaches:",
            junctionError
          );

          setLoading(false);
          return;
        }

        const coachIds = junctionData
          ? junctionData.map((item) => item.coach_id)
          : [];

        if (coachIds.length === 0) {
          setCoaches([]);
          setLoading(false);
          return;
        }

        // ---------------------------------------------------------
        // Fetch coach information
        // ---------------------------------------------------------

        const { data: coachesData, error: coachesError } =
          await supabase
            .from("coaches")
            .select(`
              id,
              sport_id,
              title,
              bio,
              hourly_rate,
              image_url,
              profiles (
                full_name
              )
            `)
            .in("id", coachIds)
            .eq("sport_id", sportId);

        if (coachesError) {
          console.error(
            "Error fetching coaches details:",
            coachesError
          );
        } else if (coachesData) {
          const formattedCoaches: CoachDisplayData[] =
            coachesData.map((coach: any) => ({
              id: coach.id,
              full_name:
                coach.profiles?.full_name || "Coach",
              title: coach.title,
              bio: coach.bio,
              hourly_rate: coach.hourly_rate,
              image_url: coach.image_url,
              sport_id: coach.sport_id,
            }));

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
  // Loading
  // ---------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-slate-900 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="h-8 w-48 bg-slate-100 rounded-lg animate-pulse" />

          <div className="h-80 bg-slate-100 border border-slate-200 rounded-3xl animate-pulse" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="aspect-square bg-slate-100 rounded-2xl animate-pulse" />
            <div className="aspect-square bg-slate-100 rounded-2xl animate-pulse" />
            <div className="aspect-square bg-slate-100 rounded-2xl animate-pulse" />
            <div className="aspect-square bg-slate-100 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // Club not found
  // ---------------------------------------------------------

  if (!club) {
    return (
      <div className="min-h-screen bg-white text-slate-900 pt-32 pb-20 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4">
          Club Not Found
        </h1>

        <Link
          href={`/booking/${sportId}`}
          className="text-yellow-600 hover:underline"
        >
          ← Back to Clubs List
        </Link>
      </div>
    );
  }

  // ---------------------------------------------------------
  // Prepare images
  // ---------------------------------------------------------

  const clubImages = Array.isArray(club.image_url)
    ? club.image_url.filter(
        (image): image is string =>
          typeof image === "string" &&
          image.trim().length > 0
      )
    : [];

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
      previousIndex === 0
        ? clubImages.length - 1
        : previousIndex - 1
    );
  };

  const goToNextImage = () => {
    if (clubImages.length <= 1) return;

    setCurrentImageIndex((previousIndex) =>
      previousIndex === clubImages.length - 1
        ? 0
        : previousIndex + 1
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

      const selectedThumbnail =
        container.children[index] as HTMLElement;

      if (selectedThumbnail) {
        selectedThumbnail.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }, 0);
  };

  // ---------------------------------------------------------
  // Scroll thumbnail bar
  // ---------------------------------------------------------

  const scrollThumbnailsLeft = () => {
    thumbnailsRef.current?.scrollBy({
      left: -180,
      behavior: "smooth",
    });
  };

  const scrollThumbnailsRight = () => {
    thumbnailsRef.current?.scrollBy({
      left: 180,
      behavior: "smooth",
    });
  };

  // ---------------------------------------------------------
  // Page
  // ---------------------------------------------------------

  return (
    <div className="min-h-screen bg-white text-slate-900 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* =====================================================
            BACK BUTTON
        ===================================================== */}

        <div>
          <Link
            href={`/booking/${sportId}`}
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-yellow-600 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>

            Back to {sport?.name || "Sport"} Clubs
          </Link>
        </div>

        {/* =====================================================
            CLUB INFORMATION + IMAGE GALLERY
        ===================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center bg-[#030303] border border-[#111111] p-5 sm:p-6 rounded-3xl shadow-2xl">

          {/* ===================================================
              LEFT — CLUB INFORMATION
          =================================================== */}

          <div className="space-y-5">

            <div>
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-[0.2em] block mb-2">
                {club.city}
              </span>

              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                {club.name}
              </h1>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              {club.description}
            </p>

            {sport?.name && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/20">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />

                <span className="text-xs font-semibold text-yellow-300">
                  {sport.name}
                </span>
              </div>
            )}

            {club.facilities &&
              club.facilities.length > 0 && (
                <div>
                  <h3 className="text-[11px] uppercase tracking-[0.15em] text-slate-500 font-semibold mb-3">
                    Available Facilities
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {club.facilities.map(
                      (facility, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-slate-300"
                        >
                          <span className="text-yellow-400 mr-1">
                            ✓
                          </span>

                          {facility}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
          </div>

          {/* ===================================================
              RIGHT — IMAGE GALLERY
          =================================================== */}

          <div className="w-full min-w-0">

            {/* Main image */}

            <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-white/[0.08] shadow-xl bg-[#080808]">

              {currentImage ? (
                <>
                  <Image
                    src={currentImage}
                    alt={`${club.name} image ${
                      currentImageIndex + 1
                    }`}
                    fill
                    priority={currentImageIndex === 0}
                    className="object-cover transition-all duration-300"
                  />

                  <div className="absolute inset-0 bg-black/15 pointer-events-none" />

                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

                  {/* Counter */}

                  {clubImages.length > 1 && (
                    <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-xs font-semibold border border-white/10">
                      {currentImageIndex + 1} /{" "}
                      {clubImages.length}
                    </div>
                  )}

                  {/* Previous */}

                  {clubImages.length > 1 && (
                    <button
                      type="button"
                      onClick={goToPreviousImage}
                      aria-label="Previous image"
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-900 shadow-lg flex items-center justify-center transition-all hover:scale-105"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                  )}

                  {/* Next */}

                  {clubImages.length > 1 && (
                    <button
                      type="button"
                      onClick={goToNextImage}
                      aria-label="Next image"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-900 shadow-lg flex items-center justify-center transition-all hover:scale-105"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <span className="text-sm">
                    No images available
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail bar */}

            {clubImages.length > 1 && (
              <div className="mt-2 flex items-center gap-2">

                {/* Left */}

                <button
                  type="button"
                  onClick={scrollThumbnailsLeft}
                  aria-label="Scroll thumbnails left"
                  className="flex-shrink-0 w-8 h-10 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] flex items-center justify-center text-slate-400 shadow-sm transition-all hover:border-yellow-400/40"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>

                {/* Thumbnails */}

                <div
                  ref={thumbnailsRef}
                  className="flex-1 min-w-0 flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
                >
                  {clubImages.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => selectImage(index)}
                      aria-label={`View image ${
                        index + 1
                      }`}
                      className={`
                        relative
                        flex-shrink-0
                        w-16
                        h-10
                        sm:w-20
                        sm:h-12
                        rounded-lg
                        overflow-hidden
                        transition-all
                        duration-200
                        ${
                          index === currentImageIndex
                            ? "ring-2 ring-yellow-400 ring-offset-1 ring-offset-[#030303] opacity-100"
                            : "opacity-50 hover:opacity-100 border border-white/10"
                        }
                      `}
                    >
                      <Image
                        src={image}
                        alt={`${club.name} thumbnail ${
                          index + 1
                        }`}
                        fill
                        className="object-cover"
                      />

                      {index === currentImageIndex && (
                        <div className="absolute inset-0 bg-yellow-400/10 pointer-events-none" />
                      )}

                      {index === currentImageIndex && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Right */}

                <button
                  type="button"
                  onClick={scrollThumbnailsRight}
                  aria-label="Scroll thumbnails right"
                  className="flex-shrink-0 w-8 h-10 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] flex items-center justify-center text-slate-400 shadow-sm transition-all hover:border-yellow-400/40"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7 7-7"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* =====================================================
            COACHES SECTION
        ===================================================== */}

        <div className="space-y-6">

          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Select a{" "}
              <span className="text-yellow-500">
                Coach
              </span>
            </h2>

            <p className="text-slate-500 mt-2">
              Book training sessions with coaches available
              at {club.name}.
            </p>
          </div>

          {/* =================================================
              NO COACHES
          ================================================= */}

          {coaches.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <p className="text-slate-500 text-lg">
                No active coaches registered at{" "}
                {club.name} for{" "}
                {sport?.name || "this sport"} yet.
              </p>
            </div>
          ) : (

            /* =================================================
               COACH CARDS
            ================================================= */

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

              {coaches.map((coach) => {
                const coachAvatar =
                  typeof coach.image_url === "string" &&
                  coach.image_url.trim() !== ""
                    ? coach.image_url
                    : null;

                return (
                  <Link
                    key={coach.id}
                    href={`/booking/${sportId}/${clubId}/${coach.id}`}
                    className="group relative block aspect-square overflow-hidden rounded-2xl bg-[#030303] shadow-md hover:shadow-2xl transition-all duration-500 cursor-pointer"
                  >

                    {/* =================================================
                        COACH IMAGE
                    ================================================= */}

                    {coachAvatar ? (
                      <Image
                        src={coachAvatar}
                        alt={coach.full_name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-all duration-700 ease-out group-hover:scale-105 group-hover:brightness-[0.38]"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#090909]">
                        <svg
                          className="w-16 h-16 text-slate-700 transition-opacity duration-500 group-hover:opacity-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
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

                    {/* =================================================
                        DARK HOVER OVERLAY
                    ================================================= */}

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-all duration-500 pointer-events-none" />

                    {/* =================================================
                        BOTTOM GRADIENT
                    ================================================= */}

                    <div className="absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-black/95 via-black/55 to-transparent pointer-events-none transition-opacity duration-500 group-hover:opacity-0" />

                    {/* =================================================
                        NORMAL COACH INFORMATION
                    ================================================= */}

                    <div className="absolute inset-x-0 bottom-0 p-5 z-10 text-white transition-all duration-400 ease-out group-hover:opacity-0 group-hover:translate-y-3">

                      {/* Name */}

                      <h3 className="text-xl font-bold tracking-tight leading-tight drop-shadow-md">
                        {coach.full_name}
                      </h3>

                      {/* Title */}

                      <p className="text-[11px] font-bold uppercase tracking-wider text-yellow-300 mt-1">
                        {coach.title}
                      </p>

                      {/* Price */}

                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-base font-extrabold">
                          {coach.hourly_rate} DZD
                        </span>

                        <span className="text-xs text-white/60">
                          / hr
                        </span>
                      </div>

                      {/* Bio */}

                      {coach.bio && (
                        <p className="text-xs text-white/70 mt-2 line-clamp-2 leading-relaxed">
                          {coach.bio}
                        </p>
                      )}
                    </div>

                    {/* =================================================
                        HOVER BOOK SESSION BUTTON
                    ================================================= */}

                    <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-400 ease-out pointer-events-none">

                      <div className="px-7 py-3.5 rounded-xl bg-yellow-400 text-black shadow-2xl font-bold text-sm flex items-center gap-2">
                        <span>
                          Book Session
                        </span>

                        <svg
                          className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
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

                    {/* =================================================
                        SUBTLE HOVER BORDER
                    ================================================= */}

                    <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-yellow-400/40 transition-colors duration-500 pointer-events-none" />
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