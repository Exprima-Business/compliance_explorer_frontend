// Virtual Scrolling Matrix Table Component
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Alert,
  Button,
  Chip,
  Card,
  CardContent,
  Pagination,
  Checkbox,
  FormControlLabel,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { 
  Search as SearchIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Sort as SortIcon
} from '@mui/icons-material';
import type { Clause, MatrixDataResponse } from '../../types/projectCreation';
import { apiCall } from '../../services/api';
import { extractErrorMessage } from '../../utils/errorUtils';

interface VirtualMatrixTableProps {
  projectId: string;
  onClauseSelect: (clause: Clause) => void;
  onClauseDeselect: (clauseId: string) => void;
}

interface TableFilters {
  search: string;
  status: string;
  confidence: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export const VirtualMatrixTable: React.FC<VirtualMatrixTableProps> = ({
  projectId,
  onClauseSelect,
  onClauseDeselect
}) => {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClauses, setSelectedClauses] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState<TableFilters>({
    search: '',
    status: 'all',
    confidence: 'all',
    sortBy: 'title',
    sortOrder: 'asc'
  });
  const [exporting, setExporting] = useState(false);

  // Load matrix data
  const loadMatrixData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        ...(filters.search && { search: filters.search }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.confidence !== 'all' && { confidence: filters.confidence })
      });
      
      const resp = await apiCall<MatrixDataResponse>(
        `/api/projects/${projectId}/matrix-data?${queryParams}`
      );

      if (resp.error) {
        throw new Error(extractErrorMessage(resp.error, 'Failed to load matrix data'));
      }

      const data = resp.data!;
      setClauses(data.clauses);
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages
      }));
      
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId, pagination.page, pagination.limit, filters]);

  // Load data when dependencies change
  useEffect(() => {
    if (projectId) {
      loadMatrixData();
    }
  }, [loadMatrixData]);

  // Filtered and sorted clauses
  const filteredClauses = useMemo(() => {
    let filtered = [...clauses];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(clause => 
        clause.title.toLowerCase().includes(searchLower) ||
        clause.clauseCode.toLowerCase().includes(searchLower) ||
        clause.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(clause => clause.status === filters.status);
    }

    // Apply confidence filter
    if (filters.confidence !== 'all') {
      filtered = filtered.filter(clause => {
        if (!clause.confidence) return false;
        const confidence = clause.confidence;
        switch (filters.confidence) {
          case 'high': return confidence >= 0.8;
          case 'medium': return confidence >= 0.5 && confidence < 0.8;
          case 'low': return confidence < 0.5;
          default: return true;
        }
      });
    }

    return filtered;
  }, [clauses, filters]);

  const handleClauseSelect = (clause: Clause) => {
    setSelectedClauses(prev => new Set([...Array.from(prev), clause.id]));
    onClauseSelect(clause);
  };

  const handleClauseDeselect = (clauseId: string) => {
    setSelectedClauses(prev => {
      const newSet = new Set(prev);
      newSet.delete(clauseId);
      return newSet;
    });
    onClauseDeselect(clauseId);
  };

  const handleSelectAll = () => {
    if (selectedClauses.size === filteredClauses.length) {
      // Deselect all
      setSelectedClauses(new Set());
      filteredClauses.forEach(clause => onClauseDeselect(clause.id));
    } else {
      // Select all
      const newSelected = new Set(filteredClauses.map(clause => clause.id));
      setSelectedClauses(newSelected);
      filteredClauses.forEach(clause => onClauseSelect(clause));
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const selectedClauseIds = Array.from(selectedClauses);
      
      const resp = await apiCall<{ data: Record<string, any>[]; metadata: any }>(
        `/api/projects/${projectId}/export`,
        {
          method: 'POST',
          body: JSON.stringify({
            clauseIds: selectedClauseIds,
            format: 'csv',
            includeMetadata: true
          })
        }
      );

      if (resp.error) {
        throw new Error(extractErrorMessage(resp.error, 'Export failed'));
      }

      const rows = resp.data?.data ?? [];
      if (rows.length === 0) throw new Error('No data to export');

      const headers = Object.keys(rows[0]);
      const csvLines = [
        headers.join(','),
        ...rows.map(row =>
          headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
        )
      ];
      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${projectId}-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleFilterChange = (key: keyof TableFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VALIDATED': return 'success';
      case 'DETECTED': return 'warning';
      case 'MANUAL': return 'info';
      default: return 'default';
    }
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'default';
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.5) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading matrix data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="h6">Error loading matrix data</Typography>
        <Typography variant="body2">{error}</Typography>
        <Button 
          onClick={loadMatrixData} 
          variant="outlined" 
          size="small" 
          sx={{ mt: 1 }}
        >
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Matrix Data ({pagination.total} clauses)
        </Typography>
        
        <Box display="flex" gap={2}>
          <Button
            onClick={handleExport}
            disabled={selectedClauses.size === 0 || exporting}
            variant="contained"
            startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
            sx={{ minWidth: 120 }}
          >
            {exporting ? 'Exporting...' : `Export (${selectedClauses.size})`}
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <TextField
              size="small"
              placeholder="Search clauses..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="VALIDATED">Validated</MenuItem>
                <MenuItem value="DETECTED">Detected</MenuItem>
                <MenuItem value="MANUAL">Manual</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Confidence</InputLabel>
              <Select
                value={filters.confidence}
                label="Confidence"
                onChange={(e) => handleFilterChange('confidence', e.target.value)}
              >
                <MenuItem value="all">All Confidence</MenuItem>
                <MenuItem value="high">High (≥80%)</MenuItem>
                <MenuItem value="medium">Medium (50-79%)</MenuItem>
                <MenuItem value="low">Low (&lt;50%)</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={filters.sortBy}
                label="Sort By"
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <MenuItem value="title">Title</MenuItem>
                <MenuItem value="clauseCode">Clause Code</MenuItem>
                <MenuItem value="confidence">Confidence</MenuItem>
                <MenuItem value="status">Status</MenuItem>
                <MenuItem value="createdAt">Created Date</MenuItem>
              </Select>
            </FormControl>
            
            <Button
              size="small"
              onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              startIcon={<SortIcon />}
            >
              {filters.sortOrder === 'asc' ? 'Asc' : 'Desc'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {/* Select All Header */}
          <Box 
            display="flex" 
            alignItems="center" 
            p={2} 
            borderBottom="1px solid"
            borderColor="divider"
            bgcolor="grey.50"
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedClauses.size === filteredClauses.length && filteredClauses.length > 0}
                  indeterminate={selectedClauses.size > 0 && selectedClauses.size < filteredClauses.length}
                  onChange={handleSelectAll}
                />
              }
              label={`Select All (${selectedClauses.size}/${filteredClauses.length})`}
            />
          </Box>

          {/* Clauses List */}
          {filteredClauses.length === 0 ? (
            <Box p={4} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                No clauses found matching your criteria.
              </Typography>
            </Box>
          ) : (
            filteredClauses.map((clause) => (
              <Box
                key={clause.id}
                display="flex"
                alignItems="center"
                p={2}
                borderBottom="1px solid"
                borderColor="divider"
                sx={{
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              >
                <Checkbox
                  checked={selectedClauses.has(clause.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleClauseSelect(clause);
                    } else {
                      handleClauseDeselect(clause.id);
                    }
                  }}
                />
                
                <Box flex={1} ml={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {clause.clauseCode}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {clause.title}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" gap={1} alignItems="center">
                      {clause.sourceType === 'scan-detected' && (
                        <Chip
                          label="Not in DB"
                          size="small"
                          variant="outlined"
                          sx={{
                            color: '#b45309',
                            borderColor: '#b45309',
                            bgcolor: '#fef3c7',
                            fontSize: '0.7rem'
                          }}
                        />
                      )}
                      <Chip
                        label={clause.status}
                        color={getStatusColor(clause.status) as any}
                        size="small"
                      />
                      {clause.confidence && (
                        <Chip
                          label={`${Math.round(clause.confidence * 100)}%`}
                          color={getConfidenceColor(clause.confidence) as any}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    {clause.description}
                  </Typography>
                  
                  {clause.locations && clause.locations.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Locations: {clause.locations.join(', ')}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={pagination.totalPages}
            page={pagination.page}
            onChange={handlePageChange}
            color="primary"
            size="large"
          />
        </Box>
      )}

      {/* Pagination Info */}
      <Box textAlign="center" mt={2}>
        <Typography variant="body2" color="text.secondary">
          Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
          {pagination.total} results
        </Typography>
      </Box>
    </Box>
  );
};
