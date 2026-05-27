import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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

interface GoalInitiative {
  id: number;
  status: string;
  initiativeName: string | null;
  customName: string | null;
  progressPercentage: number | null;
}

interface GoalInfo {
  id: number;
  title: string;
  dimensionId: number | null;
  dimensionName: string | null;
  keyProcessId: number | null;
  keyProcessName: string | null;
  initiatives: GoalInitiative[];
}

interface CatalogInitiative {
  id: number;
  name: string;
  keyProcessName: string | null;
  kri: string | null;
  kpi: string | null;
  description: string | null;
}

interface FranchiseUser {
  id: number;
  name: string;
  role: string;
}

type Step = "choose" | "catalog-list" | "catalog-configure" | "custom-form";

interface PlanningFields {
  desiredResult: string;
  startDate: string;
  endDate: string;
  ownerUserId: string;
  whatWillBeDone: string;
  whyItMatters: string;
  whoIsResponsible: string;
  whereItWillBeDone: string;
  howItWillBeDone: string;
  investmentOrEffort: string;
}

const emptyPlanning = (): PlanningFields => ({
  desiredResult: "",
  startDate: "",
  endDate: "",
  ownerUserId: "",
  whatWillBeDone: "",
  whyItMatters: "",
  whoIsResponsible: "",
  whereItWillBeDone: "",
  howItWillBeDone: "",
  investmentOrEffort: "",
});

const W2H_FIELDS: Array<{ key: keyof PlanningFields; label: string; placeholder: string }> = [
  { key: "whatWillBeDone", label: "O que será feito? (What)", placeholder: "Descreva a ação concreta" },
  { key: "whyItMatters", label: "Por que é importante? (Why)", placeholder: "Qual o propósito desta iniciativa?" },
  { key: "whoIsResponsible", label: "Quem é responsável? (Who)", placeholder: "Nome do responsável" },
  { key: "whereItWillBeDone", label: "Onde será executado? (Where)", placeholder: "Local ou contexto de execução" },
  { key: "howItWillBeDone", label: "Como será feito? (How)", placeholder: "Método de execução" },
  { key: "investmentOrEffort", label: "Quanto custa / tempo envolvido? (How much)", placeholder: "Investimento, horas, recursos" },
];

