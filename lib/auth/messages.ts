/** User-facing copy for ?error= codes set by the OAuth routes. */
export const AUTH_ERRORS: Record<string, string> = {
  google_unavailable: "Google sign-in isn't set up on this server. Please use your email and password.",
  google_cancelled: "Google sign-in was cancelled.",
  google_expired: "Your Google sign-in session expired. Please try again.",
  google_failed: "We couldn't sign you in with Google. Please try again.",
  google_unverified: "Your Google email address isn't verified, so we can't use it to sign in.",
  google_in_use: "That Google account is already connected to a different NOVA account.",
  google_already: "A Google account is already connected. Disconnect it first to use another one.",
  rate_limited: "Too many attempts. Please wait a few minutes and try again.",
};
