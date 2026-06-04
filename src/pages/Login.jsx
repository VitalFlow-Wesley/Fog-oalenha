import { useState } from 'react'
import { Flame, Lock, User } from 'lucide-react'

export default function Login({ onLogin, users }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
    <main className="loginPage loginPageClean">
      <section className="loginBrandPanel">
        <div className="fogaoLogo">
          <div className="fogaoLogoIcon"><Flame size={54} /></div>
          <div>
            <span>Churrascaria</span>
            <strong>Fogão a Lenha</strong>
            <small>Comida caseira • Bar • Churrasco</small>
          </div>
        </div>
      </section>

      <section className="loginCard">
        <h2>Entrar no sistema</h2>

        <form onSubmit={handleSubmit}>
          <label>
            <span>Login</span>
            <div className="inputIcon">
              <User size={18} />
              <input value={username} onChange={event => setUsername(event.target.value)} placeholder="Digite seu login" />
            </div>
          </label>

          <label>
            <span>Senha</span>
            <div className="inputIcon">
              <Lock size={18} />
              <input value={password} onChange={event => setPassword(event.target.value)} type="password" placeholder="Digite sua senha" />
            </div>
          </label>

          {error && <div className="loginError">{error}</div>}

          <button className="primaryBtn" type="submit">Acessar sistema</button>
        </form>
      </section>
    </main>
  )
}
