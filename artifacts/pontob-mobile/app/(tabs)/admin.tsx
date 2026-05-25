import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery, useMutation } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
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

interface Invite {
  id: number;
  franchiseId: number | null;
  franchiseName: string | null;
  role: string;
  status: string;
  usedAt: string | null;
  usedByUserName: string | null;
  usedByUserEmail: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
}

interface Dimension {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
}

interface KeyProcess {
  id: number;
  name: string;
  dimensionName: string | null;
  active: boolean;
}

interface StrategicInitiative {
  id: number;
  name: string;
  keyProcessName: string | null;
  dimensionName: string | null;
  active: boolean;
}

type CatalogEntityType = "dimension" | "key_process" | "strategic_initiative";
type CatalogItem = { id: number; name: string; subtitle: string | null; active: boolean };

interface AuditEntry {
  id: number;
  action: string;
  userName: string;
  userEmail: string;
  changedAt: string;
}

interface HistoryTarget {
  itemType: CatalogEntityType;
  itemId: number;
  itemName: string;
}

const ROLE_LABELS: Record<string, string> = {
  franqueado: "Franqueado",
  responsavel_interno: "Responsável Interno",
};

const ENTITY_TYPE_LABELS: Record<CatalogEntityType, string> = {
  dimension: "Dimensão",
  key_process: "Processo-chave",
  strategic_initiative: "Iniciativa Estratégica",
};

const ACTION_LABELS: Record<string, string> = {
  activated: "Ativado",
  deactivated: "Desativado",
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 2) return "há 1 minuto";
  if (minutes < 60) return `há ${minutes} minutos`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "há 1 dia";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months === 1) return "há 1 mês";
  return `há ${months} meses`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

type AdminTab = "approvals" | "catalog";
type CatalogTab = "dimension" | "key_process" | "strategic_initiative";

export default function AdminApprovalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [adminTab, setAdminTab] = useState<AdminTab>("approvals");
  const [catalogTab, setCatalogTab] = useState<CatalogTab>("dimension");

  const [rejectTarget, setRejectTarget] = useState<Invite | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [historyTarget, setHistoryTarget] = useState<HistoryTarget | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 80);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["invites"],
    queryFn: async () => {
      const res = await apiFetch("/invites");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<Invite[]>;
    },
    enabled: !!user && ["master_admin", "staff_regional"].includes(user.role),
    staleTime: 30_000,
  });

  const { data: dimensions = [], isLoading: dimLoading, refetch: refetchDim, isRefetching: dimRefetching } = useQuery({
    queryKey: ["catalog-dimensions-admin"],
    queryFn: async () => {
      const res = await apiFetch("/dimensions?includeInactive=true");
      if (!res.ok) throw new Error("Failed to fetch dimensions");
      return res.json() as Promise<Dimension[]>;
    },
    enabled: !!user && ["master_admin", "staff_regional"].includes(user.role) && adminTab === "catalog",
    staleTime: 60_000,
  });

  const { data: keyProcesses = [], isLoading: kpLoading, refetch: refetchKp, isRefetching: kpRefetching } = useQuery({
    queryKey: ["catalog-key-processes-admin"],
    queryFn: async () => {
      const res = await apiFetch("/key-processes?includeInactive=true");
      if (!res.ok) throw new Error("Failed to fetch key processes");
      return res.json() as Promise<KeyProcess[]>;
    },
    enabled: !!user && ["master_admin", "staff_regional"].includes(user.role) && adminTab === "catalog",
    staleTime: 60_000,
  });

  const { data: initiatives = [], isLoading: initLoading, refetch: refetchInit, isRefetching: initRefetching } = useQuery({
    queryKey: ["catalog-initiatives-admin"],
    queryFn: async () => {
      const res = await apiFetch("/strategic-initiatives?includeInactive=true");
      if (!res.ok) throw new Error("Failed to fetch initiatives");
      return res.json() as Promise<StrategicInitiative[]>;
    },
    enabled: !!user && ["master_admin", "staff_regional"].includes(user.role) && adminTab === "catalog",
    staleTime: 60_000,
  });

  const { data: historyEntries = [], isLoading: historyLoading } = useQuery({
    queryKey: ["catalog-history", historyTarget?.itemType, historyTarget?.itemId],
    queryFn: async () => {
      if (!historyTarget) return [];
      const res = await apiFetch(
        `/catalog-audit-logs?itemType=${historyTarget.itemType}&itemId=${historyTarget.itemId}`
      );
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json() as Promise<AuditEntry[]>;
    },
    enabled: !!historyTarget,
    staleTime: 30_000,
  });

  const pending = (data ?? [])
    .filter(
      (inv) => inv.status === "used" && !inv.approvedAt && !inv.rejectedAt
    )
    .sort((a, b) => {
      const ta = a.usedAt ? new Date(a.usedAt).getTime() : 0;
      const tb = b.usedAt ? new Date(b.usedAt).getTime() : 0;
      return ta - tb;
    });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/invites/${id}/approve`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Erro ao aprovar");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invites"] });
    },
    onError: (err: Error) => {
      Alert.alert("Erro", err.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({
      id,
      reason,
    }: {
      id: number;
      reason: string | undefined;
    }) => {
      const res = await apiFetch(`/invites/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Erro ao rejeitar");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invites"] });
      setRejectTarget(null);
      setRejectReason("");
    },
    onError: (err: Error) => {
      Alert.alert("Erro", err.message);
      setRejectTarget(null);
      setRejectReason("");
    },
  });

  function handleApprove(inv: Invite) {
    Alert.alert(
      "Aprovar cadastro?",
      `${inv.usedByUserName ?? "—"} da franquia ${inv.franchiseName ?? "—"} receberá acesso imediato à plataforma.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aprovar",
          onPress: () => approveMutation.mutate(inv.id),
        },
      ]
    );
  }

  function handleRejectConfirm() {
    if (!rejectTarget) return;
    rejectMutation.mutate({
      id: rejectTarget.id,
      reason: rejectReason.trim() || undefined,
    });
  }

  function getCatalogItems(): CatalogItem[] {
    if (catalogTab === "dimension") {
      return dimensions.map((d) => ({
        id: d.id,
        name: d.name,
        subtitle: d.description,
        active: d.active,
      }));
    }
    if (catalogTab === "key_process") {
      return keyProcesses.map((kp) => ({
        id: kp.id,
        name: kp.name,
        subtitle: kp.dimensionName ?? null,
        active: kp.active,
      }));
    }
    return initiatives.map((si) => ({
      id: si.id,
      name: si.name,
      subtitle: si.keyProcessName ?? si.dimensionName ?? null,
      active: si.active,
    }));
  }

  function getCatalogLoading(): boolean {
    if (catalogTab === "dimension") return dimLoading;
    if (catalogTab === "key_process") return kpLoading;
    return initLoading;
  }

  function getCatalogRefreshing(): boolean {
    if (catalogTab === "dimension") return dimRefetching;
    if (catalogTab === "key_process") return kpRefetching;
    return initRefetching;
  }

  function handleCatalogRefresh() {
    if (catalogTab === "dimension") void refetchDim();
    else if (catalogTab === "key_process") void refetchKp();
    else void refetchInit();
  }

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
    tabRow: {
      flexDirection: "row",
      marginHorizontal: 16,
      marginBottom: 14,
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    tabBtnActive: {
      backgroundColor: colors.primary,
    },
    tabBtnText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
    },
    tabBtnTextActive: {
      color: colors.primaryForeground,
    },
    content: { paddingHorizontal: 16, paddingBottom: botPad },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    badge: {
      backgroundColor: "#fef3c7",
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    badgeText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: "#92400e",
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius * 2,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
      overflow: "hidden",
    },
    cardBody: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      gap: 12,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#fef3c7",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: "#92400e",
    },
    info: { flex: 1, gap: 2 },
    name: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    meta: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    timestamp: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: "#b45309",
      marginTop: 2,
    },
    cardActions: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: 11,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 5,
    },
    approveBtn: {
      borderRightWidth: 0.5,
      borderRightColor: colors.border,
    },
    rejectBtn: {
      borderLeftWidth: 0.5,
      borderLeftColor: colors.border,
    },
    approveBtnText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: "#16a34a",
    },
    rejectBtnText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.destructive,
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius * 2,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 32,
      alignItems: "center",
      gap: 10,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
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
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: insets.bottom + 24,
      maxHeight: "75%",
    },
    sheetTitle: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginBottom: 4,
    },
    sheetSubtitle: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 16,
    },
    sheetDesc: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 16,
      lineHeight: 20,
    },
    sheetLabel: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
      marginBottom: 6,
    },
    textInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      padding: 12,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      minHeight: 80,
      textAlignVertical: "top",
      marginBottom: 16,
    },
    sheetBtnRow: { flexDirection: "row", gap: 10 },
    sheetBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 10,
      alignItems: "center",
    },
    sheetCancelBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    sheetCancelText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
    },
    sheetConfirmBtn: {
      backgroundColor: colors.destructive,
    },
    sheetConfirmText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
    catalogTabRow: {
      flexDirection: "row",
      marginBottom: 14,
      gap: 6,
    },
    catalogTypeBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    catalogTypeBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    catalogTypeBtnText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
    },
    catalogTypeBtnTextActive: {
      color: colors.primaryForeground,
    },
    catalogItem: {
      backgroundColor: colors.card,
      borderRadius: colors.radius * 2,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    catalogItemIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    catalogItemInfo: { flex: 1, gap: 2 },
    catalogItemName: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    catalogItemSubtitle: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    statusBadgeActive: { backgroundColor: "#dcfce7" },
    statusBadgeInactive: { backgroundColor: "#fee2e2" },
    statusBadgeText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
    },
    statusBadgeTextActive: { color: "#16a34a" },
    statusBadgeTextInactive: { color: "#dc2626" },
    historyEntry: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 4,
    },
    historyEntryLast: {
      borderBottomWidth: 0,
    },
    historyActionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    historyActionBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    historyActionBadgeActivated: { backgroundColor: "#dcfce7" },
    historyActionBadgeDeactivated: { backgroundColor: "#fee2e2" },
    historyActionText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
    },
    historyActionTextActivated: { color: "#16a34a" },
    historyActionTextDeactivated: { color: "#dc2626" },
    historyMeta: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      lineHeight: 18,
    },
    historyMetaBold: {
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    historyEmpty: {
      paddingVertical: 24,
      alignItems: "center",
      gap: 8,
    },
    historyEmptyText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
    },
    sheetCloseBtn: {
      alignSelf: "flex-end",
      padding: 4,
      marginBottom: 4,
    },
  });

  if (!user || !["master_admin", "staff_regional"].includes(user.role)) {
    return (
      <View
        style={[s.container, { alignItems: "center", justifyContent: "center", padding: 24 }]}
      >
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
          Acesso restrito
        </Text>
      </View>
    );
  }

  const catalogItems = getCatalogItems();
  const catalogLoading = getCatalogLoading();
  const catalogRefreshing = getCatalogRefreshing();

  const catalogTypeIcon: Record<CatalogTab, React.ComponentProps<typeof Ionicons>["name"]> = {
    dimension: "layers-outline",
    key_process: "git-branch-outline",
    strategic_initiative: "sparkles-outline",
  };

  const catalogTypeIconActive: Record<CatalogTab, string> = {
    dimension: "#6366f1",
    key_process: "#0ea5e9",
    strategic_initiative: "#f59e0b",
  };

  const catalogTypeIconBg: Record<CatalogTab, string> = {
    dimension: "#ede9fe",
    key_process: "#e0f2fe",
    strategic_initiative: "#fef3c7",
  };

  return (
    <>
      <ScrollView
        style={s.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={adminTab === "approvals" ? isRefetching : catalogRefreshing}
            onRefresh={adminTab === "approvals" ? refetch : handleCatalogRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={s.header}>
          <Text style={s.title}>Admin</Text>
        </View>

        {/* Top-level tab switcher */}
        <View style={s.tabRow}>
          <Pressable
            style={[s.tabBtn, adminTab === "approvals" && s.tabBtnActive]}
            onPress={() => setAdminTab("approvals")}
          >
            <Text style={[s.tabBtnText, adminTab === "approvals" && s.tabBtnTextActive]}>
              Aprovações
            </Text>
          </Pressable>
          <Pressable
            style={[s.tabBtn, adminTab === "catalog" && s.tabBtnActive]}
            onPress={() => setAdminTab("catalog")}
          >
            <Text style={[s.tabBtnText, adminTab === "catalog" && s.tabBtnTextActive]}>
              Catálogo
            </Text>
          </Pressable>
        </View>

        {adminTab === "approvals" ? (
          <>
            {isLoading ? (
              <View style={{ alignItems: "center", padding: 40 }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : isError ? (
              <View style={{ alignItems: "center", padding: 24 }}>
                <Ionicons name="cloud-offline-outline" size={48} color={colors.mutedForeground} />
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 16, marginTop: 12 }}>
                  Erro ao carregar
                </Text>
                <Pressable onPress={() => refetch()} style={s.retryBtn}>
                  <Text style={s.retryText}>Tentar novamente</Text>
                </Pressable>
              </View>
            ) : (
              <View style={s.content}>
                <View style={s.sectionHeader}>
                  <Ionicons name="hourglass-outline" size={18} color="#b45309" />
                  <Text style={s.sectionTitle}>Aguardando aprovação</Text>
                  {pending.length > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{pending.length}</Text>
                    </View>
                  )}
                </View>

                {pending.length === 0 ? (
                  <View style={s.emptyCard}>
                    <Ionicons name="checkmark-circle-outline" size={36} color={colors.mutedForeground} />
                    <Text style={s.emptyText}>Nenhum cadastro aguardando aprovação</Text>
                  </View>
                ) : (
                  pending.map((inv) => (
                    <View key={inv.id} style={s.card}>
                      <View style={s.cardBody}>
                        <View style={s.avatar}>
                          <Text style={s.avatarText}>{initials(inv.usedByUserName)}</Text>
                        </View>
                        <View style={s.info}>
                          <Text style={s.name} numberOfLines={1}>
                            {inv.usedByUserName ?? "—"}
                          </Text>
                          <Text style={s.meta} numberOfLines={1}>
                            {inv.usedByUserEmail ?? ""}
                            {inv.franchiseName ? `  ·  ${inv.franchiseName}` : ""}
                          </Text>
                          <Text style={s.meta}>
                            {ROLE_LABELS[inv.role] ?? inv.role}
                          </Text>
                          {inv.usedAt && (
                            <Text style={s.timestamp}>
                              Cadastrado {relativeTime(inv.usedAt)}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={s.cardActions}>
                        <Pressable
                          style={({ pressed }) => [
                            s.actionBtn,
                            s.approveBtn,
                            pressed && { opacity: 0.6 },
                          ]}
                          onPress={() => handleApprove(inv)}
                          disabled={approveMutation.isPending}
                        >
                          <Ionicons name="checkmark-outline" size={16} color="#16a34a" />
                          <Text style={s.approveBtnText}>Aprovar</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            s.actionBtn,
                            s.rejectBtn,
                            pressed && { opacity: 0.6 },
                          ]}
                          onPress={() => {
                            setRejectTarget(inv);
                            setRejectReason("");
                          }}
                          disabled={rejectMutation.isPending}
                        >
                          <Ionicons name="close-outline" size={16} color={colors.destructive} />
                          <Text style={s.rejectBtnText}>Rejeitar</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        ) : (
          <View style={s.content}>
            {/* Catalog type tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.catalogTabRow}
              contentContainerStyle={{ gap: 6, paddingRight: 4 }}
            >
              {(["dimension", "key_process", "strategic_initiative"] as CatalogTab[]).map(
                (type) => (
                  <Pressable
                    key={type}
                    style={[s.catalogTypeBtn, catalogTab === type && s.catalogTypeBtnActive]}
                    onPress={() => setCatalogTab(type)}
                  >
                    <Text
                      style={[
                        s.catalogTypeBtnText,
                        catalogTab === type && s.catalogTypeBtnTextActive,
                      ]}
                    >
                      {ENTITY_TYPE_LABELS[type]}
                    </Text>
                  </Pressable>
                )
              )}
            </ScrollView>

            {catalogLoading ? (
              <View style={{ alignItems: "center", padding: 40 }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : catalogItems.length === 0 ? (
              <View style={s.emptyCard}>
                <Ionicons name="cube-outline" size={36} color={colors.mutedForeground} />
                <Text style={s.emptyText}>Nenhum item encontrado</Text>
              </View>
            ) : (
              catalogItems.map((item) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [s.catalogItem, pressed && { opacity: 0.7 }]}
                  onPress={() =>
                    setHistoryTarget({
                      itemType: catalogTab,
                      itemId: item.id,
                      itemName: item.name,
                    })
                  }
                >
                  <View
                    style={[
                      s.catalogItemIcon,
                      { backgroundColor: catalogTypeIconBg[catalogTab] },
                    ]}
                  >
                    <Ionicons
                      name={catalogTypeIcon[catalogTab]}
                      size={18}
                      color={catalogTypeIconActive[catalogTab]}
                    />
                  </View>
                  <View style={s.catalogItemInfo}>
                    <Text style={s.catalogItemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {item.subtitle && (
                      <Text style={s.catalogItemSubtitle} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      s.statusBadge,
                      item.active ? s.statusBadgeActive : s.statusBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        s.statusBadgeText,
                        item.active
                          ? s.statusBadgeTextActive
                          : s.statusBadgeTextInactive,
                      ]}
                    >
                      {item.active ? "Ativo" : "Inativo"}
                    </Text>
                  </View>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Reject modal */}
      {rejectTarget && (
        <Pressable style={s.overlay} onPress={() => setRejectTarget(null)}>
          <Pressable
            style={s.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={s.sheetTitle}>Rejeitar cadastro?</Text>
            <Text style={s.sheetDesc}>
              O cadastro de{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold" }}>
                {rejectTarget.usedByUserName ?? "—"}
              </Text>{" "}
              da franquia{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold" }}>
                {rejectTarget.franchiseName ?? "—"}
              </Text>{" "}
              será removido permanentemente.
            </Text>
            <Text style={s.sheetLabel}>
              Motivo{" "}
              <Text style={{ fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
                (opcional)
              </Text>
            </Text>
            <TextInput
              style={s.textInput}
              placeholder="Ex: Franquia já possui responsável cadastrado..."
              placeholderTextColor={colors.mutedForeground}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={s.sheetBtnRow}>
              <Pressable
                style={[s.sheetBtn, s.sheetCancelBtn]}
                onPress={() => setRejectTarget(null)}
              >
                <Text style={s.sheetCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[s.sheetBtn, s.sheetConfirmBtn, rejectMutation.isPending && { opacity: 0.6 }]}
                onPress={handleRejectConfirm}
                disabled={rejectMutation.isPending}
              >
                <Text style={s.sheetConfirmText}>
                  {rejectMutation.isPending ? "Rejeitando..." : "Rejeitar cadastro"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      )}

      {/* History sheet */}
      {historyTarget && (
        <Pressable style={s.overlay} onPress={() => setHistoryTarget(null)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <Pressable style={s.sheetCloseBtn} onPress={() => setHistoryTarget(null)}>
              <Ionicons name="close" size={20} color={colors.mutedForeground} />
            </Pressable>
            <Text style={s.sheetTitle} numberOfLines={2}>
              {historyTarget.itemName}
            </Text>
            <Text style={s.sheetSubtitle}>
              {ENTITY_TYPE_LABELS[historyTarget.itemType]} · Histórico de alterações
            </Text>

            {historyLoading ? (
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : historyEntries.length === 0 ? (
              <View style={s.historyEmpty}>
                <Ionicons name="time-outline" size={32} color={colors.mutedForeground} />
                <Text style={s.historyEmptyText}>
                  Nenhuma alteração registrada para este item.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {historyEntries.map((entry, idx) => {
                  const isActivated = entry.action === "activated";
                  const isLast = idx === historyEntries.length - 1;
                  return (
                    <View
                      key={entry.id}
                      style={[s.historyEntry, isLast && s.historyEntryLast]}
                    >
                      <View style={s.historyActionRow}>
                        <View
                          style={[
                            s.historyActionBadge,
                            isActivated
                              ? s.historyActionBadgeActivated
                              : s.historyActionBadgeDeactivated,
                          ]}
                        >
                          <Text
                            style={[
                              s.historyActionText,
                              isActivated
                                ? s.historyActionTextActivated
                                : s.historyActionTextDeactivated,
                            ]}
                          >
                            {ACTION_LABELS[entry.action] ?? entry.action}
                          </Text>
                        </View>
                        <Ionicons
                          name={isActivated ? "arrow-up-circle-outline" : "arrow-down-circle-outline"}
                          size={14}
                          color={isActivated ? "#16a34a" : "#dc2626"}
                        />
                      </View>
                      <Text style={s.historyMeta}>
                        Por{" "}
                        <Text style={s.historyMetaBold}>{entry.userName}</Text>
                      </Text>
                      <Text style={s.historyMeta}>{formatDate(entry.changedAt)}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      )}
    </>
  );
}
