import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DEFAULT_API_URL, getApiBase, getHealth, setApiBase } from "../utils/api";

function StatusRow({ label, connected }) {
  return (
    <View className="mt-3 flex-row items-center justify-between">
      <View className="flex-row items-center">
        <View className={`mr-3 h-2.5 w-2.5 rounded-full ${connected ? "bg-safe" : "bg-danger"}`} />
        <Text className="text-[14px] text-white">{label}</Text>
      </View>
      <Text className={`text-[12px] ${connected ? "text-safe" : "text-danger"}`}>
        {connected ? "Connected" : "Not configured"}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [status, setStatus] = useState({ neo4j: false, sarvam: false, base44: false });
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getApiBase().then((value) => setApiUrl(value || DEFAULT_API_URL));
  }, []);

  const save = async () => {
    await setApiBase(apiUrl);
    Alert.alert("Saved", "Backend API URL saved on this device.");
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const health = await getHealth();
      setStatus({
        neo4j: Boolean(health.neo4j),
        sarvam: Boolean(health.sarvam),
        base44: Boolean(health.base44)
      });
    } catch (error) {
      Alert.alert("Connection Failed", error.message || "Could not reach backend.");
      setStatus({ neo4j: false, sarvam: false, base44: false });
    } finally {
      setTesting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="pb-8">
        <View className="h-16 justify-center px-4">
          <Text className="font-heading text-[20px] text-white">Settings</Text>
        </View>

        <View className="mx-4 rounded-2xl border border-border bg-card p-4">
          <Text className="text-[12px] font-bold uppercase text-muted">Backend API URL</Text>
          <TextInput
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="https://vektra-backend.onrender.com"
            placeholderTextColor="#4a5280"
            autoCorrect={false}
            autoCapitalize="none"
            keyboardType="url"
            className="mt-2 rounded-xl border border-border bg-sidebar p-3 text-[13px] text-white"
          />
          <Pressable onPress={save} className="mt-3 h-11 items-center justify-center rounded-xl bg-primary">
            <Text className="font-semibold text-white">Save API URL</Text>
          </Pressable>
        </View>

        <View className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4">
          <Text className="font-heading text-[15px] text-white">Service Status</Text>
          <StatusRow label="Neo4j" connected={status.neo4j} />
          <StatusRow label="Sarvam AI" connected={status.sarvam} />
          <StatusRow label="Base44" connected={status.base44} />
          <Pressable
            onPress={testConnection}
            disabled={testing}
            className="mt-4 h-11 items-center justify-center rounded-xl border border-primary"
          >
            <Text className="font-semibold text-primary">{testing ? "Testing..." : "Test Connection"}</Text>
          </Pressable>
        </View>

        <View className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4">
          <Text className="font-heading text-[16px] text-white">VEKTRA</Text>
          <Text className="mt-2 text-[13px] text-muted">Version: 1.0.0 - HACKHAZARDS '26</Text>
          <Text className="mt-1 text-[13px] text-muted">Built with: Neo4j, Sarvam AI, Base44, Render, Expo</Text>
          <Text className="mt-3 text-[12px] leading-[18px] text-muted">
            Base44 is shown as not configured until an API endpoint or backend integration is available.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
