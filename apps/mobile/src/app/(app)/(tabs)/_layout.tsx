import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { colors, glass, manropeFamilies } from "@/theme";

/**
 * Bottom-tab navigation: Home, Conversation, Settings.
 * The tab bar is a strong pearl-glass surface; safe-area insets are handled
 * by the tab bar itself.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
        tabBarActiveTintColor: colors.text.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          backgroundColor: glass.surfaceStrong,
          borderTopColor: glass.border,
        },
        tabBarLabelStyle: {
          fontFamily: manropeFamilies["500"],
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sunny-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="conversation"
        options={{
          title: "Conversation",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
