import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/google";

// Without this Next prerenders the redirect at build time, freezing whatever
// GOOGLE_REDIRECT_URI was set then.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.redirect(getAuthUrl());
}
