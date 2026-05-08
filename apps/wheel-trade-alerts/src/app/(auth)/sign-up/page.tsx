"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Bell, BarChart2, ShieldCheck, TrendingDown } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getLatestVersion } from "@/data/changelog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";



const FEATURES = [
  { icon: TrendingDown, label: "RSI + support/resistance entry signals" },
  { icon: BarChart2, label: "Daily digest — email and Discord" },
  { icon: ShieldCheck, label: "Position exit monitoring and roll alerts" },
];


export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Registration failed.");
    } else {
      toast.success("Account created! Sign in to continue.");
      router.push("/sign-in");
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — brand panel */}
      <div
        className="hidden lg:flex lg:w-2/5 flex-col justify-between p-10 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, oklch(0.38 0.22 290), oklch(0.30 0.20 295) 60%, oklch(0.22 0.15 300))" }}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-20 blur-3xl"
          style={{ background: "oklch(0.72 0.17 65)" }}
        />

        <div className="relative flex items-center gap-3 z-10">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}
          >
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-base leading-tight">HLF Wheel Alerts</p>
            <p className="text-[11px] text-white/60 leading-none mt-0.5">HL Financial Strategies</p>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Wheel Strategy</p>
            <h2 className="text-3xl font-bold leading-snug tracking-tight">
              Know when to enter.<br />Know when to exit.
            </h2>
            <p className="text-sm text-white/70 leading-relaxed max-w-xs">
              Daily signals for the wheel strategy — RSI, support/resistance, and position exit alerts delivered to your inbox and Discord.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                >
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm text-white/80">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="h-px bg-white/10 mb-4" />
          <p className="text-[11px] text-white/40">© {new Date().getFullYear()} HL Financial Strategies</p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <Bell className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-base text-foreground leading-tight">HLF Wheel Alerts</p>
              <p className="text-[11px] text-muted-foreground leading-none">HL Financial Strategies</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Create an account</h2>
            <p className="text-muted-foreground text-sm mt-1.5">Get wheel strategy alerts in your inbox or Discord</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" type="text" required autoComplete="name" className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="h-11" />
            </div>
            <Button type="submit" className="w-full h-11 text-base font-semibold mt-2" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>

          <p className="mt-8 text-center text-[11px] text-muted-foreground/40 flex items-center justify-center gap-2">
            <span>© {new Date().getFullYear()} HL Financial Strategies</span>
            <span className="opacity-40">·</span>
            <Link href="/changelog" className="hover:text-muted-foreground transition-colors flex items-center gap-1">
              <span>{getLatestVersion()}</span>
              <span>— What&apos;s new</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
