/**
 * Expo Push Notification service.
 * Sends push notifications via the Expo Push API (no auth key required).
 *
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

export interface PushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoPushResponse {
  data?: ExpoPushTicket[];
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Errors that mean the token is permanently invalid and should be pruned.
 */
const INVALID_TOKEN_ERRORS = new Set([
  "DeviceNotRegistered",
  "InvalidCredentials",
]);

/**
 * Send one or more push notifications.
 * Returns a list of tokens that were rejected with an invalid-token error
 * so callers can prune them from storage.
 */
export async function sendExpoPush(
  messages: PushMessage | PushMessage[]
): Promise<{ invalidTokens: string[] }> {
  const batch = Array.isArray(messages) ? messages : [messages];
  if (batch.length === 0) return { invalidTokens: [] };

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) return { invalidTokens: [] };

    const json = (await res.json()) as ExpoPushResponse;
    const tickets = json.data ?? [];

    const invalidTokens: string[] = [];
    tickets.forEach((ticket, i) => {
      if (
        ticket.status === "error" &&
        ticket.details?.error &&
        INVALID_TOKEN_ERRORS.has(ticket.details.error)
      ) {
        const msg = batch[i];
        const to = Array.isArray(msg.to) ? msg.to : [msg.to];
        invalidTokens.push(...to);
      }
    });

    return { invalidTokens };
  } catch {
    // Network failure — best-effort, do not propagate
    return { invalidTokens: [] };
  }
}

/**
 * Send alert push notifications to a set of Expo push tokens.
 * Returns tokens that are permanently invalid (DeviceNotRegistered, etc.)
 * so the caller can prune them.
 */
export async function sendAlertPush(
  tokens: string[],
  message: string
): Promise<{ invalidTokens: string[] }> {
  if (tokens.length === 0) return { invalidTokens: [] };
  const messages: PushMessage[] = tokens.map((token) => ({
    to: token,
    title: "Novo Alerta — Método Ponto B",
    body: message,
    sound: "default" as const,
  }));
  return sendExpoPush(messages);
}
