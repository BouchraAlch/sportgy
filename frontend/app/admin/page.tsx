"use client";

/**
 * Admin dashboard
 *
 * Suggested route: app/admin/page.tsx
 *
 * Assumptions (change the constants and isAdmin() below if your database differs):
 *  - A user is an admin when their row in `profiles` has `role = "admin"`
 *    or `is_admin = true`.
 *  - Row Level Security lets admins read every table and delete rows
 *    from clubs, coaches, sports, community_posts, community_comments
 *    and competitions.
 *
 * IMPORTANT: the check in this page only hides the screen. It is not
 * security. Real protection must come from your Row Level Security
 * policies, so a non-admin can never read or delete these rows even if
 * they call the API directly.
 *
 * Not included: the marketplace (its table was not shared yet).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";

// ============================================
// CONFIG
// ============================================

const LOGIN_ROUTE = "/login";

function isAdmin(profile: Profile | null) {
  return !!profile && (profile.role === "admin" || profile.is_admin === true);
}

// ============================================
// TYPES
// ============================================

type Profile = {
  id: string;
  full_name: string | null;
  role?: string | null;
  is_admin?: boolean | null;
  email?: string | null;
  created_at?: string | null;
};

type Sport = { id: string; name: string; images?: string[] | string | null };

type Club = {
  id: string;
  name: string;
  city: string | null;
  sport_id: string | null;
  image_url?: string[] | string | null;
};

type Coach = {
  id: string;
  full_name: string | null;
  sport_id: string | null;
  title: string | null;
  hourly_rate: number | null;
  image_url: string | null;
};

type ClubCoach = { club_id: string; coach_id: string };

type Booking = {
  id: string;
  user_id: string;
  coach_id: string;
  club_id: string | null;
  booking_date: string;
  start_time: string;
  total_price: number | null;
  status: string | null;
};

type Post = {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
};

type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type Competition = {
  id: string;
  title: string;
  sport_id: string;
  organizer_club_id: string;
  start_date: string;
  end_date: string;
};

type Tab =
  | "overview"
  | "users"
  | "clubs"
  | "coaches"
  | "sports"
  | "community"
  | "competitions";

type DeletableTable =
  | "clubs"
  | "coaches"
  | "sports"
  | "community_posts"
  | "community_comments"
  | "competitions";

type DeleteTarget = {
  table: DeletableTable;
  id: string;
  label: string;
  kind: string;
};

// ============================================
// PURE HELPERS
// ============================================

function getInitial(name: string | null | undefined) {
  return name?.trim().charAt(0).toUpperCase() || "S";
}

function firstImage(value: string[] | string | null | undefined) {
  if (!value) return null;

  if (Array.isArray(value)) {
    return value.find((v) => typeof v === "string" && v.trim() !== "") ?? null;
  }

  return value.trim() !== "" ? value : null;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function money(value: number | null | undefined) {
  return `${Number(value ?? 0).toLocaleString()} DZD`;
}

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function compStatus(c: Competition) {
  const now = Date.now();
  if (now < new Date(c.start_date).getTime()) return "Coming soon";
  if (now <= new Date(c.end_date).getTime()) return "Live now";
  return "Finished";
}

const COMP_STYLE: Record<string, string> = {
  "Coming soon": "bg-sky-50 text-sky-800 ring-sky-200",
  "Live now": "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Finished: "bg-stone-100 text-stone-600 ring-stone-200",
};

const BOOKING_STYLE: Record<string, string> = {
  accepted: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  refused: "bg-red-50 text-red-700 ring-red-200",
  cancelled: "bg-stone-100 text-stone-600 ring-stone-200",
  completed: "bg-sky-50 text-sky-800 ring-sky-200",
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
};

function bookingKey(status: string | null) {
  const raw = (status ?? "").toLowerCase();
  if (["refused", "rejected", "declined"].includes(raw)) return "refused";
  if (["cancelled", "canceled"].includes(raw)) return "cancelled";
  if (raw === "accepted") return "accepted";
  if (raw === "completed") return "completed";
  return "pending";
}

// ============================================
// SMALL COMPONENTS
// ============================================

type IconName =
  | "users"
  | "building"
  | "whistle"
  | "calendar"
  | "trophy"
  | "chat"
  | "grid"
  | "trash"
  | "edit"
  | "plus"
  | "close"
  | "check"
  | "alert"
  | "refresh"
  | "search"
  | "shield";

function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: IconName;
  className?: string;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    users: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.3A6.5 6.5 0 0 1 21.5 20" />
      </>
    ),
    building: (
      <>
        <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 10h4a1 1 0 0 1 1 1v10M2 21h20" />
        <path d="M8 8h3M8 12h3M8 16h3" />
      </>
    ),
    whistle: (
      <>
        <circle cx="9" cy="14" r="5" />
        <path d="M13 11l8-4v4l-4 2" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
    trophy: (
      <>
        <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
        <path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4" />
        <path d="M12 13v4M8 21h8M10 17h4" />
      </>
    ),
    chat: (
      <path d="M21 12a8.5 8.5 0 0 1-12.4 7.5L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z" />
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M10 11v6M14 11v6" />
        <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
      </>
    ),
    edit: (
      <>
        <path d="M4 20h4L19 9l-4-4L4 16v4z" />
        <path d="M13.5 6.5l4 4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="M6 6l12 12M18 6L6 18" />,
    check: <path d="M4 12.5l5 5L20 6.5" />,
    alert: (
      <>
        <path d="M12 9v4m0 4h.01" />
        <path d="M10.29 3.86l-8.1 14a2 2 0 001.73 3h16.16a2 2 0 001.73-3l-8.1-14a2 2 0 00-3.42 0z" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4" />
        <path d="M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6l8-3z" />
        <path d="M9 12l2 2 4-4" />
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

function Pill({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

const INPUT_CLASS =
  "w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-2 focus:ring-yellow-200";

function Row({
  index,
  image,
  initial,
  title,
  subtitle,
  meta,
  actions,
}: {
  index: number;
  image?: string | null;
  initial: string;
  title: string;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <article
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      className="card-in flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-yellow-300 hover:shadow-md"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="h-12 w-12 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-lg font-black text-stone-800">
            {initial}
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate font-bold text-stone-900">{title}</p>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-stone-500">{subtitle}</p>
          )}
        </div>
      </div>

      {meta && <div className="flex flex-wrap items-center gap-2">{meta}</div>}

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </article>
  );
}

function DeleteButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-lg border border-stone-200 p-2 text-stone-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-500"
    >
      <Icon name="trash" className="h-[18px] w-[18px]" />
    </button>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
        <Icon name="grid" className="h-7 w-7" />
      </span>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-stone-500">{text}</p>
    </div>
  );
}

// ============================================
// PAGE
// ============================================

export default function AdminDashboardPage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [me, setMe] = useState<Profile | null>(null);
  const [loggedIn, setLoggedIn] = useState(true);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [clubCoaches, setClubCoaches] = useState<ClubCoach[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [likes, setLikes] = useState<{ post_id: string }[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [participants, setParticipants] = useState<{ competition_id: string }[]>(
    []
  );

  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  // sport form (null = closed, "" = new, id = editing)
  const [sportFormId, setSportFormId] = useState<string | null>(null);
  const [sportName, setSportName] = useState("");
  const [sportImage, setSportImage] = useState("");
  const [savingSport, setSavingSport] = useState(false);

  // ============================================
  // LOAD
  // ============================================

  const loadAll = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError("");

      try {
        const responses = await Promise.all([
          supabase.from("profiles").select("*"),
          supabase.from("sports").select("*").order("name", { ascending: true }),
          supabase.from("clubs").select("*"),
          supabase.from("coaches").select("*"),
          supabase.from("club_coaches").select("club_id, coach_id"),
          supabase
            .from("bookings")
            .select("*")
            .order("booking_date", { ascending: false }),
          supabase
            .from("community_posts")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("community_comments")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase.from("community_likes").select("post_id"),
          supabase
            .from("competitions")
            .select("*")
            .order("start_date", { ascending: false }),
          supabase.from("competition_participants").select("competition_id"),
        ]);

        const failed = responses.find((r) => r.error);
        if (failed?.error) throw failed.error;

        setProfiles((responses[0].data ?? []) as Profile[]);
        setSports((responses[1].data ?? []) as Sport[]);
        setClubs((responses[2].data ?? []) as Club[]);
        setCoaches((responses[3].data ?? []) as Coach[]);
        setClubCoaches((responses[4].data ?? []) as ClubCoach[]);
        setBookings((responses[5].data ?? []) as Booking[]);
        setPosts((responses[6].data ?? []) as Post[]);
        setComments((responses[7].data ?? []) as PostComment[]);
        setLikes((responses[8].data ?? []) as { post_id: string }[]);
        setCompetitions((responses[9].data ?? []) as Competition[]);
        setParticipants(
          (responses[10].data ?? []) as { competition_id: string }[]
        );
      } catch (err) {
        console.error("Admin loading error:", err);
        setError(
          err instanceof Error ? err.message : "Could not load the dashboard."
        );
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // Check who is logged in, then load everything for admins.
  useEffect(() => {
    async function init() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;

        if (!user) {
          setLoggedIn(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        setMe(profile as Profile | null);

        if (isAdmin(profile as Profile | null)) {
          await loadAll();
        }
      } finally {
        setChecking(false);
      }
    }

    void init();
  }, [supabase, loadAll]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  // Reset the search when changing tab.
  useEffect(() => setSearch(""), [tab]);

  // Dialogs: close with Escape and lock page scroll.
  const dialogOpen = !!deleteTarget || sportFormId !== null;

  useEffect(() => {
    if (!dialogOpen) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDeleteTarget(null);
        setSportFormId(null);
      }
    }

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [dialogOpen]);

  // ============================================
  // ACTIONS
  // ============================================

  async function confirmDelete() {
    if (!deleteTarget) return;

    setError("");
    setMessage("");
    setDeleting(true);

    const { error: deleteError } = await supabase
      .from(deleteTarget.table)
      .delete()
      .eq("id", deleteTarget.id);

    setDeleting(false);

    if (deleteError) {
      setDeleteTarget(null);
      setError(
        `${deleteError.message} (other data may still depend on this ${deleteTarget.kind}).`
      );
      return;
    }

    setDeleteTarget(null);
    setMessage(`The ${deleteTarget.kind} was deleted.`);
    await loadAll(true);
  }

  function openSportForm(sport: Sport | null) {
    setSportFormId(sport ? sport.id : "");
    setSportName(sport?.name ?? "");
    setSportImage(firstImage(sport?.images) ?? "");
  }

  async function saveSport() {
    const name = sportName.trim();

    if (!name) {
      setError("Give the sport a name.");
      return;
    }

    setError("");
    setSavingSport(true);

    const url = sportImage.trim();
    const editing = sportFormId !== "" && sportFormId !== null;

    // `images` is stored as a list in most setups. If your column is plain
    // text, the second attempt stores the link as text instead.
    async function write(images: string[] | string | null) {
      const payload: Record<string, unknown> = { name };
      if (images !== null) payload.images = images;

      return editing
        ? supabase.from("sports").update(payload).eq("id", sportFormId as string)
        : supabase.from("sports").insert(payload);
    }

    let result = await write(url ? [url] : null);

    if (result.error && url) {
      result = await write(url);
    }

    setSavingSport(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setSportFormId(null);
    setMessage(editing ? "Sport updated." : "Sport added.");
    await loadAll(true);
  }

  // ============================================
  // DERIVED DATA
  // ============================================

  const profileName = useCallback(
    (id: string) =>
      profiles.find((p) => p.id === id)?.full_name || "SportGy member",
    [profiles]
  );

  function sportLabel(id: string | null) {
    return id ? (sports.find((s) => s.id === id)?.name ?? "") : "";
  }

  function clubLabel(id: string | null) {
    return id ? (clubs.find((c) => c.id === id)?.name ?? "") : "";
  }

  const matches = (...values: (string | null | undefined)[]) =>
    values.join(" ").toLowerCase().includes(search.trim().toLowerCase());

  const clubStats = useMemo(() => {
    const map = new Map<string, { coaches: number; bookings: number }>();

    clubs.forEach((club) => map.set(club.id, { coaches: 0, bookings: 0 }));
    clubCoaches.forEach((row) => {
      const entry = map.get(row.club_id);
      if (entry) entry.coaches += 1;
    });
    bookings.forEach((b) => {
      const entry = b.club_id ? map.get(b.club_id) : undefined;
      if (entry) entry.bookings += 1;
    });

    return map;
  }, [clubs, clubCoaches, bookings]);

  const coachClubCount = useMemo(() => {
    const map = new Map<string, number>();
    clubCoaches.forEach((row) =>
      map.set(row.coach_id, (map.get(row.coach_id) ?? 0) + 1)
    );
    return map;
  }, [clubCoaches]);

  const sportClubCount = useMemo(() => {
    const map = new Map<string, number>();
    clubs.forEach((club) => {
      if (club.sport_id) {
        map.set(club.sport_id, (map.get(club.sport_id) ?? 0) + 1);
      }
    });
    return map;
  }, [clubs]);

  const postStats = useMemo(() => {
    const likeMap = new Map<string, number>();
    const commentMap = new Map<string, number>();

    likes.forEach((l) => likeMap.set(l.post_id, (likeMap.get(l.post_id) ?? 0) + 1));
    comments.forEach((c) =>
      commentMap.set(c.post_id, (commentMap.get(c.post_id) ?? 0) + 1)
    );

    return { likeMap, commentMap };
  }, [likes, comments]);

  const participantCount = useMemo(() => {
    const map = new Map<string, number>();
    participants.forEach((p) =>
      map.set(p.competition_id, (map.get(p.competition_id) ?? 0) + 1)
    );
    return map;
  }, [participants]);

  // Bookings per day for the last 7 days.
  const weekChart = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        iso: toIso(d),
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        count: 0,
      };
    });

    bookings.forEach((b) => {
      const day = days.find((d) => d.iso === b.booking_date);
      if (day) day.count += 1;
    });

    return days;
  }, [bookings]);

  const health = useMemo(() => {
    const clubsWithCoach = new Set(clubCoaches.map((r) => r.club_id));
    const coachesWithClub = new Set(clubCoaches.map((r) => r.coach_id));

    return [
      {
        label: "Clubs without any coach",
        count: clubs.filter((c) => !clubsWithCoach.has(c.id)).length,
      },
      {
        label: "Coaches not linked to a club",
        count: coaches.filter((c) => !coachesWithClub.has(c.id)).length,
      },
      {
        label: "Sports without any club",
        count: sports.filter((s) => !sportClubCount.has(s.id)).length,
      },
    ];
  }, [clubs, coaches, sports, clubCoaches, sportClubCount]);

  // ============================================
  // RENDER
  // ============================================

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

    @keyframes barGrow {
      from { transform: scaleY(0); }
      to   { transform: scaleY(1); }
    }
    .bar-grow { transform-origin: bottom; animation: barGrow 700ms cubic-bezier(.22,.61,.36,1) both; }

    @keyframes glow {
      0%, 100% { opacity: .16; transform: scale(1); }
      50%      { opacity: .3;  transform: scale(1.15); }
    }
    .glow { animation: glow 8s ease-in-out infinite; }

    .no-scrollbar { scrollbar-width: none; }
    .no-scrollbar::-webkit-scrollbar { display: none; }

    @media (prefers-reduced-motion: reduce) {
      .card-in, .slide-down, .modal-in, .fade-in, .bar-grow, .glow { animation: none !important; }
    }
  `;

  if (checking) {
    return (
      <main className="min-h-screen bg-[#FAF7F0] px-4 pb-20 pt-40 text-center text-stone-500">
        <style>{pageStyles}</style>
        Checking your access...
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-[#FAF7F0] px-4 pb-20 pt-40 text-center text-stone-900">
        <h1 className="mb-3 text-2xl font-bold">Please log in</h1>
        <p className="mb-6 text-sm text-stone-500">
          Log in with your admin account to continue.
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

  if (!isAdmin(me)) {
    return (
      <main className="min-h-screen bg-[#FAF7F0] px-4 pb-20 pt-40 text-center text-stone-900">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <Icon name="shield" className="h-7 w-7" />
        </span>
        <h1 className="mb-3 text-2xl font-bold">Access denied</h1>
        <p className="mx-auto mb-6 max-w-md text-sm text-stone-500">
          This page is only for SportGy administrators.
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

  const tabs: { key: Tab; label: string; icon: IconName; count?: number }[] = [
    { key: "overview", label: "Overview", icon: "grid" },
    { key: "users", label: "Users", icon: "users", count: profiles.length },
    { key: "clubs", label: "Clubs", icon: "building", count: clubs.length },
    { key: "coaches", label: "Coaches", icon: "whistle", count: coaches.length },
    { key: "sports", label: "Sports", icon: "trophy", count: sports.length },
    { key: "community", label: "Community", icon: "chat", count: posts.length },
    { key: "competitions", label: "Competitions", icon: "calendar", count: competitions.length },
  ];

  const maxBar = Math.max(1, ...weekChart.map((d) => d.count));

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-stone-900">
      <style>{pageStyles}</style>

      {/* ========================================
          HEADER
      ======================================== */}

      <header className="relative overflow-hidden bg-neutral-950 px-4 pb-28 pt-32 text-white sm:px-6 lg:px-8">
        <div className="glow pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-yellow-400 blur-[130px]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Pill className="bg-yellow-400 text-black ring-yellow-400">
                <Icon name="shield" className="h-3.5 w-3.5" />
                Administrator
              </Pill>

              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                Admin <span className="text-yellow-400">dashboard</span>
              </h1>

              <p className="mt-3 max-w-xl text-sm text-white/60 sm:text-base">
                Keep an eye on the platform and moderate its content.
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[560px]">
              {[
                { label: "Users", value: profiles.length },
                { label: "Clubs", value: clubs.length },
                { label: "Coaches", value: coaches.length },
                { label: "Bookings", value: bookings.length },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
                >
                  <dd className="text-2xl font-black text-yellow-400">
                    {loading ? "…" : stat.value}
                  </dd>
                  <dt className="mt-0.5 text-xs text-white/60">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </header>

      <div className="mx-auto -mt-14 max-w-7xl px-4 sm:px-6 lg:px-8">
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

        {/* ========================================
            TABS + SEARCH
        ======================================== */}

        <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-3 shadow-lg shadow-stone-900/5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              className="no-scrollbar flex gap-2 overflow-x-auto"
              role="tablist"
              aria-label="Dashboard sections"
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
                    className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      active
                        ? "bg-neutral-950 text-white shadow-sm"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    <Icon name={item.icon} />
                    {item.label}
                    {item.count !== undefined && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-xs ${
                          active
                            ? "bg-yellow-400 text-black"
                            : "bg-white text-stone-500"
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              {tab !== "overview" && (
                <div className="relative w-full lg:w-60">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                    <Icon name="search" />
                  </span>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search"
                    aria-label="Search"
                    className={`${INPUT_CLASS} pl-10`}
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => void loadAll()}
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

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-2xl border border-stone-200 bg-white"
              />
            ))}
          </div>
        ) : (
          <>
            {/* ========================================
                OVERVIEW
            ======================================== */}
            {tab === "overview" && (
              <div className="grid gap-6 lg:grid-cols-3">
                <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm lg:col-span-2">
                  <div className="mb-6 flex items-end justify-between">
                    <div>
                      <h2 className="font-extrabold">Bookings this week</h2>
                      <p className="mt-1 text-sm text-stone-500">
                        Sessions booked for each of the last 7 days.
                      </p>
                    </div>
                    <p className="text-sm font-bold text-yellow-700">
                      {weekChart.reduce((sum, d) => sum + d.count, 0)} total
                    </p>
                  </div>

                  <div className="flex h-48 items-end gap-3">
                    {weekChart.map((day) => (
                      <div
                        key={day.iso}
                        className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                      >
                        <span className="text-xs font-bold text-stone-700">
                          {day.count}
                        </span>
                        <div
                          className="bar-grow w-full rounded-t-lg bg-yellow-400"
                          style={{
                            height: `${Math.max(4, (day.count / maxBar) * 100)}%`,
                            opacity: day.count === 0 ? 0.35 : 1,
                          }}
                        />
                        <span className="text-xs text-stone-500">{day.label}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl bg-neutral-950 p-6 text-white">
                  <h2 className="mb-4 font-extrabold">Platform health</h2>

                  <ul className="space-y-3">
                    {health.map((item) => (
                      <li
                        key={item.label}
                        className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-4 py-3 text-sm"
                      >
                        <span className="text-white/75">{item.label}</span>
                        <span
                          className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-bold ${
                            item.count > 0
                              ? "bg-amber-400 text-black"
                              : "bg-emerald-400 text-black"
                          }`}
                        >
                          {item.count > 0 ? item.count : <Icon name="check" className="h-3.5 w-3.5" />}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm lg:col-span-3">
                  <h2 className="mb-4 font-extrabold">Latest bookings</h2>

                  {bookings.length === 0 ? (
                    <p className="text-sm text-stone-500">No bookings yet.</p>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {bookings.slice(0, 6).map((booking) => {
                        const key = bookingKey(booking.status);
                        return (
                          <div
                            key={booking.id}
                            className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-bold">
                                {profileName(booking.user_id)}
                              </p>
                              <p className="text-xs text-stone-500">
                                with{" "}
                                {coaches.find((c) => c.id === booking.coach_id)
                                  ?.full_name ?? "Coach"}
                                {clubLabel(booking.club_id)
                                  ? ` at ${clubLabel(booking.club_id)}`
                                  : ""}
                              </p>
                            </div>

                            <span className="text-stone-600">
                              {formatDate(booking.booking_date)} at{" "}
                              {booking.start_time.slice(0, 5)}
                            </span>

                            <span className="font-semibold">
                              {money(booking.total_price)}
                            </span>

                            <Pill className={BOOKING_STYLE[key]}>
                              {key.charAt(0).toUpperCase() + key.slice(1)}
                            </Pill>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ========================================
                USERS
            ======================================== */}
            {tab === "users" && (
              <section className="space-y-3">
                {profiles.filter((p) => matches(p.full_name, p.email, p.role)).length === 0 ? (
                  <EmptyState title="No user found" text="Try another name." />
                ) : (
                  profiles
                    .filter((p) => matches(p.full_name, p.email, p.role))
                    .map((profile, index) => (
                      <Row
                        key={profile.id}
                        index={index}
                        initial={getInitial(profile.full_name)}
                        title={profile.full_name || "SportGy member"}
                        subtitle={
                          profile.email ?? `ID ${profile.id.slice(0, 8)}`
                        }
                        meta={
                          <>
                            {(profile.role === "admin" || profile.is_admin) && (
                              <Pill className="bg-yellow-100 text-yellow-800 ring-yellow-200">
                                Admin
                              </Pill>
                            )}
                            {profile.role && profile.role !== "admin" && (
                              <Pill className="bg-stone-100 text-stone-600 ring-stone-200">
                                {profile.role}
                              </Pill>
                            )}
                            {profile.created_at && (
                              <span className="text-xs text-stone-400">
                                Joined {formatDate(profile.created_at)}
                              </span>
                            )}
                          </>
                        }
                      />
                    ))
                )}
              </section>
            )}

            {/* ========================================
                CLUBS
            ======================================== */}
            {tab === "clubs" && (
              <section className="space-y-3">
                {clubs.filter((c) => matches(c.name, c.city, sportLabel(c.sport_id))).length === 0 ? (
                  <EmptyState title="No club found" text="Clubs created by owners appear here." />
                ) : (
                  clubs
                    .filter((c) => matches(c.name, c.city, sportLabel(c.sport_id)))
                    .map((club, index) => {
                      const stats = clubStats.get(club.id) ?? { coaches: 0, bookings: 0 };
                      return (
                        <Row
                          key={club.id}
                          index={index}
                          image={firstImage(club.image_url)}
                          initial={getInitial(club.name)}
                          title={club.name}
                          subtitle={[club.city, sportLabel(club.sport_id)].filter(Boolean).join(" | ")}
                          meta={
                            <>
                              <Pill className="bg-stone-100 text-stone-700 ring-stone-200">
                                {stats.coaches} {stats.coaches === 1 ? "coach" : "coaches"}
                              </Pill>
                              <Pill className="bg-stone-100 text-stone-700 ring-stone-200">
                                {stats.bookings} {stats.bookings === 1 ? "booking" : "bookings"}
                              </Pill>
                            </>
                          }
                          actions={
                            <DeleteButton
                              label={`Delete ${club.name}`}
                              onClick={() =>
                                setDeleteTarget({ table: "clubs", id: club.id, label: club.name, kind: "club" })
                              }
                            />
                          }
                        />
                      );
                    })
                )}
              </section>
            )}

            {/* ========================================
                COACHES
            ======================================== */}
            {tab === "coaches" && (
              <section className="space-y-3">
                {coaches.filter((c) => matches(c.full_name, c.title, sportLabel(c.sport_id))).length === 0 ? (
                  <EmptyState title="No coach found" text="Coaches appear here once they sign up." />
                ) : (
                  coaches
                    .filter((c) => matches(c.full_name, c.title, sportLabel(c.sport_id)))
                    .map((coach, index) => {
                      const linked = coachClubCount.get(coach.id) ?? 0;
                      return (
                        <Row
                          key={coach.id}
                          index={index}
                          image={coach.image_url}
                          initial={getInitial(coach.full_name)}
                          title={coach.full_name || "Unnamed coach"}
                          subtitle={[coach.title, sportLabel(coach.sport_id)].filter(Boolean).join(" | ")}
                          meta={
                            <>
                              <Pill className="bg-yellow-50 text-yellow-800 ring-yellow-200">
                                {money(coach.hourly_rate)}
                              </Pill>
                              <Pill
                                className={
                                  linked > 0
                                    ? "bg-stone-100 text-stone-700 ring-stone-200"
                                    : "bg-amber-50 text-amber-800 ring-amber-200"
                                }
                              >
                                {linked > 0
                                  ? `${linked} ${linked === 1 ? "club" : "clubs"}`
                                  : "No club"}
                              </Pill>
                            </>
                          }
                          actions={
                            <DeleteButton
                              label={`Delete ${coach.full_name}`}
                              onClick={() =>
                                setDeleteTarget({
                                  table: "coaches",
                                  id: coach.id,
                                  label: coach.full_name || "this coach",
                                  kind: "coach",
                                })
                              }
                            />
                          }
                        />
                      );
                    })
                )}
              </section>
            )}

            {/* ========================================
                SPORTS
            ======================================== */}
            {tab === "sports" && (
              <section>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <p className="text-sm text-stone-500">
                    The sports athletes can choose when booking.
                  </p>

                  <button
                    type="button"
                    onClick={() => openSportForm(null)}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black shadow-md transition hover:-translate-y-0.5 hover:bg-yellow-300"
                  >
                    <Icon name="plus" />
                    Add a sport
                  </button>
                </div>

                <div className="space-y-3">
                  {sports.filter((s) => matches(s.name)).length === 0 ? (
                    <EmptyState title="No sport found" text="Add the first sport with the button above." />
                  ) : (
                    sports
                      .filter((s) => matches(s.name))
                      .map((sport, index) => {
                        const count = sportClubCount.get(sport.id) ?? 0;
                        return (
                          <Row
                            key={sport.id}
                            index={index}
                            image={firstImage(sport.images)}
                            initial={getInitial(sport.name)}
                            title={sport.name}
                            meta={
                              <Pill
                                className={
                                  count > 0
                                    ? "bg-stone-100 text-stone-700 ring-stone-200"
                                    : "bg-amber-50 text-amber-800 ring-amber-200"
                                }
                              >
                                {count} {count === 1 ? "club" : "clubs"}
                              </Pill>
                            }
                            actions={
                              <>
                                <button
                                  type="button"
                                  onClick={() => openSportForm(sport)}
                                  aria-label={`Edit ${sport.name}`}
                                  className="rounded-lg border border-stone-200 p-2 text-stone-400 transition hover:border-yellow-400 hover:text-stone-800"
                                >
                                  <Icon name="edit" className="h-[18px] w-[18px]" />
                                </button>
                                <DeleteButton
                                  label={`Delete ${sport.name}`}
                                  onClick={() =>
                                    setDeleteTarget({ table: "sports", id: sport.id, label: sport.name, kind: "sport" })
                                  }
                                />
                              </>
                            }
                          />
                        );
                      })
                  )}
                </div>
              </section>
            )}

            {/* ========================================
                COMMUNITY MODERATION
            ======================================== */}
            {tab === "community" && (
              <section className="space-y-8">
                <div>
                  <h2 className="mb-3 font-extrabold">Posts</h2>
                  <div className="space-y-3">
                    {posts.filter((p) => matches(p.content, profileName(p.user_id))).length === 0 ? (
                      <EmptyState title="No post found" text="Community posts appear here." />
                    ) : (
                      posts
                        .filter((p) => matches(p.content, profileName(p.user_id)))
                        .slice(0, 50)
                        .map((post, index) => (
                          <Row
                            key={post.id}
                            index={index}
                            image={post.image_url}
                            initial={getInitial(profileName(post.user_id))}
                            title={profileName(post.user_id)}
                            subtitle={post.content || "Photo post"}
                            meta={
                              <>
                                <Pill className="bg-stone-100 text-stone-700 ring-stone-200">
                                  {postStats.likeMap.get(post.id) ?? 0} likes
                                </Pill>
                                <Pill className="bg-stone-100 text-stone-700 ring-stone-200">
                                  {postStats.commentMap.get(post.id) ?? 0} comments
                                </Pill>
                                <span className="text-xs text-stone-400">
                                  {formatDate(post.created_at)}
                                </span>
                              </>
                            }
                            actions={
                              <DeleteButton
                                label="Delete post"
                                onClick={() =>
                                  setDeleteTarget({
                                    table: "community_posts",
                                    id: post.id,
                                    label: `the post by ${profileName(post.user_id)}`,
                                    kind: "post",
                                  })
                                }
                              />
                            }
                          />
                        ))
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="mb-3 font-extrabold">Latest comments</h2>
                  <div className="space-y-3">
                    {comments.filter((c) => matches(c.content, profileName(c.user_id))).length === 0 ? (
                      <EmptyState title="No comment found" text="Comments appear here." />
                    ) : (
                      comments
                        .filter((c) => matches(c.content, profileName(c.user_id)))
                        .slice(0, 50)
                        .map((comment, index) => (
                          <Row
                            key={comment.id}
                            index={index}
                            initial={getInitial(profileName(comment.user_id))}
                            title={profileName(comment.user_id)}
                            subtitle={comment.content}
                            meta={
                              <span className="text-xs text-stone-400">
                                {formatDate(comment.created_at)}
                              </span>
                            }
                            actions={
                              <DeleteButton
                                label="Delete comment"
                                onClick={() =>
                                  setDeleteTarget({
                                    table: "community_comments",
                                    id: comment.id,
                                    label: `the comment by ${profileName(comment.user_id)}`,
                                    kind: "comment",
                                  })
                                }
                              />
                            }
                          />
                        ))
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ========================================
                COMPETITIONS
            ======================================== */}
            {tab === "competitions" && (
              <section className="space-y-3">
                {competitions.filter((c) => matches(c.title, clubLabel(c.organizer_club_id), sportLabel(c.sport_id))).length === 0 ? (
                  <EmptyState title="No competition found" text="Competitions created by clubs appear here." />
                ) : (
                  competitions
                    .filter((c) => matches(c.title, clubLabel(c.organizer_club_id), sportLabel(c.sport_id)))
                    .map((competition, index) => {
                      const status = compStatus(competition);
                      return (
                        <Row
                          key={competition.id}
                          index={index}
                          initial={getInitial(competition.title)}
                          title={competition.title}
                          subtitle={[
                            clubLabel(competition.organizer_club_id),
                            sportLabel(competition.sport_id),
                            `${formatDate(competition.start_date)} to ${formatDate(competition.end_date)}`,
                          ]
                            .filter(Boolean)
                            .join(" | ")}
                          meta={
                            <>
                              <Pill className={COMP_STYLE[status]}>{status}</Pill>
                              <Pill className="bg-stone-100 text-stone-700 ring-stone-200">
                                {participantCount.get(competition.id) ?? 0} applications
                              </Pill>
                            </>
                          }
                          actions={
                            <DeleteButton
                              label={`Delete ${competition.title}`}
                              onClick={() =>
                                setDeleteTarget({
                                  table: "competitions",
                                  id: competition.id,
                                  label: competition.title,
                                  kind: "competition",
                                })
                              }
                            />
                          }
                        />
                      );
                    })
                )}
              </section>
            )}
          </>
        )}
      </div>

      {/* ========================================
          SPORT FORM
      ======================================== */}

      {sportFormId !== null && (
        <div
          className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onClick={() => !savingSport && setSportFormId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sport-form-title"
            className="modal-in w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="sport-form-title" className="text-lg font-extrabold">
              {sportFormId === "" ? "Add a sport" : "Edit sport"}
            </h2>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-stone-700">
                  Name
                </span>
                <input
                  value={sportName}
                  onChange={(e) => setSportName(e.target.value)}
                  placeholder="Tennis"
                  className={INPUT_CLASS}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-stone-700">
                  Image link
                </span>
                <input
                  type="url"
                  value={sportImage}
                  onChange={(e) => setSportImage(e.target.value)}
                  placeholder="https://..."
                  className={INPUT_CLASS}
                />
                <span className="mt-1 block text-xs text-stone-400">
                  Optional. Shown on the homepage and the booking pages.
                </span>
              </label>

              {sportImage.trim() && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sportImage}
                  alt="Preview"
                  className="h-32 w-full rounded-xl object-cover"
                />
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setSportFormId(null)}
                disabled={savingSport}
                className="flex-1 rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void saveSport()}
                disabled={savingSport}
                className="flex-1 rounded-xl bg-yellow-400 px-4 py-3 text-sm font-bold text-black transition hover:bg-yellow-300 disabled:opacity-50"
              >
                {savingSport ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          DELETE CONFIRMATION
      ======================================== */}

      {deleteTarget && (
        <div
          className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="modal-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Icon name="alert" className="h-6 w-6" />
            </span>

            <h2 id="delete-title" className="text-lg font-extrabold">
              Delete this {deleteTarget.kind}?
            </h2>

            <p className="mt-2 text-sm leading-6 text-stone-500">
              {deleteTarget.label} will be removed from the platform. This
              can&apos;t be undone.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
              >
                Keep it
              </button>

              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
