import 'server-only'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import { getArticleBySlug } from '@/lib/wiki/queries'
import { getAssessmentById } from '@/lib/projects/assessments'
import type { NavigationTargetKind } from './response-envelope'

export interface ResolvedNavigationTarget {
  label: string
  route: string
}

// Resolves a model-proposed {kind, id} into a real, authorized route. The
// model never supplies a URL -- only a target kind and a stable record id;
// this is the only place that turns that into something clickable. Every
// branch reuses an existing lookup exactly as already used elsewhere in the
// app (RLS via ctx.supabase is the access check -- no new authorization
// layer). Returns null for anything missing, inaccessible, or malformed --
// never throws, and never partially reveals a title/id for a target the
// caller can't see.
export async function resolveNavigationTarget(
  ctx: WorkbenchCallerContext,
  target: { kind: NavigationTargetKind; id: string }
): Promise<ResolvedNavigationTarget | null> {
  try {
    switch (target.kind) {
      case 'wiki_article': {
        const article = await getArticleBySlug(ctx.supabase, target.id)
        if (!article) return null
        return { label: article.title, route: `/wiki/${article.slug}` }
      }
      case 'project': {
        const { data: project } = await ctx.supabase.from('projects').select('id, name').eq('id', target.id).maybeSingle()
        if (!project) return null
        return { label: project.name, route: `/projects/${project.id}` }
      }
      case 'workstream': {
        const { data: workstream } = await ctx.supabase
          .from('project_workstreams')
          .select('id, project_id, name')
          .eq('id', target.id)
          .maybeSingle()
        if (!workstream) return null
        return { label: workstream.name, route: `/projects/${workstream.project_id}/workstreams/${workstream.id}` }
      }
      case 'assessment': {
        const assessment = await getAssessmentById(ctx.supabase, target.id)
        if (!assessment) return null
        return { label: assessment.name, route: `/projects/${assessment.project_id}/assessments/${assessment.id}` }
      }
    }
  } catch {
    // A query error (malformed id, transient failure) is treated the same
    // as "not found" -- an unresolvable target is omitted, not a turn
    // failure.
    return null
  }
}
