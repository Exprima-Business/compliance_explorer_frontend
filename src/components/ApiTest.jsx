import React, { useState } from 'react';
import { testApiConnectivity } from '../utils/apiTest';

export function ApiTest() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const testResults = await testApiConnectivity();
      setResults(testResults);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">API Connectivity Test</h2>
      
      <button
        onClick={runTests}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {loading ? 'Running Tests...' : 'Run API Tests'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {results && (
        <div className="mt-4">
          <h3 className="text-xl font-semibold mb-2">Test Results</h3>
          
          <div className="mb-4">
            <p className="font-semibold">Authentication:</p>
            <p className={results.auth ? 'text-green-600' : 'text-red-600'}>
              {results.auth ? '✅ Successful' : '❌ Failed'}
            </p>
          </div>

          <div className="mb-4">
            <p className="font-semibold">API Endpoints:</p>
            <ul className="list-disc list-inside">
              <li className={results.api.clauses ? 'text-green-600' : 'text-red-600'}>
                Fetch Clauses: {results.api.clauses ? '✅' : '❌'}
              </li>
              <li className={results.api.families ? 'text-green-600' : 'text-red-600'}>
                Fetch Families: {results.api.families ? '✅' : '❌'}
              </li>
              <li className={results.api.familyClauses ? 'text-green-600' : 'text-red-600'}>
                Fetch Family Clauses: {results.api.familyClauses ? '✅' : '❌'}
              </li>
            </ul>
          </div>

          {results.errors.length > 0 && (
            <div className="mt-4">
              <p className="font-semibold text-red-600">Errors Encountered:</p>
              <ul className="list-disc list-inside text-red-600">
                {results.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 