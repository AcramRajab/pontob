import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface Goal {
  id: number;
  title: string;
  dimensionName: string | null;
  keyProcessName: string | null;
  progressPercentage: number;
  score: number;
  status: string;
  riskStatus: string;
  activeInitiativesCount: number;
  currentValue: number | null;
  targetValue: number | null;
  unit: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  em_andamento: "Em andamento",
  atrasada: "Atrasada",
  concluida: "Concluída",
  cancelada: "Cancelada",
  pausada: "Pausada",
};

export default function GoalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 80);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["goals", user?.franchiseId],
    queryFn: async () => {
      const params = user?.franchiseId
        ? `?franchiseId=${user.franchiseId}`
        : "";
      const res = await apiFetch(`/goals${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Goal[]>;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const getStatusColor = (status: string, riskStatus: string) => {
    if (status === "concluida") return colors.success;
    if (status === "cancelada") return colors.mutedForeground;
    if (status === "atrasada" || riskStatus === "atrasado")
      return colors.destructive;
    if (riskStatus === "adiantado") return colors.success;
    return colors.primary;
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: topPad + 16,
      paddingHorizontal: 20,
      paddingBottom: 16,
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
    },
    listContent: { paddingHorizontal: 16, paddingBottom: botPad, paddingTop: 4 },
    goalCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius * 2,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    goalTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    goalTitle: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      lineHeight: 21,
      marginRight: 8,
    },
    badge: {
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    dimText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 12,
    },
    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    progressLabel: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    progressPct: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    barBg: {
      height: 6,
      backgroundColor: colors.muted,
      borderRadius: 3,
      overflow: "hidden",
    },
    barFill: { height: "100%", borderRadius: 3 },
    scoreRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    metaText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    scoreText: {
      fontSize: 13,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 80,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginTop: 12,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      marginTop: 4,
    },
    retryBtn: {
      marginTop: 16,
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    retryText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
  });

  const renderGoal = ({ item: g }: { item: Goal }) => {
    const statusColor = getStatusColor(g.status, g.riskStatus);
    const pct = Math.min(g.progressPercentage, 100);
    return (
      <View style={s.goalCard}>
        <View style={s.goalTop}>
          <Text style={s.goalTitle} numberOfLines={2}>
            {g.title}
          </Text>
          <View style={[s.badge, { backgroundColor: statusColor + "18" }]}>
            <Text style={[s.badgeText, { color: statusColor }]}>
              {STATUS_LABELS[g.status] ?? g.status}
            </Text>
          </View>
        </View>

        {g.dimensionName && (
          <Text style={s.dimText}>
            {g.dimensionName}
            {g.keyProcessName ? ` · ${g.keyProcessName}` : ""}
          </Text>
        )}

        <View style={s.progressRow}>
          <Text style={s.progressLabel}>Progresso</Text>
          <Text style={s.progressPct}>{pct}%</Text>
        </View>
        <View style={s.barBg}>
          <View style={[s.barFill, { width: `${pct}%`, backgroundColor: statusColor }]} />
        </View>

        <View style={s.scoreRow}>
          <Text style={s.metaText}>
            {g.activeInitiativesCount}{" "}
            {g.activeInitiativesCount === 1 ? "iniciativa" : "iniciativas"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="trophy-outline" size={12} color={colors.mutedForeground} />
            <Text style={s.scoreText}>{g.score}</Text>
          </View>
        </View>
      </View>
    );
  };

  const activeGoals = data?.filter((g) => !["cancelada", "concluida"].includes(g.status)) ?? [];
  const doneGoals = data?.filter((g) => g.status === "concluida") ?? [];

  if (isLoading) {
    return (
      <View style={[s.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>Metas</Text>
        </View>
        <View style={s.emptyWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.mutedForeground} />
          <Text style={s.emptyTitle}>Erro ao carregar</Text>
          <Pressable style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Metas</Text>
        <Text style={s.subtitle}>
          {activeGoals.length} ativa{activeGoals.length !== 1 ? "s" : ""} ·{" "}
          {doneGoals.length} concluída{doneGoals.length !== 1 ? "s" : ""}
        </Text>
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderGoal}
        contentContainerStyle={[
          s.listContent,
          (!data || data.length === 0) && { flex: 1 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={() => (
          <View style={s.emptyWrap}>
            <Ionicons name="flag-outline" size={48} color={colors.mutedForeground} />
            <Text style={s.emptyTitle}>Nenhuma meta</Text>
            <Text style={s.emptyText}>
              Suas metas aparecerão aqui quando forem criadas no sistema
            </Text>
          </View>
        )}
        scrollEnabled={!!(data && data.length > 0)}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
