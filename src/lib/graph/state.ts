import { Annotation } from '@langchain/langgraph'
import type { RetrievedEvidenceItem, EvaluatorDetails, GraphTerminationReason } from '@/types/database'

// Deliberately narrower than the eval pipeline's full FailureClassification
// taxonomy -- the design brief is explicit: "Do not introduce the complete
// future failure taxonomy into control flow unless needed." This is a
// graph-transition concept, not a stored eval_results column.
export type GraphFailureType = 'retrieval_failure' | 'generation_failure' | 'unknown'

export interface RagGraphEvaluation {
  retrieval: { hit: boolean | null; recall: number | null; mrr: number | null } | null
  generation: number | null
  grounding: number | null
  outcome: number | null
  details: EvaluatorDetails | null
}

export interface RagGraphTraceContext {
  graphRunId: string
  projectId?: string
  evalRunId?: string
  evalCaseId?: string
}

// Explicit, typed state -- never Record<string, any> (see the design
// brief's section 7). Every field is "latest value wins": the caller
// (runCaseViaGraph, src/lib/eval/run.ts) always supplies a complete initial
// state at invoke time, and every node returns explicit values for the
// fields it touches, so no field ever needs a reducer or relies on an
// implicit channel default.
export interface RagGraphState {
  originalQuery: string
  currentQuery: string
  retrievedEvidence: RetrievedEvidenceItem[]
  generatedAnswer: string | null
  evaluation: RagGraphEvaluation | null
  failureType: GraphFailureType | null
  iteration: number
  maxIterations: number
  terminationReason: GraphTerminationReason | null
  traceContext: RagGraphTraceContext
}

// Overwrite reducer for every channel -- "return whatever the node returned"
// -- which is the only semantics this state needs (no field ever
// accumulates across nodes/iterations).
function overwrite<T>() {
  return { reducer: (_left: T, right: T) => right }
}

export const RagGraphAnnotation = Annotation.Root({
  originalQuery: Annotation<string>(overwrite<string>()),
  currentQuery: Annotation<string>(overwrite<string>()),
  retrievedEvidence: Annotation<RetrievedEvidenceItem[]>(overwrite<RetrievedEvidenceItem[]>()),
  generatedAnswer: Annotation<string | null>(overwrite<string | null>()),
  evaluation: Annotation<RagGraphEvaluation | null>(overwrite<RagGraphEvaluation | null>()),
  failureType: Annotation<GraphFailureType | null>(overwrite<GraphFailureType | null>()),
  iteration: Annotation<number>(overwrite<number>()),
  maxIterations: Annotation<number>(overwrite<number>()),
  terminationReason: Annotation<GraphTerminationReason | null>(overwrite<GraphTerminationReason | null>()),
  traceContext: Annotation<RagGraphTraceContext>(overwrite<RagGraphTraceContext>()),
})
