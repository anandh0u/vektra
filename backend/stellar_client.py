import os
import uuid
import logging
import httpx
from stellar_sdk import (
    Server, Keypair, TransactionBuilder,
    Network, Asset
)

logger = logging.getLogger("vektra.stellar")

# Load environment variables
TREASURY_SECRET = os.getenv("STELLAR_TREASURY_SECRET") or "SDUVEPUP5G3D53VMB66G6222Z64VMLM5RNDS6E3QW2HQWTFLX4PLHVEK"  # fallback mock testnet secret
NETWORK = Network.TESTNET_NETWORK_PASSPHRASE
HORIZON_URL = "https://horizon-testnet.stellar.org"

server = Server(HORIZON_URL)

try:
    treasury_keypair = Keypair.from_secret(TREASURY_SECRET)
except Exception:
    # Generate a random fallback keypair if the secret is malformed or invalid
    logger.warning("Stellar treasury secret is not configured or invalid. Using random fallback keypair for testing.")
    treasury_keypair = Keypair.random()

NFT_ASSETS = {
    "free":  Asset("VEKTRAFREE", treasury_keypair.public_key),
    "pro":   Asset("VEKTRAPRO",  treasury_keypair.public_key),
    "team":  Asset("VEKTRATEAM", treasury_keypair.public_key)
}

CREDIT_ASSET = Asset(
    "VEKTRACRED", treasury_keypair.public_key
)

async def create_user_wallet() -> dict:
    """
    Generate a new Stellar keypair for a new user.
    Fund it from Friendbot (testnet only).
    Returns { public_key, secret_key }
    """
    keypair = Keypair.random()
    public_key = keypair.public_key
    secret_key = keypair.secret
    
    # Fund with Friendbot on testnet
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.get(f"https://friendbot.stellar.org/?addr={public_key}")
            res.raise_for_status()
    except Exception as exc:
        logger.error("Friendbot funding failed for public key %s: %s", public_key, exc)
    
    return {
        "public_key": public_key,
        "secret_key": secret_key
    }

async def setup_user_trustlines(user_public_key: str, user_secret_key: str):
    """
    User wallet must trust VEKTRA assets before receiving them.
    """
    try:
        user_keypair = Keypair.from_secret(user_secret_key)
        user_account = server.load_account(user_public_key)
        
        builder = TransactionBuilder(
            source_account=user_account,
            network_passphrase=NETWORK,
            base_fee=100
        )
        
        for asset in [
            NFT_ASSETS["free"],
            NFT_ASSETS["pro"],
            NFT_ASSETS["team"],
            CREDIT_ASSET
        ]:
            builder.append_change_trust_op(asset=asset)
        
        transaction = builder.set_timeout(30).build()
        transaction.sign(user_keypair)
        server.submit_transaction(transaction)
        logger.info("Successfully established trustlines for user %s", user_public_key)
    except Exception as exc:
        logger.error("Failed to setup trustlines for user %s: %s", user_public_key, exc)

async def mint_tier_nft(user_public_key: str, tier: str) -> str:
    """
    Mint a tier NFT to user's wallet.
    Returns transaction hash.
    """
    if tier not in NFT_ASSETS:
        tier = "free"
    asset = NFT_ASSETS[tier]
    
    try:
        treasury_account = server.load_account(treasury_keypair.public_key)
        transaction = (
            TransactionBuilder(
                source_account=treasury_account,
                network_passphrase=NETWORK,
                base_fee=100
            )
            .append_payment_op(
                destination=user_public_key,
                asset=asset,
                amount="1"
            )
            .append_manage_data_op(
                data_name=f"vektra_tier_{tier}",
                data_value=tier.encode(),
                source=treasury_keypair.public_key
            )
            .set_timeout(30)
            .build()
        )
        transaction.sign(treasury_keypair)
        response = server.submit_transaction(transaction)
        return response["hash"]
    except Exception as exc:
        logger.error("Failed to mint tier NFT %s for user %s: %s", tier, user_public_key, exc)
        return ""

async def issue_credits(user_public_key: str, amount: int) -> str:
    """
    Send VEKTRA_CRED tokens to user wallet.
    Returns transaction hash.
    """
    try:
        treasury_account = server.load_account(treasury_keypair.public_key)
        transaction = (
            TransactionBuilder(
                source_account=treasury_account,
                network_passphrase=NETWORK,
                base_fee=100
            )
            .append_payment_op(
                destination=user_public_key,
                asset=CREDIT_ASSET,
                amount=str(amount)
            )
            .set_timeout(30)
            .build()
        )
        transaction.sign(treasury_keypair)
        response = server.submit_transaction(transaction)
        return response["hash"]
    except Exception as exc:
        logger.error("Failed to issue %s credits to user %s: %s", amount, user_public_key, exc)
        return ""

async def get_wallet_balance(public_key: str) -> dict:
    """
    Fetch user's current balances from Stellar.
    Returns { credits, nft_tier, xlm, public_key }
    """
    try:
        account = server.accounts().account_id(public_key).call()
        
        nft_tier = "free"
        credits = 0
        xlm = 0
        
        for b in account.get("balances", []):
            asset_code = b.get("asset_code", "")
            balance = float(b.get("balance", 0))
            
            if asset_code == "VEKTRACRED":
                credits = int(balance)
            elif asset_code == "VEKTRAPRO" and balance >= 1:
                nft_tier = "pro"
            elif asset_code == "VEKTRATEAM" and balance >= 1:
                nft_tier = "team"
            elif b.get("asset_type") == "native":
                xlm = balance
        
        return {
            "credits": credits,
            "nft_tier": nft_tier,
            "xlm": xlm,
            "public_key": public_key
        }
    except Exception as exc:
        logger.warning("Failed to fetch Stellar wallet balance for %s: %s", public_key, exc)
        return {
            "credits": 0,
            "nft_tier": "free",
            "xlm": 0,
            "public_key": public_key
        }

async def deduct_credits(user_public_key: str, user_secret_key: str, amount: int, memo: str) -> str:
    """
    User sends credits back to treasury (spend).
    Returns transaction hash.
    """
    try:
        user_keypair = Keypair.from_secret(user_secret_key)
        user_account = server.load_account(user_public_key)
        
        transaction = (
            TransactionBuilder(
                source_account=user_account,
                network_passphrase=NETWORK,
                base_fee=100
            )
            .append_payment_op(
                destination=treasury_keypair.public_key,
                asset=CREDIT_ASSET,
                amount=str(amount)
            )
            .add_text_memo(memo[:28])  # Stellar memo has 28 byte limit
            .set_timeout(30)
            .build()
        )
        transaction.sign(user_keypair)
        response = server.submit_transaction(transaction)
        return response["hash"]
    except Exception as exc:
        logger.error("Failed to deduct %s credits from user %s: %s", amount, user_public_key, exc)
        return ""
