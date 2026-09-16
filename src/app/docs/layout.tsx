import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { DocsShell } from "@/components/docs/docs-shell";

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/painel/login");
  return <DocsShell>{children}</DocsShell>;
}