export default function InitiativeNewScreen() {
  const { id, keyProcessId: keyProcessIdParam } = useLocalSearchParams<{ id: string; keyProcessId?: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const preselectedKeyProcessId = keyProcessIdParam ? parseInt(keyProcessIdParam) : null;

  const [step, setStep] = useState<Step>(preselectedKeyProcessId ? "catalog-list" : "choose");
  const [selectedInitiative, setSelectedInitiative] = useState<CatalogInitiative | null>(null);
  const [customName, setCustomName] = useState("");
  const [planning, setPlanning] = useState<PlanningFields>(emptyPlanning());
  const [show5W2H, setShow5W2H] = useState(false);
  const [ownerPickerVisible, setOwnerPickerVisible] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);

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

  const effectiveKeyProcessId = preselectedKeyProcessId ?? null;

  const { data: catalogItems = [], isLoading: catalogLoading } = useQuery({
    queryKey: ["strategic-initiatives", goal?.dimensionId, effectiveKeyProcessId],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (effectiveKeyProcessId) {
        qs.set("keyProcessId", String(effectiveKeyProcessId));
      } else if (goal?.dimensionId) {
        qs.set("dimensionId", String(goal.dimensionId));
      }
      const params = qs.toString() ? `?${qs.toString()}` : "";
      const res = await apiFetch(`/strategic-initiatives${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<CatalogInitiative[]>;
    },
    enabled: step === "catalog-list" && !!goal,
    staleTime: 60_000,
  });

  const franchiseId = user?.franchiseId;
  const { data: franchiseUsers = [] } = useQuery({
    queryKey: ["users", franchiseId],
    queryFn: async () => {
      const res = await apiFetch(`/users?franchiseId=${franchiseId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<FranchiseUser[]>;
    },
    enabled: !!franchiseId && (step === "catalog-configure" || step === "custom-form"),
    staleTime: 60_000,
  });

  const linkMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
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

  const concludeMutation = useMutation({
    mutationFn: async (initiativeId: number) => {
      const res = await apiFetch(`/goal-initiatives/${initiativeId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "concluida", progressPercentage: 100 }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onMutate: (initiativeId) => {
      setCompletingId(initiativeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal", id] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setCompletingId(null);
    },
    onError: () => {
      setCompletingId(null);
    },
  });

  const activeGoalInits = (goal?.initiatives ?? []).filter(i => i.status === "ativa");
  const isAtLimit = !goalLoading && !!goal && activeGoalInits.length >= 3;

  const buildPayload = (base: { strategicInitiativeId?: number; customName?: string }) => {
    const p = planning;
    return {
      ...base,
      desiredResult: p.desiredResult.trim() || undefined,
      startDate: p.startDate.trim() || undefined,
      endDate: p.endDate.trim() || undefined,
      ownerUserId: p.ownerUserId ? parseInt(p.ownerUserId) : undefined,
      whatWillBeDone: p.whatWillBeDone.trim() || undefined,
      whyItMatters: p.whyItMatters.trim() || undefined,
      whoIsResponsible: p.whoIsResponsible.trim() || undefined,
      whereItWillBeDone: p.whereItWillBeDone.trim() || undefined,
      howItWillBeDone: p.howItWillBeDone.trim() || undefined,
      investmentOrEffort: p.investmentOrEffort.trim() || undefined,
    };
  };

  const handleCatalogItemPress = (item: CatalogInitiative) => {
    setSelectedInitiative(item);
    setPlanning(emptyPlanning());
    setShow5W2H(false);
    setLinkError(null);
    setStep("catalog-configure");
  };

  const handleCatalogSubmit = () => {
    if (!selectedInitiative || linkMutation.isPending) return;
    setLinkError(null);
    linkMutation.mutate(buildPayload({ strategicInitiativeId: selectedInitiative.id }));
  };

  const handleCustomSubmit = () => {
    const name = customName.trim();
    if (!name) {
      setLinkError("Digite um nome para a iniciativa.");
      return;
    }
    if (linkMutation.isPending) return;
    setLinkError(null);
    linkMutation.mutate(buildPayload({ customName: name }));
  };

  const updatePlanning = (key: keyof PlanningFields, value: string) => {
    setPlanning(prev => ({ ...prev, [key]: value }));
  };

  const selectedOwnerName = franchiseUsers.find(u => String(u.id) === planning.ownerUserId)?.name;

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
      marginBottom: 6,
    },
    inputLabelOptional: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
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
    textArea: {
      borderWidth: 1,
      borderColor: colors.input,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      backgroundColor: colors.background,
      marginBottom: 16,
      minHeight: 72,
      textAlignVertical: "top",
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
    catalogGuide: {
      backgroundColor: colors.primary + "0d",
      borderRadius: colors.radius * 2,
      borderWidth: 1,
      borderColor: colors.primary + "33",
      padding: 14,
      marginBottom: 20,
      gap: 8,
    },
    catalogGuideHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 4,
    },
    catalogGuideLabel: {
      fontSize: 10,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    catalogGuideRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    catalogGuideBadge: {
      fontSize: 9,
      fontFamily: "Inter_700Bold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 2,
      minWidth: 24,
    },
    catalogGuideValue: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      lineHeight: 19,
    },
    sectionCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius * 2,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 14,
    },
    sectionCardTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 12,
    },
    dateRow: {
      flexDirection: "row",
      gap: 10,
    },
    dateCol: {
      flex: 1,
    },
    accordionToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 13,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius * 2,
      marginBottom: 14,
      backgroundColor: colors.card,
    },
    accordionToggleLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    accordionToggleText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    accordionContent: {
      backgroundColor: colors.card,
      borderRadius: colors.radius * 2,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 14,
      gap: 4,
    },
    ownerBtn: {
      borderWidth: 1,
      borderColor: colors.input,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
      backgroundColor: colors.background,
    },
    ownerBtnText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    ownerBtnPlaceholder: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
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
      paddingHorizontal: 0,
      maxHeight: "70%",
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 12,
    },
    modalPickerTitle: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    pickerItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerItemText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    pickerItemSelected: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
    },
    cancelBtn: {
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 4,
    },
    cancelBtnText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    limitBanner: {
      borderRadius: colors.radius * 2,
      borderWidth: 1,
      borderColor: "#fdba7440",
      backgroundColor: "#fff7ed",
      padding: 16,
      marginBottom: 20,
    },
    limitDotsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 8,
    },
    limitDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: "#fb923c",
    },
    limitBannerTitle: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: "#c2410c",
      marginLeft: 2,
    },
    limitBannerDesc: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: "#9a3412",
      lineHeight: 19,
    },
    limitStep: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 10,
    },
    limitStepBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    limitStepBadgeText: {
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      color: colors.mutedForeground,
    },
    limitStepText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      lineHeight: 19,
      paddingTop: 2,
    },
    limitInitCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: colors.radius * 2,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 8,
    },
    limitInitName: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
      lineHeight: 20,
      marginBottom: 6,
    },
    limitProgressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    limitProgressTrack: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.muted,
      overflow: "hidden",
    },
    limitProgressFill: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    limitProgressPct: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      minWidth: 28,
      textAlign: "right",
    },
    concludeBtn: {
      borderWidth: 1,
      borderColor: "#bbf7d0",
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: "#f0fdf4",
      minWidth: 72,
      alignItems: "center",
    },
    concludeBtnText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: "#16a34a",
    },
  });

  if (goalLoading) {
    return (
      <View style={[s.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderHeader = (subtitle?: string, onBack?: () => void) => (
    <View style={s.header}>
      <Pressable style={s.backBtn} onPress={onBack ?? (() => router.back())}>
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

  const renderOwnerPicker = () => (
    <Modal
      visible={ownerPickerVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setOwnerPickerVisible(false)}
    >
      <Pressable style={s.modalOverlay} onPress={() => setOwnerPickerVisible(false)}>
        <Pressable style={s.modalSheet} onPress={() => {}}>
          <View style={s.modalHandle} />
          <Text style={s.modalPickerTitle}>Selecionar Responsável</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Pressable
              style={s.pickerItem}
              onPress={() => { updatePlanning("ownerUserId", ""); setOwnerPickerVisible(false); }}
            >
              <Text style={planning.ownerUserId === "" ? s.pickerItemSelected : s.pickerItemText}>
                Sem responsável
              </Text>
              {planning.ownerUserId === "" && (
                <Ionicons name="checkmark" size={18} color={colors.primary} />
              )}
            </Pressable>
            {franchiseUsers.map(u => (
              <Pressable
                key={u.id}
                style={s.pickerItem}
                onPress={() => { updatePlanning("ownerUserId", String(u.id)); setOwnerPickerVisible(false); }}
              >
                <Text style={String(u.id) === planning.ownerUserId ? s.pickerItemSelected : s.pickerItemText}>
                  {u.name}
                </Text>
                {String(u.id) === planning.ownerUserId && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={s.cancelBtn} onPress={() => setOwnerPickerVisible(false)}>
            <Text style={s.cancelBtnText}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderPlanningSection = () => (
    <>
      <View style={s.sectionCard}>
        <Text style={s.sectionCardTitle}>
          Planejamento <Text style={s.inputLabelOptional}>(opcional)</Text>
        </Text>

        <Text style={s.inputLabel}>Resultado Esperado</Text>
        <TextInput
          style={s.textArea}
          value={planning.desiredResult}
          onChangeText={v => updatePlanning("desiredResult", v)}
          placeholder="O que você quer alcançar com esta iniciativa?"
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={2}
        />

        <Text style={s.inputLabel}>Responsável</Text>
        <Pressable style={s.ownerBtn} onPress={() => setOwnerPickerVisible(true)}>
          {selectedOwnerName ? (
            <Text style={s.ownerBtnText}>{selectedOwnerName}</Text>
          ) : (
            <Text style={s.ownerBtnPlaceholder}>Selecionar responsável</Text>
          )}
          <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
        </Pressable>

        <Text style={s.inputLabel}>Datas</Text>
        <View style={s.dateRow}>
          <View style={s.dateCol}>
            <Text style={[s.inputLabel, { fontSize: 11, color: colors.mutedForeground, marginBottom: 4 }]}>Início</Text>
            <TextInput
              style={[s.input, { marginBottom: 0 }]}
              value={planning.startDate}
              onChangeText={v => updatePlanning("startDate", v)}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
          <View style={s.dateCol}>
            <Text style={[s.inputLabel, { fontSize: 11, color: colors.mutedForeground, marginBottom: 4 }]}>Término</Text>
            <TextInput
              style={[s.input, { marginBottom: 0 }]}
              value={planning.endDate}
              onChangeText={v => updatePlanning("endDate", v)}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
        </View>
      </View>

      <Pressable style={s.accordionToggle} onPress={() => setShow5W2H(v => !v)}>
        <View style={s.accordionToggleLeft}>
          <Ionicons name="clipboard-outline" size={18} color={colors.mutedForeground} />
          <Text style={s.accordionToggleText}>
            5W2H — Planejamento detalhado{" "}
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular" }}>(opcional)</Text>
          </Text>
        </View>
        <Ionicons
          name={show5W2H ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.mutedForeground}
        />
      </Pressable>

      {show5W2H && (
        <View style={s.accordionContent}>
          {W2H_FIELDS.map(f => (
            <View key={f.key}>
              <Text style={s.inputLabel}>{f.label}</Text>
              <TextInput
                style={s.textArea}
                value={planning[f.key]}
                onChangeText={v => updatePlanning(f.key, v)}
                placeholder={f.placeholder}
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={2}
              />
            </View>
          ))}
        </View>
      )}
    </>
  );

  if (isAtLimit) {
    return (
      <View style={s.container}>
        {renderHeader(goal?.title, () => router.back())}
        <ScrollView style={s.content} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.limitBanner}>
            <View style={s.limitDotsRow}>
              {[0, 1, 2].map(i => (
                <View key={i} style={s.limitDot} />
              ))}
              <Text style={s.limitBannerTitle}>3 de 3 slots em uso</Text>
            </View>
            <Text style={s.limitBannerDesc}>
              Esta meta já tem 3 iniciativas ativas. Para adicionar uma nova, conclua uma das existentes abaixo.
            </Text>
          </View>

          <Text style={[s.sectionLabel, { marginTop: 8 }]}>Como liberar um slot</Text>
          {[
            "Escolha uma das iniciativas abaixo para concluir",
            'Toque em "Concluir" — o progresso vai para 100%',
            "O slot é liberado e você pode adicionar a nova iniciativa",
          ].map((text, idx) => (
            <View key={idx} style={s.limitStep}>
              <View style={s.limitStepBadge}>
                <Text style={s.limitStepBadgeText}>{idx + 1}</Text>
              </View>
              <Text style={s.limitStepText}>{text}</Text>
            </View>
          ))}

          <Text style={[s.sectionLabel, { marginTop: 16 }]}>Iniciativas ativas</Text>
          {activeGoalInits.map(ini => (
            <View key={ini.id} style={s.limitInitCard}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.limitInitName} numberOfLines={2}>
                  {ini.initiativeName ?? ini.customName ?? "Iniciativa"}
                </Text>
                <View style={s.limitProgressRow}>
                  <View style={s.limitProgressTrack}>
                    <View style={[s.limitProgressFill, { width: `${ini.progressPercentage ?? 0}%` }]} />
                  </View>
                  <Text style={s.limitProgressPct}>{ini.progressPercentage ?? 0}%</Text>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [
                  s.concludeBtn,
                  completingId === ini.id && { opacity: 0.6 },
                  pressed && { opacity: 0.75 },
                ]}
                onPress={() => concludeMutation.mutate(ini.id)}
                disabled={completingId !== null}
              >
                {completingId === ini.id ? (
                  <ActivityIndicator size="small" color="#16a34a" />
                ) : (
                  <Text style={s.concludeBtnText}>Concluir</Text>
                )}
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (step === "choose") {
    return (
      <View style={s.container}>
        {renderHeader(goal?.title, () => router.back())}
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
            onPress={() => {
              setStep("custom-form");
              setLinkError(null);
              setPlanning(emptyPlanning());
              setShow5W2H(false);
            }}
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
    const catalogContextLabel = effectiveKeyProcessId
      ? (goal?.keyProcessName ?? goal?.dimensionName ?? undefined)
      : (goal?.dimensionName ?? undefined);
    const onCatalogBack = preselectedKeyProcessId ? () => router.back() : () => setStep("choose");
    return (
      <View style={s.container}>
        {renderHeader(catalogContextLabel, onCatalogBack)}
        <ScrollView style={s.content} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {catalogLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : catalogItems.length === 0 ? (
            <Text style={s.emptyText}>Nenhuma iniciativa encontrada no catálogo.</Text>
          ) : (
            <>
              <Text style={s.sectionLabel}>
                {catalogContextLabel ?? "Iniciativas"} · {catalogItems.length} disponíveis
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
                  <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  if (step === "catalog-configure") {
    return (
      <View style={s.container}>
        {renderHeader(selectedInitiative?.name ?? undefined, () => setStep("catalog-list"))}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView style={s.content} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            {selectedInitiative && (selectedInitiative.kri || selectedInitiative.kpi) && (
              <View style={s.catalogGuide}>
                <View style={s.catalogGuideHeader}>
                  <Ionicons name="book-outline" size={12} color={colors.primary} />
                  <Text style={s.catalogGuideLabel}>Guia de execução — Catálogo RE/MAX SC</Text>
                </View>
                {selectedInitiative.kri && (
                  <View style={s.catalogGuideRow}>
                    <Text style={s.catalogGuideBadge}>KRI</Text>
                    <Text style={s.catalogGuideValue}>{selectedInitiative.kri}</Text>
                  </View>
                )}
                {selectedInitiative.kpi && (
                  <View style={s.catalogGuideRow}>
                    <Text style={s.catalogGuideBadge}>KPI</Text>
                    <Text style={s.catalogGuideValue}>{selectedInitiative.kpi}</Text>
                  </View>
                )}
              </View>
            )}

            {renderPlanningSection()}

            {linkError ? (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} style={{ marginTop: 1 }} />
                <Text style={s.errorText}>{linkError}</Text>
              </View>
            ) : null}

            <Pressable
              style={[s.primaryBtn, linkMutation.isPending && { opacity: 0.6 }]}
              onPress={handleCatalogSubmit}
              disabled={linkMutation.isPending}
            >
              {linkMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={s.primaryBtnText}>Vincular Iniciativa</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
        {renderOwnerPicker()}
      </View>
    );
  }

  if (step === "custom-form") {
    return (
      <View style={s.container}>
        {renderHeader(goal?.title, () => setStep("choose"))}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView style={s.content} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={s.inputLabel}>
              Nome da Iniciativa{" "}
              <Text style={{ color: colors.destructive }}>*</Text>
            </Text>
            <TextInput
              style={s.input}
              value={customName}
              onChangeText={(v) => { setCustomName(v); setLinkError(null); }}
              placeholder="Ex: Programa de indicações, Reunião semanal de vendas..."
              placeholderTextColor={colors.mutedForeground}
              autoFocus
              maxLength={200}
            />

            {renderPlanningSection()}

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
        {renderOwnerPicker()}
      </View>
    );
  }

  return null;
}
