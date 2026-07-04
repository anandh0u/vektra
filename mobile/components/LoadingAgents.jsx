import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

const agents = ["Analyst", "Fix Eng", "Scorer"];

export default function LoadingAgents({ loading = false }) {
  return (
    <View className="mx-4 mt-4 flex-row">
      {agents.map((agent, index) => (
        <View key={agent} className={`flex-1 rounded-xl bg-card p-3 ${index < 2 ? "mr-2" : ""}`}>
          <View className="flex-row items-center">
            {loading ? (
              <ActivityIndicator size="small" color="#7c3aed" />
            ) : (
              <View className="h-3 w-3 rounded-full bg-safe" />
            )}
            <Text className="ml-2 text-[12px] font-semibold text-white">{agent}</Text>
          </View>
          <Text className="mt-1 text-[10px] text-muted">{loading ? "Running" : "Complete"}</Text>
        </View>
      ))}
    </View>
  );
}
