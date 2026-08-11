'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, requireRole, AuthError } from '@/lib/auth'
import { AgentValidationError } from '@/lib/agent/errors'
import { createAgentFromTemplate, type CreateAgentFromTemplateInput } from '@/lib/agent/create'
import { answerQuestion, type AnswerQuestionInput } from '@/lib/agent/rag-answer-agent'
import type { GraphStep } from '@/types/database'

// Real enforcement is RLS (agents_manage_staff for platform-global agents,
// agents_manage_project_owner for project-scoped ones -- see
// 20260811100003_agent_framework.sql). requireUser + the anonymous check
// here are the same defense-in-depth convention as
// activateGraphVersionAction (src/app/actions/graphs.ts); an unauthorized
// update simply matches zero rows under RLS rather than erroring, so
// that's checked explicitly for a clear message.
export async function activateAgentVersionAction(agentId: string, versionId: string) {
  const { profile, supabase } = await requireUser()
  if (profile.role === 'anonymous') throw new AuthError('Create an account to manage agents')

  const { data, error } = await supabase.from('agents').update({ active_version_id: versionId }).eq('id', agentId).select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new AgentValidationError('You do not have permission to activate a version on this agent')
  }

  revalidatePath('/agents')
}

export type { CreateAgentFromTemplateInput }

// Real enforcement is RLS (agents_manage_staff / agents_manage_project_owner)
// -- same shape as activateAgentVersionAction above. createAgentFromTemplate
// itself surfaces a clear AgentValidationError if the final activation
// UPDATE matches zero rows.
export async function createAgentFromTemplateAction(input: Omit<CreateAgentFromTemplateInput, 'createdBy'>) {
  const { user, profile, supabase } = await requireUser()
  if (profile.role === 'anonymous') throw new AuthError('Create an account to create agents')

  const result = await createAgentFromTemplate(supabase, { ...input, createdBy: user.id })
  revalidatePath('/agents')
  return result
}

// Anyone consultant+ (i.e. not anonymous) may ask the RAG Answer Agent a
// question -- see docs/CURRENT-ARCHITECTURE.md's Agent Framework section
// for why anonymous/public execution is deliberately excluded in this
// milestone. The trace-step fetch here is a UI convenience layered on top
// of answerQuestion (which stays focused on the graph invocation itself) --
// mirrors the same graph_steps shape the eval result trace panel renders.
export async function askRagAnswerAgentAction(
  input: Omit<AnswerQuestionInput, 'requestedBy'>
): Promise<Awaited<ReturnType<typeof answerQuestion>> & { steps: GraphStep[] }> {
  const { user, supabase } = await requireRole('consultant')
  const result = await answerQuestion(supabase, { ...input, requestedBy: user.id })
  const { data: steps } = await supabase
    .from('graph_steps')
    .select('*')
    .eq('graph_run_id', result.graphRunId)
    .order('sequence_number', { ascending: true })
  return { ...result, steps: steps ?? [] }
}
