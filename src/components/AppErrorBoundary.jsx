import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Falha não tratada na interface:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="appFatalError" role="alert">
        <div className="appFatalErrorCard">
          <span className="appFatalErrorIcon"><AlertTriangle size={28} /></span>
          <p className="eyebrow">FALHA TEMPORÁRIA</p>
          <h1>Não foi possível carregar esta tela</h1>
          <p>Seus dados permanecem salvos. Atualize o sistema para tentar novamente.</p>
          <button type="button" onClick={() => window.location.reload()}>
            <RefreshCw size={18} /> Atualizar sistema
          </button>
        </div>
      </main>
    )
  }
}
