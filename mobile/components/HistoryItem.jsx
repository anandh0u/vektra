import React from "react";
import { Pressable, Text, View } from "react-native";

import SeverityBadge from "./SeverityBadge";
import { relativeTime } from "../utils/api";

export default function HistoryItem({ item, onPress }) {
  const preview = item.policy_preview || "No policy preview available";

  return (
    <Pressable onPress={() => onPress?.(item)} className="mx-4 mb-3 rounded-xl border border-border bg-card p-4">
      <View className="flex-row items-center justify-between">
        <View className="rounded-full border border-primary/50 px-3 py-1">
          <Text className="text-[10px] font-bold text-primary">{item.format || "IAM"}</Text>
        </View>
        <SeverityBadge value={item.risk_label || "LOW"} />
      </View>
      <Text className="mt-3 font-mono text-[11px] leading-[17px] text-muted" numberOfLines={2}>
        {preview.length > 40 ? `${preview.slice(0, 40)}...` : preview}
      </Text>
      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-[16px] font-bold text-white">{item.risk_score || 0}/100</Text>
        <Text className="text-[12px] text-muted">{relativeTime(item.scanned_at)}</Text>
      </View>
    </Pressable>
  );
}
