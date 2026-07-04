import React from "react";
import { Text, View } from "react-native";

const styles = {
  CRITICAL: "bg-danger",
  WARNING: "bg-warning",
  INFO: "bg-blue-500",
  HIGH: "bg-warning",
  MEDIUM: "bg-yellow-400",
  LOW: "bg-safe",
  SAFE: "bg-safe"
};

const textStyles = {
  WARNING: "text-[#211300]",
  HIGH: "text-[#211300]",
  MEDIUM: "text-[#211300]"
};

export default function SeverityBadge({ value = "INFO" }) {
  const normalized = String(value || "INFO").toUpperCase();
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${styles[normalized] || "bg-blue-500"}`}>
      <Text className={`text-[10px] font-bold ${textStyles[normalized] || "text-white"}`}>
        {normalized}
      </Text>
    </View>
  );
}
