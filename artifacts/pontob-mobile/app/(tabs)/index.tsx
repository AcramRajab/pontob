import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getMondayOf(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TodayOverview {
  date: string;
  franchiseId: number;
  activeGoals: number;
  initiativesForToday: Array<{
    id: number;
    goalId: number;
    status: string;
    progressPercentage: number | null;
    notes: string | null;
  }>;
  todayCheckins: Array<{ id: number; executedToday: string; date: string }>;
  pendingAlerts: Array<{
    id: number;
    type: string;
    severity: string;
    message: string;
    createdAt: string;
  }>;
  pendingHelpRequests: number;
  weekScore: number | null;
}

interface WeeklyCheckin {
  id: number;
  weekStartDate: string;
}

interface MonthlyCheckin {
  id: number;
  month: number;
  year: number;
}

export default function TodayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  const today = new Date();
  const isMonday = today.getDay() === 1;
  const isFirstOfMonth = today.getDate() === 1;

  const monday = getMondayOf(today);
  const weekStartDate = toISODate(monday);
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const dateStr = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 80);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard-today", user?.franchiseId],
    queryFn: async () => {
      const params = user?.franchiseId
        ? `?franchiseId=${user.franchiseId}`
        : "";
      const res = await apiFetch(`/dashboard/today${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<TodayOverview>;
    },
    enabled: !!user,
    staleTime: 30_000,
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
    enabled: !!user && isMonday,
    staleTime: 30_000,
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
    enabled: !!user && isFirstOfMonth,
    staleTime: 30_000,
  });

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: topPad + 16,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    greeting: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    dateText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
      textTransform: "capitalize",
    },
    content: { paddingHorizontal: 16, paddingBottom: botPad },
    statsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: colors.radius * 2,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    primaryCard: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: colors.radius * 2,
      padding: 16,
      gap: 4,
    },
    statNum: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    primaryNum: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: colors.primaryForeground,
    },
    statLabel: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    primaryLabel: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.primaryForeground + "bb",
    },
    section: { marginBottom: 20 },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    sectionCount: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    initCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius + 4,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    initDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    initBody: { flex: 1, gap: 6 },
    initLabel: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    initBarBg: {
      height: 4,
      backgroundColor: colors.muted,
      borderRadius: 2,
      overflow: "hidden",
    },
    initBarFill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    initPct: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    alertCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius + 4,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 3,
      borderLeftColor: colors.destructive,
      marginBottom: 8,
    },
    alertType: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.destructive,
      marginBottom: 4,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    alertMsg: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      lineHeight: 18,
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius + 4,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      gap: 8,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
    },
    checkinCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius + 4,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
      gap: 10,
    },
    checkinCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    checkinCardTitle: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    checkinPills: {
      flexDirection: "row",
      gap: 8,
      flexWrap: "wrap",
    },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1,
    },
    pillDone: {
      backgroundColor: colors.success + "18",
      borderColor: colors.success + "40",
    },
    pillPending: {
      backgroundColor: colors.muted,
      borderColor: colors.border,
    },
    pillText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
    },
    pillTextDone: {
      color: colors.success,
    },
    pillTextPending: {
      color: colors.mutedForeground,
    },
    retryBtn: {
      marginTop: 16,
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    retryText: {
      color: colors.primaryForeground,
      fontFamily: "Inter_600SemiBold",
    },
  });

  const firstName = user?.name?.split(" ")[0] ?? "Olá";
  const alreadyDoneDaily = (data?.todayCheckins?.length ?? 0) > 0;
  const alreadyDoneWeekly = !!thisWeekCheckin;
  const alreadyDoneMonthly = !!thisMonthCheckin;

  function getPendingTab(): "daily" | "weekly" | "monthly" {
    if (!alreadyDoneDaily) return "daily";
    if (isMonday && !alreadyDoneWeekly) return "weekly";
    if (isFirstOfMonth && !alreadyDoneMonthly) return "monthly";
    return "daily";
  }

  function handleCheckinCardPress() {
    router.push({
      pathname: "/(tabs)/checkin",
      params: { tab: getPendingTab() },
    });
  }

  if (isLoading) {
    return (
      <View
        style={[
          s.container,
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View
        style={[
          s.container,
          { alignItems: "center", justifyContent: "center", padding: 24 },
        ]}
      >
        <Ionicons
          name="cloud-offline-outline"
          size={48}
          color={colors.mutedForeground}
        />
        <Text
          style={{
            color: colors.foreground,
            fontFamily: "Inter_600SemiBold",
            fontSize: 16,
            marginTop: 12,
          }}
        >
          Erro ao carregar
        </Text>
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            marginTop: 4,
          }}
        >
          Verifique sua conexão
        </Text>
        <Pressable onPress={() => refetch()} style={s.retryBtn}>
          <Text style={s.retryText}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
    >
      <View style={s.header}>
        <Text style={s.greeting}>Olá, {firstName}</Text>
        <Text style={s.dateText}>{dateStr}</Text>
      </View>

      <View style={s.content}>
        <View style={s.statsRow}>
          <View style={s.primaryCard}>
            <Ionicons
              name="trophy-outline"
              size={16}
              color={colors.primaryForeground + "bb"}
            />
            <Text style={s.primaryNum}>{data?.weekScore ?? "–"}</Text>
            <Text style={s.primaryLabel}>Pontuação</Text>
          </View>
          <View style={s.statCard}>
            <Ionicons
              name="flag-outline"
              size={16}
              color={colors.mutedForeground}
            />
            <Text style={s.statNum}>{data?.activeGoals ?? 0}</Text>
            <Text style={s.statLabel}>Metas ativas</Text>
          </View>
          {(data?.pendingAlerts?.length ?? 0) > 0 && (
            <View
              style={[
                s.statCard,
                { borderColor: colors.destructive + "40" },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={colors.destructive}
              />
              <Text style={[s.statNum, { color: colors.destructive }]}>
                {data!.pendingAlerts.length}
              </Text>
              <Text style={s.statLabel}>Alertas</Text>
            </View>
          )}
        </View>

        <Pressable style={s.checkinCard} onPress={handleCheckinCardPress}>
          <View style={s.checkinCardHeader}>
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={colors.mutedForeground}
            />
            <Text style={s.checkinCardTitle}>Check-ins</Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={colors.mutedForeground}
            />
          </View>
          <View style={s.checkinPills}>
            <View
              style={[s.pill, alreadyDoneDaily ? s.pillDone : s.pillPending]}
            >
              <Text style={{ fontSize: 13 }}>
                {alreadyDoneDaily ? "✅" : "⏳"}
              </Text>
              <Text
                style={[
                  s.pillText,
                  alreadyDoneDaily ? s.pillTextDone : s.pillTextPending,
                ]}
              >
                Diário
              </Text>
            </View>
            {isMonday && (
              <View
                style={[
                  s.pill,
                  alreadyDoneWeekly ? s.pillDone : s.pillPending,
                ]}
              >
                <Text style={{ fontSize: 13 }}>
                  {alreadyDoneWeekly ? "✅" : "⏳"}
                </Text>
                <Text
                  style={[
                    s.pillText,
                    alreadyDoneWeekly ? s.pillTextDone : s.pillTextPending,
                  ]}
                >
                  Semanal
                </Text>
              </View>
            )}
            {isFirstOfMonth && (
              <View
                style={[
                  s.pill,
                  alreadyDoneMonthly ? s.pillDone : s.pillPending,
                ]}
              >
                <Text style={{ fontSize: 13 }}>
                  {alreadyDoneMonthly ? "✅" : "⏳"}
                </Text>
                <Text
                  style={[
                    s.pillText,
                    alreadyDoneMonthly ? s.pillTextDone : s.pillTextPending,
                  ]}
                >
                  Mensal
                </Text>
              </View>
            )}
          </View>
        </Pressable>

        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Iniciativas ativas</Text>
            <Text style={s.sectionCount}>
              {data?.initiativesForToday?.length ?? 0}
            </Text>
          </View>
          {!data?.initiativesForToday?.length ? (
            <View style={s.emptyCard}>
              <Ionicons
                name="rocket-outline"
                size={28}
                color={colors.mutedForeground}
              />
              <Text style={s.emptyText}>
                Nenhuma iniciativa ativa no momento
              </Text>
            </View>
          ) : (
            data.initiativesForToday.slice(0, 6).map((init) => (
              <View key={init.id} style={s.initCard}>
                <View style={s.initDot} />
                <View style={s.initBody}>
                  <Text style={s.initLabel}>Iniciativa #{init.id}</Text>
                  <View style={s.initBarBg}>
                    <View
                      style={[
                        s.initBarFill,
                        { width: `${init.progressPercentage ?? 0}%` },
                      ]}
                    />
                  </View>
                </View>
                <Text style={s.initPct}>
                  {init.progressPercentage ?? 0}%
                </Text>
              </View>
            ))
          )}
        </View>

        {(data?.pendingAlerts?.length ?? 0) > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Alertas</Text>
              <Text style={s.sectionCount}>
                {data!.pendingAlerts.length}
              </Text>
            </View>
            {data!.pendingAlerts.map((alert) => (
              <View key={alert.id} style={s.alertCard}>
                <Text style={s.alertType}>
                  {alert.type.replace(/_/g, " ")}
                </Text>
                <Text style={s.alertMsg}>{alert.message}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
