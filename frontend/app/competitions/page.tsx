"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";

// ============================================
// TYPES
// ============================================

type Profile = {
  id: string;
  full_name: string | null;
};

type Sport = {
  id: string;
  name: string;
};

type Club = {
  id: string;
  name: string;
  city: string | null;
};

type Competition = {
  id: string;
  title: string;
  description: string | null;
  sport_id: string;
  organizer_club_id: string;
  location: string | null;
  start_date: string;
  end_date: string;
  registration_deadline: string | null;
  max_participants: number | null;
  cover_image: string | null;
  created_at: string;
};

type Participant = {
  id: string;
  competition_id: string;
  user_id: string;
  registration_status: string;
  registered_at: string;
};

type CompetitionResult = {
  id: string;
  competition_id: string;
  participant_id: string;
  position: number;
  score: number | null;
  result_details: string | null;
};

type CompetitionStatus = "coming_soon" | "ongoing" | "finished";

type FilterType = "all" | CompetitionStatus;

type SortType = "soonest" | "newest" | "popular";

// ============================================
// PURE HELPERS
// ============================================

const DAY_MS = 86_400_000;

function getStatus(competition: Competition): CompetitionStatus {
  const now = Date.now();
  const start = new Date(competition.start_date).getTime();
  const end = new Date(competition.end_date).getTime();

  if (now < start) return "coming_soon";
  if (now <= end) return "ongoing";

  return "finished";
}

function getInitial(name: string | null | undefined) {
  return name?.trim().charAt(0).toUpperCase() || "S";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function daysFromNow(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / DAY_MS);
}

function timingLabel(competition: Competition, status: CompetitionStatus) {
  if (status === "coming_soon") {
    const days = daysFromNow(competition.start_date);
    if (days <= 0) return "Starts today";
    if (days === 1) return "Starts tomorrow";
    return `Starts in ${days} days`;
  }

  if (status === "ongoing") {
    const days = daysFromNow(competition.end_date);
    if (days <= 0) return "Ends today";
    if (days === 1) return "Ends tomorrow";
    return `Ends in ${days} days`;
  }

  return `Ended ${formatDate(competition.end_date)}`;
}

// ============================================
// ICONS
// ============================================

type IconName =
  | "calendar"
  | "pin"
  | "building"
  | "clock"
  | "search"
  | "close"
  | "check"
  | "refresh"
  | "users"
  | "trophy";

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
    pin: (
      <>
        <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </>
    ),
    building: (
      <>
        <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 10h4a1 1 0 0 1 1 1v10M2 21h20" />
        <path d="M8 8h3M8 12h3M8 16h3" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </>
    ),
    close: <path d="M6 6l12 12M18 6L6 18" />,
    check: <path d="M4 12.5l5 5L20 6.5" />,
    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4" />
        <path d="M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.3A6.5 6.5 0 0 1 21.5 20" />
      </>
    ),
    trophy: (
      <>
        <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
        <path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4" />
        <path d="M12 13v4M8 21h8M10 17h4" />
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

function SportGlyph({ name }: { name: string | undefined }) {
  const key = name?.toLowerCase() ?? "";

  if (key.includes("tennis")) {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
        <circle cx="50" cy="50" r="44" fill="#d4ee3a" />
        <g stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round">
          <path d="M14 26C38 38 38 62 14 74" />
          <path d="M86 26C62 38 62 62 86 74" />
        </g>
      </svg>
    );
  }

  if (key.includes("basket")) {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
        <circle cx="50" cy="50" r="44" fill="#f97316" />
        <g stroke="#431407" strokeWidth="3" fill="none" strokeLinecap="round">
          <circle cx="50" cy="50" r="44" />
          <path d="M50 6V94M6 50H94M18 18C34 32 34 68 18 82M82 18C66 32 66 68 82 82" />
        </g>
      </svg>
    );
  }

  if (key.includes("foot") || key.includes("soccer")) {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
        <circle cx="50" cy="50" r="44" fill="#fff" stroke="#0f172a" strokeWidth="3" />
        <polygon points="50,37 62,46 57.5,60 42.5,60 38,46" fill="#0f172a" />
        <g stroke="#0f172a" strokeWidth="3" strokeLinecap="round">
          <path d="M50 37V10M62 46L88 38M57.5 60L72 83M42.5 60L28 83M38 46L12 38" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <g fill="none" stroke="#facc15" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 18h36v26a18 18 0 0 1-36 0V18z" fill="#facc15" fillOpacity=".18" />
        <path d="M32 26H16v4a16 16 0 0 0 16 16M68 26h16v4a16 16 0 0 1-16 16" />
        <path d="M50 62v16M34 86h32M40 78h20" />
      </g>
    </svg>
  );
}

// ============================================
// PAGE
// ============================================

export default function CompetitionsPage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [sort, setSort] = useState<SortType>("soonest");

  const [search, setSearch] = useState("");
  const [selectedCompetition, setSelectedCompetition] =
    useState<Competition | null>(null);

  // ============================================
  // LOAD DATA
  // ============================================

  const loadCompetitions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      const currentUserId = authData.user?.id ?? null;
      setUserId(currentUserId);

      const [
        competitionResponse,
        sportResponse,
        clubResponse,
        participantResponse,
        resultResponse,
      ] = await Promise.all([
        supabase
          .from("competitions")
          .select("*")
          .order("start_date", { ascending: true }),

        supabase.from("sports").select("id, name"),

        supabase.from("clubs").select("id, name, city"),

        supabase
          .from("competition_participants")
          .select(
            "id, competition_id, user_id, registration_status, registered_at"
          ),

        supabase
          .from("competition_results")
          .select(
            "id, competition_id, participant_id, position, score, result_details"
          ),
      ]);

      if (competitionResponse.error) throw competitionResponse.error;
      if (sportResponse.error) throw sportResponse.error;
      if (clubResponse.error) throw clubResponse.error;
      if (participantResponse.error) throw participantResponse.error;
      if (resultResponse.error) throw resultResponse.error;

      const competitionData = (competitionResponse.data ??
        []) as Competition[];

      const participantData = (participantResponse.data ??
        []) as Participant[];

      const profileIds = Array.from(
        new Set([
          ...(currentUserId ? [currentUserId] : []),
          ...participantData.map((p) => p.user_id),
        ])
      );

      let profileData: Profile[] = [];

      if (profileIds.length > 0) {
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", profileIds);

        if (profileError) throw profileError;

        profileData = (data ?? []) as Profile[];
      }

      setCompetitions(competitionData);
      setSports((sportResponse.data ?? []) as Sport[]);
      setClubs((clubResponse.data ?? []) as Club[]);
      setParticipants(participantData);
      setResults((resultResponse.data ?? []) as CompetitionResult[]);
      setProfiles(profileData);
    } catch (err) {
      console.error("Competitions loading error:", err);

      setError(
        err instanceof Error ? err.message : "Could not load competitions."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadCompetitions();
  }, [loadCompetitions]);

  // success messages disappear on their own
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  // modal: close on Escape and lock page scroll
  useEffect(() => {
    if (!selectedCompetition) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedCompetition(null);
    }

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedCompetition]);

  // ============================================
  // HELPERS
  // ============================================

  function getSport(sportId: string) {
    return sports.find((sport) => sport.id === sportId);
  }

  function getClub(clubId: string) {
    return clubs.find((club) => club.id === clubId);
  }

  function getProfile(profileId: string) {
    return profiles.find((profile) => profile.id === profileId);
  }

  function getCompetitionParticipants(competitionId: string) {
    return participants.filter(
      (p) =>
        p.competition_id === competitionId &&
        p.registration_status === "registered"
    );
  }

  function getCompetitionResults(competitionId: string) {
    return results
      .filter((r) => r.competition_id === competitionId)
      .sort((a, b) => a.position - b.position);
  }

  function isRegistered(competitionId: string) {
    return participants.some(
      (p) =>
        p.competition_id === competitionId &&
        p.user_id === userId &&
        p.registration_status === "registered"
    );
  }

  // true when the competition itself accepts registrations (ignores the user)
  function registrationOpen(competition: Competition) {
    if (getStatus(competition) !== "coming_soon") return false;

    if (
      competition.registration_deadline &&
      Date.now() > new Date(competition.registration_deadline).getTime()
    ) {
      return false;
    }

    const count = getCompetitionParticipants(competition.id).length;

    if (
      competition.max_participants !== null &&
      count >= competition.max_participants
    ) {
      return false;
    }

    return true;
  }

  function canRegister(competition: Competition) {
    return !!userId && registrationOpen(competition);
  }

  function closedReason(competition: Competition) {
    const status = getStatus(competition);
    if (status === "finished") return "Finished";
    if (status === "ongoing") return "In progress";

    const count = getCompetitionParticipants(competition.id).length;
    if (
      competition.max_participants !== null &&
      count >= competition.max_participants
    ) {
      return "Full";
    }

    return "Closed";
  }

  // ============================================
  // REGISTRATION
  // ============================================

  async function toggleRegistration(competition: Competition) {
    setError("");
    setMessage("");

    if (!userId) {
      setError("Please log in to participate in competitions.");
      return;
    }

    setActionLoading(competition.id);

    try {
      const alreadyRegistered = isRegistered(competition.id);

      if (alreadyRegistered) {
        const { error: deleteError } = await supabase
          .from("competition_participants")
          .delete()
          .eq("competition_id", competition.id)
          .eq("user_id", userId);

        if (deleteError) throw deleteError;

        setMessage("Your registration was cancelled.");
      } else {
        if (!canRegister(competition)) {
          throw new Error("Registration is currently unavailable.");
        }

        const { error: insertError } = await supabase
          .from("competition_participants")
          .insert({
            competition_id: competition.id,
            user_id: userId,
            registration_status: "registered",
          });

        if (insertError) throw insertError;

        setMessage("You have successfully registered!");
      }

      await loadCompetitions();
    } catch (err) {
      console.error("Registration error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not update your registration."
      );
    } finally {
      setActionLoading(null);
    }
  }

  // ============================================
  // FILTERING
  // ============================================

  const filteredCompetitions = useMemo(() => {
    const query = search.trim().toLowerCase();

    const list = competitions.filter((competition) => {
      const status = getStatus(competition);

      const matchesFilter = activeFilter === "all" || status === activeFilter;

      const matchesSport =
        sportFilter === "all" || competition.sport_id === sportFilter;

      const matchesMine =
        !onlyMine ||
        participants.some(
          (p) =>
            p.competition_id === competition.id &&
            p.user_id === userId &&
            p.registration_status === "registered"
        );

      const sportName =
        sports.find((s) => s.id === competition.sport_id)?.name ?? "";

      const clubName =
        clubs.find((c) => c.id === competition.organizer_club_id)?.name ?? "";

      const matchesSearch = [
        competition.title,
        competition.description ?? "",
        sportName,
        clubName,
        competition.location ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

      return matchesFilter && matchesSport && matchesMine && matchesSearch;
    });

    const registeredCount = (id: string) =>
      participants.filter(
        (p) => p.competition_id === id && p.registration_status === "registered"
      ).length;

    return [...list].sort((a, b) => {
      if (sort === "newest") {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      if (sort === "popular") {
        return registeredCount(b.id) - registeredCount(a.id);
      }
      return (
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );
    });
  }, [
    competitions,
    sports,
    clubs,
    participants,
    activeFilter,
    sportFilter,
    onlyMine,
    sort,
    search,
    userId,
  ]);

  const counts = useMemo(() => {
    return {
      all: competitions.length,
      coming_soon: competitions.filter((c) => getStatus(c) === "coming_soon")
        .length,
      ongoing: competitions.filter((c) => getStatus(c) === "ongoing").length,
      finished: competitions.filter((c) => getStatus(c) === "finished").length,
    };
  }, [competitions]);

  const myCount = useMemo(() => {
    if (!userId) return 0;
    return participants.filter(
      (p) => p.user_id === userId && p.registration_status === "registered"
    ).length;
  }, [participants, userId]);

  // ============================================
  // STATUS STYLES
  // ============================================

  function statusLabel(status: CompetitionStatus) {
    switch (status) {
      case "coming_soon":
        return "Coming soon";
      case "ongoing":
        return "Live now";
      case "finished":
        return "Finished";
    }
  }

  function statusStyle(status: CompetitionStatus) {
    switch (status) {
      case "coming_soon":
        return "bg-sky-50 text-sky-800 ring-sky-200";
      case "ongoing":
        return "bg-emerald-50 text-emerald-800 ring-emerald-200";
      case "finished":
        return "bg-stone-100 text-stone-600 ring-stone-200";
    }
  }

  function statusDot(status: CompetitionStatus) {
    switch (status) {
      case "coming_soon":
        return "bg-sky-500";
      case "ongoing":
        return "bg-emerald-500 animate-pulse";
      case "finished":
        return "bg-stone-400";
    }
  }

  function StatusBadge({ status }: { status: CompetitionStatus }) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyle(status)}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${statusDot(status)}`} />
        {statusLabel(status)}
      </span>
    );
  }

  function AvatarStack({ competitionId }: { competitionId: string }) {
    const list = getCompetitionParticipants(competitionId);
    const shown = list.slice(0, 4);
    const extra = list.length - shown.length;

    if (list.length === 0) {
      return <span className="text-xs text-stone-400">Be the first to join</span>;
    }

    return (
      <div className="flex items-center">
        {shown.map((p, i) => (
          <span
            key={p.id}
            style={{ zIndex: shown.length - i }}
            className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-yellow-100 text-[11px] font-bold text-stone-800 ring-2 ring-white first:ml-0"
          >
            {getInitial(getProfile(p.user_id)?.full_name)}
          </span>
        ))}
        {extra > 0 && (
          <span className="-ml-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-stone-900 px-1.5 text-[11px] font-bold text-white ring-2 ring-white">
            +{extra}
          </span>
        )}
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-stone-900">
      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: none; }
        }
        .card-in { animation: cardIn 600ms cubic-bezier(.22,.61,.36,1) both; }

        @keyframes modalIn {
          from { opacity: 0; transform: translateY(16px) scale(.97); }
          to   { opacity: 1; transform: none; }
        }
        .modal-in { animation: modalIn 280ms cubic-bezier(.22,.61,.36,1) both; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .fade-in { animation: fadeIn 220ms ease both; }

        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: none; }
        }
        .toast-in { animation: toastIn 260ms ease both; }

        @keyframes glow {
          0%, 100% { opacity: .16; transform: scale(1); }
          50%      { opacity: .3;  transform: scale(1.15); }
        }
        .glow { animation: glow 8s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .card-in, .modal-in, .fade-in, .toast-in, .glow { animation: none !important; }
        }
      `}</style>

      {/* ========================================
          PAGE HEADER
      ======================================== */}

      <header className="relative overflow-hidden bg-neutral-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8">
        <div className="glow pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-yellow-400 blur-[130px]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                Sports <span className="text-yellow-400">Competitions</span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-white/65 sm:text-base">
                Find a tournament that fits your sport and level, apply, and
                follow the rankings once the games start.
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
              {[
                { label: "Competitions", value: counts.all },
                { label: "Live now", value: counts.ongoing },
                { label: "Coming soon", value: counts.coming_soon },
                { label: "Joined by you", value: userId ? myCount : "–" },
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

     <div className="relative z-10 mx-auto -mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ========================================
            FEEDBACK
        ======================================== */}

        {(error || message) && (
          <div className="mb-5 space-y-3">
            {error && (
              <div
                role="alert"
                className="toast-in flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm"
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
                className="toast-in flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm"
              >
                <Icon name="check" />
                {message}
              </div>
            )}
          </div>
        )}

        {/* ========================================
            FILTERS AND SEARCH
        ======================================== */}

        <section
          aria-label="Filter competitions"
          className="mb-10 rounded-2xl border border-stone-200 bg-white p-4 shadow-lg shadow-stone-900/5 sm:p-5"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* status tabs */}
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["coming_soon", "Coming soon"],
                  ["ongoing", "Live now"],
                  ["finished", "Finished"],
                ] as [FilterType, string][]
              ).map(([filter, label]) => {
                const active = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    aria-pressed={active}
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      active
                        ? "bg-neutral-950 text-white shadow-sm"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {label}
                    <span
                      className={`ml-2 rounded-md px-1.5 py-0.5 text-xs ${
                        active
                          ? "bg-yellow-400 text-black"
                          : "bg-white text-stone-500"
                      }`}
                    >
                      {counts[filter]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* search + sort */}
            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <div className="relative w-full sm:w-64">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                  <Icon name="search" />
                </span>

                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search competitions"
                  aria-label="Search competitions"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-2 focus:ring-yellow-200"
                />
              </div>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortType)}
                aria-label="Sort competitions"
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-medium text-stone-700 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200"
              >
                <option value="soonest">Soonest first</option>
                <option value="newest">Recently added</option>
                <option value="popular">Most popular</option>
              </select>
            </div>
          </div>

          {/* sport chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4">
            <span className="mr-1 text-xs font-medium text-stone-500">
              Sport
            </span>

            {[{ id: "all", name: "All sports" }, ...sports].map((sport) => {
              const active = sportFilter === sport.id;
              return (
                <button
                  key={sport.id}
                  type="button"
                  onClick={() => setSportFilter(sport.id)}
                  aria-pressed={active}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-yellow-400 bg-yellow-400 text-black"
                      : "border-stone-200 bg-white text-stone-600 hover:border-yellow-400"
                  }`}
                >
                  {sport.name}
                </button>
              );
            })}

            {userId && (
              <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs font-medium text-stone-600">
                <input
                  type="checkbox"
                  checked={onlyMine}
                  onChange={(e) => setOnlyMine(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 accent-yellow-500"
                />
                Only my competitions
              </label>
            )}
          </div>
        </section>

        {/* ========================================
            COMPETITIONS GRID
        ======================================== */}

        <section>
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold sm:text-2xl">
                Discover competitions
              </h2>

              <p className="mt-1 text-sm text-stone-500" aria-live="polite">
                {loading
                  ? "Loading…"
                  : `${filteredCompetitions.length} ${
                      filteredCompetitions.length === 1
                        ? "competition"
                        : "competitions"
                    } found`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadCompetitions()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold text-stone-600 transition hover:border-yellow-400 hover:text-stone-900 disabled:opacity-50"
            >
              <Icon
                name="refresh"
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-2xl border border-stone-200 bg-white"
                >
                  <div className="h-44 animate-pulse bg-stone-200" />
                  <div className="space-y-3 p-5">
                    <div className="h-5 w-2/3 animate-pulse rounded bg-stone-200" />
                    <div className="h-3 w-full animate-pulse rounded bg-stone-100" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-stone-100" />
                    <div className="h-10 w-full animate-pulse rounded-xl bg-stone-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCompetitions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-20 text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                <Icon name="trophy" className="h-7 w-7" />
              </span>

              <h3 className="text-lg font-bold">No competitions found</h3>

              <p className="mx-auto mt-2 max-w-sm text-sm text-stone-500">
                Try another status or sport, or clear your search.
              </p>

              <button
                type="button"
                onClick={() => {
                  setActiveFilter("all");
                  setSportFilter("all");
                  setOnlyMine(false);
                  setSearch("");
                }}
                className="mt-6 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-yellow-300"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredCompetitions.map((competition, index) => {
                const status = getStatus(competition);
                const sport = getSport(competition.sport_id);
                const club = getClub(competition.organizer_club_id);

                const registeredParticipants = getCompetitionParticipants(
                  competition.id
                );

                const registered = isRegistered(competition.id);
                const open = registrationOpen(competition);

                const spotsLeft =
                  competition.max_participants !== null
                    ? Math.max(
                        0,
                        competition.max_participants -
                          registeredParticipants.length
                      )
                    : null;

                const fillPercent =
                  competition.max_participants !== null
                    ? Math.min(
                        100,
                        (registeredParticipants.length /
                          competition.max_participants) *
                          100
                      )
                    : 0;

                return (
                  <article
                    key={competition.id}
                    style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
                    className="card-in group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-yellow-400 hover:shadow-xl hover:shadow-stone-900/10"
                  >
                    {/* CARD BANNER */}

                    <div className="relative h-44 overflow-hidden bg-neutral-950">
                      {competition.cover_image ? (
                        <>
                          <img
                            src={competition.cover_image}
                            alt={competition.title}
                            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-950 via-slate-900 to-slate-800">
                          <div className="h-20 w-20 transition duration-500 group-hover:rotate-12 group-hover:scale-110">
                            <SportGlyph name={sport?.name} />
                          </div>
                        </div>
                      )}

                      <div className="absolute left-4 top-4">
                        <StatusBadge status={status} />
                      </div>

                      <div className="absolute right-4 top-4">
                        <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                          {sport?.name ?? "Sport"}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-black">
                          <Icon name="clock" className="h-3.5 w-3.5" />
                          {timingLabel(competition, status)}
                        </span>
                      </div>
                    </div>

                    {/* CARD CONTENT */}

                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-lg font-extrabold leading-snug text-stone-900">
                        {competition.title}
                      </h3>

                      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-stone-500">
                        {competition.description ||
                          "Discover this competition and challenge other athletes."}
                      </p>

                      <ul className="mb-5 mt-4 space-y-2.5 border-t border-stone-100 pt-4 text-sm text-stone-600">
                        <li className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-50 text-yellow-700">
                            <Icon name="calendar" />
                          </span>
                          <span>
                            {formatDate(competition.start_date)}
                            {" – "}
                            {formatDate(competition.end_date)}
                          </span>
                        </li>

                        <li className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-50 text-yellow-700">
                            <Icon name="pin" />
                          </span>
                          <span className="truncate">
                            {competition.location ||
                              club?.city ||
                              "Location to be announced"}
                          </span>
                        </li>

                        <li className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-50 text-yellow-700">
                            <Icon name="building" />
                          </span>
                          <span className="truncate">
                            {club?.name ?? "Organizer"}
                          </span>
                        </li>
                      </ul>

                      {/* PARTICIPANTS */}

                      <div className="mb-5 mt-auto">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <AvatarStack competitionId={competition.id} />

                          <span className="text-xs font-semibold text-stone-600">
                            {registeredParticipants.length}
                            {competition.max_participants !== null &&
                              ` / ${competition.max_participants}`}{" "}
                            <span className="font-normal text-stone-400">
                              joined
                            </span>
                          </span>
                        </div>

                        {competition.max_participants !== null && (
                          <>
                            <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                              <div
                                className="h-full rounded-full bg-yellow-400 transition-all duration-700"
                                style={{ width: `${fillPercent}%` }}
                              />
                            </div>

                            {status === "coming_soon" && (
                              <p className="mt-1.5 text-xs text-stone-400">
                                {spotsLeft === 0
                                  ? "No spots left"
                                  : `${spotsLeft} ${
                                      spotsLeft === 1 ? "spot" : "spots"
                                    } left`}
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {/* ACTIONS */}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCompetition(competition)}
                          className="flex-1 rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold text-stone-700 transition hover:border-stone-900 hover:bg-stone-50"
                        >
                          View details
                        </button>

                        {registered ? (
                          <button
                            type="button"
                            onClick={() => void toggleRegistration(competition)}
                            disabled={actionLoading === competition.id}
                            aria-label="You joined this competition. Click to cancel."
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {actionLoading === competition.id ? (
                              "..."
                            ) : (
                              <>
                                <Icon name="check" className="h-4 w-4" />
                                Joined
                              </>
                            )}
                          </button>
                        ) : open ? (
                          <button
                            type="button"
                            onClick={() => void toggleRegistration(competition)}
                            disabled={actionLoading === competition.id}
                            className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-yellow-300 disabled:opacity-50"
                          >
                            {actionLoading === competition.id
                              ? "..."
                              : userId
                                ? "Join"
                                : "Log in to join"}
                          </button>
                        ) : (
                          <span className="flex items-center rounded-xl bg-stone-100 px-4 py-3 text-xs font-bold text-stone-500">
                            {closedReason(competition)}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ========================================
          COMPETITION DETAILS MODAL
      ======================================== */}

      {selectedCompetition &&
        (() => {
          const competition = selectedCompetition;
          const status = getStatus(competition);

          const sport = getSport(competition.sport_id);
          const club = getClub(competition.organizer_club_id);

          const registeredParticipants = getCompetitionParticipants(
            competition.id
          );

          const competitionResults = getCompetitionResults(competition.id);
          const podium = competitionResults.slice(0, 3);
          const restResults = competitionResults.slice(3);

          const registered = isRegistered(competition.id);
          const open = registrationOpen(competition);

          const podiumStyle = (position: number) =>
            position === 1
              ? "bg-yellow-400 text-black"
              : position === 2
                ? "bg-stone-300 text-stone-900"
                : "bg-amber-700 text-white";

          const resultName = (result: CompetitionResult) => {
            const participant = participants.find(
              (p) => p.id === result.participant_id
            );
            const profile = participant
              ? getProfile(participant.user_id)
              : null;
            return profile?.full_name || "Participant";
          };

          const infoItems: { label: string; value: string }[] = [
            { label: "Sport", value: sport?.name ?? "Unknown" },
            { label: "Organizer", value: club?.name ?? "Unknown" },
            {
              label: "Start date",
              value: formatDateTime(competition.start_date),
            },
            { label: "End date", value: formatDateTime(competition.end_date) },
            {
              label: "Location",
              value: competition.location || club?.city || "To be announced",
            },
            {
              label: "Registration deadline",
              value: competition.registration_deadline
                ? formatDateTime(competition.registration_deadline)
                : "Not specified",
            },
          ];

          return (
            <div
              className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
              onClick={() => setSelectedCompetition(null)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="competition-modal-title"
                className="modal-in flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-[#FBF8F1] shadow-2xl sm:rounded-3xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* MODAL HEADER */}

                <div className="relative shrink-0 overflow-hidden bg-neutral-950 px-6 pb-8 pt-10 text-white sm:px-10">
                  {competition.cover_image && (
                    <img
                      src={competition.cover_image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-30"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-neutral-950/30" />

                  <button
                    type="button"
                    onClick={() => setSelectedCompetition(null)}
                    aria-label="Close details"
                    className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25"
                  >
                    <Icon name="close" className="h-5 w-5" />
                  </button>

                  <div className="relative flex items-end gap-5">
                    <div className="hidden h-20 w-20 shrink-0 sm:block">
                      <SportGlyph name={sport?.name} />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={status} />
                        <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-black">
                          {timingLabel(competition, status)}
                        </span>
                      </div>

                      <h2
                        id="competition-modal-title"
                        className="mt-3 text-2xl font-black leading-tight sm:text-3xl"
                      >
                        {competition.title}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* MODAL BODY */}

                <div className="flex-1 space-y-8 overflow-y-auto p-6 sm:p-10">
                  {/* DESCRIPTION */}

                  <section>
                    <h3 className="mb-2 font-extrabold">
                      About this competition
                    </h3>

                    <p className="whitespace-pre-wrap text-sm leading-7 text-stone-600">
                      {competition.description || "No description available."}
                    </p>
                  </section>

                  {/* INFORMATION */}

                  <section className="grid gap-3 sm:grid-cols-2">
                    {infoItems.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-stone-200 bg-white p-4"
                      >
                        <p className="text-xs font-medium text-stone-400">
                          {item.label}
                        </p>
                        <p className="mt-1 text-sm font-bold text-stone-800">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </section>

                  {/* PARTICIPANTS */}

                  <section>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-extrabold">Participants</h3>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-stone-800">
                        <Icon name="users" className="h-3.5 w-3.5" />
                        {registeredParticipants.length}
                        {competition.max_participants !== null &&
                          ` / ${competition.max_participants}`}
                      </span>
                    </div>

                    {registeredParticipants.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-500">
                        No participants have registered yet.
                      </p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {registeredParticipants.map((participant) => {
                          const profile = getProfile(participant.user_id);
                          const isMe = participant.user_id === userId;

                          return (
                            <div
                              key={participant.id}
                              className={`flex items-center gap-3 rounded-xl border p-3 ${
                                isMe
                                  ? "border-yellow-300 bg-yellow-50"
                                  : "border-stone-200 bg-white"
                              }`}
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100 font-black text-stone-800">
                                {getInitial(profile?.full_name)}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-stone-800">
                                  {profile?.full_name || "SportGy member"}
                                  {isMe && (
                                    <span className="ml-2 text-xs font-semibold text-yellow-700">
                                      You
                                    </span>
                                  )}
                                </p>

                                <p className="text-xs text-stone-400">
                                  Registered{" "}
                                  {formatDate(participant.registered_at)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {/* LEADERBOARD */}

                  {status === "finished" && (
                    <section>
                      <div className="mb-4">
                        <h3 className="font-extrabold">Competition results</h3>

                        <p className="mt-1 text-sm text-stone-500">
                          Final participant rankings
                        </p>
                      </div>

                      {competitionResults.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-500">
                          Results have not been published yet.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* podium */}
                          <div className="grid gap-3 sm:grid-cols-3">
                            {podium.map((result) => (
                              <div
                                key={result.id}
                                className={`rounded-2xl border p-4 text-center ${
                                  result.position === 1
                                    ? "border-yellow-300 bg-yellow-50 sm:-mt-2"
                                    : "border-stone-200 bg-white"
                                }`}
                              >
                                <span
                                  className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full text-lg font-black ${podiumStyle(result.position)}`}
                                >
                                  {result.position}
                                </span>

                                <p className="mt-3 truncate text-sm font-bold text-stone-900">
                                  {resultName(result)}
                                </p>

                                <p className="mt-0.5 truncate text-xs text-stone-400">
                                  {result.result_details || "Final result"}
                                </p>

                                {result.score !== null && (
                                  <p className="mt-2 text-xl font-black text-stone-900">
                                    {result.score}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* rest of the table */}
                          {restResults.length > 0 && (
                            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                              {restResults.map((result) => (
                                <div
                                  key={result.id}
                                  className="flex items-center justify-between gap-3 border-b border-stone-100 p-4 last:border-0"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-sm font-black text-stone-700">
                                      {result.position}
                                    </span>

                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-bold text-stone-900">
                                        {resultName(result)}
                                      </p>

                                      <p className="text-xs text-stone-400">
                                        {result.result_details ||
                                          "Final result"}
                                      </p>
                                    </div>
                                  </div>

                                  {result.score !== null && (
                                    <span className="shrink-0 font-extrabold text-stone-800">
                                      {result.score}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </section>
                  )}
                </div>

                {/* MODAL ACTION (always visible) */}

                <div className="shrink-0 border-t border-stone-200 bg-white p-4 sm:px-10 sm:py-5">
                  {registered ? (
                    <button
                      type="button"
                      onClick={() => void toggleRegistration(competition)}
                      disabled={actionLoading === competition.id}
                      className="w-full rounded-xl border border-red-200 bg-red-50 px-6 py-3.5 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      {actionLoading === competition.id
                        ? "Please wait..."
                        : "Cancel my registration"}
                    </button>
                  ) : open ? (
                    <button
                      type="button"
                      onClick={() => void toggleRegistration(competition)}
                      disabled={actionLoading === competition.id}
                      className="w-full rounded-xl bg-yellow-400 px-6 py-3.5 text-sm font-bold text-black transition hover:bg-yellow-300 disabled:opacity-50"
                    >
                      {actionLoading === competition.id
                        ? "Registering..."
                        : userId
                          ? "Join this competition"
                          : "Log in to join"}
                    </button>
                  ) : (
                    <div className="rounded-xl bg-stone-100 px-5 py-3.5 text-center text-sm font-semibold text-stone-500">
                      {status === "finished"
                        ? "This competition has finished."
                        : status === "ongoing"
                          ? "Registration is closed because the competition has started."
                          : "Registration is currently closed or full."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
    </main>
  );
}
