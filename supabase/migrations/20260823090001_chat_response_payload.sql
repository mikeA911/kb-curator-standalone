-- Structured Assistant response envelope, persisted alongside the plain
-- content column so old rows and any future validation failure still
-- render as today. Nullable, no default, no index (nothing filters on it
-- yet) -- purely additive. The existing chat_messages_owner RLS policy
-- already covers the whole row; the one trigger on this table only reads
-- created_at/conversation_id, so no interaction there either.
alter table chat_messages add column response_payload jsonb;
