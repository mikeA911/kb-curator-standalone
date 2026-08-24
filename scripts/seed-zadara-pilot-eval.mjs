// Stage 3, Item 2: seeds one project-scoped eval dataset for the Zadara
// Knowledge Copilot Pilot (Sandz), so retrieval quality can be measured
// against real project-attached knowledge -- see RetrievalConfig.projectId
// in src/lib/eval/retrieval.ts and the projectLayerPrecisionAtK metric in
// src/lib/eval/scoring.ts. Cases mirror questions actually live-verified
// against this project's Assistant this session; expected_chunk_ids point at
// the real kb_vectors.chunk_id rows discovered by inspecting the project's
// six attached zadara_sandz knowledge_sources (see conversation history --
// no separate discovery script is kept, this file documents the ids used).
//
// Seeds the dataset + cases only. Running it is a separate, deliberate step
// via the deployed Evals UI (/evals/datasets/new -> pick this dataset ->
// /evals/runs/new), matching this app's existing "curator authors, then
// explicitly runs" eval workflow rather than this script executing a run
// itself.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const { data: owner, error: ownerError } = await admin.from('profiles').select('id').eq('email', 'mike.aguilar@gmail.com').single()
if (ownerError || !owner) throw ownerError ?? new Error('mike.aguilar profile not found')

const { data: project, error: projectError } = await admin
  .from('projects')
  .select('id')
  .eq('name', 'Zadara Knowledge Copilot Pilot (Sandz)')
  .single()
if (projectError || !project) throw projectError ?? new Error('Zadara pilot project not found')

const DATASET_NAME = 'Zadara Knowledge Copilot Pilot -- Retrieval Quality'

// No unique constraint on eval_datasets.name, so upsert isn't available --
// idempotent reseed instead: reuse an existing dataset with this name
// (clearing its cases first) rather than accumulating duplicates on rerun.
const { data: existing } = await admin.from('eval_datasets').select('id').eq('name', DATASET_NAME).maybeSingle()

let dataset
if (existing) {
  const { error: deleteCasesError } = await admin.from('eval_cases').delete().eq('dataset_id', existing.id)
  if (deleteCasesError) throw deleteCasesError
  dataset = existing
} else {
  const { data: inserted, error: datasetError } = await admin
    .from('eval_datasets')
    .insert({
      name: DATASET_NAME,
      description:
        "Project-scoped retrieval cases for the Sandz pilot's own attached zadara_sandz knowledge base -- exercises RetrievalConfig.projectId (Stage 3) so runs report projectLayerPrecisionAtK alongside the usual Hit@K/Recall@K/MRR.",
      version: 1,
      status: 'active',
      knowledge_base_id: 'zadara_sandz',
      project_id: project.id,
      created_by: owner.id,
    })
    .select()
    .single()
  if (datasetError || !inserted) throw datasetError ?? new Error('Failed to insert dataset')
  dataset = inserted
}

const CASES = [
  {
    question: 'What storage types and protocols does zStorage support?',
    expected_answer:
      'Block, file, and object storage, over protocols including NFS, CIFS, FC, iSCSI, iSER, S3, and Swift, on-premises, across clouds, or hybrid.',
    expected_concepts: ['block storage', 'file storage', 'object storage', 'iSCSI', 'NFS', 'S3'],
    expected_chunk_ids: ['dd16ddcd-32e3-45ed-b388-8010c63635cd'],
    scoring_criteria: 'Must name all three storage types (block/file/object) and at least two supported protocols.',
    tags: ['zadara', 'zstorage', 'overview'],
    difficulty: 'easy',
  },
  {
    question: 'How does a client authenticate to the VPSA REST API?',
    expected_answer:
      "Via an API token, passed either as the access_key body parameter or the X-Access-Key header. The token is scoped per-VPSA (one tenant's storage array), retrieved from the Users section of the VPSA or the 'Return a user's access key' API.",
    expected_concepts: ['API token', 'access_key', 'X-Access-Key', 'per-VPSA scope'],
    expected_chunk_ids: ['fd704365-bbd7-4b41-96b6-664173bd4bc0'],
    scoring_criteria: 'Must mention the access_key parameter or X-Access-Key header, and that the token is per-VPSA.',
    tags: ['zadara', 'rest-api', 'authentication'],
    difficulty: 'medium',
  },
  {
    question: 'What are the VPSA Object Storage profile tiers and their usable capacity limits?',
    expected_answer:
      'Standard (general-purpose, up to 1 PB, minimum 4 drives), Premium (up to 4 PB, minimum 24 drives, supports erasure coding), and Premium Plus (up to 60 PB, minimum 48 drives, includes ZELB).',
    expected_concepts: ['Standard Profile', 'Premium Profile', 'Premium Plus Profile', '1 PB', '4 PB', '60 PB'],
    expected_chunk_ids: ['1f54e5ec-c60d-4fbf-b822-b191e14ae133'],
    scoring_criteria: 'Must name all three profile tiers with roughly correct capacity ceilings.',
    tags: ['zadara', 'object-storage', 'capacity'],
    difficulty: 'medium',
  },
  {
    question: "What happens to a VPSA's data and billing when it is hibernated?",
    expected_answer:
      "Hibernation deletes the VPSA's Virtual Controllers but preserves data drives and metadata (no data loss), making it inaccessible via GUI/API/iSCSI/NFS/SMB while hibernated. It's billed for drives only, not the engine, and resuming takes a few minutes.",
    expected_concepts: ['no data loss', 'Virtual Controllers deleted', 'billed for drives only', 'inaccessible while hibernated'],
    expected_chunk_ids: ['630ef8d5-6744-4163-a8a6-93732e58096f'],
    scoring_criteria: 'Must state that data is preserved (no data loss) and billing continues for drives only, not the engine.',
    tags: ['zadara', 'vpsa', 'lifecycle'],
    difficulty: 'hard',
  },
  {
    question: "What's the difference between the Command Center Admin Guide and the VPSA Storage Array User Guide?",
    expected_answer:
      "Command Center is the cloud-OPERATOR-level guide, for Zadara's own staff / private-cloud operators managing the whole cloud. The VPSA Storage Array User Guide is the TENANT/CUSTOMER-facing guide, for a VPSA owner administering their own array via the Provisioning Portal.",
    expected_concepts: ['cloud operator', 'tenant/customer', 'Command Center', 'Provisioning Portal'],
    expected_chunk_ids: ['64758fb0-7f14-4b77-a485-7569a6dea8e0', '8f0dc00c-75d1-434e-b293-771932a9bc0c'],
    scoring_criteria: 'Must correctly attribute Command Center to the operator side and the VPSA guide to the tenant/customer side.',
    tags: ['zadara', 'command-center', 'vpsa', 'audience'],
    difficulty: 'hard',
  },
]

for (const c of CASES) {
  const { error } = await admin.from('eval_cases').insert({
    dataset_id: dataset.id,
    question: c.question,
    expected_answer: c.expected_answer,
    expected_concepts: c.expected_concepts,
    expected_article_ids: null,
    expected_chunk_ids: c.expected_chunk_ids,
    scoring_criteria: c.scoring_criteria,
    tags: c.tags,
    difficulty: c.difficulty,
  })
  if (error) throw error
}

console.log(`Seeded dataset ${dataset.id} ("${dataset.name}") with ${CASES.length} cases, scoped to project ${project.id}.`)
