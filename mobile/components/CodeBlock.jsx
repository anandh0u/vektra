import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

export default function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code || "");
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View>
      <ScrollView horizontal className="rounded-xl bg-[#050508] p-3">
        <Text className="font-mono text-[11px] leading-[18px] text-[#a0f0a0]">
          {code || "No fix block available yet."}
        </Text>
      </ScrollView>
      <Pressable
        onPress={handleCopy}
        disabled={!code}
        className="mt-3 h-11 items-center justify-center rounded-xl border border-primary bg-border"
      >
        <Text className="text-[14px] font-semibold text-primary">
          {copied ? "Copied" : "Copy Fix"}
        </Text>
      </Pressable>
    </View>
  );
}
