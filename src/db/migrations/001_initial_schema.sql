-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types for better data integrity
CREATE TYPE risk_classification AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE relationship_type AS ENUM ('PARENT', 'SIBLING');
CREATE TYPE analysis_type AS ENUM ('COMPLIANCE', 'RISK', 'IMPACT');

-- Create families table
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    CONSTRAINT families_name_length CHECK (char_length(name) >= 2)
);

-- Create clauses table
CREATE TABLE clauses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    intent TEXT,
    status VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE RESTRICT,
    conditions TEXT,
    implementation_guidance TEXT,
    assessment_method TEXT,
    risk_classification risk_classification NOT NULL,
    reference_url TEXT,
    embedding_vector vector(1536),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    CONSTRAINT clauses_title_length CHECK (char_length(title) >= 3),
    CONSTRAINT clauses_description_length CHECK (char_length(description) >= 10),
    CONSTRAINT valid_reference_url CHECK (reference_url ~ '^https?://[^\s/$.?#].[^\s]*$')
);

-- Create clause relationships table
CREATE TABLE clause_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clause_id UUID NOT NULL REFERENCES clauses(id) ON DELETE CASCADE,
    related_clause_id UUID NOT NULL REFERENCES clauses(id) ON DELETE CASCADE,
    relationship_type relationship_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    CONSTRAINT unique_relationship UNIQUE (clause_id, related_clause_id, relationship_type),
    CONSTRAINT no_self_relationship CHECK (clause_id != related_clause_id)
);

-- Create AI analysis table
CREATE TABLE ai_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clause_id UUID NOT NULL REFERENCES clauses(id) ON DELETE CASCADE,
    analysis_type analysis_type NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    CONSTRAINT valid_content CHECK (jsonb_typeof(content) = 'object')
);

-- Create audit log table for tracking changes
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(10) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    performed_by UUID,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_action CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- Create indexes for performance
CREATE INDEX idx_clauses_family_id ON clauses(family_id);
CREATE INDEX idx_clauses_risk_classification ON clauses(risk_classification);
CREATE INDEX idx_clause_relationships_clause_id ON clause_relationships(clause_id);
CREATE INDEX idx_clause_relationships_related_clause_id ON clause_relationships(related_clause_id);
CREATE INDEX idx_ai_analysis_clause_id ON ai_analysis(clause_id);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_families_updated_at
    BEFORE UPDATE ON families
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clauses_updated_at
    BEFORE UPDATE ON clauses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clause_relationships_updated_at
    BEFORE UPDATE ON clause_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_analysis_updated_at
    BEFORE UPDATE ON ai_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function for audit logging
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), NULL);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', NULL, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create audit triggers
CREATE TRIGGER audit_families
    AFTER INSERT OR UPDATE OR DELETE ON families
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_clauses
    AFTER INSERT OR UPDATE OR DELETE ON clauses
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_clause_relationships
    AFTER INSERT OR UPDATE OR DELETE ON clause_relationships
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_ai_analysis
    AFTER INSERT OR UPDATE OR DELETE ON ai_analysis
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger();

-- Create RLS policies
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clause_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON families
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable read access for authenticated users" ON clauses
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable read access for authenticated users" ON clause_relationships
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable read access for authenticated users" ON ai_analysis
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policies for service role (admin access)
CREATE POLICY "Enable all access for service role" ON families
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all access for service role" ON clauses
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all access for service role" ON clause_relationships
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all access for service role" ON ai_analysis
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create policy for audit logs (read-only for authenticated users)
CREATE POLICY "Enable read access for authenticated users" ON audit_logs
    FOR SELECT
    TO authenticated
    USING (true); 