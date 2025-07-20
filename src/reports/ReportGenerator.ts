import { EventEmitter } from '../utils/EventEmitter'
import type { Report, ReportConfig, AnalysisResult } from '../types'
import jsPDF from 'jspdf'

export class ReportGenerator extends EventEmitter {
  private reports: Report[] = []
  private isInitialized = false

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('Initializing Report Generator...')
    this.isInitialized = true
    this.emit('initialized')
  }

  async generateReport(
    config: ReportConfig,
    analysisResults: AnalysisResult[],
    data: any[]
  ): Promise<Report> {
    try {
      const report: Report = {
        id: this.generateId(),
        title: config.title || `${config.type} Report`,
        type: config.type,
        format: config.format,
        generatedAt: new Date(),
        content: '',
        metadata: {
          analysisResultsCount: analysisResults.length,
          dataSourcesCount: this.getUniqueDataSources(data).length,
          threatLevel: this.calculateOverallThreatLevel(analysisResults)
        }
      }

      // Generate content based on report type
      switch (config.type) {
        case 'executive-summary':
          report.content = this.generateExecutiveSummary(analysisResults, data)
          break
        case 'technical-analysis':
          report.content = this.generateTechnicalAnalysis(analysisResults, data)
          break
        case 'threat-assessment':
          report.content = this.generateThreatAssessment(analysisResults, data)
          break
        case 'incident-report':
          report.content = this.generateIncidentReport(analysisResults, data)
          break
        default:
          throw new Error(`Unknown report type: ${config.type}`)
      }

      // Generate output based on format
      switch (config.format) {
        case 'pdf':
          report.downloadUrl = await this.generatePDF(report)
          break
        case 'html':
          report.downloadUrl = this.generateHTML(report)
          break
        case 'json':
          report.downloadUrl = this.generateJSON(report, analysisResults, data)
          break
        default:
          throw new Error(`Unknown report format: ${config.format}`)
      }

      this.reports.push(report)
      this.emit('reportGenerated', report)
      
      return report

    } catch (error) {
      this.emit('reportError', error)
      throw error
    }
  }

  private generateExecutiveSummary(results: AnalysisResult[], data: any[]): string {
    const threatLevel = this.calculateOverallThreatLevel(results)
    const criticalThreats = results.filter(r => r.severity === 'critical').length
    const highThreats = results.filter(r => r.severity === 'high').length
    
    return `
# Executive Summary

## Overview
This intelligence report provides a comprehensive analysis of security threats and patterns identified from ${this.getUniqueDataSources(data).length} data sources over the analysis period.

## Key Findings
- **Overall Threat Level**: ${threatLevel.toUpperCase()}
- **Critical Threats**: ${criticalThreats}
- **High Priority Threats**: ${highThreats}
- **Total Findings**: ${results.length}

## Risk Assessment
${this.generateRiskAssessment(results)}

## Recommendations
${this.generateExecutiveRecommendations(results)}

## Conclusion
${this.generateConclusion(results)}
    `.trim()
  }

  private generateTechnicalAnalysis(results: AnalysisResult[], data: any[]): string {
    return `
# Technical Analysis Report

## Methodology
This analysis employed multiple detection techniques including:
- Threat detection algorithms
- Pattern analysis
- Anomaly detection
- Correlation analysis

## Data Sources
${this.generateDataSourcesSummary(data)}

## Detailed Findings
${this.generateDetailedFindings(results)}

## Technical Indicators
${this.generateTechnicalIndicators(results)}

## Mitigation Strategies
${this.generateMitigationStrategies(results)}
    `.trim()
  }

  private generateThreatAssessment(results: AnalysisResult[], data: any[]): string {
    const threats = results.filter(r => r.type === 'threat')
    
    return `
# Threat Assessment Report

## Threat Landscape Overview
${threats.length} threats have been identified and analyzed.

## Threat Categories
${this.generateThreatCategories(threats)}

## Severity Distribution
${this.generateSeverityDistribution(threats)}

## Attack Vectors
${this.generateAttackVectors(threats)}

## Threat Actor Analysis
${this.generateThreatActorAnalysis(threats)}

## Defensive Recommendations
${this.generateDefensiveRecommendations(threats)}
    `.trim()
  }

  private generateIncidentReport(results: AnalysisResult[], data: any[]): string {
    const incidents = results.filter(r => r.severity === 'critical' || r.severity === 'high')
    
    return `
# Incident Report

## Incident Summary
${incidents.length} high-priority incidents requiring immediate attention.

## Timeline of Events
${this.generateTimeline(incidents)}

## Impact Assessment
${this.generateImpactAssessment(incidents)}

## Response Actions
${this.generateResponseActions(incidents)}

## Lessons Learned
${this.generateLessonsLearned(incidents)}

## Next Steps
${this.generateNextSteps(incidents)}
    `.trim()
  }

  private calculateOverallThreatLevel(results: AnalysisResult[]): string {
    const criticalCount = results.filter(r => r.severity === 'critical').length
    const highCount = results.filter(r => r.severity === 'high').length
    const mediumCount = results.filter(r => r.severity === 'medium').length
    
    if (criticalCount > 0) return 'critical'
    if (highCount > 2) return 'high'
    if (highCount > 0 || mediumCount > 3) return 'medium'
    return 'low'
  }

  private getUniqueDataSources(data: any[]): string[] {
    const sources = new Set<string>()
    data.forEach(item => {
      if (item.source) sources.add(item.source)
      if (item.sourceIP) sources.add(item.sourceIP)
    })
    return Array.from(sources)
  }

  private generateRiskAssessment(results: AnalysisResult[]): string {
    const highRiskItems = results.filter(r => r.severity === 'critical' || r.severity === 'high')
    if (highRiskItems.length === 0) {
      return 'Current risk level is LOW. No critical threats identified.'
    }
    return `Current risk level is ELEVATED. ${highRiskItems.length} high-priority threats require immediate attention.`
  }

  private generateExecutiveRecommendations(results: AnalysisResult[]): string {
    const recommendations = new Set<string>()
    results.forEach(result => {
      result.recommendations.forEach(rec => recommendations.add(rec))
    })
    
    return Array.from(recommendations).slice(0, 5).map((rec, i) => `${i + 1}. ${rec}`).join('\n')
  }

  private generateConclusion(results: AnalysisResult[]): string {
    const threatLevel = this.calculateOverallThreatLevel(results)
    return `Based on the analysis of ${results.length} findings, the organization should maintain ${threatLevel} alert status and implement the recommended security measures.`
  }

  private generateDataSourcesSummary(data: any[]): string {
    const sources = this.getUniqueDataSources(data)
    return sources.map((source, i) => `${i + 1}. ${source}`).join('\n')
  }

  private generateDetailedFindings(results: AnalysisResult[]): string {
    return results.slice(0, 10).map((result, i) => `
### Finding ${i + 1}: ${result.title}
- **Severity**: ${result.severity.toUpperCase()}
- **Confidence**: ${(result.confidence * 100).toFixed(1)}%
- **Description**: ${result.description}
    `).join('\n')
  }

  private generateTechnicalIndicators(results: AnalysisResult[]): string {
    const indicators = []
    results.forEach(result => {
      result.evidence.forEach(evidence => {
        if (evidence.sourceIP) indicators.push(`IP: ${evidence.sourceIP}`)
        if (evidence.hash) indicators.push(`Hash: ${evidence.hash}`)
        if (evidence.domain) indicators.push(`Domain: ${evidence.domain}`)
      })
    })
    
    return Array.from(new Set(indicators)).slice(0, 10).map((ind, i) => `${i + 1}. ${ind}`).join('\n')
  }

  private generateMitigationStrategies(results: AnalysisResult[]): string {
    const strategies = new Set<string>()
    results.forEach(result => {
      result.recommendations.forEach(rec => strategies.add(rec))
    })
    
    return Array.from(strategies).slice(0, 8).map((strategy, i) => `${i + 1}. ${strategy}`).join('\n')
  }

  private generateThreatCategories(threats: AnalysisResult[]): string {
    const categories = new Map<string, number>()
    threats.forEach(threat => {
      const category = threat.type || 'unknown'
      categories.set(category, (categories.get(category) || 0) + 1)
    })
    
    return Array.from(categories.entries()).map(([cat, count]) => `- ${cat}: ${count}`).join('\n')
  }

  private generateSeverityDistribution(threats: AnalysisResult[]): string {
    const distribution = new Map<string, number>()
    threats.forEach(threat => {
      distribution.set(threat.severity, (distribution.get(threat.severity) || 0) + 1)
    })
    
    return Array.from(distribution.entries()).map(([sev, count]) => `- ${sev}: ${count}`).join('\n')
  }

  private generateAttackVectors(threats: AnalysisResult[]): string {
    return `
- Network-based attacks: ${threats.filter(t => t.description.includes('network')).length}
- Malware infections: ${threats.filter(t => t.description.includes('malware')).length}
- Suspicious activities: ${threats.filter(t => t.description.includes('suspicious')).length}
    `.trim()
  }

  private generateThreatActorAnalysis(threats: AnalysisResult[]): string {
    return 'Analysis suggests multiple threat actors with varying sophistication levels. Further investigation recommended.'
  }

  private generateDefensiveRecommendations(threats: AnalysisResult[]): string {
    const recommendations = new Set<string>()
    threats.forEach(threat => {
      threat.recommendations.forEach(rec => recommendations.add(rec))
    })
    
    return Array.from(recommendations).slice(0, 6).map((rec, i) => `${i + 1}. ${rec}`).join('\n')
  }

  private generateTimeline(incidents: AnalysisResult[]): string {
    return incidents.map(incident => 
      `- ${incident.timestamp.toLocaleString()}: ${incident.title}`
    ).join('\n')
  }

  private generateImpactAssessment(incidents: AnalysisResult[]): string {
    const criticalCount = incidents.filter(i => i.severity === 'critical').length
    return `${criticalCount} critical incidents with potential for significant business impact.`
  }

  private generateResponseActions(incidents: AnalysisResult[]): string {
    const actions = new Set<string>()
    incidents.forEach(incident => {
      incident.recommendations.forEach(rec => actions.add(rec))
    })
    
    return Array.from(actions).slice(0, 5).map((action, i) => `${i + 1}. ${action}`).join('\n')
  }

  private generateLessonsLearned(incidents: AnalysisResult[]): string {
    return 'Incidents highlight the need for improved monitoring and faster response times.'
  }

  private generateNextSteps(incidents: AnalysisResult[]): string {
    return `
1. Implement immediate containment measures
2. Conduct thorough investigation
3. Update security policies
4. Enhance monitoring capabilities
5. Schedule follow-up assessment
    `.trim()
  }

  private async generatePDF(report: Report): Promise<string> {
    const pdf = new jsPDF()
    const pageWidth = pdf.internal.pageSize.getWidth()
    const margin = 20
    const lineHeight = 7
    let yPosition = margin

    // Title
    pdf.setFontSize(20)
    pdf.text(report.title, margin, yPosition)
    yPosition += lineHeight * 2

    // Metadata
    pdf.setFontSize(12)
    pdf.text(`Generated: ${report.generatedAt.toLocaleString()}`, margin, yPosition)
    yPosition += lineHeight
    pdf.text(`Type: ${report.type}`, margin, yPosition)
    yPosition += lineHeight * 2

    // Content
    pdf.setFontSize(10)
    const lines = report.content.split('\n')
    
    for (const line of lines) {
      if (yPosition > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage()
        yPosition = margin
      }
      
      if (line.startsWith('#')) {
        pdf.setFontSize(14)
        pdf.text(line.replace(/^#+\s*/, ''), margin, yPosition)
        pdf.setFontSize(10)
      } else {
        const wrappedLines = pdf.splitTextToSize(line, pageWidth - 2 * margin)
        pdf.text(wrappedLines, margin, yPosition)
        yPosition += lineHeight * (wrappedLines.length || 1)
      }
      yPosition += lineHeight
    }

    const pdfBlob = pdf.output('blob')
    return URL.createObjectURL(pdfBlob)
  }

  private generateHTML(report: Report): string {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>${report.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #333; border-bottom: 2px solid #3b82f6; }
        h2 { color: #555; margin-top: 30px; }
        h3 { color: #666; }
        .metadata { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .severity-critical { color: #dc3545; font-weight: bold; }
        .severity-high { color: #fd7e14; font-weight: bold; }
        .severity-medium { color: #ffc107; font-weight: bold; }
        .severity-low { color: #28a745; font-weight: bold; }
    </style>
</head>
<body>
    <h1>${report.title}</h1>
    <div class="metadata">
        <p><strong>Generated:</strong> ${report.generatedAt.toLocaleString()}</p>
        <p><strong>Type:</strong> ${report.type}</p>
        <p><strong>Format:</strong> ${report.format}</p>
    </div>
    <div class="content">
        ${this.markdownToHTML(report.content)}
    </div>
</body>
</html>
    `
    
    const htmlBlob = new Blob([html], { type: 'text/html' })
    return URL.createObjectURL(htmlBlob)
  }

  private generateJSON(report: Report, analysisResults: AnalysisResult[], data: any[]): string {
    const jsonData = {
      report,
      analysisResults,
      dataSourcesCount: this.getUniqueDataSources(data).length,
      generatedAt: new Date().toISOString()
    }
    
    const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' })
    return URL.createObjectURL(jsonBlob)
  }

  private markdownToHTML(markdown: string): string {
    return markdown
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^\* (.*$)/gm, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.*)$/gm, '<p>$1</p>')
      .replace(/<p><h/g, '<h')
      .replace(/<\/h([1-6])><\/p>/g, '</h$1>')
      .replace(/<p><li>/g, '<ul><li>')
      .replace(/<\/li><\/p>/g, '</li></ul>')
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  getReports(): Report[] {
    return this.reports
  }

  getReportCount(): number {
    return this.reports.length
  }

  async shutdown(): Promise<void> {
    this.reports = []
    this.isInitialized = false
    console.log('Report Generator shut down')
  }
}