"use client";

/**
 * Support page
 *
 * Suggested route: app/support/page.tsx
 *
 * Messages are saved in the `support_messages` table.
 * Create it with support-messages.sql (included with this page).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";

// ============================================
// CONFIG
// ============================================

const LOGIN_ROUTE = "/login";
const MAX_MESSAGE = 2000;

const CATEGORIES = [
  "Booking",
  "Competitions",
  "Marketplace",
  "Community",
  "My account",
  "Other",
];

const FAQS = [
  {
    question: "How do I book a session with a coach?",
    answer:
      "Open Booking, choose a sport, then a club, then a coach. Pick a day and a time slot and confirm. Sessions last 90 minutes and you can book up to 90 days ahead.",
  },
  {
    question: "Does the coach have to accept my booking?",
    answer:
      "Yes. After you book, the coach can accept or refuse the session. Keep an eye on your notifications to see their answer.",
  },
  {
    question: "How do I join a competition?",
    answer:
      "Open Competitions, choose one that is coming soon and press Join. The club that organizes it may need to accept your application before you can take part.",
  },
  {
    question: "How does the marketplace work?",
    answer:
      "Sellers publish their sports gear with a description, the condition (new or used), a price and a phone number. Buyers contact the seller directly by WhatsApp or by phone. SportGy does not handle payments.",
  },
  {
    question: "Which images can I upload?",
    answer:
      "JPG, PNG or WebP images, up to 5 MB each.",
  },
  {
    question: "I can't log in. What should I do?",
    answer:
      "Check that your email and password are correct. If it still doesn't work, send us a message with the category \"My account\" and we will help you.",
  },
];

const INPUT_CLASS =
  "w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-2 focus:ring-yellow-200";

// ============================================
// PAGE
// ============================================

export default function SupportPage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const [email, setEmail] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        setUserId(data.user.id);
        setEmail(data.user.email ?? "");
      }

      setChecking(false);
    }

    void load();
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!userId) {
      setError("Please log in to send a message.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    if (subject.trim().length < 3) {
      setError("Write a short subject (at least 3 characters).");
      return;
    }

    if (message.trim().length < 10) {
      setError("Please describe your problem in a few words (at least 10 characters).");
      return;
    }

    setSending(true);

    const { error: insertError } = await supabase.from("support_messages").insert({
      user_id: userId,
      email: email.trim(),
      category,
      subject: subject.trim(),
      message: message.trim(),
    });

    setSending(false);

    if (insertError) {
      console.error("Support message error:", insertError);
      setError("We could not send your message. Please try again.");
      return;
    }

    setSent(true);
    setSubject("");
    setMessage("");
    setCategory(CATEGORIES[0]);
  }

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-stone-900">
      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: none; }
        }
        .card-in { animation: cardIn 550ms cubic-bezier(.22,.61,.36,1) both; }

        @keyframes checkPop {
          0%   { transform: scale(.4); opacity: 0; }
          60%  { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); }
        }
        .check-pop { animation: checkPop 600ms cubic-bezier(.22,.61,.36,1) both; }

        @media (prefers-reduced-motion: reduce) {
          .card-in, .check-pop { animation: none !important; }
        }
      `}</style>

      {/* HEADER */}
      <header className="bg-neutral-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            How can we <span className="text-yellow-400">help</span>?
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-7 text-white/65 sm:text-base">
            Find a quick answer below, or send us a message and we will get back
            to you.
          </p>
        </div>
      </header>

      <div className="mx-auto -mt-12 grid max-w-5xl gap-6 px-4 sm:px-6 lg:grid-cols-5 lg:px-8">
        {/* FAQ */}
        <section className="card-in rounded-2xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-900/5 lg:col-span-2">
          <h2 className="mb-4 text-lg font-extrabold">Common questions</h2>

          <div className="divide-y divide-stone-100">
            {FAQS.map((faq) => (
              <details key={faq.question} className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-stone-800 marker:hidden [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 shrink-0 text-stone-400 transition-transform duration-300 group-open:rotate-180"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>

                <p className="mt-3 text-sm leading-6 text-stone-500">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CONTACT FORM */}
        <section
          className="card-in rounded-2xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-900/5 lg:col-span-3"
          style={{ animationDelay: "100ms" }}
        >
          {checking ? (
            <div className="h-72 animate-pulse rounded-xl bg-stone-100" />
          ) : sent ? (
            <div className="space-y-4 py-10 text-center">
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

              <h2 className="text-2xl font-extrabold">Message sent</h2>

              <p className="mx-auto max-w-sm text-sm leading-6 text-stone-500">
                Thank you. We received your message and will reply to{" "}
                <span className="font-semibold text-stone-800">{email}</span>.
              </p>

              <button
                type="button"
                onClick={() => setSent(false)}
                className="rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-black transition hover:bg-yellow-300"
              >
                Send another message
              </button>
            </div>
          ) : !userId ? (
            <div className="space-y-4 py-10 text-center">
              <h2 className="text-xl font-extrabold">Log in to contact us</h2>
              <p className="mx-auto max-w-sm text-sm text-stone-500">
                Log in so we can link your message to your account and answer
                you faster.
              </p>
              <Link
                href={LOGIN_ROUTE}
                className="inline-block rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-black transition hover:bg-yellow-300"
              >
                Log in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <h2 className="text-lg font-extrabold">Send us a message</h2>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-stone-700">
                    Your email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className={INPUT_CLASS}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-stone-700">
                    Topic
                  </span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={INPUT_CLASS}
                  >
                    {CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-stone-700">
                  Subject
                </span>
                <input
                  value={subject}
                  maxLength={120}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What is it about?"
                  className={INPUT_CLASS}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-sm font-semibold text-stone-700">
                  Message
                  <span className="text-xs font-normal text-stone-400">
                    {message.length}/{MAX_MESSAGE}
                  </span>
                </span>
                <textarea
                  value={message}
                  maxLength={MAX_MESSAGE}
                  rows={6}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what happened"
                  className={`${INPUT_CLASS} resize-y`}
                />
              </label>

              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-xl bg-yellow-400 px-6 py-3.5 text-sm font-bold text-black shadow-md transition hover:-translate-y-0.5 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {sending ? "Sending..." : "Send message"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
