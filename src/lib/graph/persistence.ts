import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, GraphNodeName, GraphStepStatus } from '@/types/database'

export interface RecordGraphStepInput {
  graphRunId: string
  sequenceNumber: number
  nodeName: GraphNodeName
  iteration: number
  inputSnapshot: Record<string, unknown> | null
  outputSnapshot: Record<string, unknown> | null
  transitionTo: string | null
  status: GraphStepStatus
  latencyMs: number
  aiOperationLogId: string | null
  errorCode: string | null
  errorMessage: string | null
}

// One row per executed node -- the actual execution trace (the design
// brief's own framing: "this trace is more important than visual graph
// editing"). Always written, success or failure, via the caller's own
// RLS-scoped client, so a crash mid-run produces an explicit failed step
// rather than a silently missing one.
export async function recordGraphStep(supabase: SupabaseClient<Database>, input: RecordGraphStepInput): Promise<void> {
  const completedAt = new Date()
  const { error } = await supabase.from('graph_steps').insert({
    graph_run_id: input.graphRunId,
    sequence_number: input.sequenceNumber,
    node_name: input.nodeName,
    iteration: input.iteration,
    input_snapshot: input.inputSnapshot,
    output_snapshot: input.outputSnapshot,
    transition_to: input.transitionTo,
    status: input.status,
    latency_ms: input.latencyMs,
    ai_operation_log_id: input.aiOperationLogId,
    error_code: input.errorCode,
    error_message: input.errorMessage,
    started_at: new Date(completedAt.getTime() - input.latencyMs).toISOString(),
    completed_at: completedAt.toISOString(),
  })
  if (error) throw error
}
