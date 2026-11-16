"use client";

/**
 * Club owner dashboard
 *
 * Suggested route: app/club/dashboard/page.tsx
 *
 * Assumptions (change the constants below if your database differs):
 *  - A club belongs to the logged-in user through one of the columns listed
 *    in OWNER_COLUMNS (for example `clubs.owner_id`).
 *  - `competition_participants.registration_status` uses:
 *      "pending"    -> the athlete applied and waits for the owner
 *      "registered" -> the owner accepted (the competitions page already
 *                      counts this value as a participant)
 *      "refused"    -> the owner refused
 *    For the approval flow to work end to end, the competitions page should
 *    insert "pending" instead of "registered" when an athlete applies.
 *  - Row Level Security lets the owner read the bookings of their club,
 *    manage the competitions where `organizer_club_id` is their club, and
 *    update/delete the participants and results of those competitions.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { signOutUser } from "@/lib/auth";

// ============================================
// CONFIG
// ============================================

const OWNER_COLUMNS = ["owner_id", "user_id", "profile_id", "created_by"] as const;

const PARTICIPANT_PENDING = "pending";
const PARTICIPANT_ACCEPTED = "registered";
const PARTICIPANT_REFUSED = "refused";

const LOGIN_ROUTE = "/login";

// ============================================
// TYPES
// ============================================

type Club = {
  id: string;
  name: string;
  city: string | null;
  description: string | null;
  sport_id: string | null;
  image_url?: string[] | string | null;
};

type Coach = {
  id: string;
  full_name: string | null;
  title: string | null;
  hourly_rate: number | null;
  image_url: string | null;
};

type Booking = {
  id: string;
  user_id: string;
  coach_id: string;
  club_id: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_price: number | null;
  status: string | null;
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

type Named = { id: string; name: string };
type Profile = { id: string; full_name: string | null };

type UiStatus =
  | "pending"
  | "accepted"
  | "refused"
  | "cancelled"
  | "completed"
  | "expired";

type PartStatus = "pending" | "accepted" | "refused" | "other";
type CompStatus = "coming_soon" | "ongoing" | "finished";
type Tab = "bookings" | "coaches" | "competitions";

type ResultRow = { position: string; score: string; details: string };

type CompetitionForm = {
  title: string;
  description: string;
  sport_id: string;
  location: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  max_participants: string;
  cover_image: string;
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

function getUiStatus(b: Booking, now: Date): UiStatus {
  const raw = (b.status ?? "").toLowerCase();
  const ended = endOf(b).getTime() < now.getTime();

  if (["refused", "rejected", "declined"].includes(raw)) return "refused";
  if (["cancelled", "canceled"].includes(raw)) return "cancelled";
  if (raw === "completed") return "completed";
  if (raw === "accepted") return ended ? "completed" : "accepted";

  return ended ? "expired" : "pending";
}

function getPartStatus(p: Participant): PartStatus {
  const raw = p.registration_status.toLowerCase();

  if (["registered", "accepted"].includes(raw)) return "accepted";
  if (["refused", "rejected", "declined"].includes(raw)) return "refused";
  if (raw === "pending") return "pending";

  return "other";
}

function getCompStatus(c: Competition): CompStatus {
  const now = Date.now();
  const start = new Date(c.start_date).getTime();
  const end = new Date(c.end_date).getTime();

  if (now < start) return "coming_soon";
  if (now <= end) return "ongoing";

  return "finished";
}

function getInitial(name: string | null | undefined) {
  return name?.trim().charAt(0).toUpperCase() || "S";
}

function formatDay(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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

function firstImage(club: Club | null) {
  if (!club?.image_url) return null;

  if (Array.isArray(club.image_url)) {
    const first = club.image_url.find(
      (item) => typeof item === "string" && item.trim() !== ""
    );
    return first ?? null;
  }

  return club.image_url.trim() !== "" ? club.image_url : null;
}

const UI_STATUS_STYLE: Record<UiStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  accepted: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  refused: "bg-red-50 text-red-700 ring-red-200",
  cancelled: "bg-stone-100 text-stone-600 ring-stone-200",
  completed: "bg-sky-50 text-sky-800 ring-sky-200",
  expired: "bg-stone-100 text-stone-500 ring-stone-200",
};

const UI_STATUS_LABEL: Record<UiStatus, string> = {
  pending: "Waiting for coach",
  accepted: "Accepted",
  refused: "Refused",
  cancelled: "Cancelled",
  completed: "Completed",
  expired: "Expired",
};

const PART_STYLE: Record<PartStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  accepted: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  refused: "bg-red-50 text-red-700 ring-red-200",
  other: "bg-stone-100 text-stone-600 ring-stone-200",
};

const PART_LABEL: Record<PartStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  refused: "Refused",
  other: "Other",
};

const COMP_STYLE: Record<CompStatus, string> = {
  coming_soon: "bg-sky-50 text-sky-800 ring-sky-200",
  ongoing: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  finished: "bg-stone-100 text-stone-600 ring-stone-200",
};

const COMP_LABEL: Record<CompStatus, string> = {
  coming_soon: "Coming soon",
  ongoing: "Live now",
  finished: "Finished",
};

const EMPTY_FORM: CompetitionForm = {
  title: "",
  description: "",
  sport_id: "",
  location: "",
  start_date: "",
  end_date: "",
  registration_deadline: "",
  max_participants: "",
  cover_image: "",
};

// ============================================
// SMALL COMPONENTS
// ============================================

type IconName =
  | "calendar"
  | "clock"
  | "check"
  | "close"
  | "refresh"
  | "users"
  | "money"
  | "trophy"
  | "plus"
  | "trash"
  | "pin"
  | "list";

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
    check: <path d="M4 12.5l5 5L20 6.5" />,
    close: <path d="M6 6l12 12M18 6L6 18" />,
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
    money: (
      <>
        <rect x="2.5" y="6" width="19" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.8" />
      </>
    ),
    trophy: (
      <>
        <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
        <path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4" />
        <path d="M12 13v4M8 21h8M10 17h4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    trash: (
      <>
        <path d="M4 7h16M10 11v6M14 11v6" />
        <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </>
    ),
    list: (
      <>
        <path d="M8 6h13M8 12h13M8 18h13" />
        <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
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

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-stone-700">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-400">{hint}</span>}
    </label>
  );
}

const INPUT_CLASS =
  "w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-2 focus:ring-yellow-200";

// ============================================
// PAGE
// ============================================

export default function ClubOwnerDashboardPage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [sports, setSports] = useState<Named[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [loggedIn, setLoggedIn] = useState(true);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [tab, setTab] = useState<Tab>("bookings");
  const [now, setNow] = useState(() => new Date());

  // Account menu
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // bookings filters
  const [bookingFilter, setBookingFilter] = useState<"all" | UiStatus>("all");
  const [coachFilter, setCoachFilter] = useState("all");
  const [search, setSearch] = useState("");

  // competition dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CompetitionForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [managedId, setManagedId] = useState<string | null>(null);
  const [resultRows, setResultRows] = useState<Record<string, ResultRow>>({});
  const [savingResults, setSavingResults] = useState(false);

  const [competitionToDelete, setCompetitionToDelete] =
    useState<Competition | null>(null);

  const club = clubs.find((c) => c.id === selectedClubId) ?? null;
  const managed = competitions.find((c) => c.id === managedId) ?? null;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Close the account menu when the user clicks elsewhere.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    try {
      await signOutUser();
      window.location.href = "/";
    } catch (err) {
      console.error("Logout error:", err);
      setError("Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }

  // ============================================
  // LOAD: the clubs of the logged-in owner
  // ============================================

  useEffect(() => {
    async function loadClubs() {
      setLoadingClubs(true);

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

        for (const column of OWNER_COLUMNS) {
          const { data, error: clubError } = await supabase
            .from("clubs")
            .select("*")
            .eq(column, user.id);

          if (!clubError && data && data.length > 0) {
            setClubs(data as Club[]);
            setSelectedClubId((data as Club[])[0].id);
            break;
          }
        }
      } catch (err) {
        console.error("Club owner loading error:", err);
        setError(
          err instanceof Error ? err.message : "Could not load your club."
        );
      } finally {
        setLoadingClubs(false);
      }
    }

    void loadClubs();
  }, [supabase]);

  // ============================================
  // LOAD: data of the selected club
  // ============================================

  const loadClubData = useCallback(
    async (clubId: string, silent = false) => {
      if (!silent) setLoadingData(true);
      setError("");

      try {
        const [bookingResponse, junctionResponse, competitionResponse, sportResponse] =
          await Promise.all([
            supabase
              .from("bookings")
              .select("*")
              .eq("club_id", clubId)
              .order("booking_date", { ascending: false })
              .order("start_time", { ascending: false }),

            supabase.from("club_coaches").select("coach_id").eq("club_id", clubId),

            supabase
              .from("competitions")
              .select("*")
              .eq("organizer_club_id", clubId)
              .order("start_date", { ascending: false }),

            supabase.from("sports").select("id, name"),
          ]);

        if (bookingResponse.error) throw bookingResponse.error;
        if (junctionResponse.error) throw junctionResponse.error;
        if (competitionResponse.error) throw competitionResponse.error;
        if (sportResponse.error) throw sportResponse.error;

        const bookingData = (bookingResponse.data ?? []) as Booking[];
        const competitionData = (competitionResponse.data ?? []) as Competition[];

        const coachIds = (junctionResponse.data ?? []).map(
          (row: { coach_id: string }) => row.coach_id
        );
        const competitionIds = competitionData.map((c) => c.id);

        let coachData: Coach[] = [];
        if (coachIds.length > 0) {
          const { data, error: coachError } = await supabase
            .from("coaches")
            .select("id, full_name, title, hourly_rate, image_url")
            .in("id", coachIds);

          if (coachError) throw coachError;
          coachData = (data ?? []) as Coach[];
        }

        let participantData: Participant[] = [];
        let resultData: CompetitionResult[] = [];

        if (competitionIds.length > 0) {
          const [participantResponse, resultResponse] = await Promise.all([
            supabase
              .from("competition_participants")
              .select("id, competition_id, user_id, registration_status, registered_at")
              .in("competition_id", competitionIds),

            supabase
              .from("competition_results")
              .select("id, competition_id, participant_id, position, score, result_details")
              .in("competition_id", competitionIds),
          ]);

          if (participantResponse.error) throw participantResponse.error;
          if (resultResponse.error) throw resultResponse.error;

          participantData = (participantResponse.data ?? []) as Participant[];
          resultData = (resultResponse.data ?? []) as CompetitionResult[];
        }

        const profileIds = Array.from(
          new Set([
            ...bookingData.map((b) => b.user_id),
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

        setBookings(bookingData);
        setCoaches(coachData);
        setCompetitions(competitionData);
        setParticipants(participantData);
        setResults(resultData);
        setSports((sportResponse.data ?? []) as Named[]);
        setProfiles(profileData);
      } catch (err) {
        console.error("Club data loading error:", err);
        setError(
          err instanceof Error ? err.message : "Could not load club data."
        );
      } finally {
        setLoadingData(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (selectedClubId) void loadClubData(selectedClubId);
  }, [selectedClubId, loadClubData]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  // Dialogs: close with Escape and lock page scroll.
  const dialogOpen = showCreate || !!managedId || !!competitionToDelete;

  useEffect(() => {
    if (!dialogOpen) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowCreate(false);
        setManagedId(null);
        setCompetitionToDelete(null);
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
  // HELPERS
  // ============================================

  function personName(userId: string) {
    return profiles.find((p) => p.id === userId)?.full_name || "SportGy member";
  }

  function coachName(coachId: string) {
    return coaches.find((c) => c.id === coachId)?.full_name || "Coach";
  }

  function sportName(sportId: string | null) {
    return sportId ? (sports.find((s) => s.id === sportId)?.name ?? "") : "";
  }

  function participantsOf(competitionId: string) {
    return participants.filter((p) => p.competition_id === competitionId);
  }

  function acceptedCount(competitionId: string) {
    return participantsOf(competitionId).filter(
      (p) => getPartStatus(p) === "accepted"
    ).length;
  }

  function pendingCount(competitionId: string) {
    return participantsOf(competitionId).filter(
      (p) => getPartStatus(p) === "pending"
    ).length;
  }

  // ============================================
  // ACTIONS: participants
  // ============================================

  async function setParticipantStatus(
    participant: Participant,
    newStatus: string,
    successMessage: string
  ) {
    setError("");
    setMessage("");
    setBusyId(participant.id);

    const previous = participants;

    setParticipants((current) =>
      current.map((p) =>
        p.id === participant.id ? { ...p, registration_status: newStatus } : p
      )
    );

    const { error: updateError } = await supabase
      .from("competition_participants")
      .update({ registration_status: newStatus })
      .eq("id", participant.id);

    setBusyId(null);

    if (updateError) {
      setParticipants(previous);
      setError(updateError.message);
      return;
    }

    setMessage(successMessage);
  }

  // ============================================
  // ACTIONS: results
  // ============================================

  function openManage(competition: Competition) {
    const rows: Record<string, ResultRow> = {};

    participantsOf(competition.id)
      .filter((p) => getPartStatus(p) === "accepted")
      .forEach((p) => {
        const existing = results.find(
          (r) => r.competition_id === competition.id && r.participant_id === p.id
        );

        rows[p.id] = {
          position: existing ? String(existing.position) : "",
          score: existing?.score != null ? String(existing.score) : "",
          details: existing?.result_details ?? "",
        };
      });

    setResultRows(rows);
    setManagedId(competition.id);
  }

  async function saveResults() {
    if (!managed) return;

    setError("");
    setMessage("");

    const filled = Object.entries(resultRows).filter(
      ([, row]) => row.position.trim() !== ""
    );

    const positions = filled.map(([, row]) => Number(row.position));

    if (positions.some((p) => !Number.isInteger(p) || p < 1)) {
      setError("Positions must be whole numbers starting at 1.");
      return;
    }

    if (new Set(positions).size !== positions.length) {
      setError("Two participants cannot have the same position.");
      return;
    }

    setSavingResults(true);

    try {
      const { error: deleteError } = await supabase
        .from("competition_results")
        .delete()
        .eq("competition_id", managed.id);

      if (deleteError) throw deleteError;

      if (filled.length > 0) {
        const { error: insertError } = await supabase
          .from("competition_results")
          .insert(
            filled.map(([participantId, row]) => ({
              competition_id: managed.id,
              participant_id: participantId,
              position: Number(row.position),
              score: row.score.trim() === "" ? null : Number(row.score),
              result_details: row.details.trim() || null,
            }))
          );

        if (insertError) throw insertError;
      }

      setMessage("Results saved.");
      if (selectedClubId) await loadClubData(selectedClubId, true);
    } catch (err) {
      console.error("Save results error:", err);
      setError(
        err instanceof Error ? err.message : "Could not save the results."
      );
    } finally {
      setSavingResults(false);
    }
  }

  // ============================================
  // ACTIONS: competitions
  // ============================================

  function openCreate() {
    setForm({
      ...EMPTY_FORM,
      sport_id: club?.sport_id ?? "",
      location: club?.city ?? "",
    });
    setShowCreate(true);
  }

  async function createCompetition() {
    if (!club) return;

    setError("");
    setMessage("");

    if (!form.title.trim()) {
      setError("Give your competition a title.");
      return;
    }

    if (!form.sport_id) {
      setError("Choose a sport.");
      return;
    }

    if (!form.start_date || !form.end_date) {
      setError("Choose a start and an end date.");
      return;
    }

    const start = new Date(form.start_date);
    const end = new Date(form.end_date);

    if (end <= start) {
      setError("The end date must be after the start date.");
      return;
    }

    if (
      form.registration_deadline &&
      new Date(form.registration_deadline) > start
    ) {
      setError("The registration deadline must be before the start date.");
      return;
    }

    const max = form.max_participants.trim()
      ? Number(form.max_participants)
      : null;

    if (max !== null && (!Number.isInteger(max) || max < 1)) {
      setError("Maximum participants must be a whole number above 0.");
      return;
    }

    setSaving(true);

    const { error: insertError } = await supabase.from("competitions").insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      sport_id: form.sport_id,
      organizer_club_id: club.id,
      location: form.location.trim() || null,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      registration_deadline: form.registration_deadline
        ? new Date(form.registration_deadline).toISOString()
        : null,
      max_participants: max,
      cover_image: form.cover_image.trim() || null,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setShowCreate(false);
    setMessage("Competition created.");
    await loadClubData(club.id, true);
  }

  async function confirmDeleteCompetition() {
    const competition = competitionToDelete;

    if (!competition || !club) return;

    setError("");
    setBusyId(competition.id);

    const { error: deleteError } = await supabase
      .from("competitions")
      .delete()
      .eq("id", competition.id)
      .eq("organizer_club_id", club.id);

    setBusyId(null);
    setCompetitionToDelete(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage("Competition deleted.");
    await loadClubData(club.id, true);
  }

  // ============================================
  // DERIVED DATA
  // ============================================

  const enrichedBookings = useMemo(
    () => bookings.map((booking) => ({ booking, status: getUiStatus(booking, now) })),
    [bookings, now]
  );

  const visibleBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return enrichedBookings.filter(({ booking, status }) => {
      const matchesStatus = bookingFilter === "all" || status === bookingFilter;
      const matchesCoach = coachFilter === "all" || booking.coach_id === coachFilter;
      const name =
        profiles.find((p) => p.id === booking.user_id)?.full_name ?? "";

      return matchesStatus && matchesCoach && name.toLowerCase().includes(query);
    });
  }, [enrichedBookings, bookingFilter, coachFilter, search, profiles]);

  const stats = useMemo(() => {
    const monthBookings = enrichedBookings.filter(({ booking }) => {
      const date = startOf(booking);
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    });

    const revenue = monthBookings
      .filter(({ status }) => status === "accepted" || status === "completed")
      .reduce((sum, { booking }) => sum + Number(booking.total_price ?? 0), 0);

    return {
      coaches: coaches.length,
      monthBookings: monthBookings.length,
      revenue,
      pendingApplications: participants.filter(
        (p) => getPartStatus(p) === "pending"
      ).length,
    };
  }, [enrichedBookings, coaches, participants, now]);

  const coachStats = useMemo(() => {
    const map = new Map<string, { upcoming: number; total: number }>();

    enrichedBookings.forEach(({ booking, status }) => {
      const current = map.get(booking.coach_id) ?? { upcoming: 0, total: 0 };

      if (status === "accepted" || status === "completed") current.total += 1;
      if (status === "accepted") current.upcoming += 1;

      map.set(booking.coach_id, current);
    });

    return map;
  }, [enrichedBookings]);

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

    @keyframes glow {
      0%, 100% { opacity: .16; transform: scale(1); }
      50%      { opacity: .3;  transform: scale(1.15); }
    }
    .glow { animation: glow 8s ease-in-out infinite; }

    @media (prefers-reduced-motion: reduce) {
      .card-in, .slide-down, .modal-in, .fade-in, .glow { animation: none !important; }
    }
  `;

  if (!loadingClubs && !loggedIn) {
    return (
      <main className="min-h-screen bg-[#FAF7F0] px-4 pb-20 pt-40 text-center text-stone-900">
        <h1 className="mb-3 text-2xl font-bold">Please log in</h1>
        <p className="mb-6 text-sm text-stone-500">
          Log in with your club owner account to see your dashboard.
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

  if (!loadingClubs && loggedIn && clubs.length === 0 && !error) {
    return (
      <main className="min-h-screen bg-[#FAF7F0] px-4 pb-20 pt-40 text-center text-stone-900">
        <h1 className="mb-3 text-2xl font-bold">No club found</h1>
        <p className="mx-auto mb-6 max-w-md text-sm text-stone-500">
          This account is not linked to a club. Log in with your club owner
          account to manage your club.
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

  const loading = loadingClubs || loadingData;
  const clubImage = firstImage(club);

  const tabs: { key: Tab; label: string; icon: IconName; count: number }[] = [
    { key: "bookings", label: "Bookings", icon: "list", count: bookings.length },
    { key: "coaches", label: "Coaches", icon: "users", count: coaches.length },
    { key: "competitions", label: "Competitions", icon: "trophy", count: competitions.length },
  ];

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-stone-900">
      <style>{pageStyles}</style>

      {/* ========================================
          HEADER
      ======================================== */}

      <header className="relative isolate bg-neutral-950 px-4 pb-20 pt-24 text-white sm:px-6 lg:px-8">
        {/* Keep decorative backgrounds clipped without clipping the account dropdown. */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          {clubImage && (
            <Image
              src={clubImage}
              alt=""
              fill
              sizes="100vw"
              priority
              className="object-cover opacity-15"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/85 to-neutral-950/50" />
          <div className="glow absolute -right-24 -top-24 h-96 w-96 rounded-full bg-yellow-400 blur-[130px]" />
        </div>

        {/* Account menu - top right */}
        <div ref={profileRef} className="absolute right-4 top-4 z-40 sm:right-6 sm:top-5 lg:right-8">
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            aria-label="Open profile menu"
            aria-expanded={profileOpen}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-yellow-400/60 bg-white/10 text-yellow-400 shadow-lg backdrop-blur-md transition hover:bg-yellow-400 hover:text-black"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a8.25 8.25 0 0 1 15 0" />
            </svg>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-xl border border-white/10 bg-neutral-950/95 text-white shadow-2xl backdrop-blur-xl">
              <div className="border-b border-white/10 px-4 py-3">
                <p className="truncate text-sm font-bold">{club?.name || "Club owner"}</p>
                <p className="mt-0.5 text-xs text-white/50">Club owner account</p>
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
                className="w-full border-t border-white/10 px-4 py-3 text-left text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
            </div>
          )}
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div>
              {clubs.length > 1 && (
                <select
                  value={selectedClubId ?? ""}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  aria-label="Choose a club"
                  className="mb-4 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white outline-none"
                >
                  {clubs.map((item) => (
                    <option key={item.id} value={item.id} className="text-black">
                      {item.name}
                    </option>
                  ))}
                </select>
              )}

              <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
                {loadingClubs ? (
                  "Club dashboard"
                ) : (
                  <>
                    {club?.name} <span className="text-yellow-400">dashboard</span>
                  </>
                )}
              </h1>

              <p className="mt-2 flex items-center gap-2 text-sm text-white/60 sm:text-base">
                {club?.city && (
                  <>
                    <Icon name="pin" className="h-4 w-4 text-yellow-400" />
                    {club.city}
                    <span className="text-white/30">|</span>
                  </>
                )}
                Manage your coaches, bookings and competitions.
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[580px]">
              {[
                { label: "Coaches", value: stats.coaches },
                { label: "Bookings this month", value: stats.monthBookings },
                { label: "Revenue this month", value: money(stats.revenue) },
                { label: "Applications to review", value: stats.pendingApplications },
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

        {/* ========================================
            TABS
        ======================================== */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-lg shadow-stone-900/5">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Dashboard sections">
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
                      active ? "bg-yellow-400 text-black" : "bg-white text-stone-500"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => selectedClubId && void loadClubData(selectedClubId)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-600 transition hover:border-yellow-400 hover:text-stone-900 disabled:opacity-50"
          >
            <Icon name="refresh" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-2xl border border-stone-200 bg-white"
              />
            ))}
          </div>
        ) : (
          <>
            {/* ========================================
                BOOKINGS TAB
            ======================================== */}
            {tab === "bookings" && (
              <section>
                <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["all", "All"],
                        ["pending", "Waiting"],
                        ["accepted", "Accepted"],
                        ["completed", "Completed"],
                        ["refused", "Refused"],
                        ["cancelled", "Cancelled"],
                      ] as ["all" | UiStatus, string][]
                    ).map(([value, label]) => {
                      const active = bookingFilter === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setBookingFilter(value)}
                          aria-pressed={active}
                          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                            active
                              ? "border-yellow-400 bg-yellow-400 text-black"
                              : "border-stone-200 bg-white text-stone-600 hover:border-yellow-400"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={coachFilter}
                      onChange={(e) => setCoachFilter(e.target.value)}
                      aria-label="Filter by coach"
                      className={`${INPUT_CLASS} sm:w-44`}
                    >
                      <option value="all">All coaches</option>
                      {coaches.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.full_name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search an athlete"
                      aria-label="Search an athlete"
                      className={`${INPUT_CLASS} sm:w-52`}
                    />
                  </div>
                </div>

                {visibleBookings.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
                    <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                      <Icon name="calendar" className="h-7 w-7" />
                    </span>
                    <h3 className="text-lg font-bold">No bookings found</h3>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-stone-500">
                      Bookings made with the coaches of your club will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleBookings.map(({ booking, status }, index) => (
                      <article
                        key={booking.id}
                        style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
                        className="card-in grid items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-yellow-300 hover:shadow-md sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-100 font-black text-stone-800">
                            {getInitial(personName(booking.user_id))}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold">
                              {personName(booking.user_id)}
                            </p>
                            <p className="text-xs text-stone-500">
                              with {coachName(booking.coach_id)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1 text-sm text-stone-600">
                          <p className="flex items-center gap-2">
                            <Icon name="calendar" className="h-4 w-4 text-yellow-600" />
                            {formatDay(booking.booking_date)}
                          </p>
                          <p className="flex items-center gap-2">
                            <Icon name="clock" className="h-4 w-4 text-yellow-600" />
                            {booking.start_time.slice(0, 5)} to {booking.end_time.slice(0, 5)}
                          </p>
                        </div>

                        <p className="text-sm font-bold text-stone-900">
                          {money(booking.total_price)}
                        </p>

                        <Pill className={UI_STATUS_STYLE[status]}>
                          {UI_STATUS_LABEL[status]}
                        </Pill>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ========================================
                COACHES TAB
            ======================================== */}
            {tab === "coaches" && (
              <section>
                {coaches.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
                    <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                      <Icon name="users" className="h-7 w-7" />
                    </span>
                    <h3 className="text-lg font-bold">No coaches yet</h3>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-stone-500">
                      Coaches linked to your club will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {coaches.map((coach, index) => {
                      const counts = coachStats.get(coach.id) ?? { upcoming: 0, total: 0 };

                      return (
                        <article
                          key={coach.id}
                          style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
                          className="card-in overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-yellow-400 hover:shadow-xl hover:shadow-stone-900/10"
                        >
                          <div className="flex items-center gap-4 p-5">
                            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-yellow-400 bg-neutral-900">
                              {coach.image_url ? (
                                <Image
                                  src={coach.image_url}
                                  alt={coach.full_name ?? "Coach"}
                                  fill
                                  sizes="64px"
                                  className="object-cover"
                                />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-xl font-black text-yellow-400">
                                  {getInitial(coach.full_name)}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate text-lg font-bold">
                                {coach.full_name || "Unnamed coach"}
                              </h3>
                              <p className="truncate text-sm font-semibold text-yellow-700">
                                {coach.title}
                              </p>
                            </div>
                          </div>

                          <dl className="grid grid-cols-3 divide-x divide-stone-100 border-t border-stone-100 bg-[#FBF8F1] text-center">
                            <div className="px-2 py-4">
                              <dd className="text-lg font-black">{counts.upcoming}</dd>
                              <dt className="text-xs text-stone-500">Upcoming</dt>
                            </div>
                            <div className="px-2 py-4">
                              <dd className="text-lg font-black">{counts.total}</dd>
                              <dt className="text-xs text-stone-500">Sessions</dt>
                            </div>
                            <div className="px-2 py-4">
                              <dd className="text-sm font-black leading-7">
                                {Number(coach.hourly_rate ?? 0).toLocaleString()}
                              </dd>
                              <dt className="text-xs text-stone-500">DZD / session</dt>
                            </div>
                          </dl>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ========================================
                COMPETITIONS TAB
            ======================================== */}
            {tab === "competitions" && (
              <section>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <p className="text-sm text-stone-500">
                    Create competitions, review applications and publish results.
                  </p>

                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black shadow-md transition hover:-translate-y-0.5 hover:bg-yellow-300"
                  >
                    <Icon name="plus" />
                    New competition
                  </button>
                </div>

                {competitions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
                    <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                      <Icon name="trophy" className="h-7 w-7" />
                    </span>
                    <h3 className="text-lg font-bold">No competitions yet</h3>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-stone-500">
                      Create your first competition to let athletes apply.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-5 md:grid-cols-2">
                    {competitions.map((competition, index) => {
                      const status = getCompStatus(competition);
                      const accepted = acceptedCount(competition.id);
                      const pending = pendingCount(competition.id);

                      return (
                        <article
                          key={competition.id}
                          style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
                          className="card-in flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition duration-300 hover:border-yellow-300 hover:shadow-lg hover:shadow-stone-900/5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-lg font-extrabold">
                                {competition.title}
                              </h3>
                              <p className="mt-1 text-sm text-stone-500">
                                {sportName(competition.sport_id)}
                                {competition.location ? ` | ${competition.location}` : ""}
                              </p>
                            </div>

                            <Pill className={COMP_STYLE[status]}>
                              {COMP_LABEL[status]}
                            </Pill>
                          </div>

                          <p className="mt-4 flex items-center gap-2 text-sm text-stone-600">
                            <Icon name="calendar" className="h-4 w-4 text-yellow-600" />
                            {formatDate(competition.start_date)} to{" "}
                            {formatDate(competition.end_date)}
                          </p>

                          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                            <Pill className="bg-stone-100 text-stone-700 ring-stone-200">
                              <Icon name="users" className="h-3.5 w-3.5" />
                              {accepted}
                              {competition.max_participants !== null &&
                                ` / ${competition.max_participants}`}{" "}
                              accepted
                            </Pill>

                            {pending > 0 && (
                              <Pill className="bg-amber-50 text-amber-800 ring-amber-200">
                                {pending} to review
                              </Pill>
                            )}
                          </div>

                          <div className="mt-5 flex gap-2 border-t border-stone-100 pt-4">
                            <button
                              type="button"
                              onClick={() => openManage(competition)}
                              className="flex-1 rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-yellow-400 hover:text-black"
                            >
                              Manage
                            </button>

                            <button
                              type="button"
                              onClick={() => setCompetitionToDelete(competition)}
                              aria-label={`Delete ${competition.title}`}
                              className="rounded-xl border border-stone-200 px-3 text-stone-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-500"
                            >
                              <Icon name="trash" className="h-[18px] w-[18px]" />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {/* ========================================
          CREATE COMPETITION DIALOG
      ======================================== */}

      {showCreate && (
        <div
          className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => !saving && setShowCreate(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
            className="modal-in flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-[#FBF8F1] shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-5">
              <h2 id="create-title" className="text-lg font-extrabold">
                New competition
              </h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <Field label="Title">
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="City Open Cup"
                  className={INPUT_CLASS}
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Format, rules, prizes..."
                  className={INPUT_CLASS}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sport">
                  <select
                    value={form.sport_id}
                    onChange={(e) => setForm({ ...form, sport_id: e.target.value })}
                    className={INPUT_CLASS}
                  >
                    <option value="">Choose a sport</option>
                    {sports.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Location">
                  <input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className={INPUT_CLASS}
                  />
                </Field>

                <Field label="Starts">
                  <input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className={INPUT_CLASS}
                  />
                </Field>

                <Field label="Ends">
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className={INPUT_CLASS}
                  />
                </Field>

                <Field label="Registration deadline" hint="Optional">
                  <input
                    type="datetime-local"
                    value={form.registration_deadline}
                    onChange={(e) =>
                      setForm({ ...form, registration_deadline: e.target.value })
                    }
                    className={INPUT_CLASS}
                  />
                </Field>

                <Field label="Maximum participants" hint="Leave empty for no limit">
                  <input
                    type="number"
                    min={1}
                    value={form.max_participants}
                    onChange={(e) =>
                      setForm({ ...form, max_participants: e.target.value })
                    }
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>

              <Field label="Cover image link" hint="Optional">
                <input
                  type="url"
                  value={form.cover_image}
                  onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                  placeholder="https://..."
                  className={INPUT_CLASS}
                />
              </Field>
            </div>

            <div className="flex gap-3 border-t border-stone-200 bg-white p-4 sm:px-6">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                disabled={saving}
                className="flex-1 rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void createCompetition()}
                disabled={saving}
                className="flex-1 rounded-xl bg-yellow-400 px-4 py-3 text-sm font-bold text-black transition hover:bg-yellow-300 disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create competition"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          MANAGE COMPETITION DIALOG
      ======================================== */}

      {managed &&
        (() => {
          const status = getCompStatus(managed);
          const list = participantsOf(managed.id).sort((a, b) => {
            const order: Record<PartStatus, number> = {
              pending: 0,
              accepted: 1,
              other: 2,
              refused: 3,
            };
            return order[getPartStatus(a)] - order[getPartStatus(b)];
          });

          const accepted = list.filter((p) => getPartStatus(p) === "accepted");
          const full =
            managed.max_participants !== null &&
            accepted.length >= managed.max_participants;

          return (
            <div
              className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
              onClick={() => setManagedId(null)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="manage-title"
                className="modal-in flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-[#FBF8F1] shadow-2xl sm:rounded-3xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative bg-neutral-950 px-6 pb-6 pt-8 text-white sm:px-8">
                  <button
                    type="button"
                    onClick={() => setManagedId(null)}
                    aria-label="Close"
                    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/25"
                  >
                    <Icon name="close" className="h-5 w-5" />
                  </button>

                  <Pill className={COMP_STYLE[status]}>{COMP_LABEL[status]}</Pill>

                  <h2 id="manage-title" className="mt-3 text-2xl font-black">
                    {managed.title}
                  </h2>

                  <p className="mt-1 text-sm text-white/60">
                    {formatDate(managed.start_date)} to {formatDate(managed.end_date)}
                  </p>
                </div>

                <div className="flex-1 space-y-8 overflow-y-auto p-6 sm:p-8">
                  {/* APPLICATIONS */}
                  <section>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-extrabold">Applications</h3>
                      <Pill className="bg-yellow-100 text-stone-800 ring-yellow-200">
                        {accepted.length}
                        {managed.max_participants !== null && ` / ${managed.max_participants}`}{" "}
                        accepted
                      </Pill>
                    </div>

                    {list.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-500">
                        No athlete has applied yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {list.map((participant) => {
                          const partStatus = getPartStatus(participant);
                          const busy = busyId === participant.id;

                          return (
                            <div
                              key={participant.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100 font-black text-stone-800">
                                  {getInitial(personName(participant.user_id))}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold">
                                    {personName(participant.user_id)}
                                  </p>
                                  <p className="text-xs text-stone-400">
                                    Applied {formatDate(participant.registered_at)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Pill className={PART_STYLE[partStatus]}>
                                  {PART_LABEL[partStatus]}
                                </Pill>

                                {partStatus !== "accepted" && (
                                  <button
                                    type="button"
                                    disabled={busy || full}
                                    title={full ? "The competition is full" : undefined}
                                    onClick={() =>
                                      void setParticipantStatus(
                                        participant,
                                        PARTICIPANT_ACCEPTED,
                                        "Athlete accepted."
                                      )
                                    }
                                    className="rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Accept
                                  </button>
                                )}

                                {partStatus !== "refused" && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      void setParticipantStatus(
                                        participant,
                                        PARTICIPANT_REFUSED,
                                        "Athlete refused."
                                      )
                                    }
                                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                  >
                                    Refuse
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {/* RESULTS */}
                  <section>
                    <div className="mb-4">
                      <h3 className="font-extrabold">Results</h3>
                      <p className="mt-1 text-sm text-stone-500">
                        Give a position to each accepted athlete. Leave it empty
                        to skip someone.
                      </p>
                    </div>

                    {status === "coming_soon" ? (
                      <p className="rounded-xl border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-500">
                        You can enter results once the competition has started.
                      </p>
                    ) : accepted.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-500">
                        Accept at least one athlete to enter results.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {accepted.map((participant) => {
                          const row = resultRows[participant.id] ?? {
                            position: "",
                            score: "",
                            details: "",
                          };

                          const update = (patch: Partial<ResultRow>) =>
                            setResultRows((current) => ({
                              ...current,
                              [participant.id]: { ...row, ...patch },
                            }));

                          return (
                            <div
                              key={participant.id}
                              className="grid gap-3 rounded-xl border border-stone-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_80px_90px_minmax(0,1fr)] sm:items-center"
                            >
                              <p className="truncate text-sm font-bold">
                                {personName(participant.user_id)}
                              </p>

                              <input
                                type="number"
                                min={1}
                                value={row.position}
                                onChange={(e) => update({ position: e.target.value })}
                                placeholder="Rank"
                                aria-label={`Position of ${personName(participant.user_id)}`}
                                className={INPUT_CLASS}
                              />

                              <input
                                type="number"
                                value={row.score}
                                onChange={(e) => update({ score: e.target.value })}
                                placeholder="Score"
                                aria-label={`Score of ${personName(participant.user_id)}`}
                                className={INPUT_CLASS}
                              />

                              <input
                                value={row.details}
                                onChange={(e) => update({ details: e.target.value })}
                                placeholder="Note (optional)"
                                aria-label={`Note for ${personName(participant.user_id)}`}
                                className={INPUT_CLASS}
                              />
                            </div>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => void saveResults()}
                          disabled={savingResults}
                          className="w-full rounded-xl bg-yellow-400 px-6 py-3.5 text-sm font-bold text-black transition hover:bg-yellow-300 disabled:opacity-50"
                        >
                          {savingResults ? "Saving..." : "Save results"}
                        </button>
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ========================================
          DELETE CONFIRMATION
      ======================================== */}

      {competitionToDelete && (
        <div
          className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onClick={() => setCompetitionToDelete(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="modal-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Icon name="trash" className="h-6 w-6" />
            </span>

            <h2 id="delete-title" className="text-lg font-extrabold">
              Delete this competition?
            </h2>

            <p className="mt-2 text-sm leading-6 text-stone-500">
              &quot;{competitionToDelete.title}&quot; and its applications and
              results will be removed. This can&apos;t be undone.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setCompetitionToDelete(null)}
                className="flex-1 rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
              >
                Keep it
              </button>

              <button
                type="button"
                onClick={() => void confirmDeleteCompetition()}
                disabled={busyId === competitionToDelete.id}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {busyId === competitionToDelete.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
