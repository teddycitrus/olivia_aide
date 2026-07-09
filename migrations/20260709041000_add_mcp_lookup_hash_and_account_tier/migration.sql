-- Deterministic argon2id lookup hash for request-time auth. Nullable because
-- already-issued per-user keys cannot be backfilled without plaintext; those
-- old rows fail closed and should be reissued from the dashboard.
ALTER TABLE "McpApiKey" ADD COLUMN "keyLookupHash" TEXT;
ALTER TABLE "McpApiKey" ADD COLUMN "keyFingerprint" TEXT;
CREATE UNIQUE INDEX "McpApiKey_keyLookupHash_key" ON "McpApiKey"("keyLookupHash");
ALTER TABLE "McpApiKey" DROP COLUMN "keyPrefix";

-- MCP quotas are per account, not per key. Existing accounts stay DEFAULT
-- unless an operator explicitly promotes them.
ALTER TABLE "User" ADD COLUMN "mcpTier" "McpApiKeyTier" NOT NULL DEFAULT 'DEFAULT';
