"use client";



import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";

import React, { useEffect, useRef, useState } from "react";

import Link from "next/link";



/* ========================================================= */

/* DATA                                                      */

/* ========================================================= */



const HERO_SLIDES = [

  {

    id: 1,

    titleWhite: "Discover Nearby",

    titleYellow: "Sports",

    subtitle:

      "Find local courts, facilities, and active sports sessions around you.",

    buttonText: "Check Sports",

    buttonLink: "/booking",

    secondaryText: "My bookings",

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

    buttonLink: "/community",

    secondaryText: "My posts",

    secondaryLink: "/",

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

    secondaryText: "My competitions",

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



/* ========================================================= */

/* SVG ICONS (market section)                                */

/* ========================================================= */



function FootballIcon() {

  return (

    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">

      <circle cx="50" cy="50" r="44" fill="#ffffff" stroke="#0f172a" strokeWidth="3" />

      <polygon

        points="50,37 62,46 57.5,60 42.5,60 38,46"

        fill="#0f172a"

      />

      <g stroke="#0f172a" strokeWidth="3" strokeLinecap="round" fill="none">

        <path d="M50 37V10M62 46L88 38M57.5 60L72 83M42.5 60L28 83M38 46L12 38" />

      </g>

      <g fill="#0f172a">

        <polygon points="50,6 40,12 60,12" />

        <polygon points="90,40 86,30 94,48" />

        <polygon points="73,86 66,78 80,80" />

        <polygon points="27,86 34,78 20,80" />

        <polygon points="10,40 14,30 6,48" />

      </g>

    </svg>

  );

}



function BasketballIcon() {

  return (

    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">

      <circle cx="50" cy="50" r="44" fill="#f97316" />

      <g stroke="#431407" strokeWidth="3" fill="none" strokeLinecap="round">

        <circle cx="50" cy="50" r="44" />

        <path d="M50 6V94M6 50H94" />

        <path d="M18 18C34 32 34 68 18 82" />

        <path d="M82 18C66 32 66 68 82 82" />

      </g>

    </svg>

  );

}



function TennisBallIcon() {

  return (

    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">

      <circle cx="50" cy="50" r="44" fill="#d4ee3a" />

      <g stroke="#ffffff" strokeWidth="4" fill="none" strokeLinecap="round">

        <path d="M14 26C38 38 38 62 14 74" />

        <path d="M86 26C62 38 62 62 86 74" />

      </g>

    </svg>

  );

}



function RacketIcon() {

  return (

    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">

      <g transform="rotate(35 50 50)">

        <rect x="46.5" y="62" width="7" height="30" rx="3.5" fill="#0f172a" />

        <rect x="46.5" y="74" width="7" height="3" fill="#facc15" />

        <rect x="46.5" y="82" width="7" height="3" fill="#facc15" />

        <g stroke="#eab308" strokeWidth="1.6" strokeLinecap="round">

          <path d="M50 10V62M40 12V60M60 12V60M30 14V58M70 14V58" />

          <path d="M30 26H70M28 36H72M30 46H70" />

        </g>

        <ellipse

          cx="50"

          cy="36"

          rx="22"

          ry="28"

          fill="none"

          stroke="#0f172a"

          strokeWidth="5"

        />

      </g>

    </svg>

  );

}



function DumbbellIcon() {

  return (

    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">

      <g transform="rotate(-30 50 50)">

        <rect x="30" y="46" width="40" height="8" rx="3" fill="#64748b" />

        <rect x="18" y="30" width="12" height="40" rx="4" fill="#0f172a" />

        <rect x="8" y="38" width="10" height="24" rx="3" fill="#1e293b" />

        <rect x="70" y="30" width="12" height="40" rx="4" fill="#0f172a" />

        <rect x="82" y="38" width="10" height="24" rx="3" fill="#1e293b" />

        <rect x="21" y="34" width="3" height="32" rx="1.5" fill="#facc15" />

        <rect x="76" y="34" width="3" height="32" rx="1.5" fill="#facc15" />

      </g>

    </svg>

  );

}



const MARKET_ITEMS = [

  {

    name: "Footballs",

    blurb: "Match balls, training balls, and futsal.",

    Icon: FootballIcon,

  },

  {

    name: "Basketball gear",

    blurb: "Balls, hoops, and court essentials.",

    Icon: BasketballIcon,

  },

  {

    name: "Tennis rackets",

    blurb: "Rackets for every level, new or used.",

    Icon: RacketIcon,

  },

  {

    name: "Tennis balls",

    blurb: "Pressurized cans and practice buckets.",

    Icon: TennisBallIcon,

  },

  {

    name: "Training weights",

    blurb: "Dumbbells and gym equipment.",

    Icon: DumbbellIcon,

  },

];



/* ========================================================= */

/* SCROLL REVEAL                                             */

/* ========================================================= */



type RevealVariant = "up" | "left" | "right" | "zoom";



function Reveal({

  children,

  className = "",

  delay = 0,

  variant = "up",

}: {

  children: React.ReactNode;

  className?: string;

  delay?: number;

  variant?: RevealVariant;

}) {

  const ref = useRef<HTMLDivElement | null>(null);

  const [visible, setVisible] = useState(false);



  useEffect(() => {

    const el = ref.current;

    if (!el) return;



    if (typeof IntersectionObserver === "undefined") {

      setVisible(true);

      return;

    }



    const observer = new IntersectionObserver(

      (entries) => {

        entries.forEach((entry) => {

          if (entry.isIntersecting) {

            setVisible(true);

            observer.disconnect();

          }

        });

      },

      { threshold: 0.15 }

    );



    observer.observe(el);

    return () => observer.disconnect();

  }, []);



  return (

    <div

      ref={ref}

      className={`rv rv-${variant} ${visible ? "in" : ""} ${className}`}

      style={{ transitionDelay: `${delay}ms` }}

    >

      {children}

    </div>

  );

}



/* ========================================================= */

/* COMPETITION STEP VISUALS                                  */

/* ========================================================= */



const FILTER_SPORTS = ["Football", "Tennis", "Basketball"];

const FILTER_LEVELS = ["Beginner", "Amateur", "Semi-pro", "Pro"];



function CompetitionFilterVisual() {

  const [sport, setSport] = useState("Tennis");

  const [level, setLevel] = useState("Amateur");



  const chip = (active: boolean) =>

    `px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 ${

      active

        ? "bg-yellow-400 border-yellow-400 text-black scale-105"

        : "bg-white border-stone-300 text-stone-600 hover:border-yellow-400"

    }`;



  return (

    <div className="space-y-3">

      <div>

        <p className="text-xs text-stone-500 mb-2">Your sport</p>

        <div className="flex flex-wrap gap-2">

          {FILTER_SPORTS.map((s) => (

            <button

              key={s}

              type="button"

              onClick={() => setSport(s)}

              aria-pressed={sport === s}

              className={chip(sport === s)}

            >

              {s}

            </button>

          ))}

        </div>

      </div>

      <div>

        <p className="text-xs text-stone-500 mb-2">Your career level</p>

        <div className="flex flex-wrap gap-2">

          {FILTER_LEVELS.map((l) => (

            <button

              key={l}

              type="button"

              onClick={() => setLevel(l)}

              aria-pressed={level === l}

              className={chip(level === l)}

            >

              {l}

            </button>

          ))}

        </div>

      </div>

    </div>

  );

}



function ApplicationStatusVisual() {

  return (

    <div className="space-y-3">

      <div className="flex items-center justify-between rounded-xl bg-white border border-stone-200 px-4 py-3">

        <div>

          <p className="text-sm font-semibold text-stone-900">

            City Open Cup

          </p>

          <p className="text-xs text-stone-500">Application sent</p>

        </div>



        {/* The two statuses swap in a loop */}

        <div className="relative h-8 w-28">

          <span className="anim status-pending absolute inset-0 flex items-center justify-center gap-2 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">

            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />

            Pending

          </span>

          <span className="anim status-accepted absolute inset-0 flex items-center justify-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">

            <svg

              viewBox="0 0 20 20"

              className="h-3.5 w-3.5"

              fill="none"

              stroke="currentColor"

              strokeWidth="2.5"

              strokeLinecap="round"

              strokeLinejoin="round"

              aria-hidden="true"

            >

              <path d="M4 10.5l4 4 8-9" />

            </svg>

            Accepted

          </span>

        </div>

      </div>

      <p className="text-xs text-stone-500">

        The organizer reviews your profile and confirms your place.

      </p>

    </div>

  );

}



function LeaderboardVisual() {

  const rows = [

    { rank: 1, name: "Yacine", pts: 92, you: false },

    { rank: 2, name: "You", pts: 81, you: true },

    { rank: 3, name: "Sara", pts: 67, you: false },

  ];



  return (

    <div className="space-y-2.5">

      {rows.map((r, i) => (

        <div

          key={r.rank}

          className={`rounded-xl border px-3 py-2.5 ${

            r.you

              ? "bg-yellow-50 border-yellow-300"

              : "bg-white border-stone-200"

          }`}

        >

          <div className="flex items-center justify-between text-xs mb-1.5">

            <span className="font-semibold text-stone-900">

              {r.rank}. {r.name}

            </span>

            <span className="text-stone-500">{r.pts} pts</span>

          </div>

          <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">

            <div

              className="bar-fill h-full rounded-full bg-yellow-400"

              style={

                {

                  "--w": `${r.pts}%`,

                  transitionDelay: `${500 + i * 180}ms`,

                } as React.CSSProperties

              }

            />

          </div>

        </div>

      ))}

    </div>

  );

}



const COMPETITION_STEPS = [

  {

    n: 1,

    title: "Choose your competition",

    text: "Filter tournaments by your sport and your career level, so you only see the ones that fit you.",

    Visual: CompetitionFilterVisual,

  },

  {

    n: 2,

    title: "Apply and wait for approval",

    text: "Send your application. The competition owner reviews it and accepts or declines you.",

    Visual: ApplicationStatusVisual,

  },

  {

    n: 3,

    title: "Compete and get ranked",

    text: "Play your matches, earn points, and watch your name climb the leaderboard.",

    Visual: LeaderboardVisual,

  },

];



/* ========================================================= */

/* PAGE                                                      */

/* ========================================================= */



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

      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);

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



    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);

  }



  return (

    <div className="w-full bg-slate-50 text-slate-800">

      {/* Animation styles for the sections below the hero */}

      <style>{`

        .rv {

          opacity: 0;

          transition: opacity 800ms cubic-bezier(.22,.61,.36,1),

                      transform 800ms cubic-bezier(.22,.61,.36,1);

          will-change: opacity, transform;

        }

        .rv-up    { transform: translateY(28px); }

        .rv-left  { transform: translateX(-40px); }

        .rv-right { transform: translateX(40px); }

        .rv-zoom  { transform: scale(.94); }

        .rv.in    { opacity: 1; transform: none; }

/* leaderboard bars */

        .bar-fill { width: 0; transition: width 1100ms cubic-bezier(.22,.61,.36,1); }

        .rv.in .bar-fill { width: var(--w); }



        /* line that connects the three competition steps */

        .step-line-fill {

          transform: scaleX(0);

          transform-origin: left;

          transition: transform 1600ms ease 300ms;

        }

        .rv.in .step-line-fill { transform: scaleX(1); }



        /* pending -> accepted loop */

        @keyframes statusPending {

          0%, 42%   { opacity: 1; transform: translateY(0); }

          50%, 92%  { opacity: 0; transform: translateY(-8px); }

          100%      { opacity: 1; transform: translateY(0); }

        }

        @keyframes statusAccepted {

          0%, 42%   { opacity: 0; transform: translateY(8px); }

          50%, 92%  { opacity: 1; transform: translateY(0); }

          100%      { opacity: 0; transform: translateY(8px); }

        }

        .status-pending  { animation: statusPending 6s ease-in-out infinite; }

        .status-accepted { animation: statusAccepted 6s ease-in-out infinite; }



        /* floating chat bubbles on the community image */

        @keyframes floaty {

          0%, 100% { transform: translateY(0); }

          50%      { transform: translateY(-10px); }

        }

        .floaty { animation: floaty 5s ease-in-out infinite; }



        /* soft glow behind dark sections */

        @keyframes glow {

          0%, 100% { opacity: .18; transform: scale(1); }

          50%      { opacity: .32; transform: scale(1.15); }

        }

        .glow { animation: glow 8s ease-in-out infinite; }



        @media (prefers-reduced-motion: reduce) {

          .rv { opacity: 1 !important; transform: none !important; transition: none !important; }

          .anim, .floaty, .glow { animation: none !important; }

          .status-accepted { opacity: 0; }

          .bar-fill { width: var(--w) !important; transition: none !important; }

          .step-line-fill { transform: none !important; transition: none !important; }

        }

      `}</style>



      {/* ========================================================= */}

      {/* HERO (unchanged) */}

      {/* ========================================================= */}



      <section className="relative w-full min-h-[520px] md:min-h-[600px] flex items-center overflow-hidden bg-slate-900 text-white">

        {HERO_SLIDES.map((slide, index) => (

          <div

            key={slide.id}

            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${

              index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"

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

                <span className="text-white">{slide.titleWhite} </span>



                <span className="text-yellow-400">{slide.titleYellow}</span>

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

      {/* AVAILABLE SPORTS  (white) */}

      {/* ========================================================= */}



      <section className="w-full py-16 px-4 md:px-12 bg-white border-b border-slate-200">

        <div className="max-w-6xl mx-auto">

          <Reveal className="mb-8">

            <h2 className="text-xl md:text-2xl font-bold text-slate-900">

              Available <span className="text-yellow-500">Sports</span>

            </h2>

          </Reveal>



          {loadingSports ? (

            <div className="w-full min-h-[180px] flex items-center justify-center text-slate-400 text-sm">

              Loading sports...

            </div>

          ) : sports.length === 0 ? (

            <div className="w-full min-h-[180px] border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-sm">

              No sports available.

            </div>

          ) : (

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">

              {sports.map((sport, i) => (

                <Reveal key={sport.id} variant="zoom" delay={(i % 5) * 80}>

                  <Link

                    href={`/booking/${sport.id}`}

                    className="group relative block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 hover:border-yellow-400"

                  >

                    <div className="relative h-44 w-full overflow-hidden">

                      <img

                        src={sport.images}

                        alt={sport.name}

                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"

                      />



                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />



                      <div className="absolute bottom-3 left-3 right-3">

                        <h3 className="text-base font-bold text-white tracking-wide drop-shadow transition-transform duration-300 group-hover:-translate-y-1">

                          {sport.name}

                        </h3>

                      </div>

                    </div>

                  </Link>

                </Reveal>

              ))}

            </div>

          )}

        </div>

      </section>



      {/* ========================================================= */}

      {/* COMMUNICATE WITH OTHERS  (black) */}

      {/* ========================================================= */}



      <section className="relative w-full py-20 px-4 md:px-12 bg-neutral-950 text-white overflow-hidden">

        {/* ambient glow */}

        <div className="glow pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-yellow-400 blur-[120px]" />



        <div className="relative max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-14">

          {/* Text */}

          <Reveal variant="left" className="flex-1 text-left">

            <h2 className="text-xl md:text-2xl font-bold mb-4">

              Communicate with <span className="text-yellow-400">Others</span>

            </h2>



            <p className="text-sm md:text-base text-white/70 leading-relaxed mb-8 max-w-xl">

              Step into a community built for athletes. Post updates from

              your latest game, ask for advice on technique, share training

              routines, and organize meetups with people nearby. Follow the

              players, coaches, and clubs that inspire you, and find teammates

              who are just as serious about the sport as you are. SportGy

              keeps the conversation going long after you leave the field.

            </p>



            <Link

              href="/community"

              className="inline-block bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-6 py-3 rounded-lg shadow-lg shadow-yellow-400/10 transition-all hover:-translate-y-0.5"

            >

              Join the Community

            </Link>

          </Reveal>



          {/* Image */}

          <Reveal variant="right" delay={150} className="flex-1 w-full">

            <div className="relative">

              {/* offset frame */}

              <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl border-2 border-yellow-400/60" />



              <img

                src="/communicate.jpg"

                alt="Athletes communicating in the SportGy community"

                className="relative w-full h-64 md:h-80 object-cover rounded-2xl shadow-2xl"

              />



              {/* floating chat bubbles */}

              <div

                className="floaty absolute -left-2 md:-left-8 bottom-10 max-w-[200px] rounded-2xl rounded-bl-sm bg-white text-slate-800 text-xs font-medium px-4 py-2.5 shadow-xl"

              >

                Anyone up for 5-a-side tonight?

              </div>

              <div

                className="floaty absolute -right-2 md:-right-6 top-8 max-w-[190px] rounded-2xl rounded-br-sm bg-yellow-400 text-black text-xs font-semibold px-4 py-2.5 shadow-xl"

                style={{ animationDelay: "1.6s" }}

              >

                I'm in. Court 2 at 8!

              </div>

            </div>

          </Reveal>

        </div>

      </section>



      {/* ========================================================= */}

      {/* COMPETITIONS  (beige) */}

      {/* ========================================================= */}



      <section className="w-full py-20 px-4 md:px-12 bg-[#F5EFE2] border-b border-stone-200">

        <div className="max-w-6xl mx-auto">

          <Reveal className="text-center mb-14">

            <h2 className="text-xl md:text-2xl font-bold text-stone-900">

              Compete in <span className="text-yellow-600">Competitions</span>

            </h2>

            <p className="mt-4 text-sm md:text-base text-stone-600 max-w-xl mx-auto">

              From finding the right tournament to seeing your name on the

              leaderboard, it takes three steps.

            </p>

          </Reveal>



          <Reveal className="relative">

            {/* connecting line (desktop) */}

            <div className="hidden md:block absolute top-6 left-[16.6%] right-[16.6%] h-0.5 bg-stone-300">

              <div className="step-line-fill h-full w-full bg-yellow-400" />

            </div>



            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {COMPETITION_STEPS.map(({ n, title, text, Visual }) => (

                <div

                  key={n}

                  className="relative flex flex-col rounded-2xl bg-[#FBF8F1] border border-stone-200 p-6 pt-10 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-yellow-400"

                >

                  <span className="absolute -top-0 left-6 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400 text-black text-lg font-extrabold shadow-md ring-4 ring-[#F5EFE2]">

                    {n}

                  </span>



                  <h3 className="text-lg font-bold text-stone-900 mb-2">

                    {title}

                  </h3>

                  <p className="text-sm text-stone-600 leading-relaxed mb-6">

                    {text}

                  </p>



                  <div className="mt-auto rounded-xl bg-[#F1E9D8] p-4">

                    <Visual />

                  </div>

                </div>

              ))}

            </div>

          </Reveal>



          <Reveal className="text-center mt-12" delay={200}>

            <Link

              href="/competitions"

              className="inline-block bg-neutral-950 hover:bg-neutral-800 text-white font-bold px-7 py-3 rounded-lg transition-all hover:-translate-y-0.5"

            >

              Browse Competitions

            </Link>

          </Reveal>

        </div>

      </section>



      {/* ========================================================= */}

      {/* MARKETPLACE  (white) */}

      {/* ========================================================= */}



      <section className="w-full py-20 px-4 md:px-12 bg-white border-b border-slate-200">

        <div className="max-w-6xl mx-auto">

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">

            <Reveal>

              <h2 className="text-xl md:text-2xl font-bold text-slate-900">

                Sports <span className="text-yellow-500">Marketplace</span>

              </h2>

              <p className="mt-4 text-sm md:text-base text-slate-600 max-w-lg">

                Buy gear from other athletes or sell what you no longer use.

                Balls, rackets, weights, and more.

              </p>

            </Reveal>



            <Reveal delay={150}>

              <Link

                href="/marketplace"

                className="inline-block bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-6 py-3 rounded-lg shadow transition-all hover:-translate-y-0.5"

              >

                Visit Marketplace

              </Link>

            </Reveal>

          </div>



          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">

            {MARKET_ITEMS.map(({ name, blurb, Icon }, i) => (

              <Reveal key={name} variant="zoom" delay={i * 90}>

                <div

                  className="flex h-full flex-col items-center rounded-2xl bg-[#F7F2E7] border border-stone-200 px-4 pt-8 pb-6 text-center"

                >

                  <div className="relative mb-6 h-24 w-24">

                    <div className="h-full w-full">

                      <Icon />

                    </div>

                    {/* ground shadow */}

                    <span className="absolute -bottom-3 left-1/2 h-2 w-14 -translate-x-1/2 rounded-full bg-black/10 blur-[3px] transition-all duration-500 group-hover:w-10 group-hover:opacity-60" />

                  </div>



                  <h3 className="text-sm font-bold text-slate-900 mb-1">

                    {name}

                  </h3>

                  <p className="text-xs text-slate-500 leading-relaxed">

                    {blurb}

                  </p>

                </div>

              </Reveal>

            ))}

          </div>

        </div>

      </section>



      {/* ========================================================= */}

      {/* ABOUT  (black) */}

      {/* ========================================================= */}



      <section className="relative w-full py-24 px-4 md:px-12 bg-neutral-950 text-white overflow-hidden">

        <div

          className="glow pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400 blur-[140px]"

          style={{ animationDelay: "2s" }}

        />



        <Reveal className="relative max-w-4xl mx-auto text-center">

          <h2 className="text-2xl md:text-3xl font-bold mb-4">

            About <span className="text-yellow-400">SportGy</span>

          </h2>



          <p className="text-white/70 leading-relaxed text-sm md:text-base">

            SportGy is a full-stack sports ecosystem platform designed to

            connect athletes, coaches, local sports clubs, and communities

            into one unified experience. From finding training sessions to

            joining competitions and discovering sports equipment, SportGy

            brings everything together in one place.

          </p>

        </Reveal>

      </section>

    </div>

  );

}
