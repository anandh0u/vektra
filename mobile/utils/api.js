import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export const API_URL_KEY = "vektra_mobile_api_url";
export const LOCAL_HISTORY_KEY = "vektra_mobile_scan_history";

export const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || "";

export async function getApiBase() {
  const stored = await AsyncStorage.getItem(API_URL_KEY);
  return (stored || DEFAULT_API_URL || "").replace(/\/$/, "");
}

export async function setApiBase(url) {
  const normalized = (url || "").trim().replace(/\/$/, "");
  if (normalized) {
    await AsyncStorage.setItem(API_URL_KEY, normalized);
  } else {
    await AsyncStorage.removeItem(API_URL_KEY);
  }
  return normalized;
}

export async function createApiClient(timeout = 60000) {
  const baseURL = await getApiBase();
  if (!baseURL) {
    throw new Error("Set the backend API URL in Settings first.");
  }
  return axios.create({
    baseURL,
    timeout,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

export async function getHealth() {
  const client = await createApiClient(15000);
  const response = await client.get("/api/health");
  return response.data;
}

export function toHistoryItem(result, policyText, format) {
  const stats = result?.stats || {};
  const vulnerabilities = result?.vulnerabilities || result?.conflicts || [];
  return {
    session_id: result?.session_id || `local-${Date.now()}`,
    format: (format || result?.format || "iam").toUpperCase(),
    risk_score: stats.risk_score || 0,
    risk_label: stats.risk_label || "LOW",
    policy_preview: (policyText || "").replace(/\s+/g, " ").trim().slice(0, 80),
    scanned_at: new Date().toISOString(),
    vulnerabilities_count: vulnerabilities.length,
    result
  };
}

export async function saveLocalHistory(item) {
  const current = await getLocalHistory();
  const filtered = current.filter((entry) => entry.session_id !== item.session_id);
  const updated = [item, ...filtered].slice(0, 20);
  await AsyncStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

export async function getLocalHistory() {
  const raw = await AsyncStorage.getItem(LOCAL_HISTORY_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function getHistory() {
  try {
    const client = await createApiClient(15000);
    const response = await client.get("/api/history");
    const remote = Array.isArray(response.data) ? response.data : response.data?.items || [];
    if (remote.length > 0) {
      return { source: "base44", items: remote };
    }
  } catch {
    // Base44 is not configured yet; use device-local scan history.
  }
  return { source: "local", items: await getLocalHistory() };
}

export async function saveReportSnapshot(item) {
  try {
    const client = await createApiClient(15000);
    await client.post("/api/report/save", item);
    return { source: "base44" };
  } catch {
    await saveLocalHistory(item);
    return { source: "local" };
  }
}

export function relativeTime(isoDate) {
  const timestamp = new Date(isoDate).getTime();
  if (!Number.isFinite(timestamp)) {
    return "recently";
  }
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
