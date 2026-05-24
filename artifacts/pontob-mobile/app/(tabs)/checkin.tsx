import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";
import { useNotifications } from "@/context/notifications";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

// ─── Date helpers ────────────────────────────────────────────────────────────

function getMondayOf(d: Date): Date {
  const day = d.getDay(); // 0=Sun, 1=Mon …
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "daily" | "weekly" | "monthly" | "history";
type HistoryFilter = "all" | "daily" | "weekly" | "monthly";
type ExecutedOption = "sim" | "parcial" | "nao";

interface Goal {
  id: number;
  title: string;
  status: string;
}

interface DailyCheckin {
  id: number;
  date: string;
  executedToday: string;
  progressToday: number | null;
  blocker: string | null;
  nextStep: string | null;
  needsHelp: boolean;
  createdAt: string;
}

interface WeeklyCheckin {
  id: number;
  goalId: number | null;
  weekStartDate: string;
  weekEndDate: string | null;
  progressSummary: string | null;
  blockers: string | null;
  nextWeekPriority: string | null;
  needsRegionalSupport: boolean;
  executionPercentage: number | null;
  createdAt: string;
}

interface MonthlyCheckin {
  id: number;
  month: number;
  year: number;
  kriProgress: string | null;
  initiativesThatWorked: string | null;
  initiativesThatDidNotWork: string | null;
  continueDoing: string | null;
  stopDoing: string | null;
  startDoing: string | null;
  nextMonthFocus: string | null;
  createdAt: string;
}

const EXECUTED_OPTS: { key: ExecutedOption; label: string }[] = [
  { key: "sim", label: "Sim" },
  { key: "parcial", label: "Parcial" },
  { key: "nao", label: "Não" },
];

const MONTHS_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

// ─── Main component ──────────────────────────────────────────────────────────

export default function CheckinScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { onCheckinComplete } = useNotifications();

  const today = new Date();
  const todayStr = toISODate(today);
  const isMonday = today.getDay() === 1;
  const isFirstOfMonth = today.getDate() === 1;

  const monday = getMondayOf(today);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekStartDate = toISODate(monday);
  const weekEndDate = toISODate(sunday);

  const currentMonth = today.getMonth() + 1; // 1-based
  const currentYear = today.getFullYear();

  const dateLabel = today.toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 80);

  const [activeTab, setActiveTab] = useState<Tab>("daily");

  // ── Daily state ──────────────────────────────────────────────────────────
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [executed, setExecuted] = useState<ExecutedOption>("sim");
  const [progress, setProgress] = useState(50);
  const [blocker, setBlocker] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [needsHelp, setNeedsHelp] = useState(false);
  const [dailySubmitting, setDailySubmitting] = useState(false);
  const [dailyDone, setDailyDone] = useState(false);
  const [dailyPreFilled, setDailyPreFilled] = useState(false);

  // ── Weekly state ─────────────────────────────────────────────────────────
  const [weeklyGoalId, setWeeklyGoalId] = useState<number | null>(null);
  const [weeklyExecPct, setWeeklyExecPct] = useState(50);
  const [weeklyProgressSummary, setWeeklyProgressSummary] = useState("");
  const [weeklyBlockers, setWeeklyBlockers] = useState("");
  const [weeklyNextPriority, setWeeklyNextPriority] = useState("");
  const [weeklyNeedsSupport, setWeeklyNeedsSupport] = useState(false);
  const [weeklySubmitting, setWeeklySubmitting] = useState(false);
  const [weeklyDone, setWeeklyDone] = useState(false);
  const [weeklyPreFilled, setWeeklyPreFilled] = useState(false);

  // ── Monthly state ────────────────────────────────────────────────────────
  const [monthlyGoalId, setMonthlyGoalId] = useState<number | null>(null);
  const [monthlyKri, setMonthlyKri] = useState("");
  const [monthlyWorked, setMonthlyWorked] = useState("");
  const [monthlyDidntWork, setMonthlyDidntWork] = useState("");
  const [monthlyContinue, setMonthlyContinue] = useState("");
  const [monthlyStop, setMonthlyStop] = useState("");
  const [monthlyStart, setMonthlyStart] = useState("");
  const [monthlyNextFocus, setMonthlyNextFocus] = useState("");
  const [monthlySubmitting, setMonthlySubmitting] = useState(false);
  const [monthlyDone, setMonthlyDone] = useState(false);

  // ── History state ────────────────────────────────────────────────────────
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: todayCheckins } = useQuery({
    queryKey: ["today-checkins", user?.franchiseId, todayStr],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (user?.franchiseId) p.set("franchiseId", String(user.franchiseId));
      p.set("date", todayStr);
      const res = await apiFetch(`/daily-checkins?${p}`);
      if (!res.ok) return [] as DailyCheckin[];
      return res.json() as Promise<DailyCheckin[]>;
    },
    enabled: !!user,
  });

  const { data: thisWeekCheckin } = useQuery({
    queryKey: ["weekly-checkins", user?.franchiseId, weekStartDate],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (user?.franchiseId) p.set("franchiseId", String(user.franchiseId));
      const res = await apiFetch(`/weekly-checkins?${p}`);
      if (!res.ok) return null;
      const all = (await res.json()) as WeeklyCheckin[];
      return all.find((c) => c.weekStartDate === weekStartDate) ?? null;
    },
    enabled: !!user,
  });

  const { data: thisMonthCheckin } = useQuery({
    queryKey: ["monthly-checkins", user?.franchiseId, currentMonth, currentYear],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (user?.franchiseId) p.set("franchiseId", String(user.franchiseId));
      const res = await apiFetch(`/monthly-checkins?${p}`);
      if (!res.ok) return null;
      const all = (await res.json()) as MonthlyCheckin[];
      return all.find((c) => c.month === currentMonth && c.year === currentYear) ?? null;
    },
    enabled: !!user,
  });

  const { data: goals } = useQuery({
    queryKey: ["goals", user?.franchiseId],
    queryFn: async () => {
      const params = user?.franchiseId ? `?franchiseId=${user.franchiseId}` : "";
      const res = await apiFetch(`/goals${params}`);
      if (!res.ok) return [] as Goal[];
      return res.json() as Promise<Goal[]>;
    },
    enabled: !!user,
  });

  // History queries
  const { data: allDailyCheckins, isLoading: loadingDaily } = useQuery({
    queryKey: ["all-daily-checkins", user?.franchiseId],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (user?.franchiseId) p.set("franchiseId", String(user.franchiseId));
      const res = await apiFetch(`/daily-checkins?${p}`);
      if (!res.ok) return [] as DailyCheckin[];
      return res.json() as Promise<DailyCheckin[]>;
    },
    enabled: !!user && activeTab === "history",
  });

  const { data: allWeeklyCheckins, isLoading: loadingWeekly } = useQuery({
    queryKey: ["all-weekly-checkins", user?.franchiseId],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (user?.franchiseId) p.set("franchiseId", String(user.franchiseId));
      const res = await apiFetch(`/weekly-checkins?${p}`);
      if (!res.ok) return [] as WeeklyCheckin[];
      return res.json() as Promise<WeeklyCheckin[]>;
    },
    enabled: !!user && activeTab === "history",
  });

  const { data: allMonthlyCheckins, isLoading: loadingMonthly } = useQuery({
    queryKey: ["all-monthly-checkins", user?.franchiseId],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (user?.franchiseId) p.set("franchiseId", String(user.franchiseId));
      const res = await apiFetch(`/monthly-checkins?${p}`);
      if (!res.ok) return [] as MonthlyCheckin[];
      return res.json() as Promise<MonthlyCheckin[]>;
    },
    enabled: !!user && activeTab === "history",
  });

  const alreadySubmittedDaily = (todayCheckins?.length ?? 0) > 0;
  const alreadySubmittedWeekly = !!thisWeekCheckin;
  const alreadySubmittedMonthly = !!thisMonthCheckin;

  const existingDailyCheckin = todayCheckins?.[0] ?? null;
  const existingWeeklyCheckin = thisWeekCheckin ?? null;

  const activeGoals = goals?.filter((g) => g.status === "em_andamento") ?? [];

  // ── Pre-fill daily form from existing check-in ────────────────────────────

  useEffect(() => {
    if (!dailyPreFilled && existingDailyCheckin) {
      setExecuted(existingDailyCheckin.executedToday as ExecutedOption);
      setProgress(existingDailyCheckin.progressToday ?? 50);
      setBlocker(existingDailyCheckin.blocker ?? "");
      setNextStep(existingDailyCheckin.nextStep ?? "");
      setNeedsHelp(existingDailyCheckin.needsHelp);
      setDailyPreFilled(true);
    }
  }, [existingDailyCheckin, dailyPreFilled]);

  // ── Pre-fill weekly form from existing check-in ───────────────────────────

  useEffect(() => {
    if (!weeklyPreFilled && existingWeeklyCheckin) {
      setWeeklyExecPct(existingWeeklyCheckin.executionPercentage ?? 50);
      setWeeklyProgressSummary(existingWeeklyCheckin.progressSummary ?? "");
      setWeeklyBlockers(existingWeeklyCheckin.blockers ?? "");
      setWeeklyNextPriority(existingWeeklyCheckin.nextWeekPriority ?? "");
      setWeeklyNeedsSupport(existingWeeklyCheckin.needsRegionalSupport);
      setWeeklyPreFilled(true);
    }
  }, [existingWeeklyCheckin, weeklyPreFilled]);

  // ── Submit handlers ───────────────────────────────────────────────────────

  async function handleDailySubmit() {
    if (!user?.franchiseId) { Alert.alert("Erro", "Franquia não identificada."); return; }
    setDailySubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const body = {
        franchiseId: user.franchiseId,
        date: todayStr,
        executedToday: executed,
        progressToday: progress,
        blocker: blocker.trim() || null,
        nextStep: nextStep.trim() || null,
        needsHelp,
        goalId: selectedGoalId,
        notes: null,
      };
      const isEdit = !!existingDailyCheckin;
      const url = isEdit ? `/daily-checkins/${existingDailyCheckin!.id}` : "/daily-checkins";
      const method = isEdit ? "PATCH" : "POST";
      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      if (res.ok || res.status === 200) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: ["dashboard-today"] });
        queryClient.invalidateQueries({ queryKey: ["today-checkins"] });
        queryClient.invalidateQueries({ queryKey: ["all-daily-checkins"] });
        setDailyDone(true);
        onCheckinComplete();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const err = (await res.json()) as { error?: string };
        Alert.alert("Erro", err.error ?? "Não foi possível salvar o check-in");
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro", "Erro de conexão. Tente novamente.");
    } finally {
      setDailySubmitting(false);
    }
  }

  async function handleWeeklySubmit() {
    if (!user?.franchiseId) { Alert.alert("Erro", "Franquia não identificada."); return; }
    const isEdit = !!existingWeeklyCheckin;
    const goalId = weeklyGoalId ?? existingWeeklyCheckin?.goalId ?? (activeGoals.length === 1 ? activeGoals[0].id : null);
    if (!goalId) { Alert.alert("Selecione uma meta", "Escolha a meta relacionada a este check-in semanal."); return; }
    setWeeklySubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const body = {
        goalId,
        franchiseId: user.franchiseId,
        weekStartDate,
        weekEndDate,
        progressSummary: weeklyProgressSummary.trim() || null,
        blockers: weeklyBlockers.trim() || null,
        nextWeekPriority: weeklyNextPriority.trim() || null,
        needsRegionalSupport: weeklyNeedsSupport,
        executionPercentage: weeklyExecPct,
      };
      const url = isEdit ? `/weekly-checkins/${existingWeeklyCheckin!.id}` : "/weekly-checkins";
      const method = isEdit ? "PATCH" : "POST";
      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      if (res.ok || res.status === 200) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: ["dashboard-today"] });
        queryClient.invalidateQueries({ queryKey: ["weekly-checkins"] });
        queryClient.invalidateQueries({ queryKey: ["all-weekly-checkins"] });
        setWeeklyDone(true);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const err = (await res.json()) as { error?: string };
        Alert.alert("Erro", err.error ?? "Não foi possível salvar o check-in semanal");
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro", "Erro de conexão. Tente novamente.");
    } finally {
      setWeeklySubmitting(false);
    }
  }

  async function handleMonthlySubmit() {
    if (!user?.franchiseId) { Alert.alert("Erro", "Franquia não identificada."); return; }
    const goalId = monthlyGoalId ?? (activeGoals.length === 1 ? activeGoals[0].id : null);
    if (!goalId) { Alert.alert("Selecione uma meta", "Escolha a meta relacionada a este check-in mensal."); return; }
    setMonthlySubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const body = {
        goalId,
        franchiseId: user.franchiseId,
        month: currentMonth,
        year: currentYear,
        kriProgress: monthlyKri.trim() || null,
        initiativesThatWorked: monthlyWorked.trim() || null,
        initiativesThatDidNotWork: monthlyDidntWork.trim() || null,
        continueDoing: monthlyContinue.trim() || null,
        stopDoing: monthlyStop.trim() || null,
        startDoing: monthlyStart.trim() || null,
        nextMonthFocus: monthlyNextFocus.trim() || null,
      };
      const res = await apiFetch("/monthly-checkins", { method: "POST", body: JSON.stringify(body) });
      if (res.ok || res.status === 200) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: ["dashboard-today"] });
        queryClient.invalidateQueries({ queryKey: ["monthly-checkins"] });
        queryClient.invalidateQueries({ queryKey: ["all-monthly-checkins"] });
        setMonthlyDone(true);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const err = (await res.json()) as { error?: string };
        Alert.alert("Erro", err.error ?? "Não foi possível salvar o check-in mensal");
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro", "Erro de conexão. Tente novamente.");
    } finally {
      setMonthlySubmitting(false);
    }
  }

  // ── Styles ───────────────────────────────────────────────────────────────

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: topPad + 16,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    title: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    subtitle: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
      textTransform: "capitalize",
    },
    // Tab bar
    tabBar: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingBottom: 8,
      gap: 6,
    },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: colors.muted,
      gap: 4,
    },
    tabActive: {
      backgroundColor: colors.primary,
    },
    tabText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    tabTextActive: {
      color: colors.primaryForeground,
    },
    badge: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.destructive,
    },
    badgeActive: {
      backgroundColor: colors.primaryForeground,
    },
    // Content
    content: { paddingHorizontal: 16, paddingBottom: botPad },
    section: { marginBottom: 20 },
    secLabel: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 10,
    },
    // Executed options
    executedRow: { flexDirection: "row", gap: 10 },
    execOpt: {
      flex: 1,
      borderRadius: colors.radius,
      paddingVertical: 13,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    execOptSim: { borderColor: colors.primary, backgroundColor: colors.primary + "12" },
    execOptNao: { borderColor: colors.destructive, backgroundColor: colors.destructive + "12" },
    execOptText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground },
    execOptTextSim: { color: colors.primary },
    execOptTextNao: { color: colors.destructive },
    // Progress bar
    progRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    progValue: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.primary },
    progBarBg: {
      height: 8,
      backgroundColor: colors.muted,
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 8,
    },
    progBarFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 4 },
    progBtns: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    progBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    progHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    // Text input
    textInput: {
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      minHeight: 80,
      textAlignVertical: "top",
    },
    textInputSingle: {
      minHeight: 48,
    },
    // Switch row
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    switchLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },
    switchSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },
    // Goal selector
    goalOpt: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 8,
    },
    goalOptActive: { borderColor: colors.primary, backgroundColor: colors.primary + "08" },
    goalOptText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, marginLeft: 10 },
    // Submit button
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 8,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { color: colors.primaryForeground, fontSize: 16, fontFamily: "Inter_600SemiBold" },
    // Done card
    doneCard: {
      backgroundColor: colors.success + "18",
      borderRadius: colors.radius * 2,
      padding: 36,
      alignItems: "center",
      margin: 16,
      gap: 12,
    },
    doneTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground },
    doneText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center" },
    // Info banner
    infoBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: colors.muted,
      borderRadius: colors.radius,
      padding: 14,
      marginBottom: 20,
      gap: 10,
    },
    infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 18 },
    // Edit banner
    editBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#f59e0b18",
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: "#f59e0b50",
      padding: 12,
      marginBottom: 20,
      gap: 8,
    },
    editBannerText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#d97706", lineHeight: 18 },
    // History
    historyFilter: { flexDirection: "row", gap: 8, marginBottom: 16 },
    historyFilterBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.muted,
    },
    historyFilterBtnActive: { backgroundColor: colors.primary },
    historyFilterText: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    historyFilterTextActive: { color: colors.primaryForeground },
    historyCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    historyCardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    historyTypeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    historyTypeBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    historyDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    historyLine: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 18 },
    historyMeta: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 4 },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", marginTop: 40 },
  });

  // ── Tab definitions ───────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; pending: boolean }[] = [
    { key: "daily", label: "Diário", pending: !alreadySubmittedDaily && !dailyDone },
    { key: "weekly", label: "Semanal", pending: isMonday && !alreadySubmittedWeekly && !weeklyDone },
    { key: "monthly", label: "Mensal", pending: isFirstOfMonth && !alreadySubmittedMonthly && !monthlyDone },
    { key: "history", label: "Histórico", pending: false },
  ];

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderProgressControl(
    value: number,
    setValue: (v: number) => void,
    label = "Percentual de execução",
  ) {
    return (
      <View style={s.section}>
        <View style={s.progRow}>
          <Text style={s.secLabel}>{label}</Text>
          <Text style={s.progValue}>{value}%</Text>
        </View>
        <View style={s.progBarBg}>
          <View style={[s.progBarFill, { width: `${value}%` }]} />
        </View>
        <View style={s.progBtns}>
          <Pressable style={s.progBtn} onPress={() => setValue(Math.max(0, value - 10))}>
            <Ionicons name="remove" size={18} color={colors.foreground} />
          </Pressable>
          <Text style={s.progHint}>–10 / +10</Text>
          <Pressable style={s.progBtn} onPress={() => setValue(Math.min(100, value + 10))}>
            <Ionicons name="add" size={18} color={colors.foreground} />
          </Pressable>
        </View>
      </View>
    );
  }

  function renderSwitchRow(
    label: string,
    sub: string,
    value: boolean,
    setValue: (v: boolean) => void,
  ) {
    return (
      <View style={s.section}>
        <Pressable
          style={s.switchRow}
          onPress={() => {
            setValue(!value);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <View>
            <Text style={s.switchLabel}>{label}</Text>
            <Text style={s.switchSub}>{sub}</Text>
          </View>
          <Switch
            value={value}
            onValueChange={(v) => {
              setValue(v);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            trackColor={{ true: colors.primary, false: colors.muted }}
            thumbColor={value ? colors.primaryForeground : colors.card}
          />
        </Pressable>
      </View>
    );
  }

  function renderTextSection(
    label: string,
    placeholder: string,
    value: string,
    onChangeText: (t: string) => void,
    multiline = true,
  ) {
    return (
      <View style={s.section}>
        <Text style={s.secLabel}>{label}</Text>
        <TextInput
          style={[s.textInput, !multiline && s.textInputSingle]}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
        />
      </View>
    );
  }

  // ── Daily form ────────────────────────────────────────────────────────────

  function renderDailyForm() {
    if (dailyDone) {
      return (
        <View style={s.doneCard}>
          <Ionicons name="checkmark-circle" size={60} color={colors.success} />
          <Text style={s.doneTitle}>{alreadySubmittedDaily ? "Check-in atualizado!" : "Check-in feito!"}</Text>
          <Text style={s.doneText}>
            {alreadySubmittedDaily
              ? "Check-in diário atualizado com sucesso!"
              : "Check-in diário registrado com sucesso!"
            }
          </Text>
        </View>
      );
    }

    return (
      <View style={s.content}>
        {alreadySubmittedDaily && (
          <View style={s.editBanner}>
            <Ionicons name="create-outline" size={16} color="#d97706" />
            <Text style={s.editBannerText}>Editando check-in de hoje — suas alterações substituirão o registro atual.</Text>
          </View>
        )}
        {activeGoals.length > 1 && (
          <View style={s.section}>
            <Text style={s.secLabel}>Meta (opcional)</Text>
            {activeGoals.slice(0, 5).map((goal) => (
              <Pressable
                key={goal.id}
                style={[s.goalOpt, selectedGoalId === goal.id && s.goalOptActive]}
                onPress={() => setSelectedGoalId(selectedGoalId === goal.id ? null : goal.id)}
              >
                <Ionicons
                  name={selectedGoalId === goal.id ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={selectedGoalId === goal.id ? colors.primary : colors.mutedForeground}
                />
                <Text style={s.goalOptText} numberOfLines={2}>{goal.title}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={s.section}>
          <Text style={s.secLabel}>Executei hoje?</Text>
          <View style={s.executedRow}>
            {EXECUTED_OPTS.map(({ key, label }) => {
              const active = executed === key;
              const isNao = key === "nao";
              return (
                <Pressable
                  key={key}
                  style={[s.execOpt, active && (isNao ? s.execOptNao : s.execOptSim)]}
                  onPress={() => { setExecuted(key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[s.execOptText, active && (isNao ? s.execOptTextNao : s.execOptTextSim)]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {renderProgressControl(progress, setProgress, "Progresso geral")}

        {renderTextSection("Impedimento (opcional)", "O que te impediu de avançar mais?", blocker, setBlocker)}
        {renderTextSection("Próximo passo", "O que você vai fazer amanhã?", nextStep, setNextStep)}

        {renderSwitchRow("Preciso de ajuda", "Solicitar suporte à equipe regional", needsHelp, setNeedsHelp)}

        <Pressable
          style={({ pressed }) => [s.submitBtn, (dailySubmitting || pressed) && s.submitBtnDisabled]}
          onPress={handleDailySubmit}
          disabled={dailySubmitting}
          testID="submit-checkin"
        >
          {dailySubmitting
            ? <ActivityIndicator color={colors.primaryForeground} size="small" />
            : <Text style={s.submitBtnText}>{alreadySubmittedDaily ? "Atualizar Check-in Diário" : "Registrar Check-in Diário"}</Text>
          }
        </Pressable>
      </View>
    );
  }

  // ── Weekly form ───────────────────────────────────────────────────────────

  function renderGoalSelector(
    selectedId: number | null,
    setId: (id: number | null) => void,
  ) {
    if (activeGoals.length === 0) return null;
    if (activeGoals.length === 1) return null; // auto-selected in submit
    return (
      <View style={s.section}>
        <Text style={s.secLabel}>Meta *</Text>
        {activeGoals.slice(0, 5).map((goal) => (
          <Pressable
            key={goal.id}
            style={[s.goalOpt, selectedId === goal.id && s.goalOptActive]}
            onPress={() => setId(selectedId === goal.id ? null : goal.id)}
          >
            <Ionicons
              name={selectedId === goal.id ? "radio-button-on" : "radio-button-off"}
              size={18}
              color={selectedId === goal.id ? colors.primary : colors.mutedForeground}
            />
            <Text style={s.goalOptText} numberOfLines={2}>{goal.title}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  function renderWeeklyForm() {
    if (weeklyDone) {
      return (
        <View style={s.doneCard}>
          <Ionicons name="checkmark-circle" size={60} color={colors.success} />
          <Text style={s.doneTitle}>{alreadySubmittedWeekly ? "Check-in atualizado!" : "Check-in feito!"}</Text>
          <Text style={s.doneText}>
            {alreadySubmittedWeekly
              ? "Check-in semanal atualizado com sucesso!"
              : "Check-in semanal registrado com sucesso!"
            }
          </Text>
        </View>
      );
    }

    const mondayFmt = monday.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const sundayFmt = sunday.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

    return (
      <View style={s.content}>
        {alreadySubmittedWeekly && (
          <View style={s.editBanner}>
            <Ionicons name="create-outline" size={16} color="#d97706" />
            <Text style={s.editBannerText}>Editando check-in desta semana — suas alterações substituirão o registro atual.</Text>
          </View>
        )}
        {!isMonday && !alreadySubmittedWeekly && (
          <View style={s.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color={colors.mutedForeground} />
            <Text style={s.infoText}>
              O check-in semanal é realizado normalmente às segundas-feiras. Você ainda pode registrá-lo para a semana de {mondayFmt} a {sundayFmt}.
            </Text>
          </View>
        )}

        <View style={s.section}>
          <Text style={s.secLabel}>Semana</Text>
          <Text style={[s.historyDate, { fontSize: 14 }]}>{mondayFmt} a {sundayFmt}</Text>
        </View>

        {renderGoalSelector(weeklyGoalId, setWeeklyGoalId)}

        {renderProgressControl(weeklyExecPct, setWeeklyExecPct, "Percentual de execução da semana")}

        {renderTextSection(
          "O que foi feito esta semana?",
          "Resumo das iniciativas e atividades executadas...",
          weeklyProgressSummary,
          setWeeklyProgressSummary,
        )}

        {renderTextSection(
          "Impedimentos e bloqueios",
          "O que dificultou a execução esta semana?",
          weeklyBlockers,
          setWeeklyBlockers,
        )}

        {renderTextSection(
          "Prioridades para a próxima semana",
          "Quais são os focos da próxima semana?",
          weeklyNextPriority,
          setWeeklyNextPriority,
        )}

        {renderSwitchRow(
          "Preciso de suporte regional",
          "Solicitar apoio da equipe RE/MAX SC",
          weeklyNeedsSupport,
          setWeeklyNeedsSupport,
        )}

        <Pressable
          style={({ pressed }) => [s.submitBtn, (weeklySubmitting || pressed) && s.submitBtnDisabled]}
          onPress={handleWeeklySubmit}
          disabled={weeklySubmitting}
          testID="submit-weekly-checkin"
        >
          {weeklySubmitting
            ? <ActivityIndicator color={colors.primaryForeground} size="small" />
            : <Text style={s.submitBtnText}>{alreadySubmittedWeekly ? "Atualizar Check-in Semanal" : "Registrar Check-in Semanal"}</Text>
          }
        </Pressable>
      </View>
    );
  }

  // ── Monthly form ──────────────────────────────────────────────────────────

  function renderMonthlyForm() {
    if (monthlyDone || alreadySubmittedMonthly) {
      return (
        <View style={s.doneCard}>
          <Ionicons name="checkmark-circle" size={60} color={colors.success} />
          <Text style={s.doneTitle}>{monthlyDone ? "Check-in feito!" : "Já registrado"}</Text>
          <Text style={s.doneText}>
            {monthlyDone
              ? "Check-in mensal registrado com sucesso!"
              : `O check-in de ${MONTHS_PT[currentMonth - 1]} já foi registrado.`
            }
          </Text>
        </View>
      );
    }

    return (
      <View style={s.content}>
        {!isFirstOfMonth && (
          <View style={s.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color={colors.mutedForeground} />
            <Text style={s.infoText}>
              O check-in mensal é realizado no início de cada mês. Você ainda pode registrá-lo para {MONTHS_PT[currentMonth - 1]} de {currentYear}.
            </Text>
          </View>
        )}

        <View style={s.section}>
          <Text style={s.secLabel}>Mês de referência</Text>
          <Text style={[s.historyDate, { fontSize: 14, textTransform: "capitalize" }]}>
            {MONTHS_PT[currentMonth - 1]} de {currentYear}
          </Text>
        </View>

        {renderGoalSelector(monthlyGoalId, setMonthlyGoalId)}

        {renderTextSection(
          "Progresso dos KRIs",
          "Como evoluíram os indicadores-chave de resultado?",
          monthlyKri,
          setMonthlyKri,
        )}

        {renderTextSection(
          "Iniciativas que funcionaram",
          "Quais iniciativas trouxeram bons resultados?",
          monthlyWorked,
          setMonthlyWorked,
        )}

        {renderTextSection(
          "Iniciativas que não funcionaram",
          "O que não deu certo e por quê?",
          monthlyDidntWork,
          setMonthlyDidntWork,
        )}

        {renderTextSection(
          "Continuar fazendo",
          "Práticas e iniciativas para manter...",
          monthlyContinue,
          setMonthlyContinue,
        )}

        {renderTextSection(
          "Parar de fazer",
          "O que deve ser descontinuado?",
          monthlyStop,
          setMonthlyStop,
        )}

        {renderTextSection(
          "Começar a fazer",
          "Novas iniciativas ou práticas a adotar...",
          monthlyStart,
          setMonthlyStart,
        )}

        {renderTextSection(
          "Foco do próximo mês",
          "Qual será a prioridade principal?",
          monthlyNextFocus,
          setMonthlyNextFocus,
        )}

        <Pressable
          style={({ pressed }) => [s.submitBtn, (monthlySubmitting || pressed) && s.submitBtnDisabled]}
          onPress={handleMonthlySubmit}
          disabled={monthlySubmitting}
          testID="submit-monthly-checkin"
        >
          {monthlySubmitting
            ? <ActivityIndicator color={colors.primaryForeground} size="small" />
            : <Text style={s.submitBtnText}>Registrar Check-in Mensal</Text>
          }
        </Pressable>
      </View>
    );
  }

  // ── History tab ───────────────────────────────────────────────────────────

  function renderHistory() {
    const isLoading = loadingDaily || loadingWeekly || loadingMonthly;

    if (isLoading) {
      return (
        <View style={{ alignItems: "center", paddingTop: 40 }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    type HistoryEntry =
      | { kind: "daily"; item: DailyCheckin; date: Date }
      | { kind: "weekly"; item: WeeklyCheckin; date: Date }
      | { kind: "monthly"; item: MonthlyCheckin; date: Date };

    const entries: HistoryEntry[] = [];

    if (historyFilter === "all" || historyFilter === "daily") {
      (allDailyCheckins ?? []).forEach((item) =>
        entries.push({ kind: "daily", item, date: new Date(item.createdAt) })
      );
    }
    if (historyFilter === "all" || historyFilter === "weekly") {
      (allWeeklyCheckins ?? []).forEach((item) =>
        entries.push({ kind: "weekly", item, date: new Date(item.createdAt) })
      );
    }
    if (historyFilter === "all" || historyFilter === "monthly") {
      (allMonthlyCheckins ?? []).forEach((item) =>
        entries.push({ kind: "monthly", item, date: new Date(item.createdAt) })
      );
    }

    entries.sort((a, b) => b.date.getTime() - a.date.getTime());

    const BADGE_CONFIG = {
      daily: { bg: colors.primary + "20", color: colors.primary, label: "Diário" },
      weekly: { bg: "#f59e0b20", color: "#d97706", label: "Semanal" },
      monthly: { bg: "#8b5cf620", color: "#7c3aed", label: "Mensal" },
    };

    const HISTORY_FILTERS: { key: HistoryFilter; label: string }[] = [
      { key: "all", label: "Todos" },
      { key: "daily", label: "Diário" },
      { key: "weekly", label: "Semanal" },
      { key: "monthly", label: "Mensal" },
    ];

    return (
      <View style={s.content}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.historyFilter}>
          {HISTORY_FILTERS.map(({ key, label }) => (
            <Pressable
              key={key}
              style={[s.historyFilterBtn, historyFilter === key && s.historyFilterBtnActive]}
              onPress={() => setHistoryFilter(key)}
            >
              <Text style={[s.historyFilterText, historyFilter === key && s.historyFilterTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {entries.length === 0 ? (
          <Text style={s.emptyText}>Nenhum check-in registrado ainda.</Text>
        ) : (
          entries.slice(0, 30).map((entry, idx) => {
            const cfg = BADGE_CONFIG[entry.kind];
            const dateStr2 = entry.date.toLocaleDateString("pt-BR", {
              day: "2-digit", month: "2-digit", year: "numeric",
            });

            let mainLine = "";
            let metaLine = "";

            if (entry.kind === "daily") {
              const d = entry.item;
              const execLabel = d.executedToday === "sim" ? "Executou" : d.executedToday === "parcial" ? "Parcial" : "Não executou";
              mainLine = `${execLabel}${d.progressToday != null ? ` · ${d.progressToday}%` : ""}`;
              metaLine = d.blocker ? `Impedimento: ${d.blocker}` : d.nextStep ? `Próximo: ${d.nextStep}` : "";
            } else if (entry.kind === "weekly") {
              const w = entry.item;
              const startFmt = new Date(w.weekStartDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
              const endFmt = w.weekEndDate ? new Date(w.weekEndDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "";
              mainLine = `Semana ${startFmt}${endFmt ? ` a ${endFmt}` : ""}${w.executionPercentage != null ? ` · ${w.executionPercentage}%` : ""}`;
              metaLine = w.progressSummary ?? "";
            } else {
              const m = entry.item;
              mainLine = `${MONTHS_PT[m.month - 1].charAt(0).toUpperCase() + MONTHS_PT[m.month - 1].slice(1)} de ${m.year}`;
              metaLine = m.nextMonthFocus ? `Foco: ${m.nextMonthFocus}` : m.kriProgress ?? "";
            }

            return (
              <View key={`${entry.kind}-${entry.item.id}-${idx}`} style={s.historyCard}>
                <View style={s.historyCardRow}>
                  <View style={[s.historyTypeBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[s.historyTypeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  <Text style={s.historyDate}>{dateStr2}</Text>
                </View>
                <Text style={s.historyLine}>{mainLine}</Text>
                {!!metaLine && (
                  <Text style={s.historyMeta} numberOfLines={2}>{metaLine}</Text>
                )}
              </View>
            );
          })
        )}
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function renderTabContent() {
    switch (activeTab) {
      case "daily": return renderDailyForm();
      case "weekly": return renderWeeklyForm();
      case "monthly": return renderMonthlyForm();
      case "history": return renderHistory();
    }
  }

  const pendingCount = tabs.filter((t) => t.key !== "history" && t.pending).length;

  return (
    <ScrollView
      style={s.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={s.header}>
        <Text style={s.title}>Check-in{pendingCount > 0 ? ` · ${pendingCount} pendente${pendingCount > 1 ? "s" : ""}` : ""}</Text>
        <Text style={s.subtitle}>{dateLabel}</Text>
      </View>

      <View style={s.tabBar}>
        {tabs.map(({ key, label, pending }) => {
          const isActive = activeTab === key;
          return (
            <Pressable
              key={key}
              style={[s.tab, isActive && s.tabActive]}
              onPress={() => {
                setActiveTab(key);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[s.tabText, isActive && s.tabTextActive]}>{label}</Text>
              {pending && <View style={[s.badge, isActive && s.badgeActive]} />}
            </Pressable>
          );
        })}
      </View>

      {renderTabContent()}
    </ScrollView>
  );
}
