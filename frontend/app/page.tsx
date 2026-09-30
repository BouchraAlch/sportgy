"use client";

import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import React, { useEffect, useState } from "react";
import Link from "next/link";

const HERO_SLIDES = [
  {
    id: 1,
    titleWhite: "Discover Nearby",
    titleYellow: "Sports",
    subtitle:
      "Find local courts, facilities, and active sports sessions around you.",
    buttonText: "Check Sports",
    buttonLink: "/booking",
    secondaryText: "Book a Session",
    secondaryLink: "/booking",
    image: "/booking.png",
  },
  {
    id: 2,
    titleWhite: "Join Vibrant",
    titleYellow: "Sports Communities",
    subtitle:
      "Share posts, discuss tactics, and connect with athletes who share your passion.",
    buttonText: "Check Communities",
    buttonLink: "/communities",
    secondaryText: "Start Communicating",
    secondaryLink: "/communities",
    image: "/community.png",
  },
  {
    id: 3,
    titleWhite: "Compete & Climb the",
    titleYellow: "Leaderboards",
    subtitle:
      "Apply for tournaments organized by local clubs and track your achievements.",
    buttonText: "Check Competitions",
    buttonLink: "/competitions",
    secondaryText: "Join a Tournament",
    secondaryLink: "/competitions",
    image: "/competition.png",
  },
  {
    id: 4,
    titleWhite: "Buy & Sell",
    titleYellow: "Sports Gear",
    subtitle:
      "Find quality equipment from other athletes or publish your own listings.",
    buttonText: "Check Marketplace",
    buttonLink: "/marketplace",
    secondaryText: "Sell Your Gear",
    secondaryLink: "/marketplace",
    image: "/marketplace.png",
  },
];

interface SportDisplay {
  id: string;
  name: string;
  images: string;
}

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const [sports, setSports] = useState<SportDisplay[]>([]);
  const [loadingSports, setLoadingSports] = useState(true);

  const supabase = createSupabaseBrowserClient();

  // ================= FETCH SPORTS FROM DATABASE =================
  useEffect(() => {
    async function fetchSports() {
      try {
        setLoadingSports(true);

        const { data, error } = await supabase
          .from("sports")
          .select("id, name, images");

        if (error) {
          console.error("Error fetching sports:", error);
          setSports([]);
          return;
        }

        if (data) {
          setSports(data);
        } else {
          setSports([]);
        }
      } catch (error) {
        console.error("Unexpected error fetching sports:", error);
        setSports([]);
      } finally {
        setLoadingSports(false);
      }
    }

    fetchSports();
  }, [supabase]);

  // ================= HERO AUTO PLAY =================
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide(
        (prev) => (prev + 1) % HERO_SLIDES.length
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  // ================= HERO NAVIGATION =================
  function handlePrevSlide() {
    setIsAutoPlaying(false);

    setCurrentSlide((prev) =>
      prev === 0 ? HERO_SLIDES.length - 1 : prev - 1
    );
  }

  function handleNextSlide() {
    setIsAutoPlaying(false);

    setCurrentSlide(
      (prev) => (prev + 1) % HERO_SLIDES.length
    );
  }

  return (
    <div className="w-full bg-slate-50 text-slate-800">

      {/* ========================================================= */}
      {/* HERO */}
      {/* ========================================================= */}

      <section className="relative w-full min-h-[520px] md:min-h-[600px] flex items-center overflow-hidden bg-slate-900 text-white">

        {HERO_SLIDES.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
              index === currentSlide
                ? "opacity-100 z-10"
                : "opacity-0 z-0"
            }`}
          >

            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url("${slide.image}")`,
              }}
            >
              <div className="absolute inset-0  bg-gradient-to-t from-black via-black/60 to-transparent" />
            </div>

            {/* Hero Content */}
            <div className="relative z-20 h-full max-w-2xl px-8 md:px-16 flex flex-col justify-end pb-16 md:pb-20 items-start text-left">

              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-4 drop-shadow-md">

                <span className="text-white">
                  {slide.titleWhite}{" "}
                </span>

                <span className="text-yellow-400">
                  {slide.titleYellow}
                </span>

              </h1>

              <p className="text-sm md:text-base text-white/90 max-w-xl mb-8">
                {slide.subtitle}
              </p>

              <div className="flex flex-wrap items-center gap-4">

                <Link
                  href={slide.buttonLink}
                  className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-6 py-2 rounded-lg shadow-lg transition-all transform hover:-translate-y-0.5"
                >
                  {slide.buttonText}
                </Link>

                <Link
                  href={slide.secondaryLink}
                  className="bg-transparent border border-white/70 hover:border-yellow-400 hover:text-yellow-400 text-white font-semibold px-8 py-3 rounded-lg transition-all transform hover:-translate-y-0.5"
                >
                  {slide.secondaryText}
                </Link>

              </div>

            </div>
          </div>
        ))}

        {/* Previous Button */}
        <button
          onClick={handlePrevSlide}
          aria-label="Previous Slide"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/40 hover:bg-yellow-400 hover:text-black text-white p-3 rounded-full border border-white/20 transition-all"
        >
          ‹
        </button>

        {/* Next Button */}
        <button
          onClick={handleNextSlide}
          aria-label="Next Slide"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/40 hover:bg-yellow-400 hover:text-black text-white p-3 rounded-full border border-white/20 transition-all"
        >
          ›
        </button>

        {/* Slider Indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">

          {HERO_SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => {
                setCurrentSlide(index);
                setIsAutoPlaying(false);
              }}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? "w-8 bg-yellow-400"
                  : "w-2 bg-white/50"
              }`}
            />
          ))}

        </div>

      </section>

      {/* ========================================================= */}
{/* ========================================================= */}
{/* AVAILABLE SPORTS */}
{/* ========================================================= */}

