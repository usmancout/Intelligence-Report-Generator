import './style.css'
import { IntelligenceReportGenerator } from './core/IntelligenceReportGenerator'

// Initialize the application
const app = new IntelligenceReportGenerator()

// Start the application
app.initialize()

// Make app globally available for debugging
;(window as any).app = app