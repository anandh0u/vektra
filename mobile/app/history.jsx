import React, { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import HistoryItem from "../components/HistoryItem";
import useVektraStore from "../store/vektraStore";
import { getHistory } from "../utils/api";

export default function HistoryScreen() {
  const router = useRouter();
  const { setAnalysisResult, setHistory, history } = useVektraStore();
  const [source, setSource] = useState("local");
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const result = await getHistory();
    setSource(result.source);
    setHistory(result.items);
    setLoading(false);
  }, [setHistory]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const openHistoryItem = (item) => {
    if (item.result) {
      setAnalysisResult(item.result);
      router.push("/results");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="h-16 justify-center px-4">
        <Text className="font-heading text-[20px] text-white">Scan History</Text>
        <Text className="mt-1 text-[12px] text-muted">
          {source === "base44" ? "Synced from Base44" : "Local device history while Base44 is not configured"}
        </Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.session_id}
        renderItem={({ item }) => <HistoryItem item={item} onPress={openHistoryItem} />}
        refreshing={loading}
        onRefresh={loadHistory}
        contentContainerClassName="pb-8"
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8 py-24">
            <Ionicons name="time-outline" size={44} color="#4a5280" />
            <Text className="mt-4 font-heading text-[18px] text-muted">No scans yet</Text>
            <Text className="mt-2 text-center text-[13px] text-muted">Upload a policy to get started.</Text>
            <Pressable onPress={() => router.push("/")} className="mt-5 rounded-xl bg-primary px-5 py-3">
              <Text className="font-semibold text-white">Start Scan</Text>
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}
