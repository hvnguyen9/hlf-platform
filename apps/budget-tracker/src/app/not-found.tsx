import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
      <div className="text-6xl font-bold text-muted-foreground/20">404</div>
      <h2 className="text-xl font-semibold">Page not found</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        The page you&apos;re looking for doesn&apos;t exist or was moved.
      </p>
      <Link href="/dashboard" className="text-sm text-primary hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
