"use client";

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
    buttonLink: "/sports",
    secondaryText: "Book a Session",
    secondaryLink: "/sports",
    image:
      "/booking.png",
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
    image:
      "/community.png",
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
    image:
      "/competition.png",
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
    image:
      "/marketplace.png",
  },
];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Automatic hero slider
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  function handlePrevSlide() {
    setIsAutoPlaying(false);

    setCurrentSlide((prev) =>
      prev === 0 ? HERO_SLIDES.length - 1 : prev - 1
    );
  }

  function handleNextSlide() {
    setIsAutoPlaying(false);

    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  }

  return (
    <div className="w-full bg-slate-50 text-slate-800">

      {/* ================= HERO ================= */}
      {/* Spacing for the fixed header is now handled by Navbar's own spacer div */}
      <section className="relative w-full min-h-[520px] md:min-h-[600px] flex items-center overflow-hidden bg-black text-white">
        {HERO_SLIDES.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
              index === currentSlide
                ? "opacity-100 z-10"
                : "opacity-0 z-0"
            }`}
          >
            {/* Background image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url("${slide.image}")`,
              }}
            >
              {/* Transparent-to-black gradient rising from the bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            </div>

            {/* Content — aligned left */}
            <div className="relative z-20 h-full max-w-2xl px-8 md:px-16 flex flex-col justify-end pb-16 md:pb-20 items-start text-left">
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-md">
                <span className="text-white">{slide.titleWhite} </span>
                <span className="text-yellow-400">{slide.titleYellow}</span>
              </h1>

              <p className="text-sm md:text-lg text-white/90 max-w-xl mb-8">
                {slide.subtitle}
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href={slide.buttonLink}
                  className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-8 py-3 rounded-lg shadow-lg transition-all transform hover:-translate-y-0.5"
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

        {/* Previous button */}
        <button
          onClick={handlePrevSlide}
          aria-label="Previous Slide"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-yellow-400 hover:text-black text-white p-3 rounded-full border border-white/20 transition-all"
        >
          ‹
        </button>

        {/* Next button */}
        <button
          onClick={handleNextSlide}
          aria-label="Next Slide"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-yellow-400 hover:text-black text-white p-3 rounded-full border border-white/20 transition-all"
        >
          ›
        </button>

        {/* Slider indicators */}
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

      {/* ================= AVAILABLE SPORTS ================= */}

      <section className="w-full py-12 px-4 md:px-12 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">
              Available <span className="text-yellow-500">Sports</span>
            </h2>

            <div className="flex space-x-2">
              <button
                aria-label="Previous Sports"
                className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-300 hover:bg-yellow-400 hover:border-yellow-400 hover:text-black text-slate-700 font-bold transition-colors"
              >
                ‹
              </button>

              <button
                aria-label="Next Sports"
                className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-300 hover:bg-yellow-400 hover:border-yellow-400 hover:text-black text-slate-700 font-bold transition-colors"
              >
                ›
              </button>
            </div>
          </div>

          <div className="w-full min-h-[160px] border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-sm">
            [ Sports database items will render here ]
          </div>

        </div>
      </section>

      {/* ================= COMMUNICATE WITH OTHERS ================= */}

      <section className="w-full py-12 px-4 md:px-12 bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-10">

          {/* Text on the left */}
          <div className="flex-1 text-left">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4">
              Communicate with <span className="text-yellow-500">Others</span>
            </h2>

            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              Step into a community built for athletes. Post updates from
              your latest game, ask for advice on technique, share training
              routines, and organize meetups with people nearby. Follow the
              players, coaches, and clubs that inspire you, and find teammates
              who are just as serious about the sport as you are. Sporty
              keeps the conversation going long after you leave the field.
            </p>

            <Link
              href="/communities"
              className="inline-block bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-6 py-3 rounded-lg shadow transition-colors"
            >
              Join the Community
            </Link>
          </div>

          {/* Image on the right — replace with your own asset from /public */}
          <div className="flex-1 w-full">
            <img
              src="/communicate.jpg"
              alt="Athletes communicating in the Sporty community"
              className="w-full h-64 md:h-80 object-cover rounded-xl shadow-md"
            />
          </div>

        </div>
      </section>

      {/* ================= AI SPORT DETECTION ================= */}

      <section className="w-full py-12 px-4 md:px-12 bg-black border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">

          <div>
            <h3 className="text-xl font-bold text-white mb-2">
              Use AI to <span className="text-yellow-400">Detect Your Sport</span>
            </h3>

            <p className="text-sm text-slate-300 max-w-md">
              Upload an image of a field, court, or equipment to instantly
              identify the sport and discover relevant options.
            </p>
          </div>

          <div className="w-full md:w-80 min-h-[100px] bg-slate-900 border-2 border-dashed border-yellow-400/40 rounded-lg flex items-center justify-center text-slate-300 text-xs text-center p-4">
            [ Image Upload & Vision Detection Model Container ]
          </div>

        </div>
      </section>

      {/* ================= ABOUT ================= */}

      <section className="w-full py-16 px-4 md:px-12 bg-white">
        <div className="max-w-4xl mx-auto text-center">

          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
            About <span className="text-yellow-500">Sporty</span>
          </h2>

          <p className="text-slate-600 leading-relaxed text-sm md:text-base">
            Sporty is a full-stack sports ecosystem platform designed to
            connect athletes, coaches, local sports clubs, and communities
            into one unified experience. From finding training sessions to
            joining competitions and discovering sports equipment, Sporty
            brings everything together in one place.
          </p>

        </div>
      </section>

    </div>
  );
}
