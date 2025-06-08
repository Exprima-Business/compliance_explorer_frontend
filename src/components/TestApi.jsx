import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import environment from '../config/environment';

export function TestApi() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('TestApi component mounted');
    console.log('API URL:', environment.api.url);
  }, []);

  const runTest = async () => {
    setLoading(true);
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
      console.log('✅ Authentication successful');
      console.log('Session token:', session.access_token ? 'Present' : 'Missing');

      // Test 2: Fetch all clauses
      console.log('Testing fetchClauses...');
      const apiUrl = `${environment.api.url}/api/clauses`;
      console.log('Making request to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include'
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ API Response:`, data);
      
      setResults({
        auth: true,
        api: true,
        data
      });
    } catch (error) {
      console.error('❌ Test failed:', error);
      setResults({
        auth: false,
        api: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '20px',
      background: 'white',
      border: '1px solid #ccc',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      zIndex: 1000,
      maxWidth: '400px'
    }}>
      <h3>API Test</h3>
      <div style={{ marginBottom: '10px' }}>
        <small>API URL: {environment.api.url}</small>
      </div>
      <button 
        onClick={runTest}
        disabled={loading}
        style={{
          padding: '8px 16px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Testing...' : 'Run Test'}
      </button>
      
      {results && (
        <div style={{ marginTop: '10px' }}>
          <p>Auth: {results.auth ? '✅' : '❌'}</p>
          <p>API: {results.api ? '✅' : '❌'}</p>
          {results.error && (
            <p style={{ color: 'red' }}>Error: {results.error}</p>
          )}
          {results.data && (
            <pre style={{ 
              maxHeight: '200px', 
              overflow: 'auto',
              background: '#f5f5f5',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              {JSON.stringify(results.data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
} 