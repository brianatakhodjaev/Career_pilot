import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ConfirmView } from "./confirm-view";

export default async function ConfirmPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return <ConfirmView />;
}
