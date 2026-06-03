import { Flame, Utensils, Printer, Smartphone } from 'lucide-react'

export default function Home({ setPage }) {
  return (
    <div className="page">
      <div className="welcome">
        <div>
          <span className="eyebrow">Churrascaria familiar • Fogão a lenha</span>
          <h1>Bem-vindo ao Mesa & Brasa</h1>
          <p>
            Frontend inicial para controlar mesas, comandas, pedidos da cozinha
            e fechamento de conta. Sem estoque nesta primeira etapa.
          </p>
          <button className="primaryBtn fit" onClick={() => setPage('mesas')}>Abrir mapa de mesas</button>
        </div>
        <div className="welcomeCard">
          <Flame size={42} />
          <strong>Operação simples</strong>
          <span>Garçom lança, cozinha recebe, caixa fecha.</span>
        </div>
      </div>

      <div className="featureGrid">
        <div className="featureCard"><Smartphone /><strong>Garçom no app</strong><span>Lança pedidos direto na mesa.</span></div>
        <div className="featureCard"><Printer /><strong>Impressão cozinha</strong><span>Só imprime cozinha, churrasco e sucos.</span></div>
        <div className="featureCard"><Utensils /><strong>Bar sem impressão</strong><span>Bebidas e sobremesas só entram na comanda.</span></div>
      </div>
    </div>
  )
}
