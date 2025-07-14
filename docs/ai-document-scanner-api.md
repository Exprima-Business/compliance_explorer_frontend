# AI Document Scanner - API Documentation

This document provides detailed API specifications for the AI Document Scanner feature, including endpoints, request/response formats, authentication, and integration guidelines.

## API Overview

### Base URL
```
Production: https://api.compliance-explorer.com
Development: https://dev-api.compliance-explorer.com
```

### Authentication
All API endpoints require authentication using Bearer tokens:
```
Authorization: Bearer <access_token>
```

### Content Types
- **Upload**: `multipart/form-data`
- **JSON**: `application/json`
- **SSE**: `text/event-stream`

## Endpoints

### 1. Upload Document

**Endpoint**: `POST /api/scan/document`

**Description**: Upload a document for AI analysis and clause detection.

**Request**:
```http
POST /api/scan/document
Content-Type: multipart/form-data
Authorization: Bearer <access_token>

Form Data:
- file: <file> (required)
- options: <json_string> (optional)
```

**Request Options**:
```json
{
  "testMode": false,
  "deduplication": true,
  "confidenceThreshold": 0.8,
  "maxClauses": 1000,
  "includeMetadata": true,
  "processingPriority": "normal"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "scanId": "scan_abc123def456",
    "status": "uploaded",
    "fileName": "document.pdf",
    "fileSize": 2048576,
    "uploadedAt": "2024-12-19T13:16:18Z",
    "estimatedProcessingTime": 300,
    "sseUrl": "/api/scan/progress/scan_abc123def456"
  }
}
```

**Error Responses**:
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds maximum limit of 50MB",
    "details": {
      "maxSize": 52428800,
      "actualSize": 67108864
    }
  }
}
```

### 2. Progress Updates (SSE)

**Endpoint**: `GET /api/scan/progress/{scanId}`

**Description**: Server-Sent Events stream for real-time progress updates.

**Request**:
```http
GET /api/scan/progress/scan_abc123def456
Accept: text/event-stream
Authorization: Bearer <access_token>
```

**Event Types**:

#### Progress Event
```json
{
  "type": "progress",
  "data": {
    "progress": 45,
    "message": "Analyzing document content...",
    "stage": "ai_analysis",
    "estimatedTime": 180,
    "currentPage": 5,
    "totalPages": 12
  }
}
```

#### Complete Event
```json
{
  "type": "complete",
  "data": {
    "scanId": "scan_abc123def456",
    "totalClauses": 23,
    "processingTime": 245000,
    "resultsUrl": "/api/scan/results/scan_abc123def456"
  }
}
```

#### Error Event
```json
{
  "type": "error",
  "data": {
    "code": "PROCESSING_FAILED",
    "message": "AI analysis failed due to document format",
    "retryable": true,
    "retryUrl": "/api/scan/retry/scan_abc123def456"
  }
}
```

### 3. Get Results

**Endpoint**: `GET /api/scan/results/{scanId}`

**Description**: Retrieve final scan results and detected clauses.

**Request**:
```http
GET /api/scan/results/scan_abc123def456
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "scanId": "scan_abc123def456",
    "status": "complete",
    "fileName": "document.pdf",
    "fileSize": 2048576,
    "uploadedAt": "2024-12-19T13:16:18Z",
    "completedAt": "2024-12-19T13:20:23Z",
    "processingTime": 245000,
    "metadata": {
      "totalPages": 12,
      "totalClauses": 23,
      "uniqueClauses": 18,
      "duplicatesRemoved": 5,
      "averageConfidence": 0.87,
      "fileFormat": "pdf",
      "textExtractionMethod": "ocr"
    },
    "clauses": [
      {
        "id": "clause_001",
        "text": "The Company shall maintain compliance with all applicable regulations...",
        "confidence": 0.95,
        "type": "compliance",
        "category": "regulatory",
        "page": 3,
        "line": 15,
        "position": {
          "start": 1250,
          "end": 1450
        },
        "metadata": {
          "source": "ai_detection",
          "detectionMethod": "pattern_matching",
          "keywords": ["compliance", "regulations", "maintain"],
          "similarityScore": 0.92
        }
      }
    ],
    "summary": {
      "byType": {
        "compliance": 12,
        "liability": 5,
        "termination": 3,
        "confidentiality": 3
      },
      "byConfidence": {
        "high": 15,
        "medium": 6,
        "low": 2
      },
      "byPage": {
        "1": 2,
        "2": 1,
        "3": 4
      }
    }
  }
}
```

### 4. Retry Failed Scan

**Endpoint**: `POST /api/scan/retry/{scanId}`

**Description**: Retry a failed scan with different processing options.

**Request**:
```http
POST /api/scan/retry/scan_abc123def456
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "options": {
    "retryMode": "enhanced",
    "confidenceThreshold": 0.7,
    "includeLowConfidence": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "scanId": "scan_abc123def456_retry_001",
    "status": "retrying",
    "originalScanId": "scan_abc123def456",
    "retryCount": 1,
    "estimatedProcessingTime": 180
  }
}
```

### 5. Cancel Scan

**Endpoint**: `DELETE /api/scan/{scanId}`

**Description**: Cancel an ongoing scan.

**Request**:
```http
DELETE /api/scan/scan_abc123def456
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "scanId": "scan_abc123def456",
    "status": "cancelled",
    "cancelledAt": "2024-12-19T13:18:30Z"
  }
}
```

### 6. List Scans

**Endpoint**: `GET /api/scan/list`

**Description**: Get list of user's scans with filtering and pagination.

**Request**:
```http
GET /api/scan/list?status=complete&limit=20&offset=0
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `status`: Filter by status (uploaded, processing, complete, error, cancelled)
- `dateFrom`: Filter by upload date (ISO 8601)
- `dateTo`: Filter by upload date (ISO 8601)
- `limit`: Number of results per page (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)

