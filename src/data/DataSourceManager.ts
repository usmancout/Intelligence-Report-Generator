import { EventEmitter } from '../utils/EventEmitter'
import type { DataSource, DataSourceConfig } from '../types'

export class DataSourceManager extends EventEmitter {
  private sources: Map<string, DataSource> = new Map()
  private data: Map<string, any[]> = new Map()
  private isInitialized = false

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('Initializing Data Source Manager...')
    this.isInitialized = true
    this.emit('initialized')
  }

  async addSource(config: DataSourceConfig): Promise<DataSource> {
    const source: DataSource = {
      id: this.generateId(),
      name: config.name,
      type: config.type,
      url: config.url,
      status: config.status || 'inactive',
      lastUpdated: new Date(),
      config: config
    }

    this.sources.set(source.id, source)
    this.data.set(source.id, [])

    // Simulate data loading for demo
    if (source.status === 'active') {
      setTimeout(() => {
        this.loadSampleData(source.id, source.type)
      }, 1000)
    }

    this.emit('sourceAdded', source)
    return source
  }

  async addFileSource(file: File): Promise<DataSource> {
    const source: DataSource = {
      id: this.generateId(),
      name: file.name,
      type: 'custom',
      url: `file://${file.name}`,
      status: 'active',
      lastUpdated: new Date(),
      config: { file }
    }

    this.sources.set(source.id, source)

    try {
      const data = await this.parseFile(file)
      this.data.set(source.id, data)
      
      source.status = 'active'
      this.emit('sourceAdded', source)
      this.emit('dataProcessed', { sourceId: source.id, data })
      
      return source
    } catch (error) {
      source.status = 'error'
      this.emit('sourceAdded', source)
      throw error
    }
  }

  private async parseFile(file: File): Promise<any[]> {
    const text = await file.text()
    const extension = file.name.split('.').pop()?.toLowerCase()

    switch (extension) {
      case 'json':
        return this.parseJSON(text)
      case 'csv':
        return this.parseCSV(text)
      case 'xml':
        return this.parseXML(text)
      case 'txt':
        return this.parseText(text)
      default:
        throw new Error(`Unsupported file type: ${extension}`)
    }
  }

  private parseJSON(text: string): any[] {
    try {
      const parsed = JSON.parse(text)
      return Array.isArray(parsed) ? parsed : [parsed]
    } catch (error) {
      throw new Error('Invalid JSON format')
    }
  }

  private parseCSV(text: string): any[] {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) throw new Error('CSV must have header and data rows')

    const headers = lines[0].split(',').map(h => h.trim())
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const row: any = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      
      data.push(row)
    }

    return data
  }

  private parseXML(text: string): any[] {
    // Simple XML parsing for demo purposes
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'text/xml')
    
    if (doc.querySelector('parsererror')) {
      throw new Error('Invalid XML format')
    }

    const items = Array.from(doc.querySelectorAll('item, record, entry'))
    return items.map(item => {
      const obj: any = {}
      Array.from(item.children).forEach(child => {
        obj[child.tagName] = child.textContent
      })
      return obj
    })
  }

  private parseText(text: string): any[] {
    const lines = text.split('\n').filter(line => line.trim())
    return lines.map((line, index) => ({
      id: index + 1,
      content: line.trim(),
      timestamp: new Date().toISOString()
    }))
  }

  private loadSampleData(sourceId: string, type: string): void {
    let sampleData: any[] = []

    switch (type) {
      case 'osint':
        sampleData = this.generateOSINTData()
        break
      case 'network':
        sampleData = this.generateNetworkData()
        break
      case 'threat':
        sampleData = this.generateThreatData()
        break
      default:
        sampleData = this.generateGenericData()
    }

    this.data.set(sourceId, sampleData)
    this.emit('dataProcessed', { sourceId, data: sampleData })

    // Update source status
    const source = this.sources.get(sourceId)
    if (source) {
      source.lastUpdated = new Date()
      this.emit('sourceUpdated', source)
    }
  }

  private generateOSINTData(): any[] {
    return [
      {
        id: '1',
        source: 'Twitter',
        content: 'Suspicious activity reported in sector 7',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        sentiment: 'negative',
        confidence: 0.85
      },
      {
        id: '2',
        source: 'News Feed',
        content: 'Cybersecurity incident at major corporation',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        sentiment: 'negative',
        confidence: 0.92
      },
      {
        id: '3',
        source: 'Forum',
        content: 'New vulnerability discovered in popular software',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        sentiment: 'neutral',
        confidence: 0.78
      }
    ]
  }

  private generateNetworkData(): any[] {
    return [
      {
        id: '1',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        sourceIP: '192.168.1.100',
        destIP: '10.0.0.50',
        port: 443,
        protocol: 'HTTPS',
        bytes: 2048,
        status: 'allowed'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        sourceIP: '203.0.113.45',
        destIP: '192.168.1.10',
        port: 22,
        protocol: 'SSH',
        bytes: 512,
        status: 'blocked'
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 5400000).toISOString(),
        sourceIP: '198.51.100.23',
        destIP: '192.168.1.25',
        port: 80,
        protocol: 'HTTP',
        bytes: 1024,
        status: 'allowed'
      }
    ]
  }

  private generateThreatData(): any[] {
    return [
      {
        id: '1',
        type: 'malware',
        name: 'Trojan.Generic.123456',
        severity: 'high',
        description: 'Banking trojan targeting financial institutions',
        iocs: ['hash:abc123', 'domain:malicious.example.com'],
        timestamp: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: '2',
        type: 'phishing',
        name: 'Phishing Campaign Alpha',
        severity: 'medium',
        description: 'Email phishing campaign targeting corporate users',
        iocs: ['email:phishing@example.com', 'url:fake-bank.com'],
        timestamp: new Date(Date.now() - 14400000).toISOString()
      }
    ]
  }

  private generateGenericData(): any[] {
    return [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        type: 'event',
        description: 'Generic data entry',
        value: Math.random() * 100
      }
    ]
  }

  updateSource(id: string, updates: Partial<DataSource>): void {
    const source = this.sources.get(id)
    if (!source) throw new Error(`Source not found: ${id}`)

    Object.assign(source, updates, { lastUpdated: new Date() })
    this.emit('sourceUpdated', source)
  }

  removeSource(id: string): void {
    const source = this.sources.get(id)
    if (!source) throw new Error(`Source not found: ${id}`)

    this.sources.delete(id)
    this.data.delete(id)
    this.emit('sourceRemoved', source)
  }

  getSources(): DataSource[] {
    return Array.from(this.sources.values())
  }

  getSource(id: string): DataSource | undefined {
    return this.sources.get(id)
  }

  getSourceData(id: string): any[] {
    return this.data.get(id) || []
  }

  getAllData(): any[] {
    const allData: any[] = []
    for (const data of this.data.values()) {
      allData.push(...data)
    }
    return allData
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  async shutdown(): Promise<void> {
    this.sources.clear()
    this.data.clear()
    this.isInitialized = false
    console.log('Data Source Manager shut down')
  }
}