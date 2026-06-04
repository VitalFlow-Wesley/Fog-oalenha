import { useState } from 'react'
import { Eye, EyeOff, Flame, Lock, User } from 'lucide-react'
import loginBackground from '../assets/loginBackground.js'

export default function Login({ onLogin, users }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()

    const foundUser = users.find(user =>
      user.active &&
      user.username.trim().toLowerCase() === username.trim().toLowerCase() &&
      user.password === password
    )

    if (!foundUser) {
      setError('Login ou senha inválidos. Verifique os dados e tente novamente.')
      return
    }

    setError('')
    onLogin(foundUser)
  }

  return (
    <main className="loginPage loginPageClean loginPremiumPage" style={{ backgroundImage: `url(${loginBackground})` }}>
      <section className="loginCard loginPremiumCard loginOnlyCard">
        <div className="loginFireBadge">
          <Flame size={30} />
        </div>

        <h2>Entrar no sistema</h2>
        <p>Bem-vindo ao sistema de gestão</p>

        <form onSubmit={handleSubmit}>
          <label>
            <span>Login</span>
            <div className="inputIcon premiumInputIcon">
              <User size={20} />
              <input value={username} onChange={event => setUsername(event.target.value)} placeholder="Digite seu login" />
            </div>
          </label>

          <label>
            <span>Senha</span>
            <div className="inputIcon premiumInputIcon passwordInputIcon">
              <Lock size={20} />
              <input value={password} onChange={event => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Digite sua senha" />
              <button type="button" className="showPasswordBtn" onClick={() => setShowPassword(prev => !prev)} aria-label="Mostrar ou esconder senha">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </label>

          {error && <div className="loginError">{error}</div>}

          <button className="primaryBtn premiumLoginBtn" type="submit">Acessar sistema</button>
        </form>

        <div className="systemInternalBadge">
          <Lock size={14} />
          Sistema interno
        </div>
      </section>
    </main>
  )
}
