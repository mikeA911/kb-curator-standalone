// A 'use server' file may only export async functions (Next.js 16 enforces
// this at build time for anything a Client Component imports from one) --
// this class lives here, not in src/app/actions/projects.ts, for the same
// reason EvalValidationError lives in src/lib/eval/errors.ts.
export class ProjectValidationError extends Error {}