<section className="w-full py-12 px-4 md:px-12 bg-white border-b border-slate-200">

  <div className="max-w-6xl mx-auto">

    <div className="flex items-center justify-between mb-6">

      <h2 className="text-xl md:text-2xl font-bold text-slate-900">
        Available{" "}
        <span className="text-yellow-500">
          Sports
        </span>
      </h2>

    </div>

    {/* Loading */}
    {loadingSports ? (

      <div className="w-full min-h-[180px] flex items-center justify-center text-slate-400 text-sm">
        Loading sports...
      </div>

    ) : sports.length === 0 ? (

      /* Empty State */
      <div className="w-full min-h-[180px] border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-sm">
        No sports available.
      </div>

    ) : (

      /* Sports From Database */
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">

        {sports.map((sport) => (

          <Link
            key={sport.id}
            href={`/booking/${sport.id}`}
            className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-1 hover:border-yellow-400"
          >

            <div className="relative h-44 w-full overflow-hidden">

              <img
                src={sport.images}
                alt={sport.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Image Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

              {/* Sport Name */}
              <div className="absolute bottom-3 left-3 right-3">

                <h3 className="text-base font-bold text-white tracking-wide drop-shadow">
                  {sport.name}
                </h3>

              </div>

            </div>

          </Link>

        ))}

      </div>

    )}

  </div>

</section>

      {/* ========================================================= */}
      {/* COMMUNICATE WITH OTHERS */}
      {/* ========================================================= */}

      <section className="w-full py-12 px-4 md:px-12 bg-slate-50 border-b border-slate-200">

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-10">

          {/* Text */}
          <div className="flex-1 text-left">

            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4">

              Communicate with{" "}

              <span className="text-yellow-500">
                Others
              </span>

            </h2>

            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              Step into a community built for athletes. Post updates from
              your latest game, ask for advice on technique, share training
              routines, and organize meetups with people nearby. Follow the
              players, coaches, and clubs that inspire you, and find teammates
              who are just as serious about the sport as you are. SportGy
              keeps the conversation going long after you leave the field.
            </p>

            <Link
              href="/communities"
              className="inline-block bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-6 py-3 rounded-lg shadow transition-colors"
            >
              Join the Community
            </Link>

          </div>

          {/* Image */}
          <div className="flex-1 w-full">

            <img
              src="/communicate.jpg"
              alt="Athletes communicating in the SportGy community"
              className="w-full h-64 md:h-80 object-cover rounded-xl shadow-md"
            />

          </div>

        </div>

      </section>

      {/* ========================================================= */}
      {/* AI SPORT DETECTION */}
      {/* ========================================================= */}

      <section className="w-full py-12 px-4 md:px-12 bg-slate-100 border-b border-slate-200">

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">

          <div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">

              Use AI to{" "}

              <span className="text-yellow-600">
                Detect Your Sport
              </span>

            </h3>

            <p className="text-sm text-slate-600 max-w-md">
              Upload an image of a field, court, or equipment to instantly
              identify the sport and discover relevant options.
            </p>

          </div>

          <div className="w-full md:w-80 min-h-[100px] bg-white border-2 border-dashed border-yellow-400/60 rounded-lg flex items-center justify-center text-slate-500 text-xs text-center p-4">
            [ Image Upload & Vision Detection Model Container ]
          </div>

        </div>

      </section>

      {/* ========================================================= */}
      {/* ABOUT */}
      {/* ========================================================= */}

      <section className="w-full py-16 px-4 md:px-12 bg-white">

        <div className="max-w-4xl mx-auto text-center">

          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">

            About{" "}

            <span className="text-yellow-500">
              SportGy
            </span>

          </h2>

          <p className="text-slate-600 leading-relaxed text-sm md:text-base">
            SportGy is a full-stack sports ecosystem platform designed to
            connect athletes, coaches, local sports clubs, and communities
            into one unified experience. From finding training sessions to
            joining competitions and discovering sports equipment, SportGy
            brings everything together in one place.
          </p>

        </div>

      </section>

    </div>
  );
}