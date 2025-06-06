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

export default function App() {
  const [selectedFamily, setSelectedFamily] = useState<string>('')
  const [families, setFamilies] = useState<ClauseFamily[]>([])
  const [clauses, setClauses] = useState<Clause[]>([])
  const [activeTab, setActiveTab] = useState<number>(0)
  const [selectedClause, setSelectedClause] = useState<Clause | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [bookmarkedClauses, setBookmarkedClauses] = useState<Clause[]>([])
  const [loading, setLoading] = useState(false)
  const [parentClauseDialogOpen, setParentClauseDialogOpen] = useState(false)
  const [pendingUnbookmark, setPendingUnbookmark] = useState<{
    clause: Clause;
    parentClause: Clause;
  } | null>(null)
  const [preferences, setPreferences] = useState(() => {
    const savedPreferences = localStorage.getItem('bookmarkPreferences')
    return savedPreferences ? JSON.parse(savedPreferences) : {
      removeParentWithChild: null
    }
  })
  const [showComplianceMatrix, setShowComplianceMatrix] = useState(false)

  useEffect(() => {
    const loadFamilies = async () => {
      try {
        const familyList = await getClauseFamilies()
        setFamilies(familyList)
      } catch (error) {
        console.error('Error loading families:', error)
      }
    }
    loadFamilies()
  }, [])

  useEffect(() => {
    const loadClauses = async () => {
      setLoading(true);
      try {
        let results;
        if (selectedFamily) {
          console.log('Loading clauses for family:', selectedFamily);
          results = await getClausesByFamily(selectedFamily);
        } else {
          console.log('Loading clauses with search query:', searchQuery);
          results = await searchClauses(searchQuery);
        }
        console.log('Loaded clauses:', results?.length || 0, 'clauses');
        if (results?.length > 0) {
          console.log('Sample clause:', JSON.stringify(results[0], null, 2));
        }
        setClauses(results);
      } catch (error) {
        console.error('Error loading clauses:', error);
      } finally {
        setLoading(false);
      }
    };
    loadClauses();
  }, [searchQuery, selectedFamily]);

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setSelectedFamily('')
  }

  const handleFamilyChange = (event: SelectChangeEvent<string>) => {
    setSelectedFamily(event.target.value)
    setSearchQuery('')
  }

  const handleNodeClick = (clause: Clause) => {
    setSelectedClause(clause)
  }

  const handleClosePanel = () => {
    setSelectedClause(null)
  }

  const findParentClause = (clause: Clause): Clause | null => {
    if (!clause.parentClause) return null;
    return clauses.find(c => c.id === clause.parentClause) || null;
  };

  const handlePreferenceChange = (key: string, value: boolean | null) => {
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)
    localStorage.setItem('bookmarkPreferences', JSON.stringify(newPreferences))
  }

  const handleBookmarkToggle = (clause: Clause) => {
    setBookmarkedClauses(prev => {
      const isBookmarked = prev.some(c => c.id === clause.id);
      
      if (isBookmarked) {
        // When unbookmarking, we need to handle both child and parent clauses
        const parentClause = findParentClause(clause);
        
        if (parentClause && prev.some(c => c.id === parentClause.id)) {
          // If there's a parent clause and it's bookmarked
          if (preferences.removeParentWithChild === null) {
            // If no preference is set, show the dialog
            setPendingUnbookmark({ clause, parentClause });
            setParentClauseDialogOpen(true);
            return prev; // Don't change bookmarks yet
          } else if (preferences.removeParentWithChild) {
            // If preference is to remove parent, remove both
            return prev.filter(c => c.id !== clause.id && c.id !== parentClause.id);
          }
          // If preference is to keep parent, only remove child
          return prev.filter(c => c.id !== clause.id);
        }
        
        // If no parent clause or parent not bookmarked, just remove the clause
        return prev.filter(c => c.id !== clause.id);
      } else {
        // When bookmarking, add the clause
        return [...prev, clause];
      }
    });
  };

  const handleParentClauseDialogConfirm = (removeParent: boolean, rememberChoice: boolean) => {
    if (pendingUnbookmark) {
      setBookmarkedClauses(prev => {
        if (removeParent) {
          return prev.filter(c => c.id !== pendingUnbookmark.clause.id && c.id !== pendingUnbookmark.parentClause.id);
        } else {
          return prev.filter(c => c.id !== pendingUnbookmark.clause.id);
        }
      });
    }

    if (rememberChoice) {
      handlePreferenceChange('removeParentWithChild', removeParent);
    }

    setParentClauseDialogOpen(false);
    setPendingUnbookmark(null);
  };

  const isClauseBookmarked = (clause: Clause) => {
    return bookmarkedClauses.some(c => c.id === clause.id);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setSelectedClause(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        width: '100vw',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}>
        <AppBar 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onSettingsClick={() => setShowSettings(true)}
        />
        <Box sx={{ 
          display: 'flex', 
          flex: 1,
          width: '100%',
          mt: { xs: '64px', sm: '72px' },
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 3 },
          gap: 3,
          overflow: 'hidden',
          minHeight: 0,
          pt: '1%',
          height: 'calc(100vh - 72px)'
        }}>
          {/* Left Sidebar */}
          <Box sx={{ 
            width: { xs: '100%', sm: 320 },
            display: { xs: activeTab === 0 ? 'flex' : 'none', sm: 'flex' },
            flexDirection: 'column',
            gap: 2,
            bgcolor: 'background.paper',
            height: 'calc(100% - 1%)',
            borderRadius: 2.8,
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            overflow: 'hidden',
            flexShrink: 0,
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            },
            mt: '1%' // Match the top margin of the node map
          }}>
            <Box sx={{ 
              p: 2, 
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}>
              <SearchBar onSearch={handleSearch} />
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Filter by Family</InputLabel>
                <Select
                  value={selectedFamily}
                  label="Filter by Family"
                  onChange={handleFamilyChange}
                >
                  <MenuItem value="">All Families</MenuItem>
                  {families.map((family) => (
                    <MenuItem key={family.name} value={family.name}>
                      {family.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ 
              flex: 1, 
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              p: 1.5,
              bgcolor: 'background.paper'
            }}>
              {bookmarkedClauses.map((clause) => (
                <ClauseCard
                  key={clause.id}
                  clause={clause}
                  isBookmarked={true}
                  onBookmarkToggle={() => handleBookmarkToggle(clause)}
                  compact={true}
                  sx={{
                    '& .MuiCardContent-root': {
                      p: 0
                    },
                    '& .MuiPaper-root': {
                      p: 1.5,
                      mb: 1.5
                    },
                    '& .MuiTypography-h5': {
                      fontSize: '0.9rem',
                      mb: 0.5
                    },
                    '& .MuiTypography-h6': {
                      fontSize: '0.85rem',
                      lineHeight: 1.3
                    },
                    '& .MuiTypography-body2': {
                      fontSize: '0.8rem',
                      lineHeight: 1.4
                    },
                    '& .MuiTypography-caption': {
                      fontSize: '0.7rem'
                    }
                  }}
                />
              ))}
              {bookmarkedClauses.length > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setBookmarkedClauses([])}
                  sx={{
                    mt: 'auto',
                    mb: 1,
                    textTransform: 'none',
                    fontWeight: 600,
                    borderWidth: 2,
                    py: 0.75,
                    '&:hover': {
                      borderWidth: 2,
                    },
                  }}
                >
                  Clear All Bookmarks
                </Button>
              )}
            </Box>
          </Box>

          {/* Right Content Area */}
          <Box sx={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            overflow: 'hidden',
            width: '100%',
            height: 'calc(100% - 1%)',
            mt: '1%'
          }}>
            {activeTab === 0 ? (
              <Box sx={{ 
                flex: 1,
                width: '100%',
                height: '100%',
                bgcolor: 'background.paper',
                borderRadius: 2.8,
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                overflow: 'hidden',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                },
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                minHeight: 0
              }}>
                <ClauseGraph clauses={clauses} onNodeClick={handleNodeClick} />
              </Box>
            ) : activeTab === 1 ? (
              <Box sx={{ 
                flex: 1,
                width: '100%',
                height: '100%',
                bgcolor: 'background.paper',
                borderRadius: 2.8,
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <ComplianceMatrix 
                  clauses={bookmarkedClauses} 
                  onClose={() => setShowComplianceMatrix(false)}
                />
              </Box>
            ) : (
              <Box sx={{ 
                flex: 1,
                width: '100%',
                height: '100%',
                bgcolor: 'background.paper',
                borderRadius: 2.8,
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <DocumentScanner />
              </Box>
            )}
          </Box>

          <FloatingPanel 
            clause={selectedClause} 
            onClose={handleClosePanel}
            isBookmarked={selectedClause ? isClauseBookmarked(selectedClause) : false}
            onBookmarkToggle={selectedClause ? () => handleBookmarkToggle(selectedClause) : undefined}
          />
        </Box>

        <Settings
          open={showSettings}
          onClose={() => setShowSettings(false)}
          preferences={preferences}
          onPreferenceChange={handlePreferenceChange}
        />

        {pendingUnbookmark && (
          <ParentClauseDialog
            open={parentClauseDialogOpen}
            onClose={() => {
              setParentClauseDialogOpen(false);
              setPendingUnbookmark(null);
            }}
            onConfirm={handleParentClauseDialogConfirm}
            childClause={pendingUnbookmark.clause}
            parentClause={pendingUnbookmark.parentClause}
          />
        )}

        {showComplianceMatrix && (
          <Box sx={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2
          }}>
            <Box sx={{ 
              width: '100%', 
              height: '100%', 
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden'
            }}>
              <ComplianceMatrix 
                clauses={bookmarkedClauses} 
                onClose={() => setShowComplianceMatrix(false)}
              />
            </Box>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}
