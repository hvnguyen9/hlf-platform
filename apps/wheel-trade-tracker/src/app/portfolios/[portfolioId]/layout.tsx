import { headers } from "next/headers";
import { getBaseUrl } from "@/lib/getBaseUrl";
import PortfolioSubNav from "@/features/portfolios/components/PortfolioSubNav";
import type { Portfolio } from "@/types";

export default async function PortfolioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ portfolioId: string }>;
}) {
  const { portfolioId } = await params;
  const baseUrl = await getBaseUrl();
  const headersList = await headers();
  const cookie = headersList.get("cookie") || "";

  const res = await fetch(`${baseUrl}/api/portfolios/${portfolioId}`, {
    cache: "no-store",
    headers: { Cookie: cookie },
  });

  const portfolio: Portfolio | null = res.ok ? await res.json() : null;

  return (
    <>
      <PortfolioSubNav portfolioId={portfolioId} portfolio={portfolio} />
      {children}
    </>
  );
}
