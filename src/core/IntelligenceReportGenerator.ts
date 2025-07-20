import { DataSourceManager } from '../data/DataSourceManager'
import { AnalysisEngine } from '../analysis/AnalysisEngine'
import { ReportGenerator } from '../reports/ReportGenerator'
import { UIManager } from '../ui/UIManager'
import { EventEmitter } from '../utils/EventEmitter'
import type { DataSource, AnalysisResult, Report } from '../types'

export class IntelligenceReportGenerator extends EventEmitter {
  private dataSourceManager: DataSourceManager
  private analysisEngine: AnalysisEngine
  private reportGenerator: ReportGenerator
  private uiManager: UIManager
  private isInitialized = false

  constructor() {
    super()
    
    // Initialize core components
    this.dataSourceManager = new DataSourceManager()
    this.analysisEngine = new AnalysisEngine()
    this.reportGenerator = new ReportGenerator()
    this.uiManager = new UIManager()

    this.setupEventListeners()
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Initialize all components
      await this.dataSourceManager.initialize()
      await this.analysisEngine.initialize()
      await this.reportGenerator.initialize()
      await this.uiManager.initialize()

      // Setup UI event handlers
      this.setupUIHandlers()

      // Load initial data
      await this.loadInitialData()

      this.isInitialized = true
      this.emit('initialized')
      
      console.log('Intelligence Report Generator initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Intelligence Report Generator:', error)
      throw error
    }
  }

  private setupEventListeners(): void {
    // Data source events
    this.dataSourceManager.on('sourceAdded', (source: DataSource) => {
      this.uiManager.updateDataSources(this.dataSourceManager.getSources())
      this.uiManager.addActivity(`Data source "${source.name}" added`, 'info')
    })

    this.dataSourceManager.on('sourceUpdated', (source: DataSource) => {
      this.uiManager.updateDataSources(this.dataSourceManager.getSources())
      this.uiManager.addActivity(`Data source "${source.name}" updated`, 'info')
    })

    this.dataSourceManager.on('dataProcessed', (data: any) => {
      this.uiManager.addActivity('New data processed', 'success')
      this.updateDashboardStats()
    })

    // Analysis events
    this.analysisEngine.on('analysisStarted', () => {
      this.uiManager.setAnalysisLoading(true)
    })

    this.analysisEngine.on('analysisCompleted', (results: AnalysisResult[]) => {
      this.uiManager.setAnalysisLoading(false)
      this.uiManager.updateAnalysisResults(results)
      this.uiManager.addActivity(`Analysis completed: ${results.length} findings`, 'success')
      this.updateDashboardStats()
    })

    this.analysisEngine.on('analysisError', (error: Error) => {
      this.uiManager.setAnalysisLoading(false)
      this.uiManager.showError(`Analysis failed: ${error.message}`)
      this.uiManager.addActivity('Analysis failed', 'error')
    })

    // Report events
    this.reportGenerator.on('reportGenerated', (report: Report) => {
      this.uiManager.addReport(report)
      this.uiManager.addActivity(`Report "${report.title}" generated`, 'success')
      this.updateDashboardStats()
    })

    this.reportGenerator.on('reportError', (error: Error) => {
      this.uiManager.showError(`Report generation failed: ${error.message}`)
      this.uiManager.addActivity('Report generation failed', 'error')
    })
  }

  private setupUIHandlers(): void {
    // Navigation
    this.uiManager.onNavigationChange((section: string) => {
      console.log(`Navigated to: ${section}`)
    })

    // File upload
    this.uiManager.onFileUpload(async (files: FileList) => {
      try {
        for (const file of Array.from(files)) {
          await this.dataSourceManager.addFileSource(file)
        }
      } catch (error) {
        this.uiManager.showError(`File upload failed: ${(error as Error).message}`)
      }
    })

    // Analysis
    this.uiManager.onAnalysisRun(async (config: any) => {
      try {
        const data = this.dataSourceManager.getAllData()
        await this.analysisEngine.runAnalysis(data, config)
      } catch (error) {
        this.uiManager.showError(`Analysis failed: ${(error as Error).message}`)
      }
    })

    // Report generation
    this.uiManager.onReportGenerate(async (config: any) => {
      try {
        const analysisResults = this.analysisEngine.getLatestResults()
        const data = this.dataSourceManager.getAllData()
        await this.reportGenerator.generateReport(config, analysisResults, data)
      } catch (error) {
        this.uiManager.showError(`Report generation failed: ${(error as Error).message}`)
      }
    })
  }

  private async loadInitialData(): Promise<void> {
    // Add some sample data sources for demonstration
    await this.addSampleDataSources()
    
    // Update dashboard
    this.updateDashboardStats()
  }

  private async addSampleDataSources(): Promise<void> {
    const sampleSources = [
      {
        name: 'OSINT Feed Alpha',
        type: 'osint' as const,
        url: 'https://api.example.com/osint/alpha',
        status: 'active' as const
      },
      {
        name: 'Network Security Logs',
        type: 'network' as const,
        url: 'internal://network-logs',
        status: 'active' as const
      },
      {
        name: 'Threat Intelligence Feed',
        type: 'threat' as const,
        url: 'https://api.example.com/threat-intel',
        status: 'inactive' as const
      }
    ]

    for (const sourceConfig of sampleSources) {
      await this.dataSourceManager.addSource(sourceConfig)
    }
  }

  private updateDashboardStats(): void {
    const stats = {
      totalSources: this.dataSourceManager.getSources().length,
      totalThreats: this.analysisEngine.getThreatCount(),
      totalReports: this.reportGenerator.getReportCount(),
      lastUpdate: new Date().toLocaleString()
    }

    this.uiManager.updateDashboardStats(stats)
  }

  // Public API methods
  public async addDataSource(config: any): Promise<void> {
    await this.dataSourceManager.addSource(config)
  }

  public async runAnalysis(config: any): Promise<AnalysisResult[]> {
    const data = this.dataSourceManager.getAllData()
    return await this.analysisEngine.runAnalysis(data, config)
  }

  public async generateReport(config: any): Promise<Report> {
    const analysisResults = this.analysisEngine.getLatestResults()
    const data = this.dataSourceManager.getAllData()
    return await this.reportGenerator.generateReport(config, analysisResults, data)
  }

  public getDataSources(): DataSource[] {
    return this.dataSourceManager.getSources()
  }

  public getAnalysisResults(): AnalysisResult[] {
    return this.analysisEngine.getLatestResults()
  }

  public getReports(): Report[] {
    return this.reportGenerator.getReports()
  }

  public async shutdown(): Promise<void> {
    await this.dataSourceManager.shutdown()
    await this.analysisEngine.shutdown()
    await this.reportGenerator.shutdown()
    this.isInitialized = false
    console.log('Intelligence Report Generator shut down')
  }
}