import { NextResponse, type NextRequest } from "next/server";
import { liveSearch } from "@/lib/services/catalog";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  try {
    const data = await liveSearch(q);
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } });
  } catch (e) {
    logger.error("api.search", e);
    return NextResponse.json({ error: "Search is temporarily unavailable." }, { status: 500 });
  }
}
