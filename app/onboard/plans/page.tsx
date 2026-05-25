import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PlansView } from "./plans-view";

export default async function PlansPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return <PlansView />;
}
