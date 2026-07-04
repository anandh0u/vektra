import React from "react";
import { Text, View } from "react-native";

import SeverityBadge from "./SeverityBadge";

const riskColors = {
  CRITICAL: "text-danger",
  HIGH: "text-warning",
  MEDIUM: "text-yellow-300",
  LOW: "text-safe"
};

export default function RiskScoreBadge({ stats = {}, format = "iam" }) {
  const label = stats.risk_label || "LOW";
  const score = stats.risk_score || 0;

  return (
    <View className="mx-4 mt-4 rounded-2xl border border-border bg-card p-5">
      <View className="flex-row items-center justify-between">
        <SeverityBadge value={label} />
        <View className="rounded-full border border-primary/50 px-3 py-1">
          <Text className="text-[10px] font-bold uppercase text-primary">
            {format === "k8s" ? "K8s" : "IAM"}
          </Text>
        </View>
      </View>

      <View className="items-center py-5">
        <Text className={`font-heading text-[72px] leading-[78px] ${riskColors[label] || "text-safe"}`}>
          {score}
        </Text>
        <Text className="text-[13px] text-muted">Risk Score</Text>
      </View>

      <View className="h-px bg-border" />

      <Text className="mt-4 text-[14px] leading-[22px] text-textSoft">
        {stats.executive_summary || "No analysis summary is available yet."}
      </Text>

      {stats.compliance_notes ? (
        <View className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-2">
          <Text className="text-[12px] leading-[18px] text-warning">
            {stats.compliance_notes}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
