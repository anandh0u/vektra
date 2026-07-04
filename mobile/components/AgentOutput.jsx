import React from "react";
import { Text, View } from "react-native";

import CodeBlock from "./CodeBlock";

function ExploitabilityBar({ score }) {
  const value = Math.max(0, Math.min(Number(score || 0), 10));
  return (
    <View className="mt-3">
      <Text className="mb-2 text-[12px] text-muted">Exploitability</Text>
      <View className="flex-row">
        {Array.from({ length: 10 }).map((_, index) => (
          <View
            key={index}
            className={`mr-1 h-2 w-2 rounded-sm ${index < value ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </View>
    </View>
  );
}

export default function AgentOutput({ vulnerability }) {
  const hasAnalysis = Boolean(vulnerability?.danger_summary);
  const hasFix = Boolean(vulnerability?.fixed_policy_block);

  return (
    <View>
      <View className="mx-4 mt-3 rounded-2xl border border-border border-l-4 border-l-danger bg-card p-4">
        <Text className="text-[13px] font-bold uppercase text-primary">Danger Analysis</Text>
        <Text className="mt-3 text-[15px] leading-[24px] text-white">
          {hasAnalysis
            ? vulnerability.danger_summary
            : "Sarvam enrichment is not available yet. Configure SARVAM_API_KEY on the backend to generate the AI explanation."}
        </Text>
        {vulnerability?.attack_scenario ? (
          <Text className="mt-2 text-[13px] italic leading-[20px] text-[#a0a8d0]">
            {vulnerability.attack_scenario}
          </Text>
        ) : null}
        <ExploitabilityBar score={vulnerability?.exploitability_score} />
        {vulnerability?.attacker_capability_required ? (
          <View className="mt-3 self-start rounded-full bg-warning/10 px-3 py-1.5">
            <Text className="text-[12px] text-warning">
              Required capability: {vulnerability.attacker_capability_required}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mx-4 mt-3 rounded-2xl border border-border bg-sidebar p-4">
        <Text className="text-[13px] font-bold uppercase text-primary">Fix Advisor</Text>
        {hasFix ? (
          <>
            <Text className="my-3 text-[14px] leading-[21px] text-white">
              {vulnerability.fix_description}
            </Text>
            {vulnerability.what_changed ? (
              <Text className="mb-3 text-[13px] italic leading-[20px] text-muted">
                {vulnerability.what_changed}
              </Text>
            ) : null}
            <CodeBlock code={vulnerability.fixed_policy_block} />
            <View className="mt-3 flex-row items-center">
              <Text className="mr-2 text-[12px] text-muted">Confidence:</Text>
              <Text className="text-[12px] font-bold text-safe">
                {vulnerability.confidence || "N/A"}
              </Text>
            </View>
            {vulnerability.principle_applied ? (
              <Text className="mt-1 text-[12px] italic text-muted">
                {vulnerability.principle_applied}
              </Text>
            ) : null}
          </>
        ) : (
          <Text className="mt-3 text-[14px] leading-[21px] text-textSoft">
            Fix blocks will appear here after Sarvam credentials are configured on the backend.
          </Text>
        )}
      </View>
    </View>
  );
}
