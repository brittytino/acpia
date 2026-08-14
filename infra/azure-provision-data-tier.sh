#!/usr/bin/env bash
# Provisions the data tier (Postgres + Ollama) that the three App Services
# depend on but that App Service itself can't host: Postgres needs to be a
# real managed database, and Ollama needs persistent disk + more RAM than
# App Service's free/basic tiers give you.
#
# Run this from Azure Cloud Shell (shell.azure.com) — it's a browser-based
# shell that runs `az` directly against your subscription. No SSH, no
# local Azure CLI install required.
#
# Network design, and why: Postgres uses public access restricted to
# "allow Azure services" (Azure's documented, supported pattern for
# App Service → Flexible Server — no VNet plumbing needed). Ollama has NO
# authentication of its own, so it goes in a private subnet with no public
# IP; the backend App Service reaches it by VNet-integrating into a
# second, separate subnet (regional VNet Integration is outbound-only and
# needs its own empty delegated subnet — it cannot share one with the
# Container Instance's delegation).
#
# Review every value in the CONFIG block before running. Names must be
# globally unique where Azure requires it (Postgres server name, storage
# account name); adjust region/SKU to what your subscription/quota allows.
set -euo pipefail

# ── CONFIG — edit these ─────────────────────────────────────────────────
RESOURCE_GROUP="acpia-prod-rg"
LOCATION="centralindia"
PG_SERVER_NAME="acpia-pg-$RANDOM"          # must be globally unique
PG_ADMIN_USER="acpiaadmin"
PG_ADMIN_PASSWORD="CHANGE-ME-$(openssl rand -base64 18 | tr -d '=+/')"
PG_DB_NAME="acpia"
PG_SKU="Standard_B2s"                       # burstable, 2 vCPU/4GB — bump if needed
VNET_NAME="acpia-vnet"
ACI_SUBNET="acpia-aci-subnet"               # delegated to Container Instances
APPSVC_SUBNET="acpia-appsvc-subnet"         # delegated to Web App VNet Integration
STORAGE_ACCOUNT="acpiaollamastore$RANDOM"   # must be globally unique, lowercase, <=24 chars
FILE_SHARE="ollama-models"
OLLAMA_CONTAINER_NAME="acpia-ollama"
BACKEND_APP_NAME=""                         # fill in once the backend App Service exists
# ─────────────────────────────────────────────────────────────────────────

echo "== Resource group =="
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

echo "== Virtual network with two separate delegated subnets =="
az network vnet create \
  --resource-group "$RESOURCE_GROUP" --name "$VNET_NAME" \
  --address-prefix 10.10.0.0/16 \
  --subnet-name "$ACI_SUBNET" --subnet-prefix 10.10.1.0/24

az network vnet subnet update \
  --resource-group "$RESOURCE_GROUP" --vnet-name "$VNET_NAME" --name "$ACI_SUBNET" \
  --delegations Microsoft.ContainerInstance/containerGroups

az network vnet subnet create \
  --resource-group "$RESOURCE_GROUP" --vnet-name "$VNET_NAME" --name "$APPSVC_SUBNET" \
  --address-prefix 10.10.2.0/24 \
  --delegations Microsoft.Web/serverFarms

echo "== Postgres Flexible Server (managed — replaces the postgres container) =="
echo "   Public access restricted to 'AllowAllAzureServicesAndResourcesWithinAzureIps' (0.0.0.0)."
az postgres flexible-server create \
  --resource-group "$RESOURCE_GROUP" --name "$PG_SERVER_NAME" \
  --location "$LOCATION" \
  --admin-user "$PG_ADMIN_USER" --admin-password "$PG_ADMIN_PASSWORD" \
  --sku-name "$PG_SKU" --tier Burstable \
  --storage-size 32 --version 16 \
  --public-access 0.0.0.0

echo "== Allow the pgvector extension, then create it in the database =="
az postgres flexible-server parameter set \
  --resource-group "$RESOURCE_GROUP" --server-name "$PG_SERVER_NAME" \
  --name azure.extensions --value VECTOR

az postgres flexible-server db create \
  --resource-group "$RESOURCE_GROUP" --server-name "$PG_SERVER_NAME" --database-name "$PG_DB_NAME"

