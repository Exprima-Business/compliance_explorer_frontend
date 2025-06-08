import React from 'react';
import { TestApi } from './components/TestApi';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user } = useAuth();

  return (
    <div className="App">
      {/* Your existing app content */}
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Compliance Explorer</h1>
        {user ? (
          <div>
            <p>Welcome, {user.email}</p>
            {/* Your main app content */}
          </div>
        ) : (
          <div>
            <p>Please log in to continue</p>
            {/* Your login form */}
          </div>
        )}
      </div>
      
      {/* Development-only test component */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
          <TestApi />
        </div>
      )}
    </div>
  );
}

export default App; 