-- Mirrors the existing error_code column already on graph_runs/graph_steps
-- -- not a new convention. Lets a provider failure's already-computed
-- classification (rate_limit / quota_exceeded / model_unavailable /
-- authentication / invalid_request / unknown -- see classifyProviderError in
-- src/lib/ai/provider.ts) be queried directly instead of only living inside
-- the free-text error_message string.
alter table ai_operation_logs add column error_code text;
