import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { useAnalyze } from "../hooks/useAnalyze";
import useVektraStore from "../store/vektraStore";

const SAMPLE_IAM = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3Upload",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::prod-bucket/*"
    },
    {
      "Sid": "DenyS3Upload",
      "Effect": "Deny",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::prod-bucket/*"
    },
    {
      "Sid": "DangerousAdmin",
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*"
    }
  ]
}`;

const SAMPLE_K8S = `apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: platform-admin
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]`;

export default function UploadScreen() {
  const router = useRouter();
  const { analyze } = useAnalyze();
  const { format, setFormat, isAnalyzing } = useVektraStore();
  const [policyText, setPolicyText] = useState(SAMPLE_IAM);

  const selectFormat = async (nextFormat) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormat(nextFormat);
    setPolicyText(nextFormat === "iam" ? SAMPLE_IAM : SAMPLE_K8S);
  };

  const handleAnalyze = async () => {
    if (!policyText.trim()) {
      Alert.alert("Policy Required", "Paste or load a policy before running analysis.");
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await analyze(policyText);
    if (result.success) {
      router.push("/results");
    } else {
      Alert.alert("Analysis Failed", result.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView className="flex-1" contentContainerClassName="px-4 pb-10">
          <View className="items-center pt-4">
            <Text className="font-heading text-[28px] text-white">VEKTRA</Text>
            <Text className="mt-1 text-[13px] text-muted">Cloud Policy Scanner</Text>
          </View>

          <View className="mt-6 flex-row rounded-xl border border-border bg-sidebar p-1">
            {[
              ["iam", "AWS IAM"],
              ["k8s", "Kubernetes RBAC"]
            ].map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => selectFormat(value)}
                className={`h-10 flex-1 items-center justify-center rounded-lg ${
                  format === value ? "bg-primary" : "bg-transparent"
                }`}
              >
                <Text className={`text-[12px] font-bold ${format === value ? "text-white" : "text-muted"}`}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="mt-6 flex-row items-center justify-between">
            <Text className="text-[12px] font-bold uppercase text-muted">Paste your policy</Text>
            <Pressable onPress={() => setPolicyText(format === "iam" ? SAMPLE_IAM : SAMPLE_K8S)}>
              <Text className="text-[13px] font-semibold text-primary">Load Sample</Text>
            </Pressable>
          </View>

          <TextInput
            value={policyText}
            onChangeText={setPolicyText}
            multiline
            scrollEnabled
            autoCorrect={false}
            autoCapitalize="none"
            placeholder={SAMPLE_IAM.slice(0, 220)}
            placeholderTextColor="#2a2d4a"
            textAlignVertical="top"
            className="mt-2 h-[220px] rounded-xl border border-border bg-sidebar p-3 font-mono text-[12px] leading-[18px] text-textMain"
          />

          <Pressable disabled={isAnalyzing} onPress={handleAnalyze} className="mt-4 overflow-hidden rounded-xl opacity-100">
            <LinearGradient
              colors={["#7c3aed", "#06b6d4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className={`h-[52px] items-center justify-center ${isAnalyzing ? "opacity-70" : "opacity-100"}`}
            >
              <View className="flex-row items-center">
                {isAnalyzing ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Ionicons name="play" color="#ffffff" size={16} />
                )}
                <Text className="ml-2 font-heading text-[16px] text-white">
                  {isAnalyzing ? "Agents analyzing..." : "Analyze with VEKTRA"}
                </Text>
              </View>
            </LinearGradient>
          </Pressable>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
            {["14 vuln classes", "Neo4j graph", "Sarvam AI agents"].map((item) => (
              <View key={item} className="mr-2 rounded-full border border-border bg-card px-3 py-1.5">
                <Text className="text-[12px] text-muted">{item}</Text>
              </View>
            ))}
          </ScrollView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
