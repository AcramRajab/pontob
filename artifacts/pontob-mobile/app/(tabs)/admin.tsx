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

const ROLE_LABELS: Record<string, string> = {
  franqueado: "Franqueado",
  responsavel_interno: "Responsável Interno",
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

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

export default function AdminApprovalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [rejectTarget, setRejectTarget] = useState<Invite | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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
    },
    sheetTitle: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginBottom: 6,
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

  if (isLoading) {
    return (
      <View style={[s.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[s.container, { alignItems: "center", justifyContent: "center", padding: 24 }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.mutedForeground} />
        <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 16, marginTop: 12 }}>
          Erro ao carregar
        </Text>
        <Pressable onPress={() => refetch()} style={s.retryBtn}>
          <Text style={s.retryText}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
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
          <Text style={s.title}>Aprovações</Text>
        </View>

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
      </ScrollView>

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
    </>
  );
}
