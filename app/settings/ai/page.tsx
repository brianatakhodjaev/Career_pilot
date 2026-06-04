import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AiSettingsForm } from "./ai-settings-form";

export default async function AiSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
    select: { byoApiProvider: true, byoApiKey: true },
  });
  return (
    <AiSettingsForm
      initialProvider={settings?.byoApiProvider ?? "none"}
      hasKey={Boolean(settings?.byoApiKey)}
    />
  );
}
