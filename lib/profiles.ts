// Persona identifiers — locked in spec §2 (kickoff) and used as URL param,
// DB value (UserProfile.profileType), and Claude API input. Display titles
// are decoupled from these ids and live in the UI components.

export const PROFILE_IDS = ["veteran", "threatened", "starter"] as const;

export type ProfileId = (typeof PROFILE_IDS)[number];

export function isProfileId(value: string): value is ProfileId {
  return (PROFILE_IDS as readonly string[]).includes(value);
}
