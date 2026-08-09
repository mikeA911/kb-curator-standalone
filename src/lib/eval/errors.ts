// A 'use server' file may only export async functions (Next.js 16 enforces
// this at build time for anything a Client Component imports from one) --
// this class lives here, not in src/app/actions/eval.ts, for the same reason
// WikiValidationError lives in src/lib/wiki/articles.ts rather than
// src/app/actions/wiki.ts.
export class EvalValidationError extends Error {}
