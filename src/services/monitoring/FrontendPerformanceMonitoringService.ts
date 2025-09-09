// Frontend Performance Monitoring Service
import { 
  WebSocketPerformanceMetrics,
  StateUpdatePerformanceMetrics,
  APIPerformanceMetrics,
  UserInteractionPerformanceMetrics,
  FrontendMetrics,
  CorrelatedMetrics,
  PerformanceInsights
} from '../../types/projectCreation';

export class FrontendPerformanceMonitoringService {
  private metricsBuffer: any[] = [];
  private readonly BUFFER_SIZE = 50;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds
  private flushTimer: NodeJS.Timeout | null = null;
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = process.env.VITE_API_URL || 'http://localhost:3000';
    this.startMetricsFlush();
    this.setupPerformanceObservers();
  }

  // Track WebSocket performance
  trackWebSocketPerformance(metrics: WebSocketPerformanceMetrics): void {
    this.addMetric({
      type: 'websocket_performance',
      timestamp: Date.now(),
      data: metrics
    });
  }

  // Track state update performance
  trackStateUpdatePerformance(metrics: StateUpdatePerformanceMetrics): void {
    this.addMetric({
      type: 'state_update_performance',
      timestamp: Date.now(),
      data: metrics
    });
  }

  // Track API performance
  trackAPIPerformance(metrics: APIPerformanceMetrics): void {
    this.addMetric({
      type: 'api_performance',
      timestamp: Date.now(),
      data: metrics
    });
  }

  // Track user interaction performance
  trackUserInteractionPerformance(metrics: UserInteractionPerformanceMetrics): void {
    this.addMetric({
      type: 'user_interaction_performance',
      timestamp: Date.now(),
      data: metrics
    });
  }

  // Track custom metrics
  trackCustomMetric(type: string, data: any, projectId?: string): void {
    this.addMetric({
      type,
      timestamp: Date.now(),
      projectId,
      data
    });
  }

  // Add metric to buffer
  private addMetric(metric: any): void {
    this.metricsBuffer.push(metric);
    
    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      this.flushMetrics();
    }
  }

  // Flush metrics to backend
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;
    
    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/monitoring/frontend-metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ 
          metrics,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now()
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log(`[PerformanceMonitoring] Flushed ${metrics.length} metrics`);
      
    } catch (error) {
      console.error('[PerformanceMonitoring] Failed to flush metrics:', error);
      // Re-add metrics to buffer for retry
      this.metricsBuffer.unshift(...metrics);
    }
  }

  // Start metrics flush timer
  private startMetricsFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushMetrics();
    }, this.FLUSH_INTERVAL);
  }

  // Setup performance observers
  private setupPerformanceObservers(): void {
    // Web Vitals
    if ('web-vitals' in window) {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(this.handleWebVital.bind(this));
        getFID(this.handleWebVital.bind(this));
        getFCP(this.handleWebVital.bind(this));
        getLCP(this.handleWebVital.bind(this));
        getTTFB(this.handleWebVital.bind(this));
      }).catch(error => {
        console.warn('[PerformanceMonitoring] Failed to load web-vitals:', error);
      });
    }

    // Performance Observer for custom metrics
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.handlePerformanceEntry(entry);
          }
        });
        
        observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
      } catch (error) {
        console.warn('[PerformanceMonitoring] PerformanceObserver not supported:', error);
      }
    }

    // Navigation timing
    this.trackNavigationTiming();
  }

  // Handle Web Vitals
  private handleWebVital(metric: any): void {
    this.addMetric({
      type: 'web_vital',
      timestamp: Date.now(),
      data: {
        name: metric.name,
        value: metric.value,
        delta: metric.delta,
        id: metric.id,
        rating: metric.rating
      }
    });
  }

  // Handle performance entries
  private handlePerformanceEntry(entry: PerformanceEntry): void {
    this.addMetric({
      type: 'performance_entry',
      timestamp: Date.now(),
      data: {
        name: entry.name,
        entryType: entry.entryType,
        startTime: entry.startTime,
        duration: entry.duration,
        size: (entry as any).transferSize || 0
      }
    });
  }

  // Track navigation timing
  private trackNavigationTiming(): void {
    if ('performance' in window && 'timing' in window.performance) {
      const timing = window.performance.timing;
      const navigationStart = timing.navigationStart;
      
      const metrics = {
        dns: timing.domainLookupEnd - timing.domainLookupStart,
        tcp: timing.connectEnd - timing.connectStart,
        request: timing.responseStart - timing.requestStart,
        response: timing.responseEnd - timing.responseStart,
        dom: timing.domContentLoadedEventEnd - timing.navigationStart,
        load: timing.loadEventEnd - timing.navigationStart
      };
      
      this.addMetric({
        type: 'navigation_timing',
        timestamp: Date.now(),
        data: metrics
      });
    }
  }

  // Track component render performance
  trackComponentRender(componentName: string, renderTime: number, props?: any): void {
    this.addMetric({
      type: 'component_render',
      timestamp: Date.now(),
      data: {
        componentName,
        renderTime,
        props: props ? Object.keys(props) : []
      }
    });
  }

  // Track memory usage
  trackMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.addMetric({
        type: 'memory_usage',
        timestamp: Date.now(),
        data: {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        }
      });
    }
  }

  // Track error performance
  trackErrorPerformance(error: Error, context: string, component?: string): void {
    this.addMetric({
      type: 'error_performance',
      timestamp: Date.now(),
      data: {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        context,
        component,
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    });
  }

  // Get current metrics buffer size
  getBufferSize(): number {
    return this.metricsBuffer.length;
  }

  // Force flush metrics
  async forceFlush(): Promise<void> {
    await this.flushMetrics();
  }

  // Get authentication token
  private getAuthToken(): string {
    return localStorage.getItem('auth_token') || '';
  }

  // Cleanup
  cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Flush remaining metrics
    this.flushMetrics();
  }
}

// Singleton instance
let performanceMonitoringInstance: FrontendPerformanceMonitoringService | null = null;

export const getPerformanceMonitoringService = (): FrontendPerformanceMonitoringService => {
  if (!performanceMonitoringInstance) {
    performanceMonitoringInstance = new FrontendPerformanceMonitoringService();
  }
  return performanceMonitoringInstance;
};

// React hook for performance monitoring
export const usePerformanceMonitoring = () => {
  const service = getPerformanceMonitoringService();
  
  return {
    trackWebSocketPerformance: service.trackWebSocketPerformance.bind(service),
    trackStateUpdatePerformance: service.trackStateUpdatePerformance.bind(service),
    trackAPIPerformance: service.trackAPIPerformance.bind(service),
    trackUserInteractionPerformance: service.trackUserInteractionPerformance.bind(service),
    trackCustomMetric: service.trackCustomMetric.bind(service),
    trackComponentRender: service.trackComponentRender.bind(service),
    trackMemoryUsage: service.trackMemoryUsage.bind(service),
    trackErrorPerformance: service.trackErrorPerformance.bind(service),
    getBufferSize: service.getBufferSize.bind(service),
    forceFlush: service.forceFlush.bind(service)
  };
};
