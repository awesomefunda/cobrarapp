import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// Remove pre-render splash once React takes over
const splash = document.getElementById('pre-splash')
if (splash) splash.remove()

// Last-resort global error handlers so desktop Chrome (where unhandled promise
// rejections used to silently kill init) still shows the user something useful.
window.addEventListener('error', (e) => {
  console.error('[cobrar] uncaught error:', e.error || e.message)
})
window.addEventListener('unhandledrejection', (e) => {
  console.error('[cobrar] unhandled rejection:', e.reason)
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
