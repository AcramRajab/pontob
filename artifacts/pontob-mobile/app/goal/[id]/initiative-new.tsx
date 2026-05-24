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

interface GoalInfo {
  id: number;
  title: string;
  dimensionId: number | null;
  dimensionName: string | null;
  keyProcessId: number | null;
  keyProcessName: string | null;
  initiatives: Array<{ status: string }>;
}

interface CatalogInitiative {
  id: number;
  name: string;
  keyProcessName: string | null;
  kri: string | null;
  kpi: string | null;
  description: string | null;
}

type Step = "choose" | "catalog-list" | "custom-form";

export default function InitiativeNewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("choose");
  const [selectedInitiative, setSelectedInitiative] = useState<CatalogInitiative | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [customName, setCustomName] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  const { data: goal, isLoading: goalLoading } = useQuery({
    queryKey: ["goal", id],
    queryFn: async () => {
      const res = await apiFetch(`/goals/${id}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<GoalInfo>;
    },
    enabled: !!id && !!user,
    staleTime: 30_000,
  });

  const { data: catalogItems = [], isLoading: catalogLoading } = useQuery({
    queryKey: ["strategic-initiatives", goal?.dimensionId],
    queryFn: async () => {
      const params = goal?.dimensionId ? `?dimensionId=${goal.dimensionId}` : "";
      const res = await apiFetch(`/strategic-initiatives${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<CatalogInitiative[]>;
    },
    enabled: step === "catalog-list" && !!goal,
    staleTime: 60_000,
  });

  const linkMutation = useMutation({
    mutationFn: async (body: { strategicInitiativeId?: number; customName?: string }) => {
      const res = await apiFetch(`/goals/${id}/initiatives`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        const err = new Error(data.error ?? `HTTP ${res.status}`) as Error & { status: number };
        err.status = res.status;
        throw err;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal", id] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setConfirmVisible(false);
      router.back();
    },
    onError: (err: Error & { status?: number }) => {
      if (err.status === 409) {
        setLinkError("Esta iniciativa já está vinculada a esta meta.");
      } else if (err.status === 400 && err.message?.toLowerCase().includes("maximum")) {
        setLinkError("Esta meta já tem 3 iniciativas ativas. Conclua uma antes de adicionar outra.");
      } else {
        setLinkError("Não foi possível vincular a iniciativa. Tente novamente.");
      }
    },
  });

  const handleCatalogItemPress = (item: CatalogInitiative) => {
    setSelectedInitiative(item);
    setLinkError(null);
    setConfirmVisible(true);
  };

  const handleCatalogConfirm = () => {
    if (!selectedInitiative || linkMutation.isPending) return;
    setLinkError(null);
    linkMutation.mutate({ strategicInitiativeId: selectedInitiative.id });
  };

  const handleCustomSubmit = () => {
    const name = customName.trim();
    if (!name) {
      Alert.alert("Nome obrigatório", "Digite um nome para a iniciativa.");
      return;
    }
    if (linkMutation.isPending) return;
    setLinkError(null);
    linkMutation.mutate({ customName: name });
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
    backBtn: { padding: 4, borderRadius: colors.radius },
    headerTitle: {
      flex: 1,
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    content: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: botPad + 24 },
    choiceCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius * 2,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: colors.radius,
      alignItems: "center",
      justifyContent: "center",
    },
    choiceTitle: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 4,
    },
    choiceDesc: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      lineHeight: 18,
    },
    sectionLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 10,
      marginTop: 4,
    },
    itemCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius * 2,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 13,
      marginBottom: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    itemName: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
      lineHeight: 20,
    },
    itemSub: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
    },
    inputLabel: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.input,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      backgroundColor: colors.background,
      marginBottom: 16,
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 14,
      alignItems: "center",
    },
    primaryBtnText: {
      color: colors.primaryForeground,
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: colors.destructive + "14",
      borderWidth: 1,
      borderColor: colors.destructive + "40",
      borderRadius: colors.radius,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.destructive,
      lineHeight: 18,
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
      paddingHorizontal: 20,
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
      marginBottom: 4,
    },
    modalSub: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 6,
      lineHeight: 18,
    },
    modalMetaRow: {
      flexDirection: "row",
      gap: 6,
      marginBottom: 16,
      flexWrap: "wrap",
    },
    modalMetaChip: {
      backgroundColor: colors.muted,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    modalMetaText: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    cancelBtn: {
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 8,
    },
    cancelBtnText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    emptyText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      paddingVertical: 32,
    },
    goalInfoBox: {
      backgroundColor: colors.muted,
      borderRadius: colors.radius,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    goalInfoText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
  });

  if (goalLoading) {
    return (
      <View style={[s.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderHeader = (subtitle?: string) => (
    <View style={s.header}>
      <Pressable style={s.backBtn} onPress={() => {
        if (step === "choose") router.back();
        else setStep("choose");
      }}>
        <Ionicons name="chevron-back" size={24} color={colors.foreground} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={s.headerTitle}>Adicionar Iniciativa</Text>
        {subtitle ? (
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (step === "choose") {
    return (
      <View style={s.container}>
        {renderHeader(goal?.title)}
        <ScrollView style={s.content} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {goal && (goal.dimensionName || goal.keyProcessName) && (
            <View style={s.goalInfoBox}>
              <Ionicons name="layers-outline" size={14} color={colors.mutedForeground} />
              <Text style={s.goalInfoText} numberOfLines={1}>
                {goal.dimensionName}{goal.keyProcessName ? ` · ${goal.keyProcessName}` : ""}
              </Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [s.choiceCard, pressed && { opacity: 0.75 }]}
            onPress={() => setStep("catalog-list")}
          >
            <View style={[s.iconBox, { backgroundColor: colors.primary + "14" }]}>
              <Ionicons name="book-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.choiceTitle}>Do Catálogo Estratégico</Text>
              <Text style={s.choiceDesc}>
                Escolha uma das iniciativas já mapeadas pela RE/MAX SC com KRI, KPI e boas práticas.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} style={{ alignSelf: "center" }} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.choiceCard, pressed && { opacity: 0.75 }]}
            onPress={() => { setStep("custom-form"); setLinkError(null); }}
          >
            <View style={[s.iconBox, { backgroundColor: colors.muted }]}>
              <Ionicons name="pencil-outline" size={20} color={colors.mutedForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.choiceTitle}>Iniciativa Personalizada</Text>
              <Text style={s.choiceDesc}>
                Registre uma ação que você já executa ou que não está no catálogo.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} style={{ alignSelf: "center" }} />
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (step === "catalog-list") {
    return (
      <View style={s.container}>
        {renderHeader(goal?.dimensionName ?? undefined)}
        <ScrollView style={s.content} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {catalogLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : catalogItems.length === 0 ? (
            <Text style={s.emptyText}>Nenhuma iniciativa encontrada no catálogo.</Text>
          ) : (
            <>
              <Text style={s.sectionLabel}>
                {goal?.dimensionName ?? "Iniciativas"} · {catalogItems.length} disponíveis
              </Text>
              {catalogItems.map((item) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [s.itemCard, pressed && { opacity: 0.75 }]}
                  onPress={() => handleCatalogItemPress(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName}>{item.name}</Text>
                    {item.keyProcessName ? (
                      <Text style={s.itemSub}>{item.keyProcessName}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                </Pressable>
              ))}
            </>
          )}
        </ScrollView>

        <Modal
          visible={confirmVisible}
          transparent
          animationType="slide"
          onRequestClose={() => { setConfirmVisible(false); setLinkError(null); }}
        >
          <KeyboardAvoidingView
            style={s.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <Pressable style={{ flex: 1 }} onPress={() => {
              if (!linkMutation.isPending) { setConfirmVisible(false); setLinkError(null); }
            }} />
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <Text style={s.modalTitle}>{selectedInitiative?.name}</Text>

              {selectedInitiative?.keyProcessName ? (
                <View style={s.modalMetaRow}>
                  <View style={s.modalMetaChip}>
                    <Text style={s.modalMetaText}>{selectedInitiative.keyProcessName}</Text>
                  </View>
                </View>
              ) : null}

              {selectedInitiative?.kri ? (
                <>
                  <Text style={[s.modalSub, { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, color: colors.mutedForeground, marginBottom: 2 }]}>
                    KRI
                  </Text>
                  <Text style={[s.modalSub, { marginBottom: 10 }]}>{selectedInitiative.kri}</Text>
                </>
              ) : null}

              {linkError ? (
                <View style={s.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} style={{ marginTop: 1 }} />
                  <Text style={s.errorText}>{linkError}</Text>
                </View>
              ) : null}

              <Pressable
                style={[s.primaryBtn, linkMutation.isPending && { opacity: 0.6 }]}
                onPress={handleCatalogConfirm}
                disabled={linkMutation.isPending}
              >
                {linkMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text style={s.primaryBtnText}>Vincular Iniciativa</Text>
                )}
              </Pressable>

              <Pressable
                style={s.cancelBtn}
                onPress={() => { setConfirmVisible(false); setLinkError(null); }}
                disabled={linkMutation.isPending}
              >
                <Text style={s.cancelBtnText}>Cancelar</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  if (step === "custom-form") {
    return (
      <View style={s.container}>
        {renderHeader(goal?.title)}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView style={s.content} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={s.inputLabel}>Nome da Iniciativa *</Text>
            <TextInput
              style={s.input}
              value={customName}
              onChangeText={(v) => { setCustomName(v); setLinkError(null); }}
              placeholder="Ex: Programa de indicações, Reunião semanal de vendas..."
              placeholderTextColor={colors.mutedForeground}
              autoFocus
              maxLength={200}
            />

            {linkError ? (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} style={{ marginTop: 1 }} />
                <Text style={s.errorText}>{linkError}</Text>
              </View>
            ) : null}

            <Pressable
              style={[s.primaryBtn, linkMutation.isPending && { opacity: 0.6 }]}
              onPress={handleCustomSubmit}
              disabled={linkMutation.isPending}
            >
              {linkMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={s.primaryBtnText}>Adicionar Iniciativa</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return null;
}
