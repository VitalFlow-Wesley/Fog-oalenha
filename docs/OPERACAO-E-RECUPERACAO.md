# Operação, backup e recuperação

## Rotina de abertura

1. Ligue roteador, caixa e impressoras.
2. Inicie o sistema local.
3. Abra `status-local.ps1`.
4. Teste login, uma mesa temporária e a fila de impressão sem gastar papel, usando simulação.
5. Compartilhe o endereço local com os celulares.

## Se a internet cair

Não é necessário trocar nada. Continue usando o endereço local. A rede Wi-Fi precisa permanecer ligada.

## Se o servidor local parar

1. Execute `status-local.ps1`.
2. Execute `parar-local.ps1`.
3. Execute `iniciar-local.ps1`.
4. As mesas permanecem no MongoDB local.

## Backup

```powershell
.\scripts\windows\backup-local.ps1
```

São mantidos os 30 backups mais recentes. Copie a pasta de backups para outro disco ou pasta sincronizada. Um backup no mesmo computador não protege contra falha do disco.

## Restauração

Pare o atendimento e execute:

```powershell
.\scripts\windows\restaurar-local.ps1 -Arquivo .\backups\fogao-local_DATA.archive.gz
```

A restauração exige digitar `RESTAURAR` e substitui o banco local. Faça outro backup antes.

## Sincronização

### Importar Atlas para local

```powershell
npm run local:sync:pull
```

### Enviar local para Atlas

```powershell
npm run local:sync:push
```

Antes do `push`, feche o expediente e confirme que ninguém está alterando mesas pela URL online. A sincronização cria uma cópia do estado de destino em `sync_backups`.

Para sincronização periódica, configure `SYNC_ENABLED=true`. O padrão é `false` por segurança.

## Procedimento de emergência

Se computador e banco local ficarem indisponíveis:

1. não tente executar duas restaurações ao mesmo tempo;
2. use a URL online somente depois de decidir oficialmente mudar o expediente para o online;
3. não retorne ao local até sincronizar os dados produzidos online;
4. registre horário da troca e responsável.