az postgres flexible-server execute \
  --name "$PG_SERVER_NAME" --admin-user "$PG_ADMIN_USER" --admin-password "$PG_ADMIN_PASSWORD" \
  --database-name "$PG_DB_NAME" \
  --querytext "CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pgcrypto;"

echo "== Storage account + file share, so Ollama's pulled models survive restarts =="
az storage account create \
  --resource-group "$RESOURCE_GROUP" --name "$STORAGE_ACCOUNT" \
  --location "$LOCATION" --sku Standard_LRS

STORAGE_KEY=$(az storage account keys list --resource-group "$RESOURCE_GROUP" \
  --account-name "$STORAGE_ACCOUNT" --query "[0].value" -o tsv)

az storage share create --account-name "$STORAGE_ACCOUNT" --account-key "$STORAGE_KEY" \
  --name "$FILE_SHARE" --quota 20

echo "== Ollama as a Container Instance — private subnet, no public IP, no auth exposed =="
az container create \
  --resource-group "$RESOURCE_GROUP" --name "$OLLAMA_CONTAINER_NAME" \
  --image ollama/ollama:latest \
  --cpu 4 --memory 8 \
  --vnet "$VNET_NAME" --subnet "$ACI_SUBNET" \
  --ports 11434 \
  --azure-file-volume-account-name "$STORAGE_ACCOUNT" \
  --azure-file-volume-account-key "$STORAGE_KEY" \
  --azure-file-volume-share-name "$FILE_SHARE" \
  --azure-file-volume-mount-path /root/.ollama

OLLAMA_IP=$(az container show --resource-group "$RESOURCE_GROUP" --name "$OLLAMA_CONTAINER_NAME" \
  --query "ipAddress.ip" -o tsv)

if [ -n "$BACKEND_APP_NAME" ]; then
  echo "== VNet-integrating the backend App Service so it can reach Ollama privately =="
  az webapp vnet-integration add \
    --resource-group "$RESOURCE_GROUP" --name "$BACKEND_APP_NAME" \
    --vnet "$VNET_NAME" --subnet "$APPSVC_SUBNET"
else
  echo "!! BACKEND_APP_NAME not set — skipped VNet integration. Once the backend"
  echo "   App Service exists, run:"
  echo "   az webapp vnet-integration add --resource-group $RESOURCE_GROUP \\"
  echo "     --name <backend-app-name> --vnet $VNET_NAME --subnet $APPSVC_SUBNET"
fi

echo ""
echo "== Done. Save these — the password is not retrievable later ========"
echo "Postgres host:      ${PG_SERVER_NAME}.postgres.database.azure.com"
echo "Postgres admin:     ${PG_ADMIN_USER}"
echo "Postgres password:  ${PG_ADMIN_PASSWORD}"
echo "Postgres database:  ${PG_DB_NAME}"
echo ""
echo "DATABASE_URL       = postgresql+asyncpg://${PG_ADMIN_USER}:${PG_ADMIN_PASSWORD}@${PG_SERVER_NAME}.postgres.database.azure.com:5432/${PG_DB_NAME}"
echo "DATABASE_URL_SYNC  = postgresql://${PG_ADMIN_USER}:${PG_ADMIN_PASSWORD}@${PG_SERVER_NAME}.postgres.database.azure.com:5432/${PG_DB_NAME}?sslmode=require"
echo "DB_SSL_REQUIRE     = true   (also set this App Setting — asyncpg needs SSL passed"
echo "                     via connect_args, not a URL query string; see database.py)"
echo ""
echo "Ollama private IP: $OLLAMA_IP  (only reachable from inside $VNET_NAME)"
echo "OLLAMA_BASE_URL    = http://${OLLAMA_IP}:11434"
echo ""
echo "Note: DATABASE_URL_APP (the least-privilege runtime role) is still"
echo "provisioned automatically by the app itself on first startup, same as"
echo "local dev — it connects through DATABASE_URL above using the admin"
echo "credentials once, to create the veritas_app role, then never uses"
echo "the admin credentials again."
echo "======================================================================"
