import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AssessmentView } from "./assessment-view";

export default async function AssessmentPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return <AssessmentView />;
}
