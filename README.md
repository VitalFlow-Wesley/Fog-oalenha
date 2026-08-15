# Mesa & Brasa — Frontend

Frontend inicial para sistema de churrascaria familiar/fogão a lenha.

## Pronto nesta versão

- Login demonstrativo
- Home
- Dashboard
- Mesas e comandas
- Adicionar pedidos por categoria
- Regra de impressão para cozinha/churrasqueira/sucos
- Itens do bar apenas registrados na mesa
- Simulação de impressão da cozinha
- Fechamento de mesa
- Relatórios simples

## Rodar localmente

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Subir para um repositório novo

1. Crie um repositório novo no GitHub, por exemplo:

```text
mesa-brasa-frontend
```

2. Rode dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "feat: frontend inicial Mesa e Brasa"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/mesa-brasa-frontend.git
git push -u origin main
```

## Vercel

Na Vercel, importe o repositório novo do GitHub.

Configurações:
- Framework: Vite
- Build Command: npm run build
- Output Directory: dist

## Modo híbrido online/local

A implementação híbrida está documentada em:

- `docs/ARQUITETURA-HIBRIDA.md`
- `docs/INSTALACAO-LOCAL-WINDOWS.md`
- `docs/OPERACAO-E-RECUPERACAO.md`

Comandos principais:

```bash
npm run local:build
npm run local:start
npm run local:check
```

O servidor local reutiliza as mesmas APIs da versão online e conecta ao MongoDB Community Edition do computador do caixa.
