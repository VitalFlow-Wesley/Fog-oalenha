# Instalação local no Windows

## Requisitos

- Windows 10 ou 11 atualizado.
- Node.js LTS.
- MongoDB Community Edition com MongoDB Database Tools.
- Computador conectado por cabo ao roteador, quando possível.
- Perfil da rede Windows definido como **Privado**.
- Reserva de IP no roteador para o computador do caixa.

## Preparação

Abra o PowerShell como Administrador e execute na pasta do projeto:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\instalar-local.ps1 -InstalarMongoDb
```

O instalador:

1. verifica ou instala o MongoDB;
2. cria `local-server/.env` com segredos aleatórios;
3. instala as dependências Node;
4. compila o frontend;
5. libera a porta TCP 3000 somente para rede privada.

Revise `local-server/.env`. Nunca compartilhe seu conteúdo.

## Importação inicial do Atlas

1. Coloque a conexão do Atlas em `ONLINE_MONGODB_URI` dentro de `local-server/.env`.
2. Pare o atendimento e faça backup do Atlas.
3. Execute:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\importar-atlas.ps1
```

4. Confirme usuários, produtos, históricos e quantidade de mesas.
5. Remova ou proteja a conexão do Atlas após a importação se a sincronização automática não for usada.

## Iniciar

Clique em `Iniciar Fogao a Lenha.cmd` ou execute:

```powershell
.\scripts\windows\iniciar-local.ps1 -ComAgenteImpressao
```

O terminal exibirá o endereço que deve ser aberto nos celulares, por exemplo:

```text
http://192.168.1.50:3000
```

Todos os aparelhos precisam estar no mesmo Wi-Fi e sem isolamento de clientes habilitado no roteador.

## Iniciar automaticamente com o Windows

Abra o PowerShell como Administrador e execute:

```powershell
.\scripts\windows\registrar-inicializacao.ps1
```

Para remover a inicialização automática:

```powershell
.\scripts\windows\registrar-inicializacao.ps1 -Remover
```

## Verificações

```powershell
.\scripts\windows\status-local.ps1
.\scripts\windows\diagnostico-rede.ps1
npm run local:check
```

## Atualização

1. Feche o caixa e faça backup.
2. Pare o servidor.
3. Atualize somente a branch homologada.
4. Execute `npm install` e `npm run local:build`.
5. Inicie e realize o teste rápido antes do expediente.
