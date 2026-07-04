import React from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import LoadingAgents from "../components/LoadingAgents";
import RiskScoreBadge from "../components/RiskScoreBadge";
import VulnerabilityCard from "../components/VulnerabilityCard";
import useVektraStore from "../store/vektraStore";
import { saveReportSnapshot, toHistoryItem } from "../utils/api";

export default function ResultsScreen() {
  const router = useRouter();
  const { analysisResult, setSelectedVuln, sortedVulnerabilities, format } = useVektraStore();

  if (!analysisResult) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg px-6">
        <Text className="font-heading text-[20px] text-white">No analysis yet</Text>
        <Text className="mt-2 text-center text-[13px] leading-[20px] text-muted">
          Run a scan first to view risk, priorities, and vulnerabilities.
        </Text>
        <Pressable onPress={() => router.push("/")} className="mt-5 rounded-xl bg-primary px-5 py-3">
          <Text className="font-semibold text-white">Start Scan</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const stats = analysisResult.stats || {};
  const vulnerabilities = sortedVulnerabilities();
  const critical = vulnerabilities.filter((item) => item.severity === "CRITICAL").length;
  const warning = vulnerabilities.filter((item) => item.severity === "WARNING").length;
  const info = vulnerabilities.filter((item) => item.severity === "INFO").length;

  const openVulnerability = (vulnerability) => {
    setSelectedVuln(vulnerability);
    router.push(`/vulnerability/${encodeURIComponent(vulnerability.id)}`);
  };

  const saveReport = async () => {
    const item = toHistoryItem(analysisResult, "", format);
    const result = await saveReportSnapshot(item);
    Alert.alert("Saved", result.source === "base44" ? "Report saved to Base44." : "Report saved locally on this device.");
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="h-14 flex-row items-center justify-between px-4">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color="#7c3aed" />
        </Pressable>
        <Text className="font-heading text-[18px] text-white">Analysis Results</Text>
        <Pressable onPress={saveReport} className="h-10 justify-center">
          <Text className="text-[13px] font-semibold text-primary">Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="pb-8">
        <RiskScoreBadge stats={stats} format={analysisResult.format || format} />
        <LoadingAgents loading={false} />

        <View className="mx-4 mt-3 flex-row flex-wrap">
          {[
            ["Rules Parsed", analysisResult.nodes?.length || stats.total_rules || 0, "text-white"],
            ["Critical", critical, "text-danger"],
            ["Warnings", warning, "text-warning"],
            ["Info", info, "text-blue-400"]
          ].map(([label, value, color], index) => (
            <View key={label} className={`mb-2 w-1/2 ${index % 2 === 0 ? "pr-1" : "pl-1"}`}>
              <View className="rounded-xl bg-card p-3">
                <Text className={`text-[24px] font-bold ${color}`}>{value}</Text>
                <Text className="text-[11px] text-muted">{label}</Text>
              </View>
            </View>
          ))}
        </View>

        <View className="mx-4 mt-3 rounded-2xl bg-card p-4">
          <Text className="font-heading text-[15px] text-white">Top Priorities</Text>
          {(stats.top_3_priorities || stats.top_priorities || []).slice(0, 3).map((item, index) => (
            <View key={`${item}-${index}`} className="mt-3 flex-row">
              <View className="mr-3 h-6 w-6 items-center justify-center rounded-full bg-primary">
                <Text className="text-[12px] font-bold text-white">{index + 1}</Text>
              </View>
              <Text className="flex-1 text-[13px] leading-[20px] text-textSoft">{item}</Text>
            </View>
          ))}
        </View>

        <View className="mx-4 mb-2 mt-4 flex-row items-center justify-between">
          <Text className="font-heading text-[16px] text-white">Vulnerabilities</Text>
          <View className="rounded-full bg-border px-2.5 py-1">
            <Text className="text-[11px] text-muted">{vulnerabilities.length}</Text>
          </View>
        </View>

        {vulnerabilities.map((vulnerability) => (
          <VulnerabilityCard
            key={vulnerability.id}
            vulnerability={vulnerability}
            onPress={openVulnerability}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
