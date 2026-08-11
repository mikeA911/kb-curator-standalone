// Server-side hard ceiling on graph retries -- the design brief's default is
// maxIterations=2, but this is the absolute cap regardless of what a graph
// version or per-run override requests. Never unlimited.
export const MAX_GRAPH_ITERATIONS = 5

// A 'use server' file may only export async functions -- lives here, not in
// src/app/actions/graphs.ts, same reason every other *ValidationError in
// this codebase does (see src/lib/projects/errors.ts).
export class GraphValidationError extends Error {}
