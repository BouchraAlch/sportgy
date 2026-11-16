"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { Club, Sport } from "@/types/booking";

interface CoachDetail {
  id: string;
  full_name: string;
  title: string;
  bio?: string | null;
  hourly_rate: number;
  image_url?: string | null;
  sport_id: string;
}

interface ExistingBooking {
  booking_date: string;
  start_time: string;
}

const AVAILABLE_SLOTS = [
  "08:00",
  "09:30",
  "11:00",
  "14:00",
  "15:30",
  "17:00",
  "18:30",
  "20:00",
];

const SESSION_MINUTES = 90;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ------------------------------------------------------------
// Pure helpers
// ------------------------------------------------------------

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toIso(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function formatLongDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
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

const PAGE_STYLES = `
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: none; }
  }
  .card-in { animation: cardIn 600ms cubic-bezier(.22,.61,.36,1) both; }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: none; }
  }
  .slide-down { animation: slideDown 260ms ease both; }

  @keyframes checkPop {
    0%   { transform: scale(.4); opacity: 0; }
    60%  { transform: scale(1.12); opacity: 1; }
    100% { transform: scale(1); }
  }
  .check-pop { animation: checkPop 600ms cubic-bezier(.22,.61,.36,1) both; }

  @keyframes glow {
    0%, 100% { opacity: .16; transform: scale(1); }
    50%      { opacity: .3;  transform: scale(1.15); }
  }
  .glow { animation: glow 8s ease-in-out infinite; }

  @media (prefers-reduced-motion: reduce) {
    .card-in, .slide-down, .check-pop, .glow { animation: none !important; }
  }
`;

export default function CoachBookingPage() {
  const params = useParams();

  const sportId = params.sportId as string;
  const clubId = params.clubId as string;
  const coachId = params.coachId as string;

  const [sport, setSport] = useState<Sport | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [coach, setCoach] = useState<CoachDetail | null>(null);

  const [existingBookings, setExistingBookings] = useState<
    ExistingBooking[]
  >([]);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);

  // Month shown in the calendar (UI only)
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const supabase = createSupabaseBrowserClient();

  // Dates starting from today for the next 90 days
  const availableDates = useMemo(() => {
    const dates = [];
    const today = new Date();

    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      dates.push({ iso: toIso(d), dateObj: d });
    }

    return dates;
  }, []);

  // Booking window boundaries
  const todayIso = availableDates[0]?.iso;
  const maxDateIso = availableDates[availableDates.length - 1]?.iso;

  useEffect(() => {
    async function fetchData() {
      if (!sportId || !clubId || !coachId) return;

      try {
        setLoading(true);

        const { data: sportData } = await supabase
          .from("sports")
          .select("*")
          .eq("id", sportId)
          .single();

        if (sportData) {
          setSport(sportData);
        }

        const { data: clubData } = await supabase
          .from("clubs")
          .select("*")
          .eq("id", clubId)
          .single();

        if (clubData) {
          setClub(clubData);
        }

        // Fetch coach information
        const { data: coachData, error: coachError } = await supabase
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
          .eq("id", coachId)
          .single();

        if (coachError) {
          console.error("Coach Fetch Error:", coachError.message);
        } else if (coachData) {
          setCoach({
            id: coachData.id,
            full_name: coachData.full_name || "Coach",
            title: coachData.title,
            bio: coachData.bio,
            hourly_rate: coachData.hourly_rate,
            image_url: coachData.image_url,
            sport_id: coachData.sport_id,
          });
        }

        // Fetch existing bookings across the whole booking window
        if (todayIso && maxDateIso) {
          const { data: bookingsData } = await supabase
            .from("bookings")
            .select("booking_date, start_time")
            .eq("coach_id", coachId)
            .gte("booking_date", todayIso)
            .lte("booking_date", maxDateIso);

          if (bookingsData) {
            setExistingBookings(bookingsData);
          }
        }

        setSelectedDate(availableDates[0].iso);
      } catch (err) {
        console.error("Error loading booking details:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [
    sportId,
    clubId,
    coachId,
    supabase,
    todayIso,
    maxDateIso,
    availableDates,
  ]);

  // ------------------------------------------------------------
  // Calendar data
  // ------------------------------------------------------------

  const monthCells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();

    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (string | null)[] = Array(offset).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(toIso(new Date(year, month, day)));
    }

    return cells;
  }, [viewMonth]);

  // Days where every slot is already taken
  const fullDays = useMemo(() => {
    const counts = new Map<string, number>();

    existingBookings.forEach((b) => {
      counts.set(b.booking_date, (counts.get(b.booking_date) ?? 0) + 1);
    });

    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count >= AVAILABLE_SLOTS.length)
        .map(([iso]) => iso)
    );
  }, [existingBookings]);

  const monthIndex = (iso: string | undefined) => {
    if (!iso) return 0;
    const [y, m] = iso.split("-").map(Number);
    return y * 12 + (m - 1);
  };

  const viewIndex = viewMonth.getFullYear() * 12 + viewMonth.getMonth();
  const canGoPrev = viewIndex > monthIndex(todayIso);
  const canGoNext = viewIndex < monthIndex(maxDateIso);

  function changeMonth(delta: number) {
    setViewMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + delta, 1)
    );
  }

  // ------------------------------------------------------------
  // Slot helpers
  // ------------------------------------------------------------

  const isSlotBooked = (time: string) => {
    return existingBookings.some(
      (b) =>
        b.booking_date === selectedDate && b.start_time.startsWith(time)
    );
  };

  // Today's slots that already started cannot be booked.
  const isSlotPast = (time: string) => {
    if (selectedDate !== todayIso) return false;

    const now = new Date();
    return time <= `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  // ------------------------------------------------------------
  // Booking
  // ------------------------------------------------------------

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !coach) {
      setErrorMessage("Please select both a date and an available time slot.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorMessage("You must be logged in to make a booking.");
        setSubmitting(false);
        return;
      }

      const formattedEndTime = `${addMinutes(selectedTime, SESSION_MINUTES)}:00`;
      const formattedStartTime = `${selectedTime}:00`;

      const { error: insertError } = await supabase.from("bookings").insert({
        user_id: user.id,
        coach_id: coach.id,
        club_id: clubId,
        sport_id: sportId,
        booking_date: selectedDate,
        start_time: formattedStartTime,
        end_time: formattedEndTime,
        total_price: coach.hourly_rate,
        status: "confirmed",
      });

      if (insertError) {
        console.error(
          "Insert failed:",
          insertError.message,
          insertError.details
        );

        setErrorMessage(insertError.message || "Failed to confirm booking.");
      } else {
        setBookingSuccess(true);
      }
    } catch (err) {
      console.error(
        "Unexpected booking error:",
        err instanceof Error ? err.message : err
      );

      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------------------
  // Loading / not found
  // ------------------------------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF7F0] pb-24">
        <div className="bg-neutral-950 px-4 pb-24 pt-32 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="h-6 w-80 animate-pulse rounded bg-white/10" />
            <div className="h-10 w-72 animate-pulse rounded-lg bg-white/10" />
          </div>
        </div>

        <div className="relative z-10 mx-auto -mt-10 grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          <div className="h-[520px] animate-pulse rounded-3xl bg-stone-300" />
          <div className="h-[520px] animate-pulse rounded-3xl bg-stone-200 lg:col-span-2" />
        </div>
      </main>
    );
  }

  if (!coach || !club) {
    return (
      <main className="min-h-screen bg-[#FAF7F0] px-4 pb-20 pt-40 text-center text-stone-900">
        <h1 className="mb-4 text-2xl font-bold">Coach or club not found</h1>

        <Link
          href={`/booking/${sportId}/${clubId}`}
          className="inline-block rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-yellow-300"
        >
          Back to club
        </Link>
      </main>
    );
  }

  const coachAvatar =
    coach.image_url ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop";

  const hasSelection = !!selectedDate && !!selectedTime;
  const price = Number(coach.hourly_rate).toLocaleString();

  // ------------------------------------------------------------
  // Page
  // ------------------------------------------------------------

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-stone-900">
      <style>{PAGE_STYLES}</style>

      {/* HEADER */}

      <header className="relative z-0 overflow-hidden bg-neutral-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8">
        <div className="glow pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-yellow-400 blur-[130px]" />

        <div className="relative mx-auto max-w-7xl">
          <Link
            href={`/booking/${sportId}/${clubId}`}
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
            Back to {club.name}
          </Link>

          <h1 className="mt-8 text-3xl font-black tracking-tight sm:text-5xl">
            {bookingSuccess ? (
              <>
                Booking <span className="text-yellow-400">confirmed</span>
              </>
            ) : (
              <>
                Book a <span className="text-yellow-400">Session</span>
              </>
            )}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
            {bookingSuccess
              ? "Everything is set. Here is a summary of your session."
              : `Choose a day and a time to train with ${coach.full_name}.`}
          </p>
        </div>
      </header>

      <div className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* SUCCESS */}

        {bookingSuccess ? (
          <div className="card-in mx-auto max-w-2xl rounded-3xl border border-stone-200 bg-white p-8 shadow-xl shadow-stone-900/5 sm:p-12">
            <div className="space-y-6 text-center">
              <div className="check-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400 text-black shadow-lg shadow-yellow-400/30">
                <svg
                  viewBox="0 0 24 24"
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 12.5l5 5L20 6.5" />
                </svg>
              </div>

              <h2 className="text-2xl font-extrabold text-stone-900 sm:text-3xl">
                Your session is scheduled
              </h2>

              <dl className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-[#FBF8F1] text-left text-sm">
                {[
                  ["Coach", coach.full_name],
                  ["Club", club.name],
                  ["Date", formatLongDate(selectedDate)],
                  [
                    "Time",
                    `${selectedTime} to ${addMinutes(
                      selectedTime,
                      SESSION_MINUTES
                    )}`,
                  ],
                  ["Price", `${price} DZD`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 px-5 py-3.5"
                  >
                    <dt className="text-stone-500">{label}</dt>
                    <dd className="text-right font-semibold text-stone-900">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="text-sm leading-6 text-stone-500">
                Keep an eye on your notifications for updates on your
                session.
              </p>

              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-black shadow-md transition-all hover:-translate-y-0.5 hover:bg-yellow-300"
                >
                  Go to my bookings
                </Link>

                <Link
                  href="/"
                  className="rounded-xl bg-stone-100 px-6 py-3 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-200"
                >
                  Back to home
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            {/* LEFT: COACH INFORMATION */}

            <section className="card-in overflow-hidden rounded-3xl bg-neutral-950 text-white shadow-xl lg:sticky lg:top-28">
              <div className="relative aspect-[4/4] w-full overflow-hidden bg-neutral-900">
                <Image
                  src={coachAvatar}
                  alt={coach.full_name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />

                <div className="absolute left-5 top-5">
                  <span className="inline-flex items-center rounded-full bg-yellow-400 px-3 py-1.5 text-xs font-bold text-black shadow-lg">
                    {sport?.name || "Sport"}
                  </span>
                </div>

                <div className="absolute bottom-5 left-5 right-5">
                  <h2 className="text-3xl font-black leading-tight tracking-tight">
                    {coach.full_name}
                  </h2>

                  <p className="mt-1 text-sm font-medium text-yellow-300">
                    {coach.title}
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-7">
                <div className="flex items-center gap-3 border-b border-white/10 pb-5">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <svg
                      className="h-4 w-4 text-yellow-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z"
                      />
                      <circle cx="12" cy="9" r="2.2" />
                    </svg>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      {club.name}
                    </p>
                    <p className="mt-0.5 text-xs text-white/50">{club.city}</p>
                  </div>
                </div>

                {coach.bio && (
                  <div className="border-b border-white/10 py-5">
                    <h3 className="mb-2 text-sm font-semibold text-white/80">
                      About the coach
                    </h3>

                    <p className="text-sm leading-relaxed text-white/60">
                      {coach.bio}
                    </p>
                  </div>
                )}

                <div className="pt-5">
                  <p className="mb-1 text-sm text-white/50">Session price</p>

                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-yellow-400">
                      {price} DZD
                    </span>

                    <span className="pb-1 text-xs text-white/40">
                      / {SESSION_MINUTES} min
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* RIGHT: BOOKING */}

            <section
              className="card-in rounded-3xl border border-stone-200 bg-white shadow-xl shadow-stone-900/5 lg:col-span-2"
              style={{ animationDelay: "100ms" }}
            >
              <div className="space-y-8 p-6 sm:p-8">
                {/* CHOOSE DAY */}

                <div>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="flex items-center gap-3 text-lg font-extrabold">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-sm font-black text-black">
                        1
                      </span>
                      Choose a day
                    </h2>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => changeMonth(-1)}
                        disabled={!canGoPrev}
                        aria-label="Previous month"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-600 transition hover:border-yellow-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-stone-200"
                      >
                        <Chevron direction="left" />
                      </button>

                      <span className="min-w-[130px] text-center text-sm font-bold text-stone-800">
                        {viewMonth.toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </span>

                      <button
                        type="button"
                        onClick={() => changeMonth(1)}
                        disabled={!canGoNext}
                        aria-label="Next month"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-600 transition hover:border-yellow-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-stone-200"
                      >
                        <Chevron direction="right" />
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-[#FBF8F1] p-3 sm:p-4">
                    <div className="mb-2 grid grid-cols-7 text-center text-xs font-semibold text-stone-400">
                      {WEEKDAYS.map((day) => (
                        <span key={day} className="py-1">
                          {day}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {monthCells.map((iso, index) => {
                        if (!iso) return <span key={`empty-${index}`} />;

                        const inRange =
                          !!todayIso &&
                          !!maxDateIso &&
                          iso >= todayIso &&
                          iso <= maxDateIso;

                        const full = fullDays.has(iso);
                        const disabled = !inRange || full;
                        const isSelected = selectedDate === iso;
                        const isToday = iso === todayIso;

                        return (
                          <button
                            key={iso}
                            type="button"
                            disabled={disabled}
                            aria-pressed={isSelected}
                            aria-label={`${formatLongDate(iso)}${
                              full ? ", fully booked" : ""
                            }`}
                            onClick={() => {
                              setSelectedDate(iso);
                              setSelectedTime("");
                            }}
                            className={`relative flex aspect-square items-center justify-center rounded-xl text-sm font-bold transition-all duration-200 ${
                              isSelected
                                ? "bg-yellow-400 text-black shadow-md shadow-yellow-400/30"
                                : disabled
                                  ? "cursor-not-allowed text-stone-300"
                                  : "bg-white text-stone-800 hover:bg-yellow-100"
                            } ${full && inRange ? "line-through" : ""}`}
                          >
                            {Number(iso.slice(8))}

                            {isToday && !isSelected && (
                              <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-yellow-500" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* CHOOSE TIME */}

                <div>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="flex items-center gap-3 text-lg font-extrabold">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-sm font-black text-black">
                        2
                      </span>
                      Choose a time
                    </h2>

                    {selectedDate && (
                      <span className="text-sm text-stone-500">
                        {formatLongDate(selectedDate)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {AVAILABLE_SLOTS.map((time) => {
                      const booked = isSlotBooked(time);
                      const past = isSlotPast(time);
                      const unavailable = booked || past;
                      const isSelected = selectedTime === time;

                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={unavailable}
                          aria-pressed={isSelected}
                          onClick={() => setSelectedTime(time)}
                          className={`rounded-xl border p-4 text-left transition-all duration-200 ${
                            unavailable
                              ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400"
                              : isSelected
                                ? "border-yellow-400 bg-yellow-400 text-black shadow-md shadow-yellow-400/30"
                                : "border-stone-200 bg-white text-stone-800 hover:-translate-y-0.5 hover:border-yellow-400 hover:bg-yellow-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-base font-black ${
                                unavailable ? "line-through" : ""
                              }`}
                            >
                              {time}
                            </span>

                            {!unavailable && (
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  isSelected ? "bg-black" : "bg-emerald-400"
                                }`}
                              />
                            )}
                          </div>

                          <span
                            className={`mt-1 block text-[11px] font-medium ${
                              isSelected ? "text-black/70" : "text-stone-400"
                            }`}
                          >
                            {booked
                              ? "Booked"
                              : past
                                ? "Passed"
                                : isSelected
                                  ? "Selected"
                                  : "Available"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SUMMARY */}

                {hasSelection && (
                  <div className="slide-down rounded-2xl bg-neutral-950 p-5 text-white">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-medium text-white/50">
                          Your session
                        </p>

                        <p className="mt-1 text-sm font-bold sm:text-base">
                          {formatLongDate(selectedDate)}
                        </p>
                      </div>

                      <div className="flex gap-8">
                        <div>
                          <p className="text-xs font-medium text-white/50">
                            Time
                          </p>
                          <p className="mt-1 text-sm font-bold text-yellow-400 sm:text-base">
                            {selectedTime} to{" "}
                            {addMinutes(selectedTime, SESSION_MINUTES)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-white/50">
                            Duration
                          </p>
                          <p className="mt-1 text-sm font-bold sm:text-base">
                            {SESSION_MINUTES} minutes
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ERROR */}

                {errorMessage && (
                  <div
                    role="alert"
                    className="slide-down rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm font-medium text-red-600"
                  >
                    {errorMessage}
                  </div>
                )}

                {/* ACCOUNT / NOTIFICATION NOTE */}

                {hasSelection && (
                  <div className="slide-down rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 sm:px-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v4m0 4h.01M10.29 3.86l-8.1 14a2 2 0 001.73 3h16.16a2 2 0 001.73-3l-8.1-14a2 2 0 00-3.42 0z"
                          />
                        </svg>
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-bold text-amber-900">
                          Check your account before booking
                        </p>

                        <p className="mt-1.5 text-xs leading-relaxed text-amber-800/90 sm:text-sm">
                          This booking uses the username and email of the
                          account you are signed in with, so make sure it is
                          the right one. Keep an eye on your notifications
                          for updates, including whether the coach accepts or
                          refuses your session.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* CONFIRMATION */}

                <div className="border-t border-stone-200 pt-6">
                  <div className="flex flex-col items-stretch justify-between gap-5 sm:flex-row sm:items-center">
                    <div>
                      <span className="block text-sm text-stone-500">
                        Total due
                      </span>

                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-stone-900">
                          {price}
                        </span>

                        <span className="text-sm font-bold text-stone-500">
                          DZD
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-stretch gap-2 sm:items-end">
                      <button
                        type="button"
                        onClick={handleBooking}
                        disabled={submitting || !selectedTime}
                        className={`w-full min-w-[220px] rounded-xl px-8 py-4 text-sm font-bold shadow-md transition-all sm:w-auto ${
                          submitting || !selectedTime
                            ? "cursor-not-allowed border border-stone-200 bg-stone-100 text-stone-400 shadow-none"
                            : "bg-yellow-400 text-black shadow-yellow-400/20 hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-yellow-400/30"
                        }`}
                      >
                        {submitting
                          ? "Processing booking..."
                          : "Confirm booking"}
                      </button>

                      {!selectedTime && (
                        <p className="text-xs text-stone-400">
                          Pick a day and a time to continue.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}