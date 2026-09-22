"use client";

import { useRouter } from "next/navigation";
import { signOutUser } from "@/lib/auth";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await signOutUser();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  return (
    <button onClick={handleLogout}>
      Logout
    </button>
  );
}