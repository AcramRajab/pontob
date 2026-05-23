import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";
import { useColors } from "@/hooks/useColors";

const ROLE_LABELS: Record<string, string> = {
  master_admin: "Administrador Master",
  staff_regional: "Equipe Regional",
  franqueado: "Franqueado",
  responsavel_interno: "Responsável Interno",
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

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

  return (
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
  );
}
