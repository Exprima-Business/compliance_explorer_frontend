-- Add anonymous access policies
CREATE POLICY "Enable read access for anonymous users" ON families
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Enable read access for anonymous users" ON clauses
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Enable read access for anonymous users" ON clause_relationships
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Enable read access for anonymous users" ON ai_analysis
    FOR SELECT
    TO anon
    USING (true); 