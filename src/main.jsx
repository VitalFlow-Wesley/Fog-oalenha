import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import './styles.css'
import './theme.css'
import './cancel.css'
import './login-premium.css'
import './restaurant-tables.css'
import './dashboard-premium.css'
import './dashboard-compact.css'
import './reports-premium.css'
import './reports-complete-layout.css'
import './movement-peak-chart.css'
import './movement-peak-chart.js'
import './reports-header-actions-fix.css'
import './reports-simple-layout.css'
import './reports-print-scope-fix.css'
import './reports-print-scope-fix.js'
import './reports-closings-print-details.js'
import './reports-calendar-runtime.js'
import './settings-premium.css'
import './tables-settings.css'
import './printer-dynamic.css'
import './print-settings-v2.css'
import './settings-tabs-fix.css'
import './summary-cards-compact.css'
import './settings-footer-actions-fix.css'
import './printer-table-compact-fix.css'
import './permissions-info-fix.css'
import './access-permissions-cleanup.css'
import './products-settings.css'
import './products-mobile-final-fix.css'
import './product-storage-sync.js'
import './product-category-name-fix.js'
import './waiter-display-name-fix.js'
import './command-guests-editor.css'
import './kitchen-orders.css'
import './kitchen-orders-compact.css'
import './kitchen-waiter-print-fix.js'
import './kitchen-auto-refresh.js'
import './kitchen-print-guests-fix.js'
import './customer-name-kitchen-print-runtime.js'
import './customer-name-kitchen-print.css'
import './closing-cash.css'
import './closing-cash-refine.js'
import './closing-cash-bottom-fix.css'
import './closing-waiter-layout-fix.css'
import './closing-print-scope-fix.css'
import './closing-print-scope-fix.js'
import './cash-cycle-runtime-fix.js'
import './print.css'
import './print-blank-fix.css'
import './thermal-print-runtime.js'
import './command-premium.css'
import './sidebar-logout-fix.css'
import './sidebar-logo-brand.css'
import './mobile-layout-fix.css'
import './waiter-kitchen-mobile-fix.css'
import './waiter-kitchen-final-mobile.css'
import './reports-final-actions-clean.css'
import './reports-actions-overlap-fix.css'
import './reports-mobile-cards-fix.css'
import './closing-other-details-readable.css'
import './closing-mobile-cards-fix.css'
import './closing-mobile-final-hard-fix.css'
import './reports-toolbar-final.css'
import './reports-complete-compact.css'
import './closed-tables-compact-toolbar.js'
import './closed-tables-compact-toolbar.css'
import './item-observation-runtime.js'
import './item-observation.css'
import './table-customer-name-runtime.js'
import './table-customer-name.css'
import './app-quality-guard.css'
import './settings-access-layout-fix.css'
import './settings-permissions-compact.css'
import './command-mobile-layout-runtime.js'
import './command-mobile-compact.css'
import './command-mobile-title-row.css'
import './reports-mobile-final-override.css'

createRoot(document.getElementById('root')).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
      .catch(error => {
        console.warn('Service worker nao removido:', error.message)
      })
  })
}

if ('caches' in window) {
  window.addEventListener('load', () => {
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('fogao-a-lenha')).map(key => caches.delete(key))))
      .catch(error => {
        console.warn('Cache local nao limpo:', error.message)
      })
  })
}
