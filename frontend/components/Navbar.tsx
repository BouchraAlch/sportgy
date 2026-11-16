
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { signOutUser } from "@/lib/auth";
import AuthModal from "@/components/AuthModal";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  // Authentication modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">(
    "login"
  );

  const profileRef = useRef<HTMLDivElement>(null);

  // Check the current user and listen for authentication changes
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }

      setLoadingAuth(false);
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setProfileOpen(false);
      }

      setLoadingAuth(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Close the profile menu when clicking outside
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

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle user logout
  async function handleLogout() {
    try {
      await signOutUser();

      setUser(null);
      setProfileOpen(false);

      // Redirect to the homepage
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  // Open the authentication modal
  function openAuthModal(mode: "login" | "signup") {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }

  return (
    <>
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 w-full z-50">
        {/* Announcement Banner */}
        <div className="w-full bg-black text-yellow-400 text-sm font-medium py-2 overflow-hidden whitespace-nowrap border-b border-slate-800">
          <div className="inline-block animate-marquee pl-[100%]">
            Demo Project — This is a portfolio showcase. All data, bookings,
            and users are fictional.
          </div>
        </div>

        {/* Navbar */}
        <div className="w-full flex justify-center px-4 mt-2">
          <nav className="w-full max-w-5xl bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl px-4 md:px-8 py-2 flex items-center justify-between shadow-lg shadow-black/30">

            {/* Logo and Navigation */}
            <div className="flex items-center space-x-6">
              <Link
                href="/"
                className="flex items-center gap-1"
                aria-label="SportGy home"
              >
                <img
                  src="/logo.png"
                  alt="SportGy"
                  className="h-9 md:h-10 w-auto"
                />
              </Link>

              {/* Desktop Navigation Links */}
              <div className="hidden md:flex items-center space-x-4 text-sm font-semibold text-white/80">
                <Link
                  href="/"
                  className="hover:text-yellow-400 transition-colors"
                >
                  Home
                </Link>

                <Link
                  href="/booking"
                  className="hover:text-yellow-400 transition-colors"
                >
                  Booking
                </Link>

                <Link
                  href="/community"
                  className="hover:text-yellow-400 transition-colors"
                >
                  Community
                </Link>

                <Link
                  href="/competitions"
                  className="hover:text-yellow-400 transition-colors"
                >
                  Competitions
                </Link>

                <Link
                  href="/marketplace"
                  className="hover:text-yellow-400 transition-colors"
                >
                  Marketplace
                </Link>

                <Link
                  href="/support"
                  className="hover:text-yellow-400 transition-colors"
                >
                  Support
                </Link>
              </div>
            </div>

            {/* Right Side: Authentication or Profile */}
            <div className="flex items-center space-x-3">
              {!loadingAuth &&
                (user ? (
                  /* Logged-in User */
                  <div ref={profileRef} className="relative">
                    {/* Profile Icon */}
                    <button
                      type="button"
                      onClick={() => setProfileOpen((prev) => !prev)}
                      aria-label="Open profile menu"
                      aria-expanded={profileOpen}
                      className="w-10 h-10 rounded-full border-2 border-yellow-400 bg-white/10 hover:bg-yellow-400/20 transition-colors flex items-center justify-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="w-5 h-5 text-yellow-400"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a8.25 8.25 0 0 1 15 0"
                        />
                      </svg>
                    </button>

                    {/* Profile Dropdown */}
                    {profileOpen && (
                      <div className="absolute right-0 mt-3 w-52 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl shadow-black/40 overflow-hidden">

                        {/* User Information */}
                        <div className="px-4 py-3 border-b border-white/10">
                          <p className="text-sm font-semibold text-white truncate">
                            {user.user_metadata?.full_name || "User"}
                          </p>

                          <p className="text-xs text-white/50 truncate mt-1">
                            {user.email}
                          </p>
                        </div>

                        {/* Profile */}
                        <Link
                          href="/client/dashboard"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 hover:text-yellow-400 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1-7.5 0 8.25 8.25 0 0 1 15 0"
                            />
                          </svg>

                          <span>Profile</span>
                        </Link>

                        {/* Settings */}
                        <Link
                          href="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 hover:text-yellow-400 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M10.5 6h9.75M3.75 6h2.25m0 0a2.25 2.25 0 1 0 4.5 0m-4.5 0a2.25 2.25 0 1 1 4.5 0M3.75 12h9.75m0 0h6.75m-16.5 0a2.25 2.25 0 1 0 4.5 0m-4.5 0a2.25 2.25 0 1 1 4.5 0M14.25 18h6m-16.5 0h6m0 0a2.25 2.25 0 1 0 4.5 0m-4.5 0a2.25 2.25 0 1 1 4.5 0"
                            />
                          </svg>

                          <span>Settings</span>
                        </Link>

                        {/* Logout */}
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/10"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15"
                            />

                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M18 15l3-3m0 0l-3-3m3 3H9"
                            />
                          </svg>

                          <span>Log Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Logged-out User */
                  <>
                    {/* Get Started - Signup */}
                    <button
                      type="button"
                      onClick={() => openAuthModal("signup")}
                      className="bg-transparent border border-white/60 hover:border-yellow-400 hover:text-yellow-400 text-white text-xs md:text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                      Get Started
                    </button>

                    {/* Log In - Login */}
                    <button
                      type="button"
                      onClick={() => openAuthModal("login")}
                      className="bg-yellow-400 hover:bg-yellow-300 text-black text-xs md:text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
                    >
                      Log In
                    </button>
                  </>
                ))}
            </div>
          </nav>
        </div>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      {/* Marquee Animation */}
      <style jsx global>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }

          100% {
            transform: translateX(-100%);
          }
        }

        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
      `}</style>
    </>
  );
}
