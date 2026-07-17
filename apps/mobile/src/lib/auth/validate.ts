/**
 * Client-side auth validation. Mirrors the web rules (password ≥ 8 chars);
 * copy stays calm and instructional.
 */

export const MIN_PASSWORD_LENGTH = 8;

/** Pragmatic email shape check — the server remains the final authority. */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function validateSignIn(email: string, password: string): string | null {
  if (!isValidEmail(email)) return "Please enter a valid email address.";
  if (password.length === 0) return "Please enter your password.";
  return null;
}

export function validateSignUp(email: string, password: string, confirm: string): string | null {
  if (!isValidEmail(email)) return "Please enter a valid email address.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Please choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirm) return "Those passwords don’t match. One more look?";
  return null;
}

export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Please choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirm) return "Those passwords don’t match. One more look?";
  return null;
}
