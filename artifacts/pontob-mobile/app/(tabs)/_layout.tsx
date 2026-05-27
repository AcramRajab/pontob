import { Feather, Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Badge, Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/context/auth";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

const ADMIN_ROLES = ["master_admin", "staff_regional"];

interface TodayOverview {
  todayCheckins: Array<{ id: number; executedToday: string; date: string }>;
}

function useDailyCheckinMissing(): boolean {
  const { user } = useAuth();
  const { data, isSuccess } = useQuery({
    queryKey: ["dashboard-today", user?.franchiseId],
    queryFn: async () => {
      const params = user?.franchiseId
        ? `?franchiseId=${user.franchiseId}`
        : "";
      const res = await apiFetch(`/dashboard/today${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<TodayOverview>;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
  if (!isSuccess) return false;
  return (data?.todayCheckins?.length ?? 0) === 0;
}

interface Invite {
  status: string;
  approvedAt: string | null;
  rejectedAt: string | null;
}

function usePendingApprovalsCount(): number {
  const { user } = useAuth();
  const isAdmin = !!user && ADMIN_ROLES.includes(user.role);
  const { data } = useQuery({
    queryKey: ["invites"],
    queryFn: async () => {
      const res = await apiFetch("/invites");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<Invite[]>;
    },
    enabled: isAdmin,
    staleTime: 30_000,
  });
  if (!data) return 0;
  return data.filter(
    (inv) => inv.status === "used" && !inv.approvedAt && !inv.rejectedAt
  ).length;
}

function BadgeDot() {
  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#ef4444",
        borderWidth: 1.5,
        borderColor: "transparent",
      }}
    />
  );
}

function NativeTabLayout() {
  const { user } = useAuth();
  const isAdmin = !!user && ADMIN_ROLES.includes(user.role);
  const dailyCheckinMissing = useDailyCheckinMissing();
  const pendingApprovalsCount = usePendingApprovalsCount();

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Hoje</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="goals">
        <Icon sf={{ default: "flag", selected: "flag.fill" }} />
        <Label>Metas</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="checkin">
        <Icon
          sf={{
            default: "checkmark.circle",
            selected: "checkmark.circle.fill",
          }}
        />
        <Badge hidden={!dailyCheckinMissing} />
        <Label>Check-in</Label>
      </NativeTabs.Trigger>
      {isAdmin && (
        <NativeTabs.Trigger name="admin">
          <Icon sf={{ default: "person.badge.clock", selected: "person.badge.clock.fill" }} />
          <Badge hidden={pendingApprovalsCount === 0}>{String(pendingApprovalsCount)}</Badge>
          <Label>Aprovações</Label>
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Perfil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const isAdmin = !!user && ADMIN_ROLES.includes(user.role);
  const dailyCheckinMissing = useDailyCheckinMissing();
  const pendingApprovalsCount = usePendingApprovalsCount();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Hoje",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: "Metas",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="flag" tintColor={color} size={24} />
            ) : (
              <Ionicons name="flag-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: "Check-in",
          tabBarIcon: ({ color }) => (
            <View style={{ position: "relative" }}>
              {isIOS ? (
                <SymbolView
                  name="checkmark.circle"
                  tintColor={color}
                  size={24}
                />
              ) : (
                <Ionicons
                  name="checkmark-circle-outline"
                  size={22}
                  color={color}
                />
              )}
              {dailyCheckinMissing && <BadgeDot />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Aprovações",
          tabBarButton: isAdmin ? undefined : () => null,
          tabBarBadge: isAdmin && pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.badge.clock" tintColor={color} size={24} />
            ) : (
              <Ionicons name="time-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={24} />
            ) : (
              <Ionicons name="person-outline" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
