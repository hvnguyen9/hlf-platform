import { AppShell } from "@/components/app-shell";
import ThemeCookieSync from "@/components/layout/ThemeCookieSync";
import { IdleSignout } from "@/features/auth/components/IdleSignout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <ThemeCookieSync />
      <IdleSignout />
      {children}
    </AppShell>
  );
}
