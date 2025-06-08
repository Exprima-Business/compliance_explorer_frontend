import { fetchClauses, getClauseFamilies, getClausesByFamily } from '../services/api';
import { supabase } from '../lib/supabase';

export async function testApiConnectivity() {
  const results = {
    auth: false,
    api: {
      clauses: false,
      families: false,
      familyClauses: false
    },
    errors: []
  };

  try {
    // Test 1: Authentication
    console.log('Testing authentication...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) {
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    if (!session) {
      throw new Error('No active session found');
    }
    results.auth = true;
    console.log('✅ Authentication successful');

    // Test 2: Fetch all clauses
    console.log('Testing fetchClauses...');
    try {
      const clauses = await fetchClauses();
      results.api.clauses = true;
      console.log(`✅ Fetched ${clauses.length} clauses`);
    } catch (error) {
      results.errors.push(`fetchClauses failed: ${error.message}`);
      console.error('❌ fetchClauses failed:', error);
    }

    // Test 3: Fetch clause families
    console.log('Testing getClauseFamilies...');
    try {
      const families = await getClauseFamilies();
      results.api.families = true;
      console.log(`✅ Fetched ${families.length} families`);
    } catch (error) {
      results.errors.push(`getClauseFamilies failed: ${error.message}`);
      console.error('❌ getClauseFamilies failed:', error);
    }

    // Test 4: Fetch clauses by family
    console.log('Testing getClausesByFamily...');
    try {
      const familyClauses = await getClausesByFamily('General');
      results.api.familyClauses = true;
      console.log(`✅ Fetched ${familyClauses.length} clauses for family 'General'`);
    } catch (error) {
      results.errors.push(`getClausesByFamily failed: ${error.message}`);
      console.error('❌ getClausesByFamily failed:', error);
    }

  } catch (error) {
    results.errors.push(`Test suite failed: ${error.message}`);
    console.error('❌ Test suite failed:', error);
  }

  // Print summary
  console.log('\n=== API Connectivity Test Results ===');
  console.log(`Authentication: ${results.auth ? '✅' : '❌'}`);
  console.log('API Endpoints:');
  console.log(`- Fetch Clauses: ${results.api.clauses ? '✅' : '❌'}`);
  console.log(`- Fetch Families: ${results.api.families ? '✅' : '❌'}`);
  console.log(`- Fetch Family Clauses: ${results.api.familyClauses ? '✅' : '❌'}`);
  
  if (results.errors.length > 0) {
    console.log('\nErrors encountered:');
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  return results;
} 