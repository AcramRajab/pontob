import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface Kpi {
  id: number;
  goalId: number;
  name: string;
  initialValue: number | null;
  currentValue: number | null;
  targetValue: number | null;
  unit: string | null;
  frequency: string | null;
  indicatorType: string;
  desiredDirection: string;
  notes: string | null;
}

interface Initiative {
  id: number;
  goalId: number;
  strategicInitiativeId: number | null;
  catalogActive: boolean | null;
  initiativeName: string | null;
  customName: string | null;
  progressPercentage: number;
  status: string;
  desiredResult: string | null;
  ownerName: string | null;
  startDate: string | null;
  endDate: string | null;
  frequency: string | null;
  estimatedTime: string | null;
  whatWillBeDone: string | null;
  whyItMatters: string | null;
  whoIsResponsible: string | null;
  whereItWillBeDone: string | null;
  howItWillBeDone: string | null;
  investmentOrEffort: string | null;
  notes: string | null;
}

interface GoalDetail {
  id: number;
  title: string;
  dimensionId: number | null;
  dimensionName: string | null;
  keyProcessId: number | null;
  keyProcessName: string | null;
  kriDescription: string | null;
  currentValue: number | null;
  targetValue: number | null;
  unit: string | null;
  progressPercentage: number;
  score: number;
  status: string;
  riskStatus: string;
  activeInitiativesCount: number;
  ownerName: string | null;
  startDate: string | null;
  endDate: string | null;
  kpis: Kpi[];
  initiatives: Initiative[];
}

const INITIATIVE_STATUSES: { value: string; label: string }[] = [
  { value: "ativa", label: "Ativa" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "pausada", label: "Pausada" },
  { value: "cancelada", label: "Cancelada" },
];

const GOAL_STATUS_LABELS: Record<string, string> = {
  em_andamento: "Em andamento",
  atrasada: "Atrasada",
  concluida: "Concluída",
  cancelada: "Cancelada",
  pausada: "Pausada",
  nao_iniciada: "Não iniciada",
};

function calcKpiProgress(kpi: Kpi): number {
  if (kpi.currentValue == null || kpi.targetValue == null || kpi.targetValue <= 0) return 0;
  return Math.min(100, Math.round((kpi.currentValue / kpi.targetValue) * 100));
}

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [editingKpi, setEditingKpi] = useState<Kpi | null>(null);
  const [kpiValueInput, setKpiValueInput] = useState("");
  const [statusModalInitiative, setStatusModalInitiative] = useState<Initiative | null>(null);
  const [expandedInitiatives, setExpandedInitiatives] = useState<Set<number>>(new Set());

  const toggleInitiativeExpand = (id: number) => {
    setExpandedInitiatives((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso + (iso.includes("T") ? "" : "T00:00:00"));
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const FREQUENCY_LABELS: Record<string, string> = {
    diaria: "Diária",
    semanal: "Semanal",
    quinzenal: "Quinzenal",
    mensal: "Mensal",
    trimestral: "Trimestral",
    semestral: "Semestral",
    anual: "Anual",
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["goal", id],
    queryFn: async () => {
      const res = await apiFetch(`/goals/${id}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<GoalDetail>;
    },
    enabled: !!id && !!user,
    staleTime: 30_000,
  });

  const kpiMutation = useMutation({
    mutationFn: async ({ kpiId, value }: { kpiId: number; value: number }) => {
      const res = await apiFetch(`/kpis/${kpiId}`, {
        method: "PATCH",
        body: JSON.stringify({ currentValue: value }),
      });
      if (!res.ok) throw new Error("Failed to update KPI");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal", id] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setEditingKpi(null);
    },
    onError: () => {
      Alert.alert("Erro", "Não foi possível atualizar o KPI. Tente novamente.");
    },
  });

  const initiativeMutation = useMutation({
    mutationFn: async ({ initiativeId, status }: { initiativeId: number; status: string }) => {
      const res = await apiFetch(`/goal-initiatives/${initiativeId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update initiative");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal", id] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setStatusModalInitiative(null);
    },
    onError: () => {
      Alert.alert("Erro", "Não foi possível atualizar a iniciativa. Tente novamente.");
    },
  });

  const handleKpiSave = () => {
    if (!editingKpi) return;
    const val = parseFloat(kpiValueInput.replace(",", "."));
    if (isNaN(val)) {
      Alert.alert("Valor inválido", "Digite um número válido.");
      return;
    }
    kpiMutation.mutate({ kpiId: editingKpi.id, value: val });
  };

  const handleInitiativeStatus = (status: string) => {
    if (!statusModalInitiative) return;
    initiativeMutation.mutate({ initiativeId: statusModalInitiative.id, status });
  };

  const getStatusColor = (status: string, riskStatus?: string) => {
    if (status === "concluida") return colors.success;
    if (status === "cancelada" || status === "pausada") return colors.mutedForeground;
    if (status === "atrasada" || riskStatus === "atrasado") return colors.destructive;
    if (riskStatus === "adiantado") return colors.success;
    return colors.primary;
  };

  const getInitiativeStatusColor = (status: string) => {
    if (status === "concluida") return colors.success;
    if (status === "cancelada") return colors.destructive;
    if (status === "pausada") return colors.warning;
    if (status === "em_andamento") return colors.primary;
    return colors.mutedForeground;
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: topPad + 12,
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 8,
    },
    backBtn: {
      padding: 4,
      borderRadius: colors.radius,
    },
    headerTitle: {
      flex: 1,
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    content: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: botPad + 16 },
    section: {
      backgroundColor: colors.card,
      borderRadius: colors.radius * 2,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    goalTitle: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      lineHeight: 27,
      marginBottom: 6,
    },
    dimText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 10,
    },
    badge: {
      alignSelf: "flex-start",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: 14,
    },
    badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    progressLabel: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    progressPct: {
      fontSize: 13,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    barBg: {
      height: 8,
      backgroundColor: colors.muted,
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 10,
    },
    barFill: { height: "100%", borderRadius: 4 },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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
    kpiCard: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    kpiCardLast: {
      paddingVertical: 12,
    },
    kpiName: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 8,
    },
    kpiValRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    kpiValLabel: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    kpiValText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    kpiBarBg: {
      height: 6,
      backgroundColor: colors.muted,
      borderRadius: 3,
      overflow: "hidden",
      marginBottom: 8,
    },
    kpiBarFill: { height: "100%", borderRadius: 3 },
    editBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      alignSelf: "flex-end",
      paddingVertical: 4,
      paddingHorizontal: 10,
      backgroundColor: colors.primary + "14",
      borderRadius: colors.radius,
    },
    editBtnText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
    },
    initiativeCard: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    initiativeCardLast: {
      paddingVertical: 12,
    },
    initiativeTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: 8,
    },
    initiativeName: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      lineHeight: 20,
    },
    statusPill: {
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    statusPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    initiativeBarBg: {
      height: 5,
      backgroundColor: colors.muted,
      borderRadius: 3,
      overflow: "hidden",
      marginBottom: 4,
    },
    initiativeBarFill: { height: "100%", borderRadius: 3 },
    initiativePct: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "right",
    },
    deactivatedBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
      backgroundColor: "#fffbeb",
      borderWidth: 1,
      borderColor: "#fde68a",
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      marginBottom: 8,
    },
    deactivatedBannerText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: "#92400e",
      lineHeight: 17,
    },
    deactivatedBannerLink: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: "#92400e",
      textDecorationLine: "underline",
    },
    emptyText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      paddingVertical: 12,
    },
    kriBox: {
      backgroundColor: colors.muted,
      borderRadius: colors.radius,
      padding: 12,
      marginTop: 10,
    },
    kriLabel: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    kriText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      lineHeight: 19,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 12,
      paddingBottom: botPad + 16,
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      paddingHorizontal: 20,
      marginBottom: 4,
    },
    modalSubtitle: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    statusOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      gap: 12,
    },
    statusOptionText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    statusOptionTextSelected: {
      fontFamily: "Inter_600SemiBold",
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    kpiEditSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 12,
      paddingBottom: botPad + 16,
      paddingHorizontal: 20,
    },
    kpiEditTitle: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 4,
    },
    kpiEditName: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 16,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 16,
    },
    input: {
      flex: 1,
      height: 48,
      borderWidth: 1,
      borderColor: colors.input,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      fontSize: 17,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      backgroundColor: colors.background,
    },
    unitLabel: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
    },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 14,
      alignItems: "center",
    },
    saveBtnText: {
      color: colors.primaryForeground,
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
    cancelBtn: {
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 8,
    },
    cancelBtnText: {
      color: colors.mutedForeground,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
    },
    detailsToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 3,
      marginTop: 6,
      paddingVertical: 2,
    },
    detailsToggleText: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    detailsBox: {
      marginTop: 10,
      backgroundColor: colors.muted,
      borderRadius: colors.radius,
      padding: 12,
      gap: 8,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    detailLabel: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      minWidth: 72,
      lineHeight: 17,
    },
    detailValue: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      lineHeight: 18,
    },
    detailDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 2,
    },
    fivewLabel: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: 6,
    },
    fivewRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
      marginBottom: 6,
    },
    fivewKey: {
      fontSize: 11,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
      minWidth: 30,
      lineHeight: 17,
    },
    fivewValue: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      lineHeight: 18,
    },
  });

  if (isLoading) {
    return (
      <View style={[s.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={s.headerTitle}>Meta</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.mutedForeground} />
          <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginTop: 12 }}>
            Erro ao carregar
          </Text>
          <Pressable
            style={{ marginTop: 16, backgroundColor: colors.primary, borderRadius: colors.radius, paddingHorizontal: 20, paddingVertical: 10 }}
            onPress={() => refetch()}
          >
            <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }}>Tentar novamente</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const statusColor = getStatusColor(data.status, data.riskStatus);
  const pct = Math.min(data.progressPercentage, 100);
  const activeInitiatives = data.initiatives.filter((i) => i.status !== "cancelada" && i.status !== "concluida");

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>
          {data.title}
        </Text>
      </View>

      <ScrollView style={s.content} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          <Text style={s.goalTitle}>{data.title}</Text>

          {(data.dimensionName || data.keyProcessName) && (
            <Text style={s.dimText}>
              {data.dimensionName}
              {data.keyProcessName ? ` · ${data.keyProcessName}` : ""}
            </Text>
          )}

          <View style={[s.badge, { backgroundColor: statusColor + "18" }]}>
            <Text style={[s.badgeText, { color: statusColor }]}>
              {GOAL_STATUS_LABELS[data.status] ?? data.status}
            </Text>
          </View>

          <View style={s.progressRow}>
            <Text style={s.progressLabel}>Progresso geral</Text>
            <Text style={s.progressPct}>{pct}%</Text>
          </View>
          <View style={s.barBg}>
            <View style={[s.barFill, { width: `${pct}%`, backgroundColor: statusColor }]} />
          </View>

          <View style={s.metaRow}>
            <Text style={s.metaText}>
              {data.activeInitiativesCount}{" "}
              {data.activeInitiativesCount === 1 ? "iniciativa ativa" : "iniciativas ativas"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="trophy-outline" size={12} color={colors.mutedForeground} />
              <Text style={s.scoreText}>{data.score}</Text>
            </View>
          </View>

          {data.kriDescription ? (
            <View style={s.kriBox}>
              <Text style={s.kriLabel}>KRI</Text>
              <Text style={s.kriText}>{data.kriDescription}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>KPIs</Text>
          {data.kpis.length === 0 ? (
            <Text style={s.emptyText}>Nenhum KPI cadastrado</Text>
          ) : (
            data.kpis.map((kpi, idx) => {
              const kpiPct = calcKpiProgress(kpi);
              const isLast = idx === data.kpis.length - 1;
              return (
                <View key={kpi.id} style={isLast ? s.kpiCardLast : s.kpiCard}>
                  <Text style={s.kpiName}>{kpi.name}</Text>

                  <View style={s.kpiValRow}>
                    <Text style={s.kpiValLabel}>Atual</Text>
                    <Text style={s.kpiValText}>
                      {kpi.currentValue != null ? kpi.currentValue : "—"}
                      {kpi.unit ? ` ${kpi.unit}` : ""}
                    </Text>
                  </View>
                  <View style={s.kpiValRow}>
                    <Text style={s.kpiValLabel}>Meta</Text>
                    <Text style={s.kpiValText}>
                      {kpi.targetValue != null ? kpi.targetValue : "—"}
                      {kpi.unit ? ` ${kpi.unit}` : ""}
                    </Text>
                  </View>

                  <View style={s.kpiBarBg}>
                    <View style={[s.kpiBarFill, { width: `${kpiPct}%`, backgroundColor: colors.primary }]} />
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
                      {kpiPct}% atingido
                    </Text>
                    <Pressable
                      style={s.editBtn}
                      onPress={() => {
                        setEditingKpi(kpi);
                        setKpiValueInput(kpi.currentValue != null ? String(kpi.currentValue) : "");
                      }}
                    >
                      <Ionicons name="pencil-outline" size={12} color={colors.primary} />
                      <Text style={s.editBtnText}>Atualizar</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={s.section}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={[s.sectionTitle, { marginBottom: 0 }]}>Iniciativas</Text>
            {(user?.role === "franqueado" || user?.role === "responsavel_interno") && data.activeInitiativesCount < 3 && (
              <Pressable
                style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: colors.primary + "14", borderRadius: colors.radius }}
                onPress={() => router.push(`/goal/${id}/initiative-new` as Parameters<typeof router.push>[0])}
              >
                <Ionicons name="add" size={14} color={colors.primary} />
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.primary }}>Adicionar</Text>
              </Pressable>
            )}
          </View>
          {data.initiatives.length === 0 ? (
            <Text style={s.emptyText}>Nenhuma iniciativa vinculada</Text>
          ) : (
            data.initiatives.map((ini, idx) => {
              const isLast = idx === data.initiatives.length - 1;
              const iniStatusColor = getInitiativeStatusColor(ini.status);
              const statusLabel = INITIATIVE_STATUSES.find((s) => s.value === ini.status)?.label ?? ini.status;
              const iniPct = Math.min(ini.progressPercentage, 100);
              const canEdit = user?.role === "franqueado" || user?.role === "responsavel_interno";
              const isExpanded = expandedInitiatives.has(ini.id);
              const hasDetails =
                ini.desiredResult ||
                ini.ownerName ||
                ini.startDate ||
                ini.endDate ||
                ini.frequency ||
                ini.estimatedTime ||
                ini.whatWillBeDone ||
                ini.whyItMatters ||
                ini.whoIsResponsible ||
                ini.whereItWillBeDone ||
                ini.howItWillBeDone ||
                ini.investmentOrEffort ||
                ini.notes;

              const fivew = [
                { key: "O quê", value: ini.whatWillBeDone },
                { key: "Por quê", value: ini.whyItMatters },
                { key: "Quem", value: ini.whoIsResponsible },
                { key: "Onde", value: ini.whereItWillBeDone },
                { key: "Como", value: ini.howItWillBeDone },
                { key: "Esforço", value: ini.investmentOrEffort },
              ].filter((f) => !!f.value);

              return (
                <View key={ini.id} style={isLast ? s.initiativeCardLast : s.initiativeCard}>
                  <View style={s.initiativeTop}>
                    <Text style={s.initiativeName}>
                      {ini.initiativeName ?? ini.customName ?? "Iniciativa"}
                    </Text>
                    <Pressable
                      style={[s.statusPill, { backgroundColor: iniStatusColor + "18" }]}
                      onPress={() => setStatusModalInitiative(ini)}
                    >
                      <View style={[s.statusDot, { backgroundColor: iniStatusColor }]} />
                      <Text style={[s.statusPillText, { color: iniStatusColor }]}>{statusLabel}</Text>
                      <Ionicons name="chevron-down" size={10} color={iniStatusColor} />
                    </Pressable>
                  </View>

                  {ini.strategicInitiativeId && ini.catalogActive === false && (
                    <View style={s.deactivatedBanner}>
                      <Ionicons name="warning-outline" size={13} color="#d97706" style={{ marginTop: 1 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.deactivatedBannerText}>
                          Esta iniciativa foi desativada do catálogo.{" "}
                          <Text
                            style={s.deactivatedBannerLink}
                            onPress={() => {
                              const kpId = data?.keyProcessId;
                              const path = kpId
                                ? `/goal/${id}/initiative-new?keyProcessId=${kpId}`
                                : `/goal/${id}/initiative-new`;
                              router.push(path as Parameters<typeof router.push>[0]);
                            }}
                          >
                            Adicionar substituta
                          </Text>
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={s.initiativeBarBg}>
                    <View style={[s.initiativeBarFill, { width: `${iniPct}%`, backgroundColor: iniStatusColor }]} />
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={s.initiativePct}>{iniPct}%</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {hasDetails && (
                        <Pressable
                          style={s.detailsToggle}
                          onPress={() => toggleInitiativeExpand(ini.id)}
                        >
                          <Text style={s.detailsToggleText}>
                            {isExpanded ? "Fechar" : "Detalhes"}
                          </Text>
                          <Ionicons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={11}
                            color={colors.mutedForeground}
                          />
                        </Pressable>
                      )}
                      {canEdit && (
                        <Pressable
                          style={({ pressed }) => [s.editBtn, pressed && { opacity: 0.7 }]}
                          onPress={() =>
                            router.push(
                              `/goal/${id}/initiative-edit?initiativeId=${ini.id}` as Parameters<typeof router.push>[0]
                            )
                          }
                        >
                          <Ionicons name="pencil-outline" size={12} color={colors.primary} />
                          <Text style={s.editBtnText}>Editar</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={s.detailsBox}>
                      {ini.desiredResult ? (
                        <View style={s.detailRow}>
                          <Text style={s.detailLabel}>Resultado</Text>
                          <Text style={s.detailValue}>{ini.desiredResult}</Text>
                        </View>
                      ) : null}

                      {(ini.startDate || ini.endDate) ? (
                        <View style={s.detailRow}>
                          <Text style={s.detailLabel}>Período</Text>
                          <Text style={s.detailValue}>
                            {[formatDate(ini.startDate), formatDate(ini.endDate)]
                              .filter(Boolean)
                              .join(" → ")}
                          </Text>
                        </View>
                      ) : null}

                      {ini.ownerName ? (
                        <View style={s.detailRow}>
                          <Text style={s.detailLabel}>Responsável</Text>
                          <Text style={s.detailValue}>{ini.ownerName}</Text>
                        </View>
                      ) : null}

                      {ini.frequency ? (
                        <View style={s.detailRow}>
                          <Text style={s.detailLabel}>Frequência</Text>
                          <Text style={s.detailValue}>
                            {FREQUENCY_LABELS[ini.frequency] ?? ini.frequency}
                          </Text>
                        </View>
                      ) : null}

                      {ini.estimatedTime ? (
                        <View style={s.detailRow}>
                          <Text style={s.detailLabel}>Tempo est.</Text>
                          <Text style={s.detailValue}>{ini.estimatedTime}</Text>
                        </View>
                      ) : null}

                      {fivew.length > 0 ? (
                        <>
                          <View style={s.detailDivider} />
                          <Text style={s.fivewLabel}>Planejamento 5W2H</Text>
                          {fivew.map((f) => (
                            <View key={f.key} style={s.fivewRow}>
                              <Text style={s.fivewKey}>{f.key}</Text>
                              <Text style={s.fivewValue}>{f.value}</Text>
                            </View>
                          ))}
                        </>
                      ) : null}

                      {ini.notes ? (
                        <>
                          <View style={s.detailDivider} />
                          <View style={s.detailRow}>
                            <Text style={s.detailLabel}>Notas</Text>
                            <Text style={s.detailValue}>{ini.notes}</Text>
                          </View>
                        </>
                      ) : null}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={editingKpi !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingKpi(null)}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setEditingKpi(null)} />
          <View style={s.kpiEditSheet}>
            <View style={s.modalHandle} />
            <Text style={s.kpiEditTitle}>Atualizar KPI</Text>
            <Text style={s.kpiEditName}>{editingKpi?.name}</Text>

            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                value={kpiValueInput}
                onChangeText={setKpiValueInput}
                keyboardType="numeric"
                placeholder="Valor atual"
                placeholderTextColor={colors.mutedForeground}
                autoFocus
                selectTextOnFocus
              />
              {editingKpi?.unit ? (
                <Text style={s.unitLabel}>{editingKpi.unit}</Text>
              ) : null}
            </View>

            {editingKpi?.targetValue != null && (
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 16 }}>
                Meta: {editingKpi.targetValue}{editingKpi.unit ? ` ${editingKpi.unit}` : ""}
              </Text>
            )}

            <Pressable
              style={[s.saveBtn, kpiMutation.isPending && { opacity: 0.6 }]}
              onPress={handleKpiSave}
              disabled={kpiMutation.isPending}
            >
              {kpiMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={s.saveBtnText}>Salvar</Text>
              )}
            </Pressable>

            <Pressable style={s.cancelBtn} onPress={() => setEditingKpi(null)}>
              <Text style={s.cancelBtnText}>Cancelar</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={statusModalInitiative !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalInitiative(null)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setStatusModalInitiative(null)}>
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Status da iniciativa</Text>
            <Text style={s.modalSubtitle} numberOfLines={2}>
              {statusModalInitiative?.initiativeName ?? statusModalInitiative?.customName ?? "Iniciativa"}
            </Text>

            {INITIATIVE_STATUSES.map((opt) => {
              const isSelected = statusModalInitiative?.status === opt.value;
              const optColor = getInitiativeStatusColor(opt.value);
              return (
                <Pressable
                  key={opt.value}
                  style={[s.statusOption, isSelected && { backgroundColor: colors.muted }]}
                  onPress={() => handleInitiativeStatus(opt.value)}
                  disabled={initiativeMutation.isPending}
                >
                  <View style={[s.statusDot, { backgroundColor: optColor, width: 12, height: 12, borderRadius: 6 }]} />
                  <Text style={[s.statusOptionText, isSelected && s.statusOptionTextSelected]}>
                    {opt.label}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={colors.primary}
                      style={{ marginLeft: "auto" }}
                    />
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
