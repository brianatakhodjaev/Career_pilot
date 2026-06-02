import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isProfileId } from "@/lib/profiles";
import { ProudIntake } from "./proud-intake";

interface PageProps {
  searchParams: Promise<{ profile?: string }>;
}

export default async function ProudPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { profile } = await searchParams;
  if (!profile || !isProfileId(profile)) {
    redirect("/onboard/profile");
  }

  return <ProudIntake profile={profile} />;
}
