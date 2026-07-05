from datetime import date
import asyncio
import logging
from backend import stellar_client

logger = logging.getLogger("vektra.credits")

CREDIT_COSTS = {
    "basic_scan":    1,
    "full_scan":     5,
    "rerun_agents":  2,
    "export_pdf":    1,
    "export_svg":    1
}

DAILY_CREDITS = {
    "free":  5,
    "pro":   200,
    "team":  1000
}

async def check_and_deduct_credits(
    user: dict,
    action: str,
    neo4j_client,
) -> dict:
    """
    Check user has enough credits, deduct if yes.
    Returns { allowed: bool, remaining: int, cost: int, error: Optional[str] }
    """
    cost = CREDIT_COSTS.get(action, 1)
    
    # We retrieve the fresh balance
    balance = user.get("credits_balance", 0)
    
    # Reset daily credits if new day
    today = date.today().isoformat()
    if user.get("credits_reset_date") != today:
        tier = user.get("tier", "free")
        balance = DAILY_CREDITS.get(tier, 5)
        await neo4j_client.reset_user_credits(
            user["id"], balance, today
        )
    
    if balance < cost:
        return {
            "allowed": False,
            "remaining": balance,
            "cost": cost,
            "error": f"Insufficient credits. Need {cost}, have {balance}."
        }
    
    new_balance = balance - cost
    
    # Deduct from Neo4j (fast, real-time)
    await neo4j_client.update_credits(user["id"], new_balance)
    
    # Deduct from Stellar (async, for blockchain record)
    # Fire and forget — don't block
    if user.get("stellar_public_key") and user.get("stellar_secret_key"):
        asyncio.create_task(
            deduct_stellar_credits_bg(
                user["stellar_public_key"],
                user["stellar_secret_key"],
                cost,
                f"vektra_{action}"
            )
        )
        
    return {
        "allowed": True,
        "remaining": new_balance,
        "cost": cost
    }

async def deduct_stellar_credits_bg(public_key: str, secret_key: str, amount: int, memo: str):
    try:
        await stellar_client.deduct_credits(public_key, secret_key, amount, memo)
        logger.info("Successfully deducted %s credits from Stellar wallet %s in background.", amount, public_key)
    except Exception as exc:
        logger.error("Failed to deduct %s credits from Stellar wallet %s in background: %s", amount, public_key, exc)
