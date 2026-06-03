import { Flame, Lock, User } from 'lucide-react'

export default function Login({ onLogin }) {
  return (
    <main className="loginPage">
      <section className="loginHero">
        <div className="heroBadge"><Flame size={22} /> Mesa & Brasa</div>
        <h1>Sistema de mesas e comandas para churrascaria familiar.</h1>
        <p>
          Controle o salão, envie pedidos para a cozinha, registre itens do bar
          e feche contas com mais rapidez.
        </p>
        <div className="heroPreview">
          <div>
            <strong>Mesa 04</strong>
            <span>Galinha caipira • Suco de cajá</span>
          </div>
          <b>Pedido enviado</b>
        </div>
      </section>

      <section className="loginCard">
        <h2>Entrar no sistema</h2>
        <p>Use qualquer dado para acessar a demonstração.</p>

        <label>
          <span>Usuário</span>
          <div className="inputIcon"><User size={18} /><input placeholder="admin@mesabrasa.com" /></div>
        </label>

        <label>
          <span>Senha</span>
          <div className="inputIcon"><Lock size={18} /><input type="password" placeholder="••••••••" /></div>
        </label>

        <button className="primaryBtn" onClick={onLogin}>Acessar painel</button>
      </section>
    </main>
  )
}
