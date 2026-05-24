/**
 * NotificationsProvider
 *
 * Reminder strategy: pre-schedule DATE triggers for the next 14 days.
 *  - 14 independent one-shot notifications are scheduled upfront.
 *    Each fires on its own; no reschedule needed between firings, so reminders
 *    continue for 2 weeks even if the user never opens the app.
 *  - Today's notification is conditionally skipped when the check-in is already done.
 *  - onCheckinComplete() cancels only today's pending reminder (future days unchanged).
 *  - Every app open / foreground refresh re-fills the 14-day window, keeping
 *    delivery reliable indefinitely as long as the app is opened at least once
 *    every two weeks (expected daily for a check-in product).
 *
 * Server-driven push (via Expo Push API) is the primary channel for new alert
 * notifications; local foreground polling is the fallback.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

import { apiFetch } from "@/lib/api";

// ─── Storage keys ────────────────────────────────────────────────────────────
const NOTIF_ASKED_KEY = "pontob_notif_asked";
const NOTIF_TIME_KEY = "pontob_notif_time";
const NOTIF_ENABLED_KEY = "pontob_notif_enabled";
const REMINDER_PREFIX = "pontob_reminder_";
const SCHEDULE_DAYS = 14;

function seenAlertsKey(userId: number) {
  return `pontob_seen_alert_ids_${userId}`;
}

export interface NotifTime {
  hour: number;
  minute: number;
}

interface NotificationsContextType {
  permissionGranted: boolean;
  notifEnabled: boolean;
  notifTime: NotifTime;
  requestPermission: () => Promise<boolean>;
  setNotifEnabled: (enabled: boolean) => Promise<void>;
  setNotifTime: (time: NotifTime) => Promise<void>;
  onCheckinComplete: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | null>(
  null
);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── ID helpers ──────────────────────────────────────────────────────────────

function reminderIdForDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${REMINDER_PREFIX}${yyyy}-${mm}-${dd}`;
}

// ─── Scheduling helpers ───────────────────────────────────────────────────────

async function cancelAllReminders(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const ours = scheduled.filter((n) =>
      n.identifier.startsWith(REMINDER_PREFIX)
    );
    await Promise.all(
      ours.map((n) =>
        Notifications.cancelScheduledNotificationAsync(n.identifier).catch(
          () => {}
        )
      )
    );
  } catch {
    // ignore
  }
}

async function cancelTodayReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(
      reminderIdForDate(new Date())
    );
  } catch {
    // may not exist
  }
}

/**
 * Returns true if the user has already submitted a daily check-in today.
 */
async function hasDoneCheckinToday(franchiseId: number): Promise<boolean> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const res = await apiFetch(
      `/daily-checkins?franchiseId=${franchiseId}&date=${today}`
    );
    if (!res.ok) return false;
    const data = (await res.json()) as unknown[];
    return data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Pre-schedule DATE triggers for the next SCHEDULE_DAYS days.
 *
 * This guarantees delivery for 14 days without requiring any further app
 * interaction — each notification fires independently.  The current day is
 * skipped when the check-in is already done.
 */
async function scheduleReminders(
  time: NotifTime,
  franchiseId: number | null
): Promise<void> {
  if (Platform.OS === "web") return;
  await cancelAllReminders();

  const checkinDoneToday = franchiseId
    ? await hasDoneCheckinToday(franchiseId)
    : false;

  const now = new Date();
  const pending: Promise<string>[] = [];

  for (let i = 0; i < SCHEDULE_DAYS; i++) {
    const fireDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + i,
      time.hour,
      time.minute,
      0,
      0
    );

    // Skip times already in the past
    if (fireDate.getTime() <= now.getTime()) continue;

    // Skip today if check-in is already done
    if (i === 0 && checkinDoneToday) continue;

    pending.push(
      Notifications.scheduleNotificationAsync({
        identifier: reminderIdForDate(fireDate),
        content: {
          title: "Lembrete de Check-in",
          body: "Não se esqueça de registrar seu check-in diário no Método Ponto B.",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireDate,
        },
      })
    );
  }

  await Promise.all(pending);
}

// ─── Push token registration ─────────────────────────────────────────────────

async function registerPushToken(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig
        ?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;
    const platform = Platform.OS;

    await apiFetch("/notifications/push-token", {
      method: "POST",
      body: JSON.stringify({ token, platform }),
    });
  } catch {
    // Best-effort — Expo Go dev environments without a project ID will fail
    // here; the app still works with local polling as fallback.
  }
}

// ─── Alert polling (foreground fallback for when push is unavailable) ─────────

interface PendingAlert {
  id: number;
  type: string;
  severity: string;
  message: string;
  createdAt: string;
}

async function checkForNewAlerts(
  franchiseId: number,
  userId: number
): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const res = await apiFetch(`/dashboard/today?franchiseId=${franchiseId}`);
    if (!res.ok) return;
    const data = (await res.json()) as { pendingAlerts?: PendingAlert[] };
    const alerts: PendingAlert[] = data.pendingAlerts ?? [];
    if (alerts.length === 0) return;

    const key = seenAlertsKey(userId);
    const raw = await AsyncStorage.getItem(key);
    const seenIds: number[] = raw ? (JSON.parse(raw) as number[]) : [];
    const seenSet = new Set(seenIds);

    const newAlerts = alerts.filter((a) => !seenSet.has(a.id));
    if (newAlerts.length === 0) return;

    for (const alert of newAlerts) seenSet.add(alert.id);
    await AsyncStorage.setItem(key, JSON.stringify([...seenSet]));

    const body =
      newAlerts.length === 1
        ? newAlerts[0].message
        : `${newAlerts.length} novos alertas na sua franquia.`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Novo Alerta — Método Ponto B",
        body,
        sound: true,
      },
      trigger: null,
    });
  } catch {
    // silent
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NotificationsProvider({
  children,
  franchiseId,
  userId,
}: {
  children: React.ReactNode;
  franchiseId: number | null;
  userId: number | null;
}) {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [notifEnabled, setNotifEnabledState] = useState(true);
  const [notifTime, setNotifTimeState] = useState<NotifTime>({
    hour: 8,
    minute: 0,
  });
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const initialized = useRef(false);

  // Refs for stable access inside listeners / callbacks
  const permGrantedRef = useRef(false);
  const notifEnabledRef = useRef(true);
  const notifTimeRef = useRef<NotifTime>({ hour: 8, minute: 0 });
  const franchiseIdRef = useRef<number | null>(null);
  const userIdRef = useRef<number | null>(null);

  useEffect(() => { permGrantedRef.current = permissionGranted; }, [permissionGranted]);
  useEffect(() => { notifEnabledRef.current = notifEnabled; }, [notifEnabled]);
  useEffect(() => { notifTimeRef.current = notifTime; }, [notifTime]);
  useEffect(() => { franchiseIdRef.current = franchiseId; }, [franchiseId]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // ── Boot: load prefs, auto-request permission on first launch ────────────
  useEffect(() => {
    if (Platform.OS === "web") return;
    async function init() {
      const [storedEnabled, storedTime, storedAsked] = await Promise.all([
        AsyncStorage.getItem(NOTIF_ENABLED_KEY),
        AsyncStorage.getItem(NOTIF_TIME_KEY),
        AsyncStorage.getItem(NOTIF_ASKED_KEY),
      ]);

      const enabled =
        storedEnabled === null ? true : storedEnabled === "true";
      const time: NotifTime = storedTime
        ? (JSON.parse(storedTime) as NotifTime)
        : { hour: 8, minute: 0 };

      setNotifEnabledState(enabled);
      setNotifTimeState(time);
      notifEnabledRef.current = enabled;
      notifTimeRef.current = time;

      let granted = false;

      if (storedAsked === "true") {
        const perm = await Notifications.getPermissionsAsync();
        granted = (perm as unknown as { granted: boolean }).granted;
      } else {
        // First launch: automatically show OS permission dialog
        await AsyncStorage.setItem(NOTIF_ASKED_KEY, "true");
        const perm = await Notifications.requestPermissionsAsync();
        granted = (perm as unknown as { granted: boolean }).granted;
      }

      setPermissionGranted(granted);
      permGrantedRef.current = granted;

      if (granted && enabled) {
        await scheduleReminders(time, franchiseIdRef.current);
        await registerPushToken();
      }

      initialized.current = true;
    }
    init();
  }, []);

  // ── Re-register push token & refresh schedule when user logs in ──────────
  useEffect(() => {
    if (Platform.OS === "web" || !initialized.current) return;
    if (permissionGranted && notifEnabled && userId) {
      scheduleReminders(notifTime, franchiseId);
      registerPushToken();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, franchiseId]);

  // ── Re-fill the 14-day window on app foreground ─────────────────────────
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = AppState.addEventListener(
      "change",
      async (nextState: AppStateStatus) => {
        const wasBackground = appStateRef.current.match(/inactive|background/);
        appStateRef.current = nextState;
        if (wasBackground && nextState === "active") {
          if (permGrantedRef.current && notifEnabledRef.current) {
            // Refresh 14-day schedule; also handles today's conditional skip
            await scheduleReminders(
              notifTimeRef.current,
              franchiseIdRef.current
            );
          }
          if (
            permGrantedRef.current &&
            franchiseIdRef.current !== null &&
            userIdRef.current !== null
          ) {
            await checkForNewAlerts(
              franchiseIdRef.current,
              userIdRef.current
            );
          }
        }
      }
    );
    return () => sub.remove();
  }, []);

  // ── Poll for new alerts every 5 min while foregrounded ───────────────────
  useEffect(() => {
    if (
      Platform.OS === "web" ||
      !permissionGranted ||
      !franchiseId ||
      !userId
    )
      return;
    checkForNewAlerts(franchiseId, userId);
    const interval = setInterval(() => {
      checkForNewAlerts(franchiseId, userId);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [permissionGranted, franchiseId, userId]);

  // ── Public API ───────────────────────────────────────────────────────────

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") return false;
    await AsyncStorage.setItem(NOTIF_ASKED_KEY, "true");
    const perm = await Notifications.requestPermissionsAsync();
    const granted = (perm as unknown as { granted: boolean }).granted;
    setPermissionGranted(granted);
    permGrantedRef.current = granted;
    if (granted && notifEnabled) {
      await scheduleReminders(notifTime, franchiseId);
      await registerPushToken();
    }
    return granted;
  }, [notifEnabled, notifTime, franchiseId]);

  const setNotifEnabled = useCallback(
    async (enabled: boolean) => {
      setNotifEnabledState(enabled);
      notifEnabledRef.current = enabled;
      await AsyncStorage.setItem(NOTIF_ENABLED_KEY, String(enabled));
      if (enabled && permissionGranted) {
        await scheduleReminders(notifTime, franchiseId);
      } else {
        await cancelAllReminders();
      }
    },
    [permissionGranted, notifTime, franchiseId]
  );

  const setNotifTime = useCallback(
    async (time: NotifTime) => {
      setNotifTimeState(time);
      notifTimeRef.current = time;
      await AsyncStorage.setItem(NOTIF_TIME_KEY, JSON.stringify(time));
      if (notifEnabled && permissionGranted) {
        await scheduleReminders(time, franchiseId);
      }
    },
    [notifEnabled, permissionGranted, franchiseId]
  );

  /**
   * Call after a daily check-in is submitted.
   * Cancels today's reminder only (future days are already scheduled and intact).
   */
  const onCheckinComplete = useCallback(async (): Promise<void> => {
    if (Platform.OS === "web" || !permissionGranted || !notifEnabled) return;
    await cancelTodayReminder();
  }, [permissionGranted, notifEnabled]);

  return (
    <NotificationsContext.Provider
      value={{
        permissionGranted,
        notifEnabled,
        notifTime,
        requestPermission,
        setNotifEnabled,
        setNotifTime,
        onCheckinComplete,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationsProvider"
    );
  return ctx;
}
