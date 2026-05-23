import AsyncStorage from "@react-native-async-storage/async-storage";

const COOKIE_KEY = "pontob_session";

export function getBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) return "http://localhost:80";
  return `https://${domain}`;
}

export async function getStoredCookie(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(COOKIE_KEY);
  } catch {
    return null;
  }
}

export async function storeSessionCookie(
  setCookieHeader: string | null
): Promise<void> {
  if (!setCookieHeader) return;
  const match = setCookieHeader.match(/connect\.sid=[^;]+/);
  if (match) {
    try {
      await AsyncStorage.setItem(COOKIE_KEY, match[0]);
    } catch {}
  }
}

export async function clearSessionCookie(): Promise<void> {
  try {
    await AsyncStorage.removeItem(COOKIE_KEY);
  } catch {}
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const cookie = await getStoredCookie();
  const existingHeaders =
    (options.headers as Record<string, string>) ?? {};
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...existingHeaders,
    ...(cookie ? { Cookie: cookie } : {}),
  };

  const url = `${getBaseUrl()}/api${path}`;
  return fetch(url, { ...options, headers });
}
