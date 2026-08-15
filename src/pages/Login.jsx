import { useState } from 'react'
import { Eye, EyeOff, Flame, Lock, User } from 'lucide-react'
import loginBackground from '../assets/login-bg.png'

export default function Login({ onLogin, runtimeConfig }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Login ou senha invalidos.')
      setError('')
      onLogin(payload.user)
    } catch (loginError) {
      setError(loginError.message || 'Nao foi possivel entrar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="loginPage loginPageClean loginPremiumPage" style={{ backgroundImage: `url(${loginBackground})` }}>
      <section className="loginCard loginPremiumCard loginOnlyCard">
        <div className="loginFireBadge"><Flame size={30} /></div>
        <h2>Entrar no sistema</h2>
        <p>Bem-vindo ao sistema de gestao</p>
        <form onSubmit={handleSubmit}>
          <label><span>Login</span><div className="inputIcon premiumInputIcon"><User size={20} /><input value={username} onChange={event => setUsername(event.target.value)} placeholder="Digite seu login" autoComplete="username" /></div></label>
          <label><span>Senha</span><div className="inputIcon premiumInputIcon passwordInputIcon"><Lock size={20} /><input value={password} onChange={event => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Digite sua senha" autoComplete="current-password" /><button type="button" className="showPasswordBtn" onClick={() => setShowPassword(value => !value)} aria-label="Mostrar ou esconder senha">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div></label>
          {error && <div className="loginError">{error}</div>}
          <button className="primaryBtn premiumLoginBtn" type="submit" disabled={busy}>{busy ? 'Entrando...' : 'Acessar sistema'}</button>
        </form>
        <div className="systemInternalBadge"><Lock size={14} />Sistema interno</div>
        <div className={`loginEnvironmentBadge ${runtimeConfig?.mode === 'local' ? 'local' : 'online'}`}>{runtimeConfig?.mode === 'local' ? 'Servidor local — funciona sem internet' : 'Sistema online'}</div>
      </section>
    </main>
  )
}
