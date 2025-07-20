import { EventEmitter } from '../utils/EventEmitter'
import type { DataSource, AnalysisResult, Report } from '../types'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

export class UIManager extends EventEmitter {
  private isInitialized = false
  private currentSection = 'dashboard'
  private threatChart: Chart | null = null

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('Initializing UI Manager...')
    this.setupNavigation()
    this.setupFileUpload()
    this.setupAnalysisControls()
    this.setupReportGenerator()
    this.initializeCharts()
    
    this.isInitialized = true
    this.emit('initialized')
  }

  private setupNavigation(): void {
    const navLinks = document.querySelectorAll('.nav-link')
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault()
        const section = link.getAttribute('data-section')
        if (section) {
          this.navigateToSection(section)
        }
      })
    })
  }

  private navigateToSection(section: string): void {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active')
    })
    document.querySelector(`[data-section="${section}"]`)?.classList.add('active')

    // Show/hide sections
    document.querySelectorAll('.content-section').forEach(sec => {
      sec.classList.remove('active')
    })
    document.getElementById(`${section}-section`)?.classList.add('active')

    this.currentSection = section
    this.emit('navigationChange', section)
  }

  private setupFileUpload(): void {
    const dropZone = document.getElementById('file-drop-zone')
    const fileInput = document.getElementById('file-input') as HTMLInputElement

    if (!dropZone || !fileInput) return

    // Click to upload
    dropZone.addEventListener('click', () => {
      fileInput.click()
    })

    // File input change
    fileInput.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files) {
        this.emit('fileUpload', files)
      }
    })

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault()
      dropZone.classList.add('dragover')
    })

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover')
    })

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault()
      dropZone.classList.remove('dragover')
      
      const files = e.dataTransfer?.files
      if (files) {
        this.emit('fileUpload', files)
      }
    })
  }

  private setupAnalysisControls(): void {
    const runAnalysisBtn = document.getElementById('run-analysis-btn')
    
    runAnalysisBtn?.addEventListener('click', () => {
      const config = this.getAnalysisConfig()
      this.emit('analysisRun', config)
    })
  }

  private getAnalysisConfig(): any {
    const analysisType = (document.getElementById('analysis-type') as HTMLSelectElement)?.value
    const timeRange = (document.getElementById('time-range') as HTMLSelectElement)?.value
    const severityFilter = (document.getElementById('severity-filter') as HTMLSelectElement)?.value

    return {
      type: analysisType,
      timeRange,
      severityFilter
    }
  }

  private setupReportGenerator(): void {
    const generateReportBtn = document.getElementById('generate-report-btn')
    
    generateReportBtn?.addEventListener('click', () => {
      const config = this.getReportConfig()
      this.emit('reportGenerate', config)
    })
  }

  private getReportConfig(): any {
    const reportType = (document.getElementById('report-type') as HTMLSelectElement)?.value
    const reportFormat = (document.getElementById('report-format') as HTMLSelectElement)?.value
    const reportTitle = (document.getElementById('report-title') as HTMLInputElement)?.value

    return {
      type: reportType,
      format: reportFormat,
      title: reportTitle || `${reportType} Report`
    }
  }

  private initializeCharts(): void {
    const chartCanvas = document.getElementById('threat-chart') as HTMLCanvasElement
    if (!chartCanvas) return

    this.threatChart = new Chart(chartCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
          data: [0, 0, 0, 0],
          backgroundColor: [
            '#dc3545',
            '#fd7e14',
            '#ffc107',
            '#28a745'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    })
  }

  updateDashboardStats(stats: any): void {
    const elements = {
      'total-sources': stats.totalSources,
      'total-threats': stats.totalThreats,
      'total-reports': stats.totalReports,
      'last-update': stats.lastUpdate
    }

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id)
      if (element) {
        element.textContent = value.toString()
      }
    })
  }

  updateDataSources(sources: DataSource[]): void {
    const sourcesBody = document.getElementById('sources-body')
    if (!sourcesBody) return

    sourcesBody.innerHTML = sources.map(source => `
      <div class="table-row">
        <div>${source.name}</div>
        <div>${source.type}</div>
        <div>
          <span class="status-badge status-${source.status}">
            ${source.status}
          </span>
        </div>
        <div>${source.lastUpdated.toLocaleString()}</div>
        <div>
          <button class="btn btn-small btn-secondary">Configure</button>
        </div>
      </div>
    `).join('')
  }

  updateAnalysisResults(results: AnalysisResult[]): void {
    const findingsCount = document.getElementById('findings-count')
    const findingsList = document.getElementById('analysis-findings')

    if (findingsCount) {
      findingsCount.textContent = `${results.length} findings`
    }

    if (findingsList) {
      findingsList.innerHTML = results.map(result => `
        <div class="finding-item">
          <div class="finding-header">
            <span class="finding-title">${result.title}</span>
            <span class="severity-badge severity-${result.severity}">
              ${result.severity.toUpperCase()}
            </span>
          </div>
          <div class="finding-description">${result.description}</div>
          <div class="finding-confidence">
            Confidence: ${(result.confidence * 100).toFixed(1)}%
          </div>
        </div>
      `).join('')
    }

    // Update threat chart
    this.updateThreatChart(results)
  }

  private updateThreatChart(results: AnalysisResult[]): void {
    if (!this.threatChart) return

    const severityCounts = {
      critical: results.filter(r => r.severity === 'critical').length,
      high: results.filter(r => r.severity === 'high').length,
      medium: results.filter(r => r.severity === 'medium').length,
      low: results.filter(r => r.severity === 'low').length
    }

    this.threatChart.data.datasets[0].data = [
      severityCounts.critical,
      severityCounts.high,
      severityCounts.medium,
      severityCounts.low
    ]

    this.threatChart.update()
  }

  setAnalysisLoading(loading: boolean): void {
    const runAnalysisBtn = document.getElementById('run-analysis-btn')
    if (!runAnalysisBtn) return

    if (loading) {
      runAnalysisBtn.innerHTML = `
        <div class="loading">
          <div class="spinner"></div>
          Running Analysis...
        </div>
      `
      runAnalysisBtn.setAttribute('disabled', 'true')
    } else {
      runAnalysisBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5,3 19,12 5,21 5,3"/>
        </svg>
        Run Analysis
      `
      runAnalysisBtn.removeAttribute('disabled')
    }
  }

  addReport(report: Report): void {
    const reportsList = document.getElementById('reports-list')
    if (!reportsList) return

    const reportElement = document.createElement('div')
    reportElement.className = 'report-item'
    reportElement.innerHTML = `
      <div class="report-info">
        <h4>${report.title}</h4>
        <div class="report-meta">
          ${report.type} • ${report.format.toUpperCase()} • ${report.generatedAt.toLocaleString()}
        </div>
      </div>
      <div class="report-actions">
        <a href="${report.downloadUrl}" download="${report.title}.${report.format}" class="btn btn-small btn-primary">
          Download
        </a>
      </div>
    `

    reportsList.insertBefore(reportElement, reportsList.firstChild)
  }

  addActivity(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    const activityList = document.getElementById('activity-list')
    if (!activityList) return

    const activityElement = document.createElement('div')
    activityElement.className = 'activity-item'
    
    const iconMap = {
      info: `<circle cx="12" cy="12" r="3"/>`,
      success: `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22,4 12,14.01 9,11.01"/>`,
      error: `<circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>`
    }

    activityElement.innerHTML = `
      <div class="activity-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${iconMap[type]}
        </svg>
      </div>
      <div class="activity-content">
        <p>${message}</p>
        <span class="activity-time">Just now</span>
      </div>
    `

    activityList.insertBefore(activityElement, activityList.firstChild)

    // Keep only the last 10 activities
    while (activityList.children.length > 10) {
      activityList.removeChild(activityList.lastChild!)
    }
  }

  showError(message: string): void {
    // Simple error display - in a real app, you'd use a proper notification system
    alert(`Error: ${message}`)
  }

  // Event handler registration methods
  onNavigationChange(handler: (section: string) => void): void {
    this.on('navigationChange', handler)
  }

  onFileUpload(handler: (files: FileList) => void): void {
    this.on('fileUpload', handler)
  }

  onAnalysisRun(handler: (config: any) => void): void {
    this.on('analysisRun', handler)
  }

  onReportGenerate(handler: (config: any) => void): void {
    this.on('reportGenerate', handler)
  }

  async shutdown(): Promise<void> {
    if (this.threatChart) {
      this.threatChart.destroy()
      this.threatChart = null
    }
    this.isInitialized = false
    console.log('UI Manager shut down')
  }
}