"use client";



/**

 * Coach dashboard

 *

 * Suggested route: app/coach/dashboard/page.tsx

 *

 * Assumptions (change the constants below if your database differs):

 *  - A coach is found in the `coaches` table by the logged-in user's id

 *    (`coaches.id`, or `coaches.user_id` / `coaches.profile_id` as fallbacks).

 *  - `bookings.status` uses these values:

 *      "pending" or "confirmed"  -> waiting for the coach to answer

 *        (the booking page currently inserts "confirmed")

 *      "accepted"                -> the coach accepted

 *      "refused"                 -> the coach refused

 *      "cancelled"               -> the coach cancelled an accepted session

 *    If `status` has a CHECK constraint or an enum, allow these values.

 *  - Row Level Security lets a coach read and update their own bookings,

 *    and read the profiles of the clients who booked them.

 */



import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import Image from "next/image";

import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { signOutUser } from "@/lib/auth";



// ============================================

// CONFIG

// ============================================



const STATUS_ACCEPTED = "accepted";

const STATUS_REFUSED = "refused";

const STATUS_CANCELLED = "cancelled";



// Columns that can link a coach row to the logged-in user, tried in order.

const COACH_USER_COLUMNS = ["id", "user_id", "profile_id"] as const;



const LOGIN_ROUTE = "/login";



// ============================================

// TYPES

// ============================================



type Coach = {

  id: string;

  full_name: string | null;

  sport_id: string | null;

  title: string | null;

  bio: string | null;

  hourly_rate: number | null;

  image_url: string | null;

};



type Booking = {

  id: string;

  user_id: string;

  coach_id: string;

  club_id: string | null;

  sport_id: string | null;

  booking_date: string;

  start_time: string;

  end_time: string;

  total_price: number | null;

  status: string | null;

};



type Named = { id: string; name: string; city?: string | null };

type Profile = { id: string; full_name: string | null };



type UiStatus =

  | "pending"

  | "accepted"

  | "refused"

  | "cancelled"

  | "completed"

  | "expired";



type Tab = "requests" | "upcoming" | "history";



type PendingAction = {

  booking: Booking;

  kind: "refuse" | "cancel";

};



// ============================================

// PURE HELPERS

// ============================================



function startOf(b: Booking) {

  return new Date(`${b.booking_date}T${b.start_time.slice(0, 5)}`);

}



function endOf(b: Booking) {

  return new Date(`${b.booking_date}T${b.end_time.slice(0, 5)}`);

}



function timeRange(b: Booking) {

  return `${b.start_time.slice(0, 5)} to ${b.end_time.slice(0, 5)}`;

}



function getUiStatus(b: Booking, now: Date): UiStatus {

  const raw = (b.status ?? "").toLowerCase();

  const ended = endOf(b).getTime() < now.getTime();



  if (["refused", "rejected", "declined"].includes(raw)) return "refused";

  if (["cancelled", "canceled"].includes(raw)) return "cancelled";

  if (raw === "completed") return "completed";

  if (raw === "accepted") return ended ? "completed" : "accepted";



  // "pending", "confirmed" and anything unknown wait for the coach

  return ended ? "expired" : "pending";

}



function getInitial(name: string | null | undefined) {

  return name?.trim().charAt(0).toUpperCase() || "C";

}



function formatDay(iso: string) {

  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {

    weekday: "short",

    month: "short",

    day: "numeric",

  });

}



function dayHeading(iso: string, now: Date) {

  const target = new Date(`${iso}T00:00:00`);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);



  if (diff === 0) return "Today";

  if (diff === 1) return "Tomorrow";



  return target.toLocaleDateString("en-US", {

    weekday: "long",

    month: "long",

    day: "numeric",

  });

}



function money(value: number | null | undefined) {

  return `${Number(value ?? 0).toLocaleString()} DZD`;

}



function statusLabel(status: UiStatus) {

  switch (status) {

    case "pending":

      return "Needs your answer";

    case "accepted":

      return "Accepted";

    case "refused":

      return "Refused";

    case "cancelled":

      return "Cancelled";

    case "completed":

      return "Completed";

    case "expired":

      return "Expired";

  }

}



function statusStyle(status: UiStatus) {

  switch (status) {

    case "pending":

      return "bg-amber-50 text-amber-800 ring-amber-200";

    case "accepted":

      return "bg-emerald-50 text-emerald-800 ring-emerald-200";

    case "refused":

      return "bg-red-50 text-red-700 ring-red-200";

    case "cancelled":

      return "bg-stone-100 text-stone-600 ring-stone-200";

    case "completed":

      return "bg-sky-50 text-sky-800 ring-sky-200";

    case "expired":

      return "bg-stone-100 text-stone-500 ring-stone-200";

  }

}



function statusDot(status: UiStatus) {

  switch (status) {

    case "pending":

      return "bg-amber-500 animate-pulse";

    case "accepted":

      return "bg-emerald-500";

    case "refused":

      return "bg-red-500";

    case "completed":

      return "bg-sky-500";

    default:

      return "bg-stone-400";

  }

}



// ============================================

// SMALL COMPONENTS

// ============================================



type IconName =

  | "calendar"

  | "clock"

  | "pin"

  | "check"

  | "close"

  | "refresh"

  | "inbox"

  | "money"

  | "sun"

  | "list"

  | "history";



function Icon({

  name,

  className = "h-4 w-4",

}: {

  name: IconName;

  className?: string;

}) {

  const paths: Record<IconName, React.ReactNode> = {

    calendar: (

      <>

        <rect x="3" y="5" width="18" height="16" rx="2" />

        <path d="M3 10h18M8 3v4M16 3v4" />

      </>

    ),

    clock: (

      <>

        <circle cx="12" cy="12" r="9" />

        <path d="M12 7v5l3 2" />

      </>

    ),

    pin: (

      <>

        <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />

        <circle cx="12" cy="9.5" r="2.5" />

      </>

    ),

    check: <path d="M4 12.5l5 5L20 6.5" />,

    close: <path d="M6 6l12 12M18 6L6 18" />,

    refresh: (

      <>

        <path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4" />

        <path d="M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4" />

      </>

    ),

    inbox: (

      <>

        <path d="M3 13l3-8h12l3 8" />

        <path d="M3 13v6h18v-6h-5l-1.5 2h-5L8 13H3z" />

      </>

    ),

    money: (

      <>

        <rect x="2.5" y="6" width="19" height="12" rx="2" />

        <circle cx="12" cy="12" r="2.8" />

      </>

    ),

    sun: (

      <>

        <circle cx="12" cy="12" r="4" />

        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />

      </>

    ),

    list: (

      <>

        <path d="M8 6h13M8 12h13M8 18h13" />

        <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />

      </>

    ),

    history: (

      <>

        <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />

        <path d="M12 8v4l3 2" />

      </>

    ),

  };



  return (

    <svg

      viewBox="0 0 24 24"

      fill="none"

      stroke="currentColor"

      strokeWidth="1.8"

      strokeLinecap="round"

      strokeLinejoin="round"

      className={className}

      aria-hidden="true"

    >

      {paths[name]}

    </svg>

  );

}



function StatusBadge({ status }: { status: UiStatus }) {

  return (

    <span

      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyle(status)}`}

    >

      <span className={`h-1.5 w-1.5 rounded-full ${statusDot(status)}`} />

      {statusLabel(status)}

    </span>

  );

}



function BookingCard({

  booking,

  status,

  clientName,

  clubName,

  sportName,

  busy,

  index,

  onAccept,

  onRefuse,

  onCancel,

}: {

  booking: Booking;

  status: UiStatus;

  clientName: string;

  clubName: string | null;

  sportName: string | null;

  busy: boolean;

  index: number;

  onAccept: () => void;

  onRefuse: () => void;

  onCancel: () => void;

}) {

  return (

    <article

      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}

      className="card-in rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition duration-300 hover:border-yellow-300 hover:shadow-lg hover:shadow-stone-900/5"

    >

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div className="flex min-w-0 items-center gap-3">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-lg font-black text-stone-800">

            {getInitial(clientName)}

          </div>



          <div className="min-w-0">

            <p className="truncate font-bold text-stone-900">{clientName}</p>

            <p className="mt-0.5 text-xs text-stone-500">

              {sportName ?? "Training session"}

            </p>

          </div>

        </div>



        <StatusBadge status={status} />

      </div>



      <ul className="mt-5 grid gap-3 text-sm text-stone-600 sm:grid-cols-2">

        <li className="flex items-center gap-3">

          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-50 text-yellow-700">

            <Icon name="calendar" />

          </span>

          {formatDay(booking.booking_date)}

        </li>



        <li className="flex items-center gap-3">

          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-50 text-yellow-700">

            <Icon name="clock" />

          </span>

          {timeRange(booking)}

        </li>



        {clubName && (

          <li className="flex items-center gap-3">

            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-50 text-yellow-700">

              <Icon name="pin" />

            </span>

            <span className="truncate">{clubName}</span>

          </li>

        )}



        <li className="flex items-center gap-3">

          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-50 text-yellow-700">

            <Icon name="money" />

          </span>

          <span className="font-semibold text-stone-900">

            {money(booking.total_price)}

          </span>

        </li>

      </ul>



      {status === "pending" && (

        <div className="mt-5 flex gap-3 border-t border-stone-100 pt-4">

          <button

            type="button"

            onClick={onAccept}

            disabled={busy}

            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3 text-sm font-bold text-black transition hover:bg-yellow-300 disabled:opacity-50"

          >

            <Icon name="check" />

            {busy ? "..." : "Accept"}

          </button>



          <button

            type="button"

            onClick={onRefuse}

            disabled={busy}

            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold text-stone-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"

          >

            <Icon name="close" />

            Refuse

          </button>

        </div>

      )}



      {status === "accepted" && (

        <div className="mt-5 border-t border-stone-100 pt-4">

          <button

            type="button"

            onClick={onCancel}

            disabled={busy}

            className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"

          >

            Cancel this session

          </button>

        </div>

      )}

    </article>

  );

}



// ============================================

// PAGE

// ============================================



export default function CoachDashboardPage() {

  const [supabase] = useState(() => createSupabaseBrowserClient());



  const [coach, setCoach] = useState<Coach | null>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);

  const [sports, setSports] = useState<Named[]>([]);

  const [clubs, setClubs] = useState<Named[]>([]);

  const [profiles, setProfiles] = useState<Profile[]>([]);



  const [loggedIn, setLoggedIn] = useState(true);

  const [loading, setLoading] = useState(true);

  const [actionId, setActionId] = useState<string | null>(null);



  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  // Profile dropdown and logout state.
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await signOutUser();
      window.location.href = "/";
    } catch (err) {
      console.error("Logout error:", err);
      setError("Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }



  const [tab, setTab] = useState<Tab>("requests");

  const [search, setSearch] = useState("");

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(

    null

  );



  // Re-evaluate "expired" and "completed" every minute.

  const [now, setNow] = useState(() => new Date());



  useEffect(() => {

    const timer = setInterval(() => setNow(new Date()), 60_000);

    return () => clearInterval(timer);

  }, []);



  // ============================================

  // Close the profile dropdown when the user clicks outside it.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // LOAD DATA

  // ============================================



  const loadData = useCallback(

    async (silent = false) => {

      if (!silent) setLoading(true);

      setError("");



      try {

        const { data: authData, error: authError } =

          await supabase.auth.getUser();



        if (authError) throw authError;



        const user = authData.user;



        if (!user) {

          setLoggedIn(false);

          return;

        }



        setLoggedIn(true);



        // Find the coach row that belongs to this user.

        let coachRow: Coach | null = null;



        for (const column of COACH_USER_COLUMNS) {

          const { data, error: coachError } = await supabase

            .from("coaches")

            .select(

              "id, full_name, sport_id, title, bio, hourly_rate, image_url"

            )

            .eq(column, user.id)

            .maybeSingle();



          if (!coachError && data) {

            coachRow = data as Coach;

            break;

          }

        }



        setCoach(coachRow);



        if (!coachRow) return;



        const [bookingResponse, sportResponse, clubResponse] =

          await Promise.all([

            supabase

              .from("bookings")

              .select("*")

              .eq("coach_id", coachRow.id)

              .order("booking_date", { ascending: true })

              .order("start_time", { ascending: true }),



            supabase.from("sports").select("id, name"),



            supabase.from("clubs").select("id, name, city"),

          ]);



        if (bookingResponse.error) throw bookingResponse.error;

        if (sportResponse.error) throw sportResponse.error;

        if (clubResponse.error) throw clubResponse.error;



        const bookingData = (bookingResponse.data ?? []) as Booking[];



        const clientIds = Array.from(

          new Set(bookingData.map((b) => b.user_id))

        );



        let profileData: Profile[] = [];



        if (clientIds.length > 0) {

          const { data, error: profileError } = await supabase

            .from("profiles")

            .select("id, full_name")

            .in("id", clientIds);



          if (profileError) throw profileError;



          profileData = (data ?? []) as Profile[];

        }



        setBookings(bookingData);

        setSports((sportResponse.data ?? []) as Named[]);

        setClubs((clubResponse.data ?? []) as Named[]);

        setProfiles(profileData);

      } catch (err) {

        console.error("Coach dashboard loading error:", err);

        setError(

          err instanceof Error ? err.message : "Could not load your dashboard."

        );

      } finally {

        setLoading(false);

      }

    },

    [supabase]

  );



  useEffect(() => {

    void loadData();

  }, [loadData]);



  // New requests show up without a manual refresh.

  useEffect(() => {

    if (!coach?.id) return;



    const channel = supabase

      .channel(`coach-bookings-${coach.id}`)

      .on(

        "postgres_changes",

        {

          event: "*",

          schema: "public",

          table: "bookings",

          filter: `coach_id=eq.${coach.id}`,

        },

        () => void loadData(true)

      )

      .subscribe();



    return () => {

      void supabase.removeChannel(channel);

    };

  }, [supabase, coach?.id, loadData]);



  useEffect(() => {

    if (!message) return;

    const timer = setTimeout(() => setMessage(""), 4000);

    return () => clearTimeout(timer);

  }, [message]);



  // Confirmation dialog: close with Escape and lock page scroll.

  useEffect(() => {

    if (!pendingAction) return;



    function onKey(e: KeyboardEvent) {

      if (e.key === "Escape") setPendingAction(null);

    }



    document.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";



    return () => {

      document.removeEventListener("keydown", onKey);

      document.body.style.overflow = previousOverflow;

    };

  }, [pendingAction]);



  // ============================================

  // ACTIONS

  // ============================================



  async function updateStatus(

    booking: Booking,

    newStatus: string,

    successMessage: string

  ) {

    if (!coach) return;



    setError("");

    setMessage("");

    setActionId(booking.id);



    const previous = bookings;



    // Optimistic update, rolled back if the request fails.

    setBookings((current) =>

      current.map((b) => (b.id === booking.id ? { ...b, status: newStatus } : b))

    );



    const { error: updateError } = await supabase

      .from("bookings")

      .update({ status: newStatus })

      .eq("id", booking.id)

      .eq("coach_id", coach.id);



    setActionId(null);

    setPendingAction(null);



    if (updateError) {

      setBookings(previous);

      setError(updateError.message);

      return;

    }



    setMessage(successMessage);

  }



  function acceptBooking(booking: Booking) {

    void updateStatus(booking, STATUS_ACCEPTED, "Session accepted.");

  }



  function confirmPendingAction() {

    if (!pendingAction) return;



    const { booking, kind } = pendingAction;



    if (kind === "refuse") {

      void updateStatus(booking, STATUS_REFUSED, "Request refused.");

    } else {

      void updateStatus(booking, STATUS_CANCELLED, "Session cancelled.");

    }

  }



  // ============================================

  // DERIVED DATA

  // ============================================



  function clientName(userId: string) {

    return (

      profiles.find((p) => p.id === userId)?.full_name || "SportGy member"

    );

  }



  function nameOf(list: Named[], id: string | null) {

    return id ? (list.find((item) => item.id === id)?.name ?? null) : null;

  }



  const enriched = useMemo(

    () =>

      bookings.map((booking) => ({

        booking,

        status: getUiStatus(booking, now),

      })),

    [bookings, now]

  );



  const lists = useMemo(() => {

    const byStartAsc = (

      a: (typeof enriched)[number],

      b: (typeof enriched)[number]

    ) => startOf(a.booking).getTime() - startOf(b.booking).getTime();



    return {

      requests: enriched.filter((e) => e.status === "pending").sort(byStartAsc),

      upcoming: enriched.filter((e) => e.status === "accepted").sort(byStartAsc),

      history: enriched

        .filter((e) =>

          ["completed", "refused", "cancelled", "expired"].includes(e.status)

        )

        .sort((a, b) => byStartAsc(b, a)),

    };

  }, [enriched]);



  const visible = useMemo(() => {

    const query = search.trim().toLowerCase();



    return lists[tab].filter((entry) =>

      clientName(entry.booking.user_id).toLowerCase().includes(query)

    );

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [lists, tab, search, profiles]);



  const stats = useMemo(() => {

    const todayIso = `${now.getFullYear()}-${String(

      now.getMonth() + 1

    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;



    const weekEnd = new Date(now.getTime() + 7 * 86_400_000);



    const monthEarnings = enriched

      .filter((e) => {

        const date = startOf(e.booking);

        return (

          (e.status === "accepted" || e.status === "completed") &&

          date.getFullYear() === now.getFullYear() &&

          date.getMonth() === now.getMonth()

        );

      })

      .reduce((sum, e) => sum + Number(e.booking.total_price ?? 0), 0);



    return {

      requests: lists.requests.length,

      today: lists.upcoming.filter((e) => e.booking.booking_date === todayIso)

        .length,

      week: lists.upcoming.filter((e) => startOf(e.booking) <= weekEnd).length,

      monthEarnings,

    };

  }, [enriched, lists, now]);



  const nextSession = lists.upcoming[0] ?? null;



  // Upcoming sessions are grouped by day.

  const groupedVisible = useMemo(() => {

    if (tab !== "upcoming") return null;



    const groups = new Map<string, typeof visible>();



    visible.forEach((entry) => {

      const key = entry.booking.booking_date;

      groups.set(key, [...(groups.get(key) ?? []), entry]);

    });



    return Array.from(groups.entries());

  }, [visible, tab]);



  // ============================================

  // RENDER

  // ============================================



  const firstName = coach?.full_name?.trim().split(" ")[0] || "Coach";



  const tabs: { key: Tab; label: string; icon: IconName; count: number }[] = [

    { key: "requests", label: "Requests", icon: "inbox", count: lists.requests.length },

    { key: "upcoming", label: "Upcoming", icon: "list", count: lists.upcoming.length },

    { key: "history", label: "History", icon: "history", count: lists.history.length },

  ];



  const emptyCopy: Record<Tab, { title: string; text: string }> = {

    requests: {

      title: "No pending requests",

      text: "New booking requests from athletes will appear here.",

    },

    upcoming: {

      title: "No upcoming sessions",

      text: "Sessions you accept will be listed here by day.",

    },

    history: {

      title: "No history yet",

      text: "Completed, refused and cancelled sessions will show up here.",

    },

  };



  const pageStyles = `

    @keyframes cardIn {

      from { opacity: 0; transform: translateY(16px); }

      to   { opacity: 1; transform: none; }

    }

    .card-in { animation: cardIn 550ms cubic-bezier(.22,.61,.36,1) both; }



    @keyframes slideDown {

      from { opacity: 0; transform: translateY(-8px); }

      to   { opacity: 1; transform: none; }

    }

    .slide-down { animation: slideDown 260ms ease both; }



    @keyframes modalIn {

      from { opacity: 0; transform: translateY(14px) scale(.97); }

      to   { opacity: 1; transform: none; }

    }

    .modal-in { animation: modalIn 260ms cubic-bezier(.22,.61,.36,1) both; }



    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .fade-in { animation: fadeIn 220ms ease both; }



    @keyframes glow {

      0%, 100% { opacity: .16; transform: scale(1); }

      50%      { opacity: .3;  transform: scale(1.15); }

    }

    .glow { animation: glow 8s ease-in-out infinite; }



    @media (prefers-reduced-motion: reduce) {

      .card-in, .slide-down, .modal-in, .fade-in, .glow { animation: none !important; }

    }

  `;



  // Not logged in

  if (!loading && !loggedIn) {

    return (

      <main className="min-h-screen bg-[#FAF7F0] px-4 pb-20 pt-40 text-center text-stone-900">

        <h1 className="mb-3 text-2xl font-bold">Please log in</h1>

        <p className="mb-6 text-sm text-stone-500">

          Log in with your coach account to see your dashboard.

        </p>

        <Link

          href={LOGIN_ROUTE}

          className="inline-block rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-yellow-300"

        >

          Log in

        </Link>

      </main>

    );

  }



  // Logged in but not a coach

  if (!loading && loggedIn && !coach && !error) {

    return (

      <main className="min-h-screen bg-[#FAF7F0] px-4 pb-20 pt-40 text-center text-stone-900">

        <h1 className="mb-3 text-2xl font-bold">No coach profile found</h1>

        <p className="mx-auto mb-6 max-w-md text-sm text-stone-500">

          This account is not linked to a coach profile. Log in with your

          coach account to see your bookings.

        </p>

        <Link

          href="/"

          className="inline-block rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-yellow-300"

        >

          Back to home

        </Link>

      </main>

    );

  }



  return (

    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-stone-900">

      <style>{pageStyles}</style>



      {/* ========================================

          HEADER

      ======================================== */}



      <header className="relative isolate bg-neutral-950 px-4 pb-20 pt-24 text-white sm:px-6 lg:px-8">


        {/* Profile menu - fixed at the top-right of the header */}
        <div ref={profileRef} className="absolute right-4 top-5 z-30 sm:right-6 lg:right-8">
          <button
            type="button"
            onClick={() => setProfileOpen((previous) => !previous)}
            aria-label="Open profile menu"
            aria-expanded={profileOpen}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-yellow-400/60 bg-white/10 text-yellow-400 shadow-lg backdrop-blur-md transition hover:bg-yellow-400 hover:text-black"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a8.25 8.25 0 0 1 15 0" />
            </svg>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-xl border border-white/10 bg-neutral-950/95 shadow-2xl backdrop-blur-xl">
              <div className="border-b border-white/10 px-4 py-3">
                <p className="truncate text-sm font-bold text-white">{coach?.full_name || "Coach"}</p>
                <p className="mt-0.5 text-xs text-white/50">Coach account</p>
              </div>

              <Link
                href="/profile"
                onClick={() => setProfileOpen(false)}
                className="block px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-yellow-400"
              >
                Update profile
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="block w-full border-t border-white/10 px-4 py-3 text-left text-sm font-medium text-red-300 transition hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
            </div>
          )}
        </div>


        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="glow absolute -right-24 -top-24 h-96 w-96 rounded-full bg-yellow-400 blur-[130px]" />
        </div>



        <div className="relative mx-auto max-w-7xl">

          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">

            <div className="flex items-center gap-5">


              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-yellow-400 bg-neutral-800 sm:h-20 sm:w-20">

                {coach?.image_url ? (

                  <Image

                    src={coach.image_url}

                    alt={coach.full_name ?? "Coach"}

                    fill

                    sizes="80px"

                    className="object-cover"

                  />

                ) : (

                  <span className="flex h-full w-full items-center justify-center text-2xl font-black text-yellow-400">

                    {getInitial(coach?.full_name)}

                  </span>

                )}

              </div>



              <div>

                <h1 className="text-2xl font-black tracking-tight sm:text-4xl">

                  {loading ? (

                    "Welcome back"

                  ) : (

                    <>

                      Welcome back,{" "}

                      <span className="text-yellow-400">{firstName}</span>

                    </>

                  )}

                </h1>



                <p className="mt-2 text-sm text-white/60 sm:text-base">

                  Manage your booking requests and your upcoming sessions.

                </p>

              </div>

            </div>



            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[560px]">

              {[

                { label: "Pending requests", value: stats.requests, icon: "inbox" as IconName },

                { label: "Sessions today", value: stats.today, icon: "sun" as IconName },

                { label: "Next 7 days", value: stats.week, icon: "calendar" as IconName },

                { label: "Earned this month", value: money(stats.monthEarnings), icon: "money" as IconName },

              ].map((stat) => (

                <div

                  key={stat.label}

                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"

                >

                  <dd className="truncate text-xl font-black text-yellow-400 sm:text-2xl">

                    {loading ? "…" : stat.value}

                  </dd>

                  <dt className="mt-0.5 text-xs text-white/60">{stat.label}</dt>

                </div>

              ))}

            </dl>

          </div>

        </div>

      </header>



      <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ========================================

            FEEDBACK

        ======================================== */}



        {(error || message) && (

          <div className="mb-5 space-y-3">

            {error && (

              <div

                role="alert"

                className="slide-down flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm"

              >

                <span>{error}</span>

                <button

                  type="button"

                  onClick={() => setError("")}

                  aria-label="Dismiss error"

                  className="shrink-0 text-red-400 transition hover:text-red-700"

                >

                  <Icon name="close" />

                </button>

              </div>

            )}



            {message && (

              <div

                role="status"

                className="slide-down flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm"

              >

                <Icon name="check" />

                {message}

              </div>

            )}

          </div>

        )}



        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">

          {/* ========================================

              MAIN COLUMN

          ======================================== */}

          <section className="min-w-0">

            {/* tabs + search */}

            <div className="mb-5 rounded-2xl border border-stone-200 bg-white p-3 shadow-lg shadow-stone-900/5">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div

                  className="flex flex-wrap gap-2"

                  role="tablist"

                  aria-label="Bookings"

                >

                  {tabs.map((item) => {

                    const active = tab === item.key;

                    return (

                      <button

                        key={item.key}

                        type="button"

                        role="tab"

                        aria-selected={active}

                        onClick={() => setTab(item.key)}

                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${

                          active

                            ? "bg-neutral-950 text-white shadow-sm"

                            : "bg-stone-100 text-stone-600 hover:bg-stone-200"

                        }`}

                      >

                        <Icon name={item.icon} />

                        {item.label}

                        <span

                          className={`rounded-md px-1.5 py-0.5 text-xs ${

                            active

                              ? "bg-yellow-400 text-black"

                              : item.key === "requests" && item.count > 0

                                ? "bg-amber-400 text-black"

                                : "bg-white text-stone-500"

                          }`}

                        >

                          {item.count}

                        </span>

                      </button>

                    );

                  })}

                </div>



                <div className="flex gap-2">

                  <input

                    type="search"

                    value={search}

                    onChange={(e) => setSearch(e.target.value)}

                    placeholder="Search an athlete"

                    aria-label="Search an athlete"

                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-2 focus:ring-yellow-200 sm:w-52"

                  />



                  <button

                    type="button"

                    onClick={() => void loadData()}

                    disabled={loading}

                    aria-label="Refresh"

                    className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-600 transition hover:border-yellow-400 hover:text-stone-900 disabled:opacity-50"

                  >

                    <Icon

                      name="refresh"

                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}

                    />

                  </button>

                </div>

              </div>

            </div>



            {/* list */}

            {loading ? (

              <div className="space-y-4">

                {[1, 2, 3].map((item) => (

                  <div

                    key={item}

                    className="rounded-2xl border border-stone-200 bg-white p-5"

                  >

                    <div className="flex items-center gap-3">

                      <div className="h-12 w-12 animate-pulse rounded-full bg-stone-200" />

                      <div className="space-y-2">

                        <div className="h-3 w-36 animate-pulse rounded bg-stone-200" />

                        <div className="h-2.5 w-24 animate-pulse rounded bg-stone-100" />

                      </div>

                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">

                      <div className="h-8 animate-pulse rounded bg-stone-100" />

                      <div className="h-8 animate-pulse rounded bg-stone-100" />

                    </div>

                  </div>

                ))}

              </div>

            ) : visible.length === 0 ? (

              <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">

                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">

                  <Icon name="inbox" className="h-7 w-7" />

                </span>



                <h3 className="text-lg font-bold">

                  {search ? "No athlete matches your search" : emptyCopy[tab].title}

                </h3>



                <p className="mx-auto mt-2 max-w-sm text-sm text-stone-500">

                  {search ? "Try another name." : emptyCopy[tab].text}

                </p>

              </div>

            ) : groupedVisible ? (

              <div className="space-y-8">

                {groupedVisible.map(([date, entries]) => (

                  <div key={date}>

                    <h3 className="mb-3 flex items-center gap-3 text-sm font-bold text-stone-700">

                      {dayHeading(date, now)}

                      <span className="h-px flex-1 bg-stone-200" />

                      <span className="text-xs font-medium text-stone-400">

                        {entries.length}{" "}

                        {entries.length === 1 ? "session" : "sessions"}

                      </span>

                    </h3>



                    <div className="space-y-4">

                      {entries.map(({ booking, status }, index) => (

                        <BookingCard

                          key={booking.id}

                          booking={booking}

                          status={status}

                          index={index}

                          clientName={clientName(booking.user_id)}

                          clubName={nameOf(clubs, booking.club_id)}

                          sportName={nameOf(sports, booking.sport_id)}

                          busy={actionId === booking.id}

                          onAccept={() => acceptBooking(booking)}

                          onRefuse={() =>

                            setPendingAction({ booking, kind: "refuse" })

                          }

                          onCancel={() =>

                            setPendingAction({ booking, kind: "cancel" })

                          }

                        />

                      ))}

                    </div>

                  </div>

                ))}

              </div>

            ) : (

              <div className="space-y-4">

                {visible.map(({ booking, status }, index) => (

                  <BookingCard

                    key={booking.id}

                    booking={booking}

                    status={status}

                    index={index}

                    clientName={clientName(booking.user_id)}

                    clubName={nameOf(clubs, booking.club_id)}

                    sportName={nameOf(sports, booking.sport_id)}

                    busy={actionId === booking.id}

                    onAccept={() => acceptBooking(booking)}

                    onRefuse={() =>

                      setPendingAction({ booking, kind: "refuse" })

                    }

                    onCancel={() =>

                      setPendingAction({ booking, kind: "cancel" })

                    }

                  />

                ))}

              </div>

            )}

          </section>



          {/* ========================================

              SIDEBAR

          ======================================== */}

          <aside className="space-y-5 lg:sticky lg:top-28">

            {/* next session */}

            <section className="rounded-2xl bg-neutral-950 p-5 text-white">

              <h2 className="mb-4 text-sm font-bold text-white/80">

                Next session

              </h2>



              {loading ? (

                <div className="space-y-3">

                  <div className="h-5 w-40 animate-pulse rounded bg-white/10" />

                  <div className="h-4 w-28 animate-pulse rounded bg-white/10" />

                </div>

              ) : nextSession ? (

                <div className="space-y-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-400 font-black text-black">

                      {getInitial(clientName(nextSession.booking.user_id))}

                    </div>



                    <div className="min-w-0">

                      <p className="truncate font-bold">

                        {clientName(nextSession.booking.user_id)}

                      </p>

                      <p className="text-xs text-white/55">

                        {nameOf(sports, nextSession.booking.sport_id) ??

                          "Training session"}

                      </p>

                    </div>

                  </div>



                  <div className="space-y-2 text-sm">

                    <p className="flex items-center gap-2 text-white/80">

                      <Icon name="calendar" className="h-4 w-4 text-yellow-400" />

                      {dayHeading(nextSession.booking.booking_date, now)}

                    </p>

                    <p className="flex items-center gap-2 text-white/80">

                      <Icon name="clock" className="h-4 w-4 text-yellow-400" />

                      {timeRange(nextSession.booking)}

                    </p>

                    {nameOf(clubs, nextSession.booking.club_id) && (

                      <p className="flex items-center gap-2 text-white/80">

                        <Icon name="pin" className="h-4 w-4 text-yellow-400" />

                        {nameOf(clubs, nextSession.booking.club_id)}

                      </p>

                    )}

                  </div>

                </div>

              ) : (

                <p className="text-sm text-white/55">

                  No accepted session coming up.

                </p>

              )}

            </section>



            {/* coach profile */}

            {coach && (

              <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-lg shadow-stone-900/5">

                <h2 className="mb-4 text-sm font-bold text-stone-700">

                  Your coach profile

                </h2>



                <dl className="space-y-3 text-sm">

                  <div className="flex justify-between gap-4">

                    <dt className="text-stone-500">Name</dt>

                    <dd className="text-right font-semibold">

                      {coach.full_name || "Coach"}

                    </dd>

                  </div>



                  {coach.title && (

                    <div className="flex justify-between gap-4">

                      <dt className="text-stone-500">Title</dt>

                      <dd className="text-right font-semibold">{coach.title}</dd>

                    </div>

                  )}



                  {nameOf(sports, coach.sport_id) && (

                    <div className="flex justify-between gap-4">

                      <dt className="text-stone-500">Sport</dt>

                      <dd className="text-right font-semibold">

                        {nameOf(sports, coach.sport_id)}

                      </dd>

                    </div>

                  )}



                  <div className="flex justify-between gap-4">

                    <dt className="text-stone-500">Session price</dt>

                    <dd className="text-right font-semibold text-yellow-700">

                      {money(coach.hourly_rate)}

                    </dd>

                  </div>

                </dl>



                {coach.bio && (

                  <p className="mt-4 border-t border-stone-100 pt-4 text-sm leading-6 text-stone-500">

                    {coach.bio}

                  </p>

                )}

              </section>

            )}

          </aside>

        </div>

      </div>



      {/* ========================================

          CONFIRMATION DIALOG

      ======================================== */}



      {pendingAction && (

        <div

          className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"

          onClick={() => setPendingAction(null)}

        >

          <div

            role="alertdialog"

            aria-modal="true"

            aria-labelledby="confirm-title"

            className="modal-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"

            onClick={(e) => e.stopPropagation()}

          >

            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">

              <Icon name="close" className="h-6 w-6" />

            </span>



            <h2 id="confirm-title" className="text-lg font-extrabold">

              {pendingAction.kind === "refuse"

                ? "Refuse this request?"

                : "Cancel this session?"}

            </h2>



            <p className="mt-2 text-sm leading-6 text-stone-500">

              {clientName(pendingAction.booking.user_id)} booked{" "}

              {formatDay(pendingAction.booking.booking_date)} at{" "}

              {pendingAction.booking.start_time.slice(0, 5)}.{" "}

              {pendingAction.kind === "refuse"

                ? "They will see that you refused."

                : "They will see that the session was cancelled."}

            </p>



            <div className="mt-6 flex gap-3">

              <button

                type="button"

                onClick={() => setPendingAction(null)}

                className="flex-1 rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50"

              >

                Go back

              </button>



              <button

                type="button"

                onClick={confirmPendingAction}

                disabled={actionId === pendingAction.booking.id}

                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"

              >

                {pendingAction.kind === "refuse" ? "Refuse" : "Cancel session"}

              </button>

            </div>

          </div>

        </div>

      )}

    </main>

  );

}
