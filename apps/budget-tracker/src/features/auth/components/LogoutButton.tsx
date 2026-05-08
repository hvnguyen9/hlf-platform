"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-2 text-sm text-destructive hover:underline"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  );
}
