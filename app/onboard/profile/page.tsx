import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProfileSelector } from "./profile-selector";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return <ProfileSelector />;
}
