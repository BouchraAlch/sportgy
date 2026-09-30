"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
signInUser,
getCurrentUserProfile,
} from "@/lib/auth";

interface LoginModalProps {
onClose: () => void;
onSwitchToSignup: () => void;
}

export default function LoginModal({
onClose,
onSwitchToSignup,
}: LoginModalProps) {
const router = useRouter();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const [loading, setLoading] = useState(false);
const [message, setMessage] = useState("");

async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
e.preventDefault();

setLoading(true);
setMessage("");

try {
  await signInUser(email, password);

  const profile = await getCurrentUserProfile();

  if (!profile) {
    throw new Error("User profile not found.");
  }

  console.log("Logged-in user role:", profile.role);

  // Close the modal first
  onClose();

  // Redirect according to role
  switch (profile.role) {
    case "client":
      router.push("/");
      break;

    case "coach":
      router.push("/coach/dashboard");
      break;

    case "club_owner":
      router.push("/club-owner/dashboard");
      break;

    case "admin":
      router.push("/admin/dashboard");
      break;

    default:
      throw new Error("Invalid user role.");
  }
} catch (error: any) {
  setMessage(error.message);
} finally {
  setLoading(false);
}

}

return (
<div
className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
onMouseDown={(e) => {
if (e.target === e.currentTarget) {
onClose();
}
}}
>
<div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-8">

    {/* Close button */}
    <button
      type="button"
      onClick={onClose}
      aria-label="Close login modal"
      className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-black transition-colors text-xl"
    >
      ×
    </button>

    {/* Header */}
    <div className="text-center mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        Welcome Back
      </h1>

      <p className="text-sm text-gray-500 mt-1">
        Sign in to access your account.
      </p>
    </div>

    {/* Form */}
    <form onSubmit={handleLogin} className="space-y-4">

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
        />
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
        />
      </div>

      {/* Error */}
      {message && (
        <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-700 text-center leading-relaxed">
            {message}
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-black hover:bg-gray-800 text-white font-medium rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>

    {/* Switch to signup */}
    <p className="text-sm text-gray-500 text-center mt-6">
      Don't have an account?{" "}
      <button
        type="button"
        onClick={onSwitchToSignup}
        className="font-semibold text-black hover:text-yellow-500 transition-colors"
      >
        Sign Up
      </button>
    </p>
  </div>
</div>

);
}