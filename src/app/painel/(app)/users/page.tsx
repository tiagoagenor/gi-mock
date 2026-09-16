import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { UsersView } from "@/components/panel/users/users-view";

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/painel/login");
  if (user.role !== "ADMIN") redirect("/painel/mocks");
  return <UsersView />;
}
