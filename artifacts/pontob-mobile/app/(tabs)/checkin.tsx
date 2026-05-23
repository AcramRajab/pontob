import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
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
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface Goal {
  id: number;
  title: string;
  status: string;
}

type ExecutedOption = "sim" | "parcial" | "nao";

const EXECUTED_OPTS: { key: ExecutedOption; label: string }[] = [
  { key: "sim", label: "Sim" },
  { key: "parcial", label: "Parcial" },
  { key: "nao", label: "Não" },
];

export default function CheckinScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split("T")[0];
  const dateLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 80);

  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [executed, setExecuted] = useState<ExecutedOption>("sim");
  const [progress, setProgress] = useState(50);
  const [blocker, setBlocker] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [needsHelp, setNeedsHelp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: todayCheckins } = useQuery({
    queryKey: ["today-checkins", user?.franchiseId, today],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (user?.franchiseId) p.set("franchiseId", String(user.franchiseId));
      p.set("date", today);
      const res = await apiFetch(`/daily-checkins?${p}`);
      if (!res.ok) return [];
      return res.json() as Promise<Array<{ id: number; date: string; executedToday: string }>>;
    },
    enabled: !!user,
  });

  const alreadySubmitted = (todayCheckins?.length ?? 0) > 0;

  const { data: goals } = useQuery({
    queryKey: ["goals", user?.franchiseId],
    queryFn: async () => {
      const params = user?.franchiseId
        ? `?franchiseId=${user.franchiseId}`
        : "";
      const res = await apiFetch(`/goals${params}`);
      if (!res.ok) return [];
      return res.json() as Promise<Goal[]>;
    },
    enabled: !!user,
  });

  const activeGoals = goals?.filter((g) => g.status === "em_andamento") ?? [];

  async function handleSubmit() {
    if (!user?.franchiseId) {
      Alert.alert("Erro", "Franquia não identificada.");
      return;
    }
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const body = {
        franchiseId: user.franchiseId,
        date: today,
        executedToday: executed,
        progressToday: progress,
        blocker: blocker.trim() || null,
        nextStep: nextStep.trim() || null,
        needsHelp,
        goalId: selectedGoalId,
        notes: null,
      };

      const res = await apiFetch("/daily-checkins", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (res.ok || res.status === 200) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: ["dashboard-today"] });
        queryClient.invalidateQueries({ queryKey: ["today-checkins"] });
        setSubmitted(true);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const err = (await res.json()) as { error?: string };
        Alert.alert("Erro", err.error ?? "Não foi possível salvar o check-in");
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro", "Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
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
    subtitle: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
      textTransform: "capitalize",
    },
    content: { paddingHorizontal: 16, paddingBottom: botPad },
    section: { marginBottom: 20 },
    secLabel: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 10,
    },
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
    execOptNao: {
      borderColor: colors.destructive,
      backgroundColor: colors.destructive + "12",
    },
    execOptText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
    },
    execOptTextSim: { color: colors.primary },
    execOptTextNao: { color: colors.destructive },
    progRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    progValue: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
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
    progHint: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
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
    switchLabel: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    switchSub: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
    },
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
    goalOptActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "08",
    },
    goalOptText: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      marginLeft: 10,
    },
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 8,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: {
      color: colors.primaryForeground,
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    doneCard: {
      backgroundColor: colors.success + "18",
      borderRadius: colors.radius * 2,
      padding: 36,
      alignItems: "center",
      margin: 16,
      gap: 12,
    },
    doneTitle: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    doneText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
    },
  });

  if (submitted || alreadySubmitted) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>Check-in Diário</Text>
          <Text style={s.subtitle}>{dateLabel}</Text>
        </View>
        <View style={s.doneCard}>
          <Ionicons name="checkmark-circle" size={60} color={colors.success} />
          <Text style={s.doneTitle}>
            {submitted ? "Check-in feito!" : "Já registrado"}
          </Text>
          <Text style={s.doneText}>
            {submitted
              ? "Check-in registrado com sucesso!"
              : "Você já realizou o check-in hoje."}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={s.header}>
        <Text style={s.title}>Check-in Diário</Text>
        <Text style={s.subtitle}>{dateLabel}</Text>
      </View>

      <View style={s.content}>
        {activeGoals.length > 1 && (
          <View style={s.section}>
            <Text style={s.secLabel}>Meta (opcional)</Text>
            {activeGoals.slice(0, 5).map((goal) => (
              <Pressable
                key={goal.id}
                style={[
                  s.goalOpt,
                  selectedGoalId === goal.id && s.goalOptActive,
                ]}
                onPress={() =>
                  setSelectedGoalId(
                    selectedGoalId === goal.id ? null : goal.id
                  )
                }
              >
                <Ionicons
                  name={
                    selectedGoalId === goal.id
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={18}
                  color={
                    selectedGoalId === goal.id
                      ? colors.primary
                      : colors.mutedForeground
                  }
                />
                <Text style={s.goalOptText} numberOfLines={2}>
                  {goal.title}
                </Text>
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
                  style={[
                    s.execOpt,
                    active && (isNao ? s.execOptNao : s.execOptSim),
                  ]}
                  onPress={() => {
                    setExecuted(key);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text
                    style={[
                      s.execOptText,
                      active && (isNao ? s.execOptTextNao : s.execOptTextSim),
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={s.section}>
          <View style={s.progRow}>
            <Text style={s.secLabel}>Progresso geral</Text>
            <Text style={s.progValue}>{progress}%</Text>
          </View>
          <View style={s.progBarBg}>
            <View style={[s.progBarFill, { width: `${progress}%` }]} />
          </View>
          <View style={s.progBtns}>
            <Pressable
              style={s.progBtn}
              onPress={() => setProgress(Math.max(0, progress - 10))}
            >
              <Ionicons name="remove" size={18} color={colors.foreground} />
            </Pressable>
            <Text style={s.progHint}>–10 / +10</Text>
            <Pressable
              style={s.progBtn}
              onPress={() => setProgress(Math.min(100, progress + 10))}
            >
              <Ionicons name="add" size={18} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.secLabel}>Impedimento (opcional)</Text>
          <TextInput
            style={s.textInput}
            placeholder="O que te impediu de avançar mais?"
            placeholderTextColor={colors.mutedForeground}
            value={blocker}
            onChangeText={setBlocker}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={s.section}>
          <Text style={s.secLabel}>Próximo passo</Text>
          <TextInput
            style={s.textInput}
            placeholder="O que você vai fazer amanhã?"
            placeholderTextColor={colors.mutedForeground}
            value={nextStep}
            onChangeText={setNextStep}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={s.section}>
          <Pressable
            style={s.switchRow}
            onPress={() => {
              setNeedsHelp(!needsHelp);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <View>
              <Text style={s.switchLabel}>Preciso de ajuda</Text>
              <Text style={s.switchSub}>
                Solicitar suporte à equipe regional
              </Text>
            </View>
            <Switch
              value={needsHelp}
              onValueChange={(v) => {
                setNeedsHelp(v);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              trackColor={{ true: colors.primary, false: colors.muted }}
              thumbColor={needsHelp ? colors.primaryForeground : colors.card}
            />
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            s.submitBtn,
            (submitting || pressed) && s.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
          testID="submit-checkin"
        >
          {submitting ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Text style={s.submitBtnText}>Registrar Check-in</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
