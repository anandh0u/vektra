import "../global.css";

import React from "react";
import { Text, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";

function TabIcon({ name, color }) {
  return <Ionicons name={name} size={22} color={color} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold
  });

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-sm text-muted">Loading VEKTRA...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#0a0c16",
            borderTopColor: "#1e2240",
            borderTopWidth: 1
          },
          tabBarActiveTintColor: "#7c3aed",
          tabBarInactiveTintColor: "#4a5280",
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: "Inter_600SemiBold"
          }
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Scan",
            tabBarIcon: ({ color }) => <TabIcon name="scan-outline" color={color} />
          }}
        />
        <Tabs.Screen
          name="results"
          options={{
            title: "Results",
            tabBarIcon: ({ color }) => <TabIcon name="analytics-outline" color={color} />
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarIcon: ({ color }) => <TabIcon name="time-outline" color={color} />
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => <TabIcon name="settings-outline" color={color} />
          }}
        />
        <Tabs.Screen
          name="vulnerability/[id]"
          options={{
            href: null,
            tabBarStyle: { display: "none" }
          }}
        />
      </Tabs>
    </>
  );
}
