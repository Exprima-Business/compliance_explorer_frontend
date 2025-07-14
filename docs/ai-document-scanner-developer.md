# AI Document Scanner - Developer Documentation

This document provides technical details for developers working with the AI Document Scanner feature, including architecture, API integration, component structure, and implementation guidelines.

## Architecture Overview

### Frontend Components
```
src/components/DocumentScanner/
├── index.tsx                 # Main DocumentScanner component
├── __tests__/
│   └── DocumentScanner.test.tsx  # Component tests
└── types.ts                  # TypeScript interfaces
```

### API Services
```
src/services/
├── scanApi.ts               # Document scanning API service
└── hybridClauseService.ts   # Clause management integration
```

### Key Dependencies
- **React 18**: Component framework
- **TypeScript**: Type safety and development experience
- **Material-UI**: UI components and theming
- **React Dropzone**: File upload handling
- **EventSource**: Server-Sent Events for real-time updates

## Component Architecture

### DocumentScanner Component

The main component follows a state machine pattern with the following states:

```typescript
type ScanState = 
  | 'idle'           // Ready for upload
  | 'uploading'      // File upload in progress
  | 'processing'     // AI analysis in progress
  | 'complete'       // Scan completed successfully
  | 'error'          // Error occurred
  | 'retrying'       // Retry attempt in progress
```

#### State Management
```typescript
interface ScanState {
  status: ScanState;
  progress: number;
  message: string;
  error?: string;
  results?: ScanResults;
  file?: File;
}
```

#### Key Features
- **File Upload**: Drag & drop and click-to-browse
- **Progress Tracking**: Real-time updates via SSE
- **Error Handling**: Comprehensive error recovery
- **Test Mode**: Development and testing support
- **Results Display**: Structured clause presentation

### API Integration

#### scanApi Service
```typescript
interface ScanApiService {
  uploadDocument(file: File, options?: UploadOptions): Promise<UploadResponse>;
  getProgress(scanId: string): EventSource;
  getResults(scanId: string): Promise<ScanResults>;
  retryScan(scanId: string): Promise<void>;
}
```

#### API Endpoints
- `POST /api/scan/document` - Upload and start scanning
- `GET /api/scan/progress/{scanId}` - SSE progress updates
- `GET /api/scan/results/{scanId}` - Get final results
- `POST /api/scan/retry/{scanId}` - Retry failed scan

#### Server-Sent Events
```typescript
interface ProgressEvent {
  type: 'progress' | 'complete' | 'error';
  data: {
    progress: number;
    message: string;
    stage: string;
    estimatedTime?: number;
  };
}
```

## Implementation Details

### File Upload Handling

#### Supported Formats
```typescript
const SUPPORTED_FORMATS = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'text/plain': ['.txt'],
  'application/rtf': ['.rtf']
};
```

#### File Validation
```typescript
const validateFile = (file: File): ValidationResult => {
  // Check file size (50MB limit)
  // Validate file type
  // Check file integrity
  // Return validation result
};
```

### Progress Tracking

#### SSE Connection Management
```typescript
const establishSSEConnection = (scanId: string): EventSource => {
  const eventSource = new EventSource(`/api/scan/progress/${scanId}`);
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateProgress(data);
  };
  
  eventSource.onerror = (error) => {
    handleSSEError(error);
  };
  
  return eventSource;
};
```

#### Progress State Updates
```typescript
const updateProgress = (data: ProgressEvent) => {
  setScanState(prev => ({
    ...prev,
    progress: data.progress,
    message: data.message,
    stage: data.stage
  }));
};
```

### Error Handling

#### Error Types
```typescript
enum ScanErrorType {
  UPLOAD_FAILED = 'upload_failed',
  PROCESSING_FAILED = 'processing_failed',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  TIMEOUT_ERROR = 'timeout_error'
}
```

#### Error Recovery
```typescript
const handleError = (error: ScanError) => {
  switch (error.type) {
    case ScanErrorType.UPLOAD_FAILED:
      return retryUpload();
    case ScanErrorType.PROCESSING_FAILED:
      return retryProcessing();
    case ScanErrorType.NETWORK_ERROR:
      return reconnectSSE();
    default:
      return showError(error);
  }
};
```

### Test Mode

#### Test Data Generation
```typescript
const generateTestResults = (): ScanResults => ({
  clauses: [
    {
      id: 'test-1',
      text: 'Sample compliance clause text',
      confidence: 0.95,
      type: 'compliance',
      category: 'regulatory',
      page: 1,
      line: 10
    }
  ],
  metadata: {
    totalClauses: 1,
    processingTime: 5000,
    fileSize: 1024,
    pages: 1
  }
});
```

## Integration Points

### Clause Management Integration

#### Results Processing
```typescript
const processScanResults = (results: ScanResults) => {
  // Transform scan results to clause format
  const clauses = results.clauses.map(clause => ({
    id: generateClauseId(),
    text: clause.text,
    confidence: clause.confidence,
    metadata: {
      source: 'ai_scan',
      scanId: results.scanId,
      originalFile: results.fileName
    }
  }));
  
  // Save to clause management system
  return saveClauses(clauses);
};
```

#### Export Options
```typescript
const exportResults = (results: ScanResults, format: ExportFormat) => {
  switch (format) {
    case 'json':
      return exportAsJSON(results);
    case 'csv':
      return exportAsCSV(results);
    case 'pdf':
      return exportAsPDF(results);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
};
```

## Performance Considerations

### File Size Optimization
- **Chunked uploads**: Large files split into chunks
- **Progress tracking**: Real-time upload progress
- **Background processing**: Non-blocking file processing
- **Memory management**: Efficient file handling

### Network Optimization
- **Compression**: File compression for uploads
- **Retry logic**: Automatic retry with exponential backoff
- **Connection pooling**: Reuse connections where possible
- **Caching**: Result caching for repeated scans

### UI Performance
- **Virtual scrolling**: For large result sets
- **Lazy loading**: Load results progressively
- **Debounced updates**: Prevent excessive re-renders
- **Optimistic updates**: Immediate UI feedback

## Security Considerations

### File Upload Security
```typescript
const securityChecks = (file: File) => {
  // File type validation
  // Size limits
  // Malware scanning
  // Content validation
};
```

### Data Protection
- **Encryption**: All data encrypted in transit and at rest
- **Access control**: Role-based permissions
- **Audit logging**: Complete activity tracking
- **Data retention**: Configurable retention policies

## Testing Strategy

### Unit Tests
```typescript
describe('DocumentScanner', () => {
  test('should handle file upload', () => {
    // Test file upload functionality
  });
  
  test('should display progress updates', () => {
    // Test progress tracking
  });
  
  test('should handle errors gracefully', () => {
    // Test error handling
  });
});
```

### Integration Tests
```typescript
describe('Scan API Integration', () => {
  test('should upload and process document', async () => {
    // Test end-to-end workflow
  });
  
  test('should handle SSE connection', () => {
    // Test real-time updates
  });
});
```

### E2E Tests
```typescript
describe('Document Scanner E2E', () => {
  test('should complete full scan workflow', () => {
    // Test complete user workflow
  });
});
```

## Configuration

### Environment Variables
```typescript
interface ScanConfig {
  VITE_API_URL: string;
  VITE_MAX_FILE_SIZE: number;
  VITE_SUPPORTED_FORMATS: string[];
  VITE_SSE_TIMEOUT: number;
  VITE_RETRY_ATTEMPTS: number;
}
```

### Feature Flags
```typescript
interface FeatureFlags {
  ENABLE_TEST_MODE: boolean;
  ENABLE_BATCH_UPLOAD: boolean;
  ENABLE_ADVANCED_FILTERS: boolean;
  ENABLE_EXPORT_FEATURES: boolean;
}
```

## Deployment

### Build Configuration
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'document-scanner': ['./src/components/DocumentScanner']
        }
      }
    }
  }
});
```

### Environment Setup
```bash
# Development
npm run dev

# Testing
npm run test

# Building
npm run build

# Preview
npm run preview
```

## Monitoring and Debugging

### Debug Logging
```typescript
const debugLog = (message: string, data?: any) => {
  if (process.env.VITE_DEBUG_LOG === '1') {
    console.log(`[DocumentScanner] ${message}`, data);
  }
};
```

### Performance Monitoring
```typescript
const trackPerformance = (operation: string, duration: number) => {
  // Send metrics to monitoring service
  analytics.track('scan_performance', {
    operation,
    duration,
    timestamp: Date.now()
  });
};
```

### Error Tracking
```typescript
const trackError = (error: Error, context: string) => {
  // Send error to error tracking service
  errorTracking.captureException(error, {
    tags: { component: 'DocumentScanner', context }
  });
};
```

## Future Enhancements

### Planned Features
- **Batch processing**: Multiple file upload
- **Advanced filters**: Custom clause filtering
- **Template matching**: Pre-defined clause templates
- **Machine learning**: Improved accuracy over time
- **Integration APIs**: Third-party system integration

### Technical Improvements
- **Web Workers**: Background processing
- **Service Workers**: Offline support
- **Progressive Web App**: Native app experience
- **Real-time collaboration**: Multi-user editing

---

*Last updated: December 2024*
*Version: 1.0* 