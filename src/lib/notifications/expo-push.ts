import "server-only";

/**
 * Expo push sender — SERVER ONLY.
 *
 * Sends through Expo's push API (https://exp.host/--/api/v2/push/send).
 * The optional EXPO_ACCESS_TOKEN (enhanced push security, if enabled for the
 * EAS project) is a server secret and never reaches any client bundle.
 * Notification bodies come exclusively from the tested copy catalog.
 */

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default";
}

export interface ExpoPushOutcome {
  /** "ok" | "DeviceNotRegistered" | "error:<category>" */
  status: string;
  tokenExpired: boolean;
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendExpoPush(
  message: ExpoPushMessage,
  fetchFn: typeof fetch = fetch,
): Promise<ExpoPushOutcome> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const accessToken = process.env.EXPO_ACCESS_TOKEN;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  try {
    const response = await fetchFn(EXPO_PUSH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...message, sound: message.sound ?? "default" }),
    });
    if (!response.ok) {
      return { status: `error:http_${response.status}`, tokenExpired: false };
    }
    const payload = (await response.json()) as {
      data?: { status?: string; details?: { error?: string } };
    };
    const ticket = payload.data;
    if (ticket?.status === "ok") return { status: "ok", tokenExpired: false };
    const detail = ticket?.details?.error ?? "unknown";
    return { status: detail, tokenExpired: detail === "DeviceNotRegistered" };
  } catch {
    return { status: "error:network", tokenExpired: false };
  }
}
