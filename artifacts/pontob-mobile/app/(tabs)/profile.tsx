import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";
import { useNotifications } from "@/context/notifications";
import { useColors } from "@/hooks/useColors";

const ROLE_LABELS: Record<string, string> = {
  master_admin: "Administrador Master",
  staff_regional: "Equipe Regional",
  franqueado: "Franqueado",
  responsavel_interno: "Responsável Interno",
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Returns a YYYY-MM-DD string for a date offset by `days` from today. */
function offsetDateStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Formats a YYYY-MM-DD string for display (e.g. "25/05/2026"). */
function formatDateDisplay(dateStr: string): string {
  const [yyyy, mm, dd] = dateStr.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

/** Returns a short friendly label for a pause resume date (pauseUntil). */
function pauseLabel(dateStr: string): string {
  const tomorrow = offsetDateStr(1);
  const in3Days = offsetDateStr(3);
  const in7Days = offsetDateStr(7);
  const in14Days = offsetDateStr(14);
  if (dateStr === tomorrow) return "— retoma amanhã";
  if (dateStr === in3Days) return `por 3 dias — retoma em ${formatDateDisplay(dateStr)}`;
  if (dateStr === in7Days) return "por 1 semana";
  if (dateStr === in14Days) return "por 2 semanas";
  return `— retoma em ${formatDateDisplay(dateStr)}`;
}

// ─── Time picker modal ────────────────────────────────────────────────────────

function TimePickerModal({
  visible,
  hour,
  minute,
  onConfirm,
  onCancel,
  colors,
}: {
  visible: boolean;
  hour: number;
  minute: number;
  onConfirm: (h: number, m: number) => void;
  onCancel: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [selHour, setSelHour] = useState(hour);
  const [selMinute, setSelMinute] = useState(minute);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={tp.overlay}>
        <View style={[tp.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[tp.title, { color: colors.foreground }]}>
            Horário do lembrete
          </Text>

          <View style={tp.pickersRow}>
            <View style={tp.pickerCol}>
              <Text style={[tp.pickerLabel, { color: colors.mutedForeground }]}>Hora</Text>
              <ScrollView style={[tp.scroll, { borderColor: colors.border }]} showsVerticalScrollIndicator={false}>
                {HOURS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[tp.option, selHour === h && { backgroundColor: colors.primary + "22" }]}
                    onPress={() => setSelHour(h)}
                  >
                    <Text style={[tp.optionText, { color: selHour === h ? colors.primary : colors.foreground, fontFamily: selHour === h ? "Inter_700Bold" : "Inter_400Regular" }]}>
                      {pad(h)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={[tp.colon, { color: colors.foreground }]}>:</Text>

            <View style={tp.pickerCol}>
              <Text style={[tp.pickerLabel, { color: colors.mutedForeground }]}>Min</Text>
              <ScrollView style={[tp.scroll, { borderColor: colors.border }]} showsVerticalScrollIndicator={false}>
                {MINUTES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[tp.option, selMinute === m && { backgroundColor: colors.primary + "22" }]}
                    onPress={() => setSelMinute(m)}
                  >
                    <Text style={[tp.optionText, { color: selMinute === m ? colors.primary : colors.foreground, fontFamily: selMinute === m ? "Inter_700Bold" : "Inter_400Regular" }]}>
                      {pad(m)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={tp.btnRow}>
            <Pressable
              style={[tp.btn, { borderColor: colors.border }]}
              onPress={onCancel}
            >
              <Text style={[tp.btnText, { color: colors.mutedForeground }]}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[tp.btn, tp.btnPrimary, { backgroundColor: colors.primary }]}
              onPress={() => onConfirm(selHour, selMinute)}
            >
              <Text style={[tp.btnText, { color: colors.primaryForeground }]}>Confirmar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const tp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  sheet: { width: "100%", borderRadius: 16, padding: 24, borderWidth: 1, maxWidth: 340 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 20 },
  pickersRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 },
  pickerCol: { flex: 1, alignItems: "center" },
  pickerLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6 },
  scroll: { height: 160, width: "100%", borderWidth: 1, borderRadius: 8 },
  option: { paddingVertical: 10, paddingHorizontal: 12, alignItems: "center" },
  optionText: { fontSize: 16 },
  colon: { fontSize: 22, fontFamily: "Inter_700Bold", paddingTop: 22 },
  btnRow: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  btnPrimary: { borderWidth: 0 },
  btnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});

// ─── Pause picker modal ───────────────────────────────────────────────────────

/** Generates an array of next `count` days as YYYY-MM-DD strings starting from tomorrow. */
function getUpcomingDates(count: number): string[] {
  return Array.from({ length: count }, (_, i) => offsetDateStr(i + 1));
}

const PT_MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const PT_WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function formatDateFull(dateStr: string): string {
  const [yyyy, mm, dd] = dateStr.split("-").map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  const weekday = PT_WEEKDAYS[d.getDay()];
  const month = PT_MONTHS[mm - 1].substring(0, 3).toLowerCase();
  return `${weekday}, ${dd} ${month} ${yyyy}`;
}

const QUICK_PICKS = [
  { label: "Amanhã", days: 1 },
  { label: "Próximos 3 dias", days: 3 },
  { label: "1 semana", days: 7 },
  { label: "2 semanas", days: 14 },
];

function PausePickerModal({
  visible,
  onConfirm,
  onCancel,
  colors,
}: {
  visible: boolean;
  onConfirm: (dateStr: string) => void;
  onCancel: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const upcomingDates = getUpcomingDates(30);
  const [selectedCustom, setSelectedCustom] = useState<string | null>(null);

  function handleQuickPick(days: number) {
    onConfirm(offsetDateStr(days));
  }

  function handleCustomConfirm() {
    if (selectedCustom) onConfirm(selectedCustom);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={pm.overlay}>
        <View style={[pm.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {!showCustom ? (
            <>
              <View style={pm.titleRow}>
                <Ionicons name="moon-outline" size={18} color={colors.primary} />
                <Text style={[pm.title, { color: colors.foreground }]}>
                  Pausar lembretes
                </Text>
              </View>
              <Text style={[pm.subtitle, { color: colors.mutedForeground }]}>
                Os lembretes diários serão retomados automaticamente na data escolhida. Alertas continuam ativos.
              </Text>

              <View style={pm.quickList}>
                {QUICK_PICKS.map((q) => (
                  <Pressable
                    key={q.days}
                    style={[pm.quickRow, { borderColor: colors.border }]}
                    onPress={() => handleQuickPick(q.days)}
                  >
                    <Text style={[pm.quickLabel, { color: colors.foreground }]}>{q.label}</Text>
                    <Text style={[pm.quickSub, { color: colors.mutedForeground }]}>
                      {formatDateFull(offsetDateStr(q.days))}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                  </Pressable>
                ))}

                <Pressable
                  style={[pm.quickRow, { borderColor: colors.border }]}
                  onPress={() => setShowCustom(true)}
                >
                  <Text style={[pm.quickLabel, { color: colors.foreground }]}>Data personalizada</Text>
                  <Text style={[pm.quickSub, { color: colors.mutedForeground }]}>Escolha uma data</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>

              <Pressable style={[pm.cancelBtn, { borderColor: colors.border }]} onPress={onCancel}>
                <Text style={[pm.cancelText, { color: colors.mutedForeground }]}>Cancelar</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={pm.titleRow}>
                <Pressable onPress={() => setShowCustom(false)} hitSlop={8}>
                  <Ionicons name="arrow-back" size={20} color={colors.foreground} />
                </Pressable>
                <Text style={[pm.title, { color: colors.foreground }]}>
                  Escolher data
                </Text>
              </View>

              <ScrollView
                style={[pm.dateScroll, { borderColor: colors.border }]}
                showsVerticalScrollIndicator={false}
              >
                {upcomingDates.map((d) => {
                  const selected = selectedCustom === d;
                  return (
                    <Pressable
                      key={d}
                      style={[
                        pm.dateRow,
                        { borderBottomColor: colors.border },
                        selected && { backgroundColor: colors.primary + "18" },
                      ]}
                      onPress={() => setSelectedCustom(d)}
                    >
                      <Text
                        style={[
                          pm.dateText,
                          { color: selected ? colors.primary : colors.foreground,
                            fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular" },
                        ]}
                      >
                        {formatDateFull(d)}
                      </Text>
                      {selected && (
                        <Ionicons name="checkmark" size={16} color={colors.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={pm.btnRow}>
                <Pressable
                  style={[pm.btn, { borderColor: colors.border }]}
                  onPress={() => setShowCustom(false)}
                >
                  <Text style={[pm.btnText, { color: colors.mutedForeground }]}>Voltar</Text>
                </Pressable>
                <Pressable
                  style={[pm.btn, pm.btnPrimary, { backgroundColor: selectedCustom ? colors.primary : colors.border }]}
                  onPress={handleCustomConfirm}
                  disabled={!selectedCustom}
                >
                  <Text style={[pm.btnText, { color: colors.primaryForeground }]}>Confirmar</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 24 },
  sheet: { width: "100%", maxWidth: 360, borderRadius: 16, padding: 20, borderWidth: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 16 },
  quickList: { gap: 0 },
  quickRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderTopWidth: 1, gap: 8 },
  quickLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  quickSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cancelBtn: { marginTop: 16, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  cancelText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  dateScroll: { height: 200, borderWidth: 1, borderRadius: 10, marginBottom: 16 },
  dateRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  dateText: { flex: 1, fontSize: 14 },
  btnRow: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  btnPrimary: { borderWidth: 0 },
  btnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const {
    permissionGranted,
    notifEnabled,
    notifTime,
    pauseUntil,
    requestPermission,
    setNotifEnabled,
    setNotifTime,
    setPauseUntil,
  } = useNotifications();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPausePicker, setShowPausePicker] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 80);

  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  function handleLogout() {
    Alert.alert("Sair", "Deseja encerrar sua sessão?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await logout();
        },
      },
    ]);
  }

  async function handleToggleNotifications(value: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value && !permissionGranted) {
      const granted = await requestPermission();
      if (!granted) return;
    }
    await setNotifEnabled(value);
  }

  async function handleTimeConfirm(h: number, m: number) {
    setShowTimePicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setNotifTime({ hour: h, minute: m });
  }

  async function handlePauseConfirm(dateStr: string) {
    setShowPausePicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setPauseUntil(dateStr);
  }

  async function handleResume() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setPauseUntil(null);
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
    avatarCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius * 2,
      padding: 28,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      marginBottom: 16,
    },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    avatarText: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: colors.primaryForeground,
    },
    userName: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      textAlign: "center",
    },
    userEmail: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 4,
      textAlign: "center",
    },
    roleBadge: {
      marginTop: 12,
      backgroundColor: colors.primary + "18",
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    roleText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
    },
    infoCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius * 2,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      marginBottom: 16,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    infoLabelText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    infoValue: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    sectionTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    notifCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius * 2,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      marginBottom: 16,
    },
    notifRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    notifRowBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    notifRowText: { flex: 1 },
    notifLabel: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    notifSub: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
    },
    pausedSub: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.primary,
      marginTop: 2,
    },
    timeValue: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
    },
    resumeBtn: {
      backgroundColor: colors.primary + "18",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    resumeBtnText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
    },
    permissionBanner: {
      backgroundColor: colors.primary + "18",
      borderRadius: colors.radius * 2,
      borderWidth: 1,
      borderColor: colors.primary + "44",
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
    },
    permissionText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    permissionBtn: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    permissionBtnText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.primaryForeground,
    },
    logoutBtn: {
      backgroundColor: colors.card,
      borderRadius: colors.radius * 2,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      gap: 8,
    },
    logoutText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.destructive,
    },
    footer: { marginTop: 28, alignItems: "center", paddingBottom: 8 },
    footerText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
  });

  const notifActive = notifEnabled && permissionGranted;

  return (
    <>
      <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>Perfil</Text>
        </View>

        <View style={s.content}>
          <View style={s.avatarCard}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <Text style={s.userName}>{user?.name}</Text>
            <Text style={s.userEmail}>{user?.email}</Text>
            {user?.role && (
              <View style={s.roleBadge}>
                <Text style={s.roleText}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </Text>
              </View>
            )}
          </View>

          {user?.franchiseName && (
            <View style={s.infoCard}>
              <View style={s.infoRow}>
                <Ionicons
                  name="business-outline"
                  size={18}
                  color={colors.mutedForeground}
                />
                <View>
                  <Text style={s.infoLabelText}>Franquia</Text>
                  <Text style={s.infoValue}>{user.franchiseName}</Text>
                </View>
              </View>
            </View>
          )}

          {Platform.OS !== "web" && (
            <>
              <Text style={s.sectionTitle}>Notificações</Text>

              {!permissionGranted && (
                <View style={s.permissionBanner}>
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={s.permissionText}>
                    Ative as notificações para receber lembretes de check-in e alertas.
                  </Text>
                  <Pressable
                    style={s.permissionBtn}
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      await requestPermission();
                    }}
                    testID="enable-notifications-btn"
                  >
                    <Text style={s.permissionBtnText}>Ativar</Text>
                  </Pressable>
                </View>
              )}

              <View style={s.notifCard}>
                {/* Toggle row */}
                <View style={s.notifRow}>
                  <Ionicons
                    name="notifications-outline"
                    size={18}
                    color={colors.mutedForeground}
                  />
                  <View style={s.notifRowText}>
                    <Text style={s.notifLabel}>Lembretes de check-in</Text>
                    <Text style={s.notifSub}>
                      Lembrete diário para registrar seu check-in
                    </Text>
                  </View>
                  <Switch
                    value={notifActive}
                    onValueChange={handleToggleNotifications}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.background}
                    testID="notif-toggle"
                  />
                </View>

                {/* Time picker row */}
                {notifActive && (
                  <Pressable
                    style={[s.notifRow, s.notifRowBorder]}
                    onPress={() => setShowTimePicker(true)}
                    testID="notif-time-btn"
                  >
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={colors.mutedForeground}
                    />
                    <View style={s.notifRowText}>
                      <Text style={s.notifLabel}>Horário do lembrete</Text>
                      <Text style={s.notifSub}>
                        Toque para alterar o horário
                      </Text>
                    </View>
                    <Text style={s.timeValue}>
                      {pad(notifTime.hour)}:{pad(notifTime.minute)}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                )}

                {/* Pause row */}
                {notifActive && (
                  <View style={[s.notifRow, s.notifRowBorder]}>
                    <Ionicons
                      name="moon-outline"
                      size={18}
                      color={pauseUntil ? colors.primary : colors.mutedForeground}
                    />
                    <View style={s.notifRowText}>
                      <Text style={s.notifLabel}>Pausar lembretes</Text>
                      {pauseUntil ? (
                        <Text style={s.pausedSub}>
                          Pausado {pauseLabel(pauseUntil)}
                        </Text>
                      ) : (
                        <Text style={s.notifSub}>
                          Silenciar por um período (ex: férias)
                        </Text>
                      )}
                    </View>
                    {pauseUntil ? (
                      <Pressable
                        style={s.resumeBtn}
                        onPress={handleResume}
                        testID="notif-resume-btn"
                      >
                        <Text style={s.resumeBtnText}>Retomar</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => setShowPausePicker(true)}
                        testID="notif-pause-btn"
                        hitSlop={8}
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={colors.mutedForeground}
                        />
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            </>
          )}

          <Pressable
            style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.7 }]}
            onPress={handleLogout}
            testID="logout-button"
          >
            <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
            <Text style={s.logoutText}>Sair da conta</Text>
          </Pressable>

          <View style={s.footer}>
            <Text style={s.footerText}>Método Ponto B · RE/MAX SC</Text>
          </View>
        </View>
      </ScrollView>

      {Platform.OS !== "web" && (
        <>
          <TimePickerModal
            visible={showTimePicker}
            hour={notifTime.hour}
            minute={notifTime.minute}
            onConfirm={handleTimeConfirm}
            onCancel={() => setShowTimePicker(false)}
            colors={colors}
          />
          <PausePickerModal
            visible={showPausePicker}
            onConfirm={handlePauseConfirm}
            onCancel={() => setShowPausePicker(false)}
            colors={colors}
          />
        </>
      )}
    </>
  );
}
