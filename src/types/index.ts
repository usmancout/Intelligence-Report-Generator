export interface DataSource {
  id: string
  name: string
  type: 'osint' | 'network' | 'threat' | 'custom'
  url: string
  status: 'active' | 'inactive' | 'error'
  lastUpdated: Date
  config: any
}

export interface DataSourceConfig {
  name: string
  type: 'osint' | 'network' | 'threat' | 'custom'
  url: string
  status?: 'active' | 'inactive' | 'error'
  [key: string]: any
}

export interface AnalysisResult {
  id: string
  type: 'threat' | 'pattern' | 'anomaly' | 'correlation'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  timestamp: Date
  evidence: any[]
  recommendations: string[]
}

export interface AnalysisConfig {
  type: 'threat-detection' | 'pattern-analysis' | 'anomaly-detection' | 'correlation-analysis'
  timeRange: string
  severityFilter: string
  [key: string]: any
}

export interface Report {
  id: string
  title: string
  type: 'executive-summary' | 'technical-analysis' | 'threat-assessment' | 'incident-report'
  format: 'pdf' | 'html' | 'json'
  content: string
  generatedAt: Date
  downloadUrl?: string
  metadata: {
    analysisResultsCount: number
    dataSourcesCount: number
    threatLevel: string
    [key: string]: any
  }
}

export interface ReportConfig {
  type: 'executive-summary' | 'technical-analysis' | 'threat-assessment' | 'incident-report'
  format: 'pdf' | 'html' | 'json'
  title?: string
  [key: string]: any
}

export interface DashboardStats {
  totalSources: number
  totalThreats: number
  totalReports: number
  lastUpdate: string
}

export interface ActivityItem {
  id: string
  message: string
  type: 'info' | 'success' | 'error'
  timestamp: Date
}