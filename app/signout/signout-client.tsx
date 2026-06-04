"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Loader2 } from "lucide-react";

// sessionStorage key shared with the onboarding flow. Kept as a
// literal here (rather than imported) so this file has no cross-cutting
// dependency on the onboarding components.
const ONBOARDING_STORAGE_KEY = "careerpilot:onboarding";

export function SignOutClient() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Clear onboarding state FIRST so even if signOut() throws or
      // the user kills the tab mid-redirect, the next session starts
      // clean.
      try {
        sessionStorage.removeItem(ONBOARDING_STORAGE_KEY);
      } catch {
        // private mode / storage disabled — best effort, continue
      }

      try {
        await signOut({ redirectTo: "/login" });
      } catch (err) {
        if (cancelled) return;
        console.error("[signout] signOut failed", err);
        setError("Couldn't complete sign-out. Try again from the login page.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        {error ? (
          <>
            <h1 className="text-xl font-semibold">Sign-out issue</h1>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
          </>
        ) : (
          <>
            <Loader2
              className="mx-auto h-6 w-6 animate-spin text-black"
              aria-hidden="true"
            />
            <p
              className="mt-6 text-sm text-gray-700"
              aria-live="polite"
            >
              Signing you out…
            </p>
          </>
        )}
      </div>
    </main>
  );
}
