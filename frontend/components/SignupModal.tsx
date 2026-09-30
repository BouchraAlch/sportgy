"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUpClient } from "@/lib/auth";

interface SignupModalProps {
onClose: () => void;
onSwitchToLogin: () => void;
}

export default function SignupModal({
onClose,
onSwitchToLogin,
}: SignupModalProps) {
const router = useRouter();

const [fullName, setFullName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const [loading, setLoading] = useState(false);
const [message, setMessage] = useState("");

async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
e.preventDefault();

setLoading(true);
setMessage("");

try {
  const data = await signUpClient(email, password, fullName);

  // Supabase created a session immediately
  if (data.session) {
    onClose();
    router.push("/");
    return;
  }

  // Email confirmation required
  setMessage(
    "Account created successfully. Please check your email to confirm your account."
  );

  setFullName("");
  setEmail("");
  setPassword("");
} catch (error: unknown) {
  if (error instanceof Error) {
    setMessage(error.message);
  } else {
    setMessage("Something went wrong.");
  }
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
      aria-label="Close signup modal"
      className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-black transition-colors text-xl"
    >
      ×
    </button>

    {/* Header */}
    <div className="text-center mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        Create Client Account
      </h1>

      <p className="text-sm text-gray-500 mt-1">
        Enter your details below to get started.
      </p>
    </div>

    {/* Form */}
    <form onSubmit={handleSignup} className="space-y-4">

      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full Name
        </label>

        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Doe"
          required
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
        />
      </div>

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

      {/* Message */}
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
        {loading ? "Creating account..." : "Sign Up"}
      </button>
    </form>

    {/* Switch to login */}
    <p className="text-sm text-gray-500 text-center mt-6">
      Already have an account?{" "}
      <button
        type="button"
        onClick={onSwitchToLogin}
        className="font-semibold text-black hover:text-yellow-500 transition-colors"
      >
        Login
      </button>
    </p>
  </div>
</div>

);
}