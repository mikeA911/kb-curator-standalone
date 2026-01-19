-- ============================================
-- KNOWLEDGE BASE CURATOR MODULE - ENHANCEMENTS
-- Version: 1.1
-- ============================================

-- 1. Create knowledge_bases table
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial KBs
INSERT INTO knowledge_bases (id, name, description) VALUES
('fhir', 'FHIR/EHR Integration', 'Standards, implementation guides, vendor-specific workflows'),
('vbc', 'Value-Based Care (VBC) Playbooks', 'Quality metrics, reporting, care coordination'),
('grants', 'Grant Funding', 'HRSA, FORHP, state programs, application templates'),
('billing', 'Billing & Revenue Cycle', 'CPT coding, claims optimization, reimbursement strategies')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 2. Add assigned_kbs to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assigned_kbs TEXT[] DEFAULT '{}';

-- 3. Update document_chunks review_status
DO $$ 
BEGIN
    ALTER TABLE document_chunks DROP CONSTRAINT IF EXISTS document_chunks_review_status_check;
    ALTER TABLE document_chunks ADD CONSTRAINT document_chunks_review_status_check 
      CHECK (review_status IN ('pending', 'approved', 'rejected', 'filtered', 'enriching', 'draft'));
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not update document_chunks_review_status_check';
END $$;

-- 4. Update documents processing_status
DO $$ 
BEGIN
    ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_processing_status_check;
    ALTER TABLE documents ADD CONSTRAINT documents_processing_status_check 
      CHECK (processing_status IN ('pending', 'processing', 'review', 'submitted', 'completed', 'failed'));
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not update documents_processing_status_check';
END $$;

-- 5. Create curation_queue table
CREATE TABLE IF NOT EXISTS curation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kb_id TEXT REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  added_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(kb_id, url)
);

-- 6. Update documents table for source tracking and duplicates
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Add unique constraint to prevent duplicates within the same KB
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_kb_source_url') THEN
        ALTER TABLE documents ADD CONSTRAINT unique_kb_source_url UNIQUE (doc_type, source_url);
    END IF;
END $$;

-- Add foreign key to knowledge_bases
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_documents_kb') THEN
        ALTER TABLE documents ADD CONSTRAINT fk_documents_kb FOREIGN KEY (doc_type) REFERENCES knowledge_bases(id);
    END IF;
END $$;

-- 7. Seed curation_queue with provided links
INSERT INTO curation_queue (kb_id, title, url) VALUES
-- FHIR
('fhir', 'HL7 FHIR Implementation Guide Registry', 'https://www.fhir.org/guides/registry/'),
('fhir', 'Epic on FHIR Documentation', 'https://fhir.epic.com/Documentation'),
('fhir', 'open.epic Technical Specifications', 'https://open.epic.com/TechnicalSpecifications'),
('fhir', 'HL7 FHIR Implementation Guidance Checklist (CDC)', 'https://www.cdc.gov/nchs/nvss/modernization/pdf/fhir-implimentation-guidance-checklist.pdf'),
('fhir', 'FHIR Implementation Guide Template (NHS Digital)', 'https://simplifier.net/guide/fhirimplementationguidetemplate'),
-- VBC
('vbc', 'Health IT Playbook - Value-Based Care', 'https://www.healthit.gov/playbook/value-based-care/'),
('vbc', 'CMS Quality Reporting and Value-Based Programs', 'https://mmshub.cms.gov/about-quality/quality/programs'),
('vbc', 'CMS Quality Measures Guide', 'https://mmshub.cms.gov/sites/default/files/Guide-Quality-Measures-How-They-Are-Developed-Used-Maintained.pdf'),
('vbc', 'Universal Foundation Quality Measures (NEJM)', 'https://www.nejm.org/doi/full/10.1056/NEJMp2215539'),
('vbc', 'CMS Value-Based Care Basics', 'https://www.cms.gov/priorities/innovation-center/value-based-care-spotlight/basics-value-based-care'),
-- Grants
('grants', 'HRSA Rural Health Grants Overview', 'https://www.hrsa.gov/rural-health/grants'),
('grants', 'Rural Health Grants Eligibility Analyzer', 'https://data.hrsa.gov/tools/rural-health'),
('grants', 'FORHP Definition of Rural', 'https://www.hrsa.gov/rural-health/about-us/what-is-rural'),
('grants', 'Rural Health Care Services Outreach Program FAQ', 'https://www.hrsa.gov/grants/find-funding/HRSA-25-038/faq'),
('grants', 'HRSA State Fact Sheets (FY 2024)', 'https://www.hrsa.gov/rural-health/about-us/state-fact-sheets'),
-- Billing
('billing', 'CMS List of CPT/HCPCS Codes', 'https://www.cms.gov/medicare/regulations-guidance/physician-self-referral/list-cpt-hcpcs-codes'),
('billing', 'Codify by AAPC', 'https://www.aapc.com/codes/'),
('billing', 'Revenue Cycle Management Definitive Guide', 'https://cpamedicalbilling.com/the-definitive-guide-to-revenue-cycle-management/'),
('billing', 'CMS Healthcare Common Procedure Coding System (HCPCS)', 'https://www.cms.gov/medicare/coding-billing/healthcare-common-procedure-system'),
('billing', 'NATA Commonly Used CPT Codes', 'https://www.nata.org/practice-patient-care/revenue-reimbursement/billing-reimbursement/commonly-used-cpt-codes')
ON CONFLICT (kb_id, url) DO NOTHING;

-- 8. RLS Policies for new tables
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE curation_queue ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read KBs
CREATE POLICY "Anyone can view knowledge bases" ON knowledge_bases FOR SELECT TO authenticated USING (true);
-- Only admins can manage KBs
CREATE POLICY "Admins can manage knowledge bases" ON knowledge_bases FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Anyone authenticated can read curation_queue
CREATE POLICY "Anyone can view curation queue" ON curation_queue FOR SELECT TO authenticated USING (true);
-- Only curators/admins can manage curation_queue
CREATE POLICY "Curators/Admins can manage curation queue" ON curation_queue FOR ALL TO authenticated USING (is_curator_or_admin(auth.uid()));
