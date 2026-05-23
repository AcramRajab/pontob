import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Preencha e-mail e senha.");
      return;
    }
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await login(email.trim(), password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  const topPad =
    insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad =
    insets.bottom + (Platform.OS === "web" ? 34 : 24);

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingTop: topPad + 24,
      paddingBottom: botPad,
    },
    logoSection: { alignItems: "center", marginBottom: 40 },
    logoCircle: {
      width: 76,
      height: 76,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    logoLetter: {
      color: colors.primaryForeground,
      fontSize: 32,
      fontFamily: "Inter_700Bold",
    },
    appName: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      textAlign: "center",
    },
    appSub: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      marginTop: 4,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius * 2,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
      marginBottom: 6,
      marginTop: 16,
    },
    firstLabel: { marginTop: 0 },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    inputFocused: { borderColor: colors.primary },
    pwdWrap: { position: "relative" },
    pwdInput: { paddingRight: 48 },
    eyeBtn: {
      position: "absolute",
      right: 14,
      top: 0,
      bottom: 0,
      justifyContent: "center",
    },
    errorBox: {
      backgroundColor: colors.destructive + "18",
      borderRadius: colors.radius,
      padding: 12,
      marginTop: 16,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.destructive,
      lineHeight: 18,
    },
    loginBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 24,
    },
    loginBtnDisabled: { opacity: 0.6 },
    loginBtnText: {
      color: colors.primaryForeground,
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
    footer: { marginTop: 32, alignItems: "center" },
    footerText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
  });

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.logoSection}>
          <View style={s.logoCircle}>
            <Text style={s.logoLetter}>B</Text>
          </View>
          <Text style={s.appName}>Método Ponto B</Text>
          <Text style={s.appSub}>RE/MAX Santa Catarina</Text>
        </View>

        <View style={s.card}>
          <Text style={[s.label, s.firstLabel]}>E-mail</Text>
          <TextInput
            style={[s.input, emailFocused && s.inputFocused]}
            placeholder="seu@email.com"
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            returnKeyType="next"
            testID="email-input"
          />

          <Text style={s.label}>Senha</Text>
          <View style={s.pwdWrap}>
            <TextInput
              style={[
                s.input,
                s.pwdInput,
                passwordFocused && s.inputFocused,
              ]}
              placeholder="Sua senha"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              testID="password-input"
            />
            <Pressable
              style={s.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>

          {error && (
            <View style={s.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={colors.destructive}
              />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              s.loginBtn,
              (loading || pressed) && s.loginBtnDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
            testID="login-button"
          >
            {loading ? (
              <ActivityIndicator
                color={colors.primaryForeground}
                size="small"
              />
            ) : (
              <Text style={s.loginBtnText}>Entrar</Text>
            )}
          </Pressable>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>RE/MAX Santa Catarina</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
