# Arquitetura híbrida — Fogão a Lenha

## Ambientes

### Online

- Frontend Vite hospedado na Vercel.
- Funções em `api/`.
- MongoDB Atlas.
- URL oficial: `https://project-c6vsh.vercel.app`.

### Local

- O mesmo frontend compilado é servido pelo computador do caixa.
- `local-server/server.js` adapta as mesmas funções em `api/` para Express.
- MongoDB Community Edition em `127.0.0.1:27017`.
- Celulares acessam `http://IP-DO-CAIXA:3000` pela rede Wi-Fi.
- A fila de impressão também fica no MongoDB local.

## Regra de autoridade

Durante o expediente local, o MongoDB do restaurante é a autoridade para mesas, pedidos, impressão e fechamento. Não opere uma mesma mesa simultaneamente na URL online e local.

Históricos são mesclados por identificador. Na sincronização `push`, produtos, usuários, configurações e mesas locais prevalecem; históricos existentes no Atlas são preservados e combinados sem duplicar IDs.

## Contrato de API preservado

- `/api/auth/login`, `/logout`, `/session`, `/authorize`
- `/api/state`
- `/api/users`, `/api/products`, `/api/tables`
- `/api/print-jobs`
- `/api/qz-certificate`, `/api/qz-sign`
- `/api/health` e `/api/runtime-config` no ambiente local

O backend antigo em `backend/` não é usado como servidor local porque possui rotas parciais e modelos incompatíveis. A implementação local reutiliza a API comprovada da aplicação online.

## Segurança

- `local-server/.env` nunca deve ser enviado ao GitHub.
- O cookie de sessão usa `Secure` online e o desativa somente na rede HTTP local.
- O Firewall deve liberar a porta 3000 apenas no perfil de rede Privada.
- `APP_AUTH_SECRET`, `PRINT_AGENT_TOKEN` e conexões MongoDB devem permanecer somente no `.env`.
- Troque a credencial do Atlas que já apareceu anteriormente no histórico do repositório.