**Response**:
```json
{
  "success": true,
  "data": {
    "scans": [
      {
        "scanId": "scan_abc123def456",
        "fileName": "document.pdf",
        "status": "complete",
        "uploadedAt": "2024-12-19T13:16:18Z",
        "completedAt": "2024-12-19T13:20:23Z",
        "totalClauses": 23,
        "fileSize": 2048576
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

## Data Types

### Scan Status
```typescript
type ScanStatus = 
  | 'uploaded'      // File uploaded, waiting to process
  | 'processing'     // AI analysis in progress
  | 'complete'       // Scan completed successfully
  | 'error'          // Error occurred during processing
  | 'cancelled'      // Scan was cancelled by user
  | 'retrying'       // Retry attempt in progress
```

### Clause Types
```typescript
type ClauseType = 
  | 'compliance'     // Regulatory compliance clauses
  | 'liability'      // Liability and indemnification
  | 'termination'    // Contract termination clauses
  | 'confidentiality' // Confidentiality and NDA clauses
  | 'payment'        // Payment and financial terms
  | 'intellectual_property' // IP and licensing clauses
  | 'other'          // Other clause types
```

### Confidence Levels
```typescript
type ConfidenceLevel = 
  | 'high'           // 0.8 - 1.0
  | 'medium'         // 0.6 - 0.79
  | 'low'            // 0.0 - 0.59
