"use server";
import { lucia } from "src/server/LOGIN_LUCIA_ACTION/lucia";
import { cookies } from "next/headers";
import { generateCodeVerifier, generateState } from "arctic";
import { google } from "~/server/LOGIN_LUCIA_ACTION/googleOauth";

export async function logOut() {
  const sessionCookie = lucia.createBlankSessionCookie();
  (await cookies()).set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );
  return { success: true };
}

export async function getGoogleOauthConsentUrl() {
  try {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();


    (await cookies()).set("codeVerifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    (await cookies()).set("state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });


    const scopes = [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];


    const authUrl = google.createAuthorizationURL(
      state,
      codeVerifier,
      scopes
    );

    return { success: true, url: authUrl.toString() };
  } catch (error: unknown) {
    return { success: false, error };
  }
}



