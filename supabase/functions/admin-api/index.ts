import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    // Check if admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Admin privileges required')
    }

    // Admin client with service role
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { type, ...payload } = await req.json()

    if (type === 'list-profiles') {
      const { data, error } = await adminClient
        .from('profiles')
        .select('*')
        .order('email')
      if (error) throw error
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (type === 'update-role') {
      const { userId, role } = payload
      const { error } = await adminClient
        .from('profiles')
        .update({ role })
        .eq('id', userId)
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (type === 'assign-kbs') {
      const { userId, kbIds } = payload
      const { error } = await adminClient
        .from('profiles')
        .update({ assigned_kbs: kbIds })
        .eq('id', userId)
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (type === 'create-kb') {
      const { kb } = payload
      const { data, error } = await adminClient
        .from('knowledge_bases')
        .insert(kb)
        .select()
        .single()
      if (error) throw error
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (type === 'delete-kb') {
      const { id } = payload
      const { error } = await adminClient
        .from('knowledge_bases')
        .delete()
        .eq('id', id)
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (type === 'approve-document') {
      const { documentId } = payload
      
      // Update document status to completed
      const { error: docError } = await adminClient
        .from('documents')
        .update({ processing_status: 'completed' })
        .eq('id', documentId)

      if (docError) throw docError

      // Update curation queue status if this document was from the queue
      const { data: doc } = await adminClient
        .from('documents')
        .select('source_url, doc_type')
        .eq('id', documentId)
        .single()

      if (doc?.source_url) {
        await adminClient
          .from('curation_queue')
          .update({ status: 'completed' })
          .eq('url', doc.source_url)
          .eq('kb_id', doc.doc_type)
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error('Invalid request type')
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
