import httpx
import os
import json
import logging

logger = logging.getLogger("vektra.base44")

def get_base44_config():
    app_id = os.getenv("BASE44_APP_ID") or "6a494c246e43fac149974886"
    api_key = os.getenv("BASE44_API_KEY") or "1ec5cf39c2ff457c9686d35b1c5650d0"
    url = f"https://api.base44.com/v1/apps/{app_id}"
    headers = {
        "x-api-key": api_key or "",
        "Content-Type": "application/json"
    }
    return url, headers, bool(app_id and api_key)

async def save_scan_history(
  session_id: str,
  fmt: str,
  stats: dict,
  policy_text: str
):
  """Save scan summary to Base44 after every analysis."""
  url, headers, configured = get_base44_config()
  if not configured:
    logger.warning("Base44: Not configured (missing app ID or API key). Skipping scan history save.")
    return
  try:
    async with httpx.AsyncClient() as client:
      res = await client.post(
        f"{url}/entities/ScanHistory",
        headers=headers,
        json={
          "session_id": session_id,
          "format": fmt,
          "total_rules": stats.get("total_rules", 0),
          "critical_count": stats.get("critical_count", 0),
          "warning_count": stats.get("warning_count", 0),
          "risk_score": stats.get("risk_score", 0),
          "risk_label": stats.get("risk_label", "LOW"),
          "executive_summary": stats.get(
            "executive_summary", ""
          ),
          "policy_preview": policy_text[:200]
        }
      )
      if res.status_code >= 400:
        logger.warning(f"Base44: Failed to save scan history. Status: {res.status_code}, Response: {res.text}")
  except Exception as e:
    logger.warning(f"Base44: Exception occurred during save_scan_history: {e}")
    pass  # Never crash main flow if Base44 fails

async def save_report(
  session_id: str,
  report_data: dict,
  title: str = "Untitled Scan"
):
  """Save full report JSON to Base44."""
  url, headers, configured = get_base44_config()
  if not configured:
    logger.warning("Base44: Not configured. Skipping saved report.")
    return
  try:
    async with httpx.AsyncClient() as client:
      res = await client.post(
        f"{url}/entities/SavedReport",
        headers=headers,
        json={
          "session_id": session_id,
          "report_json": json.dumps(report_data),
          "title": title
        }
      )
      if res.status_code >= 400:
        logger.warning(f"Base44: Failed to save report. Status: {res.status_code}, Response: {res.text}")
  except Exception as e:
    logger.warning(f"Base44: Exception occurred during save_report: {e}")
    pass

async def get_scan_history(limit: int = 10):
  """Fetch last N scans for sidebar history."""
  url, headers, configured = get_base44_config()
  if not configured:
    logger.warning("Base44: Not configured. Cannot get scan history.")
    return []
  try:
    async with httpx.AsyncClient() as client:
      res = await client.get(
        f"{url}/entities/ScanHistory",
        headers=headers,
        params={
          "sort": "-scanned_at",
          "limit": limit
        }
      )
      if res.status_code >= 400:
        logger.warning(f"Base44: Failed to fetch scan history. Status: {res.status_code}")
        return []
      return res.json().get("items", [])
  except Exception as e:
    logger.warning(f"Base44: Exception occurred during get_scan_history: {e}")
    return []

async def get_saved_report(session_id: str):
  """Fetch a saved report by session ID."""
  url, headers, configured = get_base44_config()
  if not configured:
    logger.warning("Base44: Not configured. Cannot fetch saved report.")
    return None
  try:
    async with httpx.AsyncClient() as client:
      res = await client.get(
        f"{url}/entities/SavedReport",
        headers=headers,
        params={"filter": f"session_id=={session_id}"}
      )
      if res.status_code >= 400:
        logger.warning(f"Base44: Failed to fetch saved report. Status: {res.status_code}")
        return None
      items = res.json().get("items", [])
      if items:
        import json as j
        report = items[0]
        report["report_json"] = j.loads(
          report["report_json"]
        )
        return report
      return None
  except Exception as e:
    logger.warning(f"Base44: Exception occurred during get_saved_report: {e}")
    return None
