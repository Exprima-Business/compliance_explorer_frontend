import React, { useState, useEffect } from 'react'
import { Box, CssBaseline, ThemeProvider, createTheme, Select, MenuItem, FormControl, InputLabel, alpha, useMediaQuery, Button } from '@mui/material'
import type { SelectChangeEvent } from '@mui/material'
import { ClauseGraph } from './components/ClauseGraph'
import { SearchBar } from './components/SearchBar'
import { ClauseCard } from './components/ClauseCard'
import { FloatingPanel } from './components/FloatingPanel'
import { ComplianceMatrix } from './components/ComplianceMatrix'
import { DocumentScanner } from './components/DocumentScanner'
import type { Clause, ClauseFamily } from './types/clause'
import { searchClauses, getClauseFamilies, getClausesByFamily } from './services/clauseService'
import { ParentClauseDialog } from './components/ParentClauseDialog'
import { Settings } from './components/Settings'
import { AppBar } from './components/AppBar'
import { AuthProvider } from './contexts/AuthContext'
import { ClauseProvider } from './contexts/ClauseContext'
import { useAuth } from './contexts/AuthContext'
import { useClauseContext } from './contexts/ClauseContext'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0f172a', // Deep slate
      light: '#334155',
      dark: '#020617',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#6366f1', // Modern indigo
      light: '#818cf8',
      dark: '#4f46e5',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f1f5f9',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
    },
    divider: 'rgba(148, 163, 184, 0.1)',
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      fontSize: '1.25rem',
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      letterSpacing: '0.01em',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 11,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: alpha('#6366f1', 0.04),
            transform: 'translateY(-1px)',
          },
          '&.Mui-focused': {
            backgroundColor: alpha('#6366f1', 0.08),
          },
        },
        select: {
          '&:focus': {
            backgroundColor: 'transparent',
          },
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            transition: 'all 0.2s ease-in-out',
            '&:hover fieldset': {
              borderColor: '#6366f1',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#6366f1',
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: alpha('#6366f1', 0.08),
          },
          '&.Mui-selected': {
            backgroundColor: alpha('#6366f1', 0.12),
            '&:hover': {
              backgroundColor: alpha('#6366f1', 0.16),
            },
          },
        },
      },
    },
  },
})

function ClauseMap() {
  const { clauses, loading, error } = useClauseContext();
  const { user } = useAuth();

  if (!user) {
    return <div>Please log in to view the clause map</div>;
  }

  if (loading) {
    return <div>Loading clause map...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="clause-map-container">
      <ClauseGraph 
        clauses={clauses}
        onNodeClick={(clause) => {
          console.log('Selected clause:', clause);
          // Handle clause selection
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ClauseProvider>
        <div className="App">
          <header className="App-header">
            <h1>Compliance Explorer</h1>
          </header>
          <main>
            <ClauseMap />
          </main>
        </div>
      </ClauseProvider>
    </AuthProvider>
  );
}

export default App;
