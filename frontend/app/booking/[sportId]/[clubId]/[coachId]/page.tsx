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

  // UI state only
  const [dayOpen, setDayOpen] = useState<boolean>(false);
  const [timeOpen, setTimeOpen] = useState<boolean>(false);

  const supabase = createSupabaseBrowserClient();

  // Generate dates starting from today for the next 90 days
  const availableDates = useMemo(() => {
    const dates = [];
    const today = new Date();

    for (let i = 0; i < 90; i++) {
      const d = new Date(today);

      d.setDate(today.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");

      const iso = `${year}-${month}-${day}`;

      dates.push({
        iso,
        dateObj: d,
        dayName: d.toLocaleDateString("en-US", {
          weekday: "short",
        }),
        dayNumber: d.getDate(),
        monthName: d.toLocaleDateString("en-US", {
          month: "short",
        }),
        year,
        monthYearHeader: d.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
      });
    }

    return dates;
  }, []);

  // Compute three-month boundary dates
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

        const { data: coachData, error: coachError } = await supabase
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
          .eq("id", coachId)
          .single();

        if (coachError) {
          console.error("Coach Fetch Error:", coachError.message);
        } else if (coachData) {
          const rawCoach: any = coachData;

          setCoach({
            id: rawCoach.id,
            full_name: rawCoach.profiles?.full_name || "Coach",
            title: rawCoach.title,
            bio: rawCoach.bio,
            hourly_rate: rawCoach.hourly_rate,
            image_url: rawCoach.image_url,
            sport_id: rawCoach.sport_id,
          });
        }

        // Fetch existing bookings across the entire 3-month window
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

  const isSlotBooked = (time: string) => {
    return existingBookings.some(
      (b) =>
        b.booking_date === selectedDate &&
        b.start_time.startsWith(time)
    );
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !coach) {
      setErrorMessage(
        "Please select both a date and an available time slot."
      );
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

      const [hours, minutes] = selectedTime.split(":").map(Number);

      const endHour = hours + 1;
      const endMinutes = minutes + 30;

      const formattedEndTime = `${String(endHour).padStart(
        2,
        "0"
      )}:${String(endMinutes % 60).padStart(2, "0")}:00`;

      const formattedStartTime = `${selectedTime}:00`;

      const { error: insertError } = await supabase
        .from("bookings")
        .insert({
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

        setErrorMessage(
          insertError.message || "Failed to confirm booking."
        );
      } else {
        setBookingSuccess(true);
      }
    } catch (err: any) {
      console.error(
        "Unexpected booking error:",
        err?.message || err
      );

      setErrorMessage(
        "An unexpected error occurred. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-slate-900 pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="h-64 bg-slate-100 border border-slate-200 rounded-3xl animate-pulse" />
          <div className="h-96 bg-slate-100 border border-slate-200 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!coach || !club) {
    return (
      <div className="min-h-screen bg-white text-slate-900 pt-32 pb-20 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4">
          Coach or Club Not Found
        </h1>

        <Link
          href={`/booking/${sportId}/${clubId}`}
          className="text-yellow-500 hover:text-yellow-600 hover:underline"
        >
          ← Back to Club
        </Link>
      </div>
    );
  }

  const coachAvatar =
    coach.image_url ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop";

  const selectedDateObject = availableDates.find(
    (date) => date.iso === selectedDate
  );

  const selectedDateLabel = selectedDateObject
    ? `${selectedDateObject.dayName}, ${selectedDateObject.monthName} ${selectedDateObject.dayNumber}, ${selectedDateObject.year}`
    : "Select a day";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* =========================================================
            BACK BUTTON
        ========================================================= */}
        <div className="mb-8">
          <Link
            href={`/booking/${sportId}/${clubId}`}
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

            Back to {club.name}
          </Link>
        </div>

        {/* =========================================================
            SUCCESS
        ========================================================= */}
        {bookingSuccess ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm">
            <div className="max-w-2xl mx-auto text-center space-y-6">

              <div className="w-16 h-16 bg-yellow-400 text-slate-900 rounded-full flex items-center justify-center mx-auto text-3xl font-black shadow-lg shadow-yellow-400/20">
                ✓
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                Booking Confirmed!
              </h2>

              <p className="text-slate-600 leading-relaxed">
                Your session with{" "}
                <span className="text-yellow-600 font-bold">
                  {coach.full_name}
                </span>{" "}
                at{" "}
                <span className="text-slate-900 font-semibold">
                  {club.name}
                </span>{" "}
                on{" "}
                <span className="text-slate-900 font-semibold">
                  {selectedDate}
                </span>{" "}
                at{" "}
                <span className="text-yellow-600 font-bold">
                  {selectedTime}
                </span>{" "}
                has been scheduled.
              </p>

              <div className="pt-4 flex flex-wrap justify-center gap-4">
                <Link
                  href="/dashboard"
                  className="px-6 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold text-sm transition-colors shadow-md"
                >
                  Go to My Bookings
                </Link>

                <Link
                  href="/"
                  className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition-colors"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* =======================================================
             MAIN TWO COLUMN SECTION
          ======================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* =====================================================
                LEFT — COACH INFORMATION
            ====================================================== */}
            <section className="lg:col-span-1 bg-black rounded-3xl overflow-hidden shadow-xl">

              <div className="relative aspect-[4/4.5] w-full bg-slate-900 overflow-hidden">
                <Image
                  src={coachAvatar}
                  alt={coach.full_name}
                  fill
                  className="object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                <div className="absolute top-5 left-5">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-yellow-400 text-black text-[10px] font-black uppercase tracking-[0.15em] shadow-lg">
                    {sport?.name || "Sport"}
                  </span>
                </div>

                <div className="absolute left-5 right-5 bottom-5 text-white">
                  <p className="text-yellow-400 text-xs font-bold uppercase tracking-[0.18em] mb-2">
                    Professional Coach
                  </p>

                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                    {coach.full_name}
                  </h1>

                  <p className="text-white/70 text-sm mt-1 font-medium">
                    {coach.title}
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-7 text-white">

                <div className="flex items-center gap-3 pb-5 border-b border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-yellow-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z"
                      />
                      <circle
                        cx="12"
                        cy="9"
                        r="2.2"
                      />
                    </svg>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-bold">
                      Club
                    </p>

                    <p className="text-sm font-semibold text-white">
                      {club.name}
                    </p>

                    <p className="text-xs text-white/45 mt-0.5">
                      {club.city}
                    </p>
                  </div>
                </div>

                {coach.bio && (
                  <div className="py-5 border-b border-white/10">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-bold mb-2">
                      About the Coach
                    </p>

                    <p className="text-sm text-white/65 leading-relaxed">
                      {coach.bio}
                    </p>
                  </div>
                )}

                <div className="pt-5">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-bold mb-2">
                    Session Price
                  </p>

                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-yellow-400">
                      {coach.hourly_rate} DZD
                    </span>

                    <span className="text-xs text-white/40 pb-1">
                      / 90 min
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* =====================================================
                RIGHT — BOOKING
            ====================================================== */}
            <section className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-visible">

              {/* Header */}
              <div className="p-6 sm:p-8 border-b border-slate-200">

                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">

                  <div>


                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                      Book a{" "}
                      <span className="text-yellow-500">
                        Session
                      </span>
                    </h2>

                    <p className="text-sm text-slate-500 mt-1.5">
                      Choose your preferred day and time.
                    </p>
                  </div>


                </div>
              </div>

              {/* Booking Controls */}
              <div className="p-6 sm:p-8 space-y-6">

                {/* =================================================
                    DAY SELECTOR
                ================================================== */}
                <div className="space-y-2">

                  <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Choose Day
                  </label>

                  <div className="relative">

                    <button
                      type="button"
                      onClick={() => {
                        setDayOpen((prev) => !prev);
                        setTimeOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border transition-all duration-200 ${
                        dayOpen
                          ? "border-yellow-400 bg-yellow-50/40 ring-2 ring-yellow-100"
                          : "border-slate-200 bg-slate-50 hover:border-yellow-300 hover:bg-yellow-50/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">

                        <div className="w-10 h-10 rounded-xl bg-black text-yellow-400 flex items-center justify-center">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <rect
                              x="3"
                              y="4"
                              width="18"
                              height="18"
                              rx="2"
                              ry="2"
                              strokeWidth="1.8"
                            />
                            <path
                              d="M16 2v4M8 2v4M3 10h18"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>

                        <div className="text-left">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-bold">
                            Selected Day
                          </p>

                          <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                            {selectedDateLabel}
                          </p>
                        </div>
                      </div>

                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                          dayOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M6 9l6 6 6-6"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {dayOpen && (
                      <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">

                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                            Available Days
                          </p>

                          <span className="text-[10px] text-slate-400">
                            Next 3 months
                          </span>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-[330px] overflow-y-auto pr-1">

                          {availableDates.map((dateObj) => {
                            const isSelected =
                              selectedDate === dateObj.iso;

                            return (
                              <button
                                key={dateObj.iso}
                                type="button"
                                onClick={() => {
                                  setSelectedDate(dateObj.iso);
                                  setSelectedTime("");
                                  setDayOpen(false);
                                }}
                                className={`relative p-3 rounded-xl border text-center transition-all duration-200 ${
                                  isSelected
                                    ? "bg-yellow-400 border-yellow-400 text-slate-900 shadow-md shadow-yellow-400/20"
                                    : "bg-white border-slate-200 text-slate-700 hover:border-yellow-400 hover:bg-yellow-50"
                                }`}
                              >
                                <span className="block text-[9px] uppercase font-bold tracking-wider opacity-70">
                                  {dateObj.monthName}
                                </span>

                                <span className="block text-xl font-black leading-tight mt-1">
                                  {dateObj.dayNumber}
                                </span>

                                <span className="block text-[10px] font-medium opacity-70 mt-0.5">
                                  {dateObj.dayName}
                                </span>

                                {isSelected && (
                                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-slate-900" />
                                )}
                              </button>
                            );
                          })}

                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* =================================================
                    TIME SELECTOR
                ================================================== */}
                <div className="space-y-2">

                  <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Choose Time
                  </label>

                  <div className="relative">

                    <button
                      type="button"
                      onClick={() => {
                        setTimeOpen((prev) => !prev);
                        setDayOpen(false);
                      }}
                      disabled={!selectedDate}
                      className={`w-full flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border transition-all duration-200 ${
                        !selectedDate
                          ? "bg-slate-100 border-slate-200 cursor-not-allowed opacity-60"
                          : timeOpen
                          ? "border-yellow-400 bg-yellow-50/40 ring-2 ring-yellow-100"
                          : "border-slate-200 bg-slate-50 hover:border-yellow-300 hover:bg-yellow-50/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">

                        <div className="w-10 h-10 rounded-xl bg-black text-yellow-400 flex items-center justify-center">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="9"
                              strokeWidth="1.8"
                            />

                            <path
                              d="M12 7v5l3 2"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>

                        <div className="text-left">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-bold">
                            Selected Time
                          </p>

                          <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                            {selectedTime ||
                              "Select an available time"}
                          </p>
                        </div>
                      </div>

                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                          timeOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M6 9l6 6 6-6"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {timeOpen && selectedDate && (
                      <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">

                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                            Available Times
                          </p>

                          <span className="text-[10px] text-slate-400">
                            {selectedDate}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                          {AVAILABLE_SLOTS.map((time) => {
                            const booked = isSlotBooked(time);
                            const isSelected =
                              selectedTime === time;

                            return (
                              <button
                                key={time}
                                type="button"
                                disabled={booked}
                                onClick={() => {
                                  setSelectedTime(time);
                                  setTimeOpen(false);
                                }}
                                className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                                  booked
                                    ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                    : isSelected
                                    ? "bg-yellow-400 text-slate-900 border-yellow-400 shadow-md shadow-yellow-400/20"
                                    : "bg-white border-slate-200 text-slate-800 hover:border-yellow-400 hover:bg-yellow-50"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">

                                  <span
                                    className={`text-base font-black ${
                                      booked
                                        ? "line-through"
                                        : ""
                                    }`}
                                  >
                                    {time}
                                  </span>

                                  {!booked && (
                                    <span
                                      className={`w-2 h-2 rounded-full ${
                                        isSelected
                                          ? "bg-slate-900"
                                          : "bg-green-400"
                                      }`}
                                    />
                                  )}
                                </div>

                                <span
                                  className={`block text-[10px] font-medium mt-1 ${
                                    booked
                                      ? "text-slate-400"
                                      : isSelected
                                      ? "text-slate-700"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {booked
                                    ? "Booked"
                                    : isSelected
                                    ? "Selected"
                                    : "Available"}
                                </span>
                              </button>
                            );
                          })}

                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* =================================================
                    CURRENT SELECTION SUMMARY
                ================================================== */}
                {selectedDate && selectedTime && (
                 <div className="rounded-2xl bg-yellow-50 p-5 text-black">

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                      <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-bold">
                          Your Session
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <span className="text-sm font-bold">
                            {selectedDateLabel}
                          </span>

                          <span className="hidden sm:block text-white/20">
                            •
                          </span>

                          <span className="text-sm font-bold text-yellow-400">
                            {selectedTime}
                          </span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-bold">
                          Duration
                        </p>

                        <p className="text-sm font-bold">
                          90 minutes
                        </p>
                      </div>

                    </div>
                  </div>
                )}

                {/* =================================================
                    ERROR
                ================================================== */}
                {errorMessage && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium text-center">
                    {errorMessage}
                  </div>
                )}

                {/* =================================================
                    ACCOUNT / NOTIFICATION WARNING
                ================================================== */}
                {selectedDate && selectedTime && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 sm:px-5">

                    <div className="flex items-start gap-3">

                      {/* Warning Icon */}
                      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v4m0 4h.01M10.29 3.86l-8.1 14a2 2 0 001.73 3h16.16a2 2 0 001.73-3l-8.1-14a2 2 0 00-3.42 0z"
                          />
                        </svg>
                      </div>

                      {/* Warning Text */}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-red-700">
                          Please review your account before booking
                        </p>

                        <p className="text-xs sm:text-sm text-red-600/90 leading-relaxed mt-1.5">
                          This booking will use the username and email
                          address associated with your current account.
                          Please make sure you are signed in to the
                          correct account before confirming your session.
                          Keep an eye on your notifications for booking
                          updates, including whether your session is
                          accepted or refused by the coach.
                        </p>
                      </div>

                    </div>
                  </div>
                )}

                {/* =================================================
                    CONFIRMATION
                ================================================== */}
                <div className="pt-6 border-t border-slate-200">

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-5">

                    <div>
                      <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 block font-bold">
                        Total Due
                      </span>

                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-black text-yellow-500">
                          {coach.hourly_rate}
                        </span>

                        <span className="text-sm font-bold text-slate-500">
                          DZD
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleBooking}
                      disabled={submitting || !selectedTime}
                      className={`w-full sm:w-auto min-w-[210px] px-8 py-4 rounded-xl font-bold text-sm transition-all shadow-md ${
                        submitting || !selectedTime
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                          : "bg-yellow-400 hover:bg-yellow-300 text-slate-900 shadow-yellow-400/20 hover:shadow-yellow-400/30 hover:-translate-y-0.5"
                      }`}
                    >
                      {submitting
                        ? "Processing Booking..."
                        : "Confirm Booking Now"}
                    </button>

                  </div>
                </div>

              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}