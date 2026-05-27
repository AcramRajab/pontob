import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

// ─── Constants ───────────────────────────────────────────────────────────────

const ADMIN_ROLES = ["master_admin", "staff_regional"];

// ─── Types ───────────────────────────────────────────────────────────────────

type HistoryFilter = "all" | "daily" | "weekly" | "monthly";
type ViewMode = "history" | "comparativo";

interface DailyCheckin {
  id: number;
  date: string;
  executedToday: string;
  progressToday: number | null;
  blocker: string | null;
  nextStep: string | null;
  needsHelp: boolean;
  goalTitle: string | null;
  createdAt: string;
}

interface WeeklyCheckin {
  id: number;
  goalId: number | null;
  goalTitle: string | null;
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

interface CheckinComparison {
  franchiseId: number;
  franchiseName: string;
  dailyCount: number;
  weeklyCount: number;
  monthlyCount: number;
  lastDaily?: string | null;
  lastWeekly?: string | null;
  lastMonthly?: string | null;
}

type HistoryEntry =
  | { kind: "daily"; item: DailyCheckin; date: Date }
  | { kind: "weekly"; item: WeeklyCheckin; date: Date }
  | { kind: "monthly"; item: MonthlyCheckin; date: Date };

const MONTHS_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const HISTORY_FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "daily", label: "Diário" },
  { key: "weekly", label: "Semanal" },
  { key: "monthly", label: "Mensal" },
];

const BADGE_CONFIG = {
  daily: { bg: "#3b82f620", color: "#3b82f6", label: "Diário" },
  weekly: { bg: "#f59e0b20", color: "#d97706", label: "Semanal" },
  monthly: { bg: "#8b5cf620", color: "#7c3aed", label: "Mensal" },
};

// ─── Recency helper ──────────────────────────────────────────────────────────

function recencyColor(iso: string | null | undefined, count: number, fallback: string): string {
  if (!iso || count === 0) return fallback;
  const days = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 7) return "#16a34a";
  if (days <= 30) return "#d97706";
  return "#ef4444";
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const isAdmin = !!user && ADMIN_ROLES.includes(user.role);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 80);

  const [viewMode, setViewMode] = useState<ViewMode>("history");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [drillFranchise, setDrillFranchise] = useState<{ id: number; name: string } | null>(null);

  // ── Own history queries ───────────────────────────────────────────────────

  const { data: allDailyCheckins, isLoading: loadingDaily } = useQuery({
    queryKey: ["all-daily-checkins", user?.franchiseId],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (user?.franchiseId) p.set("franchiseId", String(user.franchiseId));
      const res = await apiFetch(`/daily-checkins?${p}`);
      if (!res.ok) return [] as DailyCheckin[];
      return res.json() as Promise<DailyCheckin[]>;
    },
    enabled: !!user && viewMode === "history",
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
    enabled: !!user && viewMode === "history",
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
    enabled: !!user && viewMode === "history",
  });

  // ── Comparison query (admin only) ─────────────────────────────────────────

  const { data: compRows = [], isLoading: loadingComp } = useQuery({
    queryKey: ["checkins-comparison"],
    queryFn: async () => {
      const res = await apiFetch("/checkins/comparison");
      if (!res.ok) return [] as CheckinComparison[];
      return res.json() as Promise<CheckinComparison[]>;
    },
    enabled: isAdmin && viewMode === "comparativo" && drillFranchise === null,
    staleTime: 60_000,
  });

  // ── Drill-down franchise queries (admin comparativo drill) ────────────────

  const { data: drillDaily, isLoading: loadingDrillDaily } = useQuery({
    queryKey: ["drill-daily-checkins", drillFranchise?.id],
    queryFn: async () => {
      const p = new URLSearchParams();
      p.set("franchiseId", String(drillFranchise!.id));
      const res = await apiFetch(`/daily-checkins?${p}`);
      if (!res.ok) return [] as DailyCheckin[];
      return res.json() as Promise<DailyCheckin[]>;
    },
    enabled: !!drillFranchise,
  });

  const { data: drillWeekly, isLoading: loadingDrillWeekly } = useQuery({
    queryKey: ["drill-weekly-checkins", drillFranchise?.id],
    queryFn: async () => {
      const p = new URLSearchParams();
      p.set("franchiseId", String(drillFranchise!.id));
      const res = await apiFetch(`/weekly-checkins?${p}`);
      if (!res.ok) return [] as WeeklyCheckin[];
      return res.json() as Promise<WeeklyCheckin[]>;
    },
    enabled: !!drillFranchise,
  });

  const { data: drillMonthly, isLoading: loadingDrillMonthly } = useQuery({
    queryKey: ["drill-monthly-checkins", drillFranchise?.id],
    queryFn: async () => {
      const p = new URLSearchParams();
      p.set("franchiseId", String(drillFranchise!.id));
      const res = await apiFetch(`/monthly-checkins?${p}`);
      if (!res.ok) return [] as MonthlyCheckin[];
      return res.json() as Promise<MonthlyCheckin[]>;
    },
    enabled: !!drillFranchise,
  });

  // ── Sync selectedEntry with latest fetched data ───────────────────────────
  // When queries are invalidated and refetched (e.g. after editing a check-in
  // from the Check-in tab), the list cards re-render automatically.  But
  // selectedEntry is a snapshot captured at tap-time, so the detail view
  // would still show stale values.  This effect keeps it in sync.

  useEffect(() => {
    if (!selectedEntry) return;

    const { kind } = selectedEntry;

    if (kind === "daily" && allDailyCheckins) {
      const fresh = allDailyCheckins.find((c) => c.id === selectedEntry.item.id);
      if (fresh) setSelectedEntry({ kind: "daily", item: fresh, date: new Date(fresh.createdAt) });
    } else if (kind === "weekly" && allWeeklyCheckins) {
      const fresh = allWeeklyCheckins.find((c) => c.id === selectedEntry.item.id);
      if (fresh) setSelectedEntry({ kind: "weekly", item: fresh, date: new Date(fresh.createdAt) });
    } else if (kind === "monthly" && allMonthlyCheckins) {
      const fresh = allMonthlyCheckins.find((c) => c.id === selectedEntry.item.id);
      if (fresh) setSelectedEntry({ kind: "monthly", item: fresh, date: new Date(fresh.createdAt) });
    }
    // Intentionally excludes selectedEntry from deps: we only want to re-sync
    // when the underlying query data changes, not when selectedEntry itself changes
    // (which would cause an update loop).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDailyCheckins, allWeeklyCheckins, allMonthlyCheckins]);

  // ── Styles ────────────────────────────────────────────────────────────────

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
    viewToggle: {
      flexDirection: "row",
      marginHorizontal: 16,
      marginBottom: 14,
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    viewToggleBtn: {
      flex: 1,
      paddingVertical: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    viewToggleBtnActive: {
      backgroundColor: colors.primary,
    },
    viewToggleBtnText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
    },
    viewToggleBtnTextActive: {
      color: colors.primaryForeground,
    },
    content: { paddingHorizontal: 16, paddingBottom: botPad },
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
    backHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 10,
    },
    backBtnText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.primary,
    },
    progBarBg: {
      height: 8,
      backgroundColor: colors.muted,
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 8,
    },
    progBarFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 4 },
    detailHeader: {
      borderLeftWidth: 3,
      paddingLeft: 12,
      marginBottom: 20,
    },
    detailTitle: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      lineHeight: 22,
    },
    detailField: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    detailFieldLabel: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    detailFieldValue: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      lineHeight: 20,
    },
    detailBoolRow: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    detailBoolBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    detailBoolBadgeText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
    },
    // ── Comparativo styles ────────────────────────────────────────────────
    compCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
      overflow: "hidden",
    },
    compCardRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    compFranchiseName: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    compChevron: {
      marginLeft: 6,
    },
    compDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    compCountRow: {
      flexDirection: "row",
    },
    compCountCell: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 4,
    },
    compCountCellBorder: {
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    compCountLabel: {
      fontSize: 10,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: 3,
    },
    compCountNumber: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
    },
    compCountDate: {
      fontSize: 10,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    compHeaderRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingBottom: 8,
      paddingTop: 2,
    },
    compHeaderLabel: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    compLegendRow: {
      flexDirection: "row",
      gap: 16,
      paddingHorizontal: 16,
      paddingBottom: 14,
      flexWrap: "wrap",
    },
    compLegendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    compLegendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    compLegendText: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    drillFranchiseHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 10,
    },
    drillFranchiseName: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
  });

  // ── History list (shared between own history + franchise drill) ───────────

  function renderList(
    daily: DailyCheckin[],
    weekly: WeeklyCheckin[],
    monthly: MonthlyCheckin[],
    isLoading: boolean
  ) {
    if (isLoading) {
      return (
        <View style={{ alignItems: "center", paddingTop: 40 }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    const entries: HistoryEntry[] = [];

    if (historyFilter === "all" || historyFilter === "daily") {
      daily.forEach((item) =>
        entries.push({ kind: "daily", item, date: new Date(item.createdAt) })
      );
    }
    if (historyFilter === "all" || historyFilter === "weekly") {
      weekly.forEach((item) =>
        entries.push({ kind: "weekly", item, date: new Date(item.createdAt) })
      );
    }
    if (historyFilter === "all" || historyFilter === "monthly") {
      monthly.forEach((item) =>
        entries.push({ kind: "monthly", item, date: new Date(item.createdAt) })
      );
    }

    entries.sort((a, b) => b.date.getTime() - a.date.getTime());

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
            const dateStr = entry.date.toLocaleDateString("pt-BR", {
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
              <Pressable
                key={`${entry.kind}-${entry.item.id}-${idx}`}
                style={({ pressed }) => [s.historyCard, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedEntry(entry);
                }}
              >
                <View style={s.historyCardRow}>
                  <View style={[s.historyTypeBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[s.historyTypeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
                    <Text style={s.historyDate}>{dateStr}</Text>
                  </View>
                </View>
                <Text style={s.historyLine}>{mainLine}</Text>
                {!!metaLine && (
                  <Text style={s.historyMeta} numberOfLines={2}>{metaLine}</Text>
                )}
              </Pressable>
            );
          })
        )}
      </View>
    );
  }

  // ── Read-only detail view ─────────────────────────────────────────────────

  function renderDetail() {
    if (!selectedEntry) return null;

    const { kind, item } = selectedEntry;
    const cfg = {
      daily: { bg: BADGE_CONFIG.daily.bg, color: BADGE_CONFIG.daily.color, label: "Diário" },
      weekly: { bg: BADGE_CONFIG.weekly.bg, color: BADGE_CONFIG.weekly.color, label: "Semanal" },
      monthly: { bg: BADGE_CONFIG.monthly.bg, color: BADGE_CONFIG.monthly.color, label: "Mensal" },
    }[kind];

    function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
      if (!value) return null;
      return (
        <View style={s.detailField}>
          <Text style={s.detailFieldLabel}>{label}</Text>
          <Text style={s.detailFieldValue}>{value}</Text>
        </View>
      );
    }

    function DetailBool({ label, value }: { label: string; value: boolean }) {
      return (
        <View style={s.detailBoolRow}>
          <Text style={s.detailFieldLabel}>{label}</Text>
          <View style={[s.detailBoolBadge, { backgroundColor: value ? colors.success + "20" : colors.muted }]}>
            <Text style={[s.detailBoolBadgeText, { color: value ? colors.success : colors.mutedForeground }]}>
              {value ? "Sim" : "Não"}
            </Text>
          </View>
        </View>
      );
    }

    function DetailProgress({ label, value }: { label: string; value: number | null | undefined }) {
      if (value == null) return null;
      return (
        <View style={s.detailField}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={s.detailFieldLabel}>{label}</Text>
            <Text style={[s.detailFieldLabel, { color: colors.primary }]}>{value}%</Text>
          </View>
          <View style={s.progBarBg}>
            <View style={[s.progBarFill, { width: `${value}%` }]} />
          </View>
        </View>
      );
    }

    let titleLine = "";
    let content: React.ReactNode = null;

    if (kind === "daily") {
      const d = item as DailyCheckin;
      titleLine = `Check-in Diário — ${new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`;
      const execLabel = d.executedToday === "sim" ? "Sim" : d.executedToday === "parcial" ? "Parcial" : "Não";
      const execColor = d.executedToday === "sim" ? colors.success : d.executedToday === "parcial" ? "#d97706" : colors.destructive;
      content = (
        <>
          <View style={s.detailField}>
            <Text style={s.detailFieldLabel}>Executei hoje?</Text>
            <View style={[s.detailBoolBadge, { backgroundColor: execColor + "20", alignSelf: "flex-start" }]}>
              <Text style={[s.detailBoolBadgeText, { color: execColor }]}>{execLabel}</Text>
            </View>
          </View>
          <DetailProgress label="Progresso geral" value={d.progressToday} />
          <DetailField label="Impedimento" value={d.blocker} />
          <DetailField label="Próximo passo" value={d.nextStep} />
          <DetailBool label="Precisa de ajuda" value={d.needsHelp} />
          <DetailField label="Meta relacionada" value={d.goalTitle} />
        </>
      );
    } else if (kind === "weekly") {
      const w = item as WeeklyCheckin;
      const startFmt = new Date(w.weekStartDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
      const endFmt = w.weekEndDate ? new Date(w.weekEndDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
      titleLine = `Check-in Semanal — ${startFmt}${endFmt ? ` a ${endFmt}` : ""}`;
      content = (
        <>
          <DetailProgress label="Percentual de execução" value={w.executionPercentage} />
          <DetailField label="O que foi feito esta semana?" value={w.progressSummary} />
          <DetailField label="Impedimentos e bloqueios" value={w.blockers} />
          <DetailField label="Prioridades para a próxima semana" value={w.nextWeekPriority} />
          <DetailBool label="Precisa de suporte regional" value={w.needsRegionalSupport} />
          <DetailField label="Meta relacionada" value={w.goalTitle} />
        </>
      );
    } else {
      const m = item as MonthlyCheckin;
      const monthName = MONTHS_PT[m.month - 1];
      titleLine = `Check-in Mensal — ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${m.year}`;
      content = (
        <>
          <DetailField label="Progresso dos KRIs" value={m.kriProgress} />
          <DetailField label="Iniciativas que funcionaram" value={m.initiativesThatWorked} />
          <DetailField label="Iniciativas que não funcionaram" value={m.initiativesThatDidNotWork} />
          <DetailField label="Continuar fazendo" value={m.continueDoing} />
          <DetailField label="Parar de fazer" value={m.stopDoing} />
          <DetailField label="Começar a fazer" value={m.startDoing} />
          <DetailField label="Foco do próximo mês" value={m.nextMonthFocus} />
        </>
      );
    }

    const backLabel = drillFranchise ? `Voltar a ${drillFranchise.name}` : "Voltar ao histórico";

    return (
      <>
        <Pressable
          style={s.backHeader}
          onPress={() => setSelectedEntry(null)}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={s.backBtnText}>{backLabel}</Text>
        </Pressable>

        <View style={s.content}>
          <View style={[s.detailHeader, { borderLeftColor: cfg.color }]}>
            <View style={[s.historyTypeBadge, { backgroundColor: cfg.bg, alignSelf: "flex-start", marginBottom: 8 }]}>
              <Text style={[s.historyTypeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <Text style={s.detailTitle}>{titleLine}</Text>
          </View>

          {content}
        </View>
      </>
    );
  }

  // ── Comparativo view ──────────────────────────────────────────────────────

  function renderComparativo() {
    if (loadingComp) {
      return (
        <View style={[s.content, { paddingTop: 8 }]}>
          <View style={{ alignItems: "center", paddingTop: 40 }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        </View>
      );
    }

    if (compRows.length === 0) {
      return (
        <View style={[s.content, { paddingTop: 8 }]}>
          <Text style={s.emptyText}>Nenhuma franquia encontrada.</Text>
        </View>
      );
    }

    return (
      <View style={[s.content, { paddingTop: 4 }]}>
        <View style={s.compLegendRow}>
          <View style={s.compLegendItem}>
            <View style={[s.compLegendDot, { backgroundColor: "#16a34a" }]} />
            <Text style={s.compLegendText}>≤ 7 dias</Text>
          </View>
          <View style={s.compLegendItem}>
            <View style={[s.compLegendDot, { backgroundColor: "#d97706" }]} />
            <Text style={s.compLegendText}>≤ 30 dias</Text>
          </View>
          <View style={s.compLegendItem}>
            <View style={[s.compLegendDot, { backgroundColor: "#ef4444" }]} />
            <Text style={s.compLegendText}>{"> 30 dias"}</Text>
          </View>
        </View>

        {compRows.map((row) => {
          const dcColor = recencyColor(row.lastDaily, row.dailyCount, colors.mutedForeground);
          const wcColor = recencyColor(row.lastWeekly, row.weeklyCount, colors.mutedForeground);
          const mcColor = recencyColor(row.lastMonthly, row.monthlyCount, colors.mutedForeground);

          return (
            <Pressable
              key={row.franchiseId}
              style={({ pressed }) => [s.compCard, pressed && { opacity: 0.75 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDrillFranchise({ id: row.franchiseId, name: row.franchiseName });
                setHistoryFilter("all");
                setSelectedEntry(null);
              }}
            >
              <View style={s.compCardRow}>
                <Text style={s.compFranchiseName} numberOfLines={1}>{row.franchiseName}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} style={s.compChevron} />
              </View>
              <View style={s.compDivider} />
              <View style={s.compCountRow}>
                <View style={[s.compCountCell, s.compCountCellBorder]}>
                  <Text style={s.compCountLabel}>Diário</Text>
                  <Text style={[s.compCountNumber, { color: dcColor }]}>{row.dailyCount}</Text>
                  <Text style={[s.compCountDate, { color: dcColor }]}>{formatShortDate(row.lastDaily)}</Text>
                </View>
                <View style={[s.compCountCell, s.compCountCellBorder]}>
                  <Text style={s.compCountLabel}>Semanal</Text>
                  <Text style={[s.compCountNumber, { color: wcColor }]}>{row.weeklyCount}</Text>
                  <Text style={[s.compCountDate, { color: wcColor }]}>{formatShortDate(row.lastWeekly)}</Text>
                </View>
                <View style={s.compCountCell}>
                  <Text style={s.compCountLabel}>Mensal</Text>
                  <Text style={[s.compCountNumber, { color: mcColor }]}>{row.monthlyCount}</Text>
                  <Text style={[s.compCountDate, { color: mcColor }]}>{formatShortDate(row.lastMonthly)}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  }

  // ── Franchise drill-down ──────────────────────────────────────────────────

  function renderDrillHeader() {
    if (!drillFranchise) return null;
    return (
      <View style={s.drillFranchiseHeader}>
        <Pressable
          onPress={() => {
            setDrillFranchise(null);
            setSelectedEntry(null);
          }}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={s.backBtnText}>Comparativo</Text>
        </Pressable>
        <Text style={s.drillFranchiseName} numberOfLines={1}>{drillFranchise.name}</Text>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const inHistoryMode = viewMode === "history";
  const inComparativoMode = viewMode === "comparativo";
  const isDrilling = inComparativoMode && !!drillFranchise;

  const drillLoading = loadingDrillDaily || loadingDrillWeekly || loadingDrillMonthly;

  return (
    <ScrollView
      style={s.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={s.header}>
        <Text style={s.title}>Histórico</Text>
      </View>

      {isAdmin && (
        <View style={s.viewToggle}>
          <Pressable
            style={[s.viewToggleBtn, inHistoryMode && s.viewToggleBtnActive]}
            onPress={() => {
              setViewMode("history");
              setDrillFranchise(null);
              setSelectedEntry(null);
            }}
          >
            <Text style={[s.viewToggleBtnText, inHistoryMode && s.viewToggleBtnTextActive]}>
              Histórico
            </Text>
          </Pressable>
          <Pressable
            style={[s.viewToggleBtn, inComparativoMode && s.viewToggleBtnActive]}
            onPress={() => {
              setViewMode("comparativo");
              setDrillFranchise(null);
              setSelectedEntry(null);
            }}
          >
            <Text style={[s.viewToggleBtnText, inComparativoMode && s.viewToggleBtnTextActive]}>
              Comparativo
            </Text>
          </Pressable>
        </View>
      )}

      {inHistoryMode && (
        selectedEntry
          ? renderDetail()
          : renderList(
              allDailyCheckins ?? [],
              allWeeklyCheckins ?? [],
              allMonthlyCheckins ?? [],
              loadingDaily || loadingWeekly || loadingMonthly
            )
      )}

      {inComparativoMode && !isDrilling && renderComparativo()}

      {isDrilling && (
        selectedEntry
          ? renderDetail()
          : (
            <>
              {renderDrillHeader()}
              {renderList(
                drillDaily ?? [],
                drillWeekly ?? [],
                drillMonthly ?? [],
                drillLoading
              )}
            </>
          )
      )}
    </ScrollView>
  );
}
