import { auth } from "@/server/auth/auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function ProtectedPage({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session) redirect("/login");

  return <>{children}</>;
}
