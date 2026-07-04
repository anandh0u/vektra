import * as Haptics from "expo-haptics";

import useVektraStore from "../store/vektraStore";
import { createApiClient, saveLocalHistory, toHistoryItem } from "../utils/api";

export const useAnalyze = () => {
  const { setAnalysisResult, setIsAnalyzing, format } = useVektraStore();

  const analyze = async (policyText) => {
    setIsAnalyzing(true);
    try {
      const client = await createApiClient(60000);
      const sessionId = `mobile-${Math.random().toString(36).slice(2)}-${Date.now()}`;
      const response = await client.post("/api/analyze", {
        policy_text: policyText,
        format,
        session_id: sessionId
      });

      setAnalysisResult(response.data);
      await saveLocalHistory(toHistoryItem(response.data, policyText, format));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.detail || error.message || "Analysis failed"
      };
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { analyze };
};
