"use server";

import { cookies } from "next/headers";

const COOKIE_NAME = "NEXT_LOCALE";

export async function setUserLocale(locale: string) {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, locale, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });
}

export async function getUserLocale(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || "en";
}
