import { SignOutClient } from "./signout-client";

// /signout — the canonical sign-out entry for the app. Future Sign Out
// buttons should link here. The client component clears the onboarding
// sessionStorage key BEFORE calling NextAuth signOut(), so a returning
// user signing in to a different account on the same tab can't inherit
// the prior account's intake state. Closes the stale-reviewSummary
// class of bugs alongside the write-time invalidation in
// background-intake.tsx.

export default function SignOutPage() {
  return <SignOutClient />;
}
