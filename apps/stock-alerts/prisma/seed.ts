import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

// Curated wheel-strategy universe — high-volume, optionable, well-known names.
// Ticker.createdBy is left null on these so they show up under "Wheel Universe"
// for every user. Users can hide individual ones from their own view via
// HiddenTicker, or add their own (which become user-scoped).
const WHEEL_UNIVERSE = [
  { symbol: "AAPL",  name: "Apple Inc.",                       sector: "Technology" },
  { symbol: "MSFT",  name: "Microsoft Corporation",            sector: "Technology" },
  { symbol: "GOOGL", name: "Alphabet Inc.",                    sector: "Technology" },
  { symbol: "AMZN",  name: "Amazon.com Inc.",                  sector: "Consumer Discretionary" },
  { symbol: "NVDA",  name: "NVIDIA Corporation",               sector: "Technology" },
  { symbol: "META",  name: "Meta Platforms Inc.",              sector: "Technology" },
  { symbol: "TSLA",  name: "Tesla Inc.",                       sector: "Consumer Discretionary" },
  { symbol: "JPM",   name: "JPMorgan Chase & Co.",             sector: "Financials" },
  { symbol: "V",     name: "Visa Inc.",                        sector: "Financials" },
  { symbol: "MA",    name: "Mastercard Inc.",                  sector: "Financials" },
  { symbol: "UNH",   name: "UnitedHealth Group Inc.",          sector: "Healthcare" },
  { symbol: "JNJ",   name: "Johnson & Johnson",                sector: "Healthcare" },
  { symbol: "PFE",   name: "Pfizer Inc.",                      sector: "Healthcare" },
  { symbol: "ABBV",  name: "AbbVie Inc.",                      sector: "Healthcare" },
  { symbol: "AMD",   name: "Advanced Micro Devices Inc.",      sector: "Technology" },
  { symbol: "INTC",  name: "Intel Corporation",                sector: "Technology" },
  { symbol: "CRM",   name: "Salesforce Inc.",                  sector: "Technology" },
  { symbol: "ORCL",  name: "Oracle Corporation",               sector: "Technology" },
  { symbol: "NFLX",  name: "Netflix Inc.",                     sector: "Communication Services" },
  { symbol: "DIS",   name: "The Walt Disney Company",          sector: "Communication Services" },
  { symbol: "COST",  name: "Costco Wholesale Corporation",     sector: "Consumer Staples" },
  { symbol: "WMT",   name: "Walmart Inc.",                     sector: "Consumer Staples" },
  { symbol: "KO",    name: "The Coca-Cola Company",            sector: "Consumer Staples" },
  { symbol: "PEP",   name: "PepsiCo Inc.",                     sector: "Consumer Staples" },
  { symbol: "XOM",   name: "Exxon Mobil Corporation",          sector: "Energy" },
  { symbol: "CVX",   name: "Chevron Corporation",              sector: "Energy" },
  { symbol: "BAC",   name: "Bank of America Corporation",      sector: "Financials" },
  { symbol: "GS",    name: "The Goldman Sachs Group Inc.",     sector: "Financials" },
  { symbol: "SPY",   name: "SPDR S&P 500 ETF Trust",           sector: "ETF" },
  { symbol: "QQQ",   name: "Invesco QQQ Trust",                sector: "ETF" },
];

async function main() {
  console.log(`Seeding ${WHEEL_UNIVERSE.length} approved wheel-universe tickers...`);

  for (const t of WHEEL_UNIVERSE) {
    await prisma.ticker.upsert({
      where: { symbol: t.symbol },
      update: { name: t.name, sector: t.sector, isApproved: true },
      create: { symbol: t.symbol, name: t.name, sector: t.sector, isApproved: true },
    });
  }

  console.log(`✓ Seeded ${WHEEL_UNIVERSE.length} tickers`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