```

## Error Codes

### Upload Errors
- `FILE_TOO_LARGE`: File exceeds maximum size limit
- `UNSUPPORTED_FORMAT`: File format not supported
- `CORRUPTED_FILE`: File is corrupted or unreadable
- `UPLOAD_FAILED`: General upload failure

### Processing Errors
- `PROCESSING_FAILED`: AI analysis failed
- `TIMEOUT_ERROR`: Processing timeout
- `INSUFFICIENT_QUALITY`: Document quality too low
- `CONTENT_EXTRACTION_FAILED`: Text extraction failed

### Network Errors
- `NETWORK_ERROR`: Network connectivity issue
- `SSE_CONNECTION_FAILED`: SSE connection failed
- `AUTHENTICATION_FAILED`: Invalid or expired token
- `RATE_LIMIT_EXCEEDED`: Too many requests

## Rate Limits

### Upload Limits
- **File size**: 50MB maximum
- **Upload frequency**: 10 files per minute
- **Concurrent uploads**: 3 per user

### API Limits
- **Requests per minute**: 100 per user
- **SSE connections**: 5 concurrent per user
- **Results cache**: 24 hours

## Integration Examples

### JavaScript/TypeScript

#### Upload Document
```typescript
const uploadDocument = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('options', JSON.stringify({
    testMode: false,
    deduplication: true
  }));

  const response = await fetch('/api/scan/document', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: formData
  });

  return response.json();
};
```

#### Listen to Progress Updates
```typescript
const listenToProgress = (scanId: string) => {
  const eventSource = new EventSource(`/api/scan/progress/${scanId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'progress':
        updateProgress(data.data);
        break;
      case 'complete':
        handleComplete(data.data);
        break;
      case 'error':
        handleError(data.data);
        break;
    }
  };

  return eventSource;
};
```

#### Get Results
```typescript
const getResults = async (scanId: string) => {
  const response = await fetch(`/api/scan/results/${scanId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  return response.json();
};
```

### Python

#### Upload Document
```python
import requests

def upload_document(file_path, access_token):
    url = "https://api.compliance-explorer.com/api/scan/document"
    
    with open(file_path, 'rb') as file:
        files = {'file': file}
        headers = {'Authorization': f'Bearer {access_token}'}
        
        response = requests.post(url, files=files, headers=headers)
        return response.json()
```

#### SSE Client
```python
import sseclient
import requests

def listen_to_progress(scan_id, access_token):
    url = f"https://api.compliance-explorer.com/api/scan/progress/{scan_id}"
    headers = {'Authorization': f'Bearer {access_token}'}
    
    response = requests.get(url, headers=headers, stream=True)
    client = sseclient.SSEClient(response)
    
    for event in client.events():
        data = json.loads(event.data)
        print(f"Progress: {data['progress']}% - {data['message']}")
```

### cURL Examples

#### Upload Document
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@document.pdf" \
  -F "options={\"testMode\":false}" \
  https://api.compliance-explorer.com/api/scan/document
```

#### Get Results
```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://api.compliance-explorer.com/api/scan/results/scan_abc123def456
```

## Webhooks

### Webhook Events
- `scan.uploaded`: Document uploaded successfully
- `scan.processing`: Processing started
- `scan.completed`: Scan completed successfully
- `scan.failed`: Scan failed with error
- `scan.cancelled`: Scan cancelled by user

### Webhook Payload
```json
{
  "event": "scan.completed",
  "timestamp": "2024-12-19T13:20:23Z",
  "data": {
    "scanId": "scan_abc123def456",
    "fileName": "document.pdf",
    "totalClauses": 23,
    "processingTime": 245000
  }
}
```

## SDKs and Libraries

### Official SDKs
- **JavaScript/TypeScript**: `@compliance-explorer/scan-sdk`
- **Python**: `compliance-explorer-scan`
- **Java**: `compliance-explorer-scan-java`
- **.NET**: `ComplianceExplorer.Scan`

### Community Libraries
- **React Hook**: `use-document-scanner`
- **Vue Plugin**: `vue-document-scanner`
- **Angular Service**: `ng-document-scanner`

## Best Practices

### Error Handling
1. **Always check response status**: Handle HTTP errors gracefully
2. **Implement retry logic**: Use exponential backoff for transient errors
3. **Handle SSE disconnections**: Reconnect automatically with backoff
4. **Validate file types**: Check supported formats before upload
5. **Monitor progress**: Show user feedback during processing

### Performance
1. **Compress large files**: Reduce upload time and bandwidth
2. **Use streaming**: For large result sets
3. **Cache results**: Avoid repeated API calls
4. **Implement pagination**: For large scan lists
5. **Background processing**: Don't block UI during uploads

### Security
1. **Validate tokens**: Check token expiration
2. **Sanitize file names**: Prevent path traversal attacks
3. **Rate limiting**: Respect API limits
4. **Error logging**: Don't expose sensitive information
5. **HTTPS only**: Always use secure connections

---

*Last updated: December 2024*
*Version: 1.0* 