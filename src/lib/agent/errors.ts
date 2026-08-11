// A 'use server' file may only export async functions -- lives here, not in
// src/app/actions/agents.ts, same reason every other *ValidationError in
// this codebase does (see src/lib/graph/errors.ts).
export class AgentValidationError extends Error {}
