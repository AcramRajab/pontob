import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

interface InitiativeDetail {
  id: number;
  goalId: number;
  strategicInitiativeId: number | null;
  customName: string | null;
  initiativeName: string | null;
  desiredResult: string | null;
  ownerUserId: number | null;
  ownerName: string | null;
  startDate: string | null;
  endDate: string | null;
  whatWillBeDone: string | null;
  whyItMatters: string | null;
  whoIsResponsible: string | null;
  whereItWillBeDone: string | null;
  howItWillBeDone: string | null;
  investmentOrEffort: string | null;
  progressPercentage: number | null;
  status: string;
  notes: string | null;
}

interface FranchiseUser {
  id: number;
  name: string;
  role: string;
}

interface PlanningFields {
  customName: string;
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

const W2H_FIELDS: Array<{ key: keyof PlanningFields; label: string; placeholder: string }> = [
  { key: "whatWillBeDone", label: "O que será feito? (What)", placeholder: "Descreva a ação concreta" },
  { key: "whyItMatters", label: "Por que é importante? (Why)", placeholder: "Qual o propósito desta iniciativa?" },
  { key: "whoIsResponsible", label: "Quem é responsável? (Who)", placeholder: "Nome do responsável" },
  { key: "whereItWillBeDone", label: "Onde será executado? (Where)", placeholder: "Local ou contexto de execução" },
  { key: "howItWillBeDone", label: "Como será feito? (How)", placeholder: "Método de execução" },
  { key: "investmentOrEffort", label: "Quanto custa / tempo envolvido? (How much)", placeholder: "Investimento, horas, recursos" },
];

export default function InitiativeEditScreen() {
  const { id, initiativeId } = useLocalSearchParams<{ id: string; initiativeId: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  const [planning, setPlanning] = useState<PlanningFields>({
    customName: "",
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
  const [show5W2H, setShow5W2H] = useState(false);
  const [ownerPickerVisible, setOwnerPickerVisible] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { data: initiative, isLoading } = useQuery({
    queryKey: ["goal-initiative", initiativeId],
    queryFn: async () => {
      const res = await apiFetch(`/goal-initiatives/${initiativeId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<InitiativeDetail>;
    },
    enabled: !!initiativeId && !!user,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (initiative && !initialized) {
      const has5W2H =
        !!initiative.whatWillBeDone ||
        !!initiative.whyItMatters ||
        !!initiative.whoIsResponsible ||
        !!initiative.whereItWillBeDone ||
        !!initiative.howItWillBeDone ||
        !!initiative.investmentOrEffort;
      setPlanning({
        customName: initiative.customName ?? "",
        desiredResult: initiative.desiredResult ?? "",
        startDate: initiative.startDate ?? "",
        endDate: initiative.endDate ?? "",
        ownerUserId: initiative.ownerUserId != null ? String(initiative.ownerUserId) : "",
        whatWillBeDone: initiative.whatWillBeDone ?? "",
        whyItMatters: initiative.whyItMatters ?? "",
        whoIsResponsible: initiative.whoIsResponsible ?? "",
        whereItWillBeDone: initiative.whereItWillBeDone ?? "",
        howItWillBeDone: initiative.howItWillBeDone ?? "",
        investmentOrEffort: initiative.investmentOrEffort ?? "",
      });
      if (has5W2H) setShow5W2H(true);
      setInitialized(true);
    }
  }, [initiative, initialized]);

  const franchiseId = user?.franchiseId;
  const { data: franchiseUsers = [] } = useQuery({
    queryKey: ["users", franchiseId],
    queryFn: async () => {
      const res = await apiFetch(`/users?franchiseId=${franchiseId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<FranchiseUser[]>;
    },
    enabled: !!franchiseId,
    staleTime: 60_000,
  });

  const saveMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await apiFetch(`/goal-initiatives/${initiativeId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal", id] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goal-initiative", initiativeId] });
      router.back();
    },
    onError: (err: Error) => {
      setSaveError(err.message || "Não foi possível salvar. Tente novamente.");
    },
  });

  const updatePlanning = (key: keyof PlanningFields, value: string) => {
    setPlanning(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (saveMutation.isPending) return;
    setSaveError(null);

    const isCustom = !initiative?.strategicInitiativeId;

    const body: Record<string, unknown> = {
      desiredResult: planning.desiredResult.trim() || null,
      startDate: planning.startDate.trim() || null,
      endDate: planning.endDate.trim() || null,
      ownerUserId: planning.ownerUserId ? parseInt(planning.ownerUserId) : null,
      whatWillBeDone: planning.whatWillBeDone.trim() || null,
      whyItMatters: planning.whyItMatters.trim() || null,
      whoIsResponsible: planning.whoIsResponsible.trim() || null,
      whereItWillBeDone: planning.whereItWillBeDone.trim() || null,
      howItWillBeDone: planning.howItWillBeDone.trim() || null,
      investmentOrEffort: planning.investmentOrEffort.trim() || null,
    };

    if (isCustom) {
      const name = planning.customName.trim();
      if (!name) {
        setSaveError("O nome da iniciativa não pode ficar em branco.");
        return;
      }
      body.customName = name;
    }

    saveMutation.mutate(body);
  };

  const selectedOwnerName = franchiseUsers.find(u => String(u.id) === planning.ownerUserId)?.name;
  const initiativeDisplayName = initiative?.initiativeName ?? initiative?.customName ?? "Iniciativa";
  const isCustom = initiative && !initiative.strategicInitiativeId;

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
    nameBadge: {
      backgroundColor: colors.muted,
      borderRadius: colors.radius,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    nameBadgeText: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
      lineHeight: 20,
    },
    dateRow: { flexDirection: "row", gap: 10 },
    dateCol: { flex: 1 },
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
  });

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

  if (isLoading || !initialized) {
    return (
      <View style={[s.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!initiative) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={s.headerTitle}>Iniciativa</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.mutedForeground} />
          <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginTop: 12 }}>
            Erro ao carregar
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Editar Iniciativa</Text>
          <Text
            style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}
            numberOfLines={1}
          >
            {initiativeDisplayName}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView style={s.content} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {isCustom ? (
            <View style={s.sectionCard}>
              <Text style={s.sectionCardTitle}>Nome da Iniciativa</Text>
              <TextInput
                style={s.input}
                value={planning.customName}
                onChangeText={v => { updatePlanning("customName", v); setSaveError(null); }}
                placeholder="Nome da iniciativa"
                placeholderTextColor={colors.mutedForeground}
                maxLength={200}
              />
            </View>
          ) : (
            <View style={s.nameBadge}>
              <Ionicons name="book-outline" size={14} color={colors.mutedForeground} />
              <Text style={s.nameBadgeText} numberOfLines={2}>{initiativeDisplayName}</Text>
            </View>
          )}

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

          {saveError ? (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} style={{ marginTop: 1 }} />
              <Text style={s.errorText}>{saveError}</Text>
            </View>
          ) : null}

          <Pressable
            style={[s.primaryBtn, saveMutation.isPending && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={s.primaryBtnText}>Salvar alterações</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {renderOwnerPicker()}
    </View>
  );
}
