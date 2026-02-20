# 🚀 Guia de Restauração de Backup - MeuWhatsApp

Este repositório contém backups críticos da base de dados e do cache Redis realizados em 20/02/2026. Siga este guia para restaurar o sistema em um novo ambiente ou após a destruição dos containers.

## 📦 Arquivos de Backup
- `database_backup.sql`: Dump completo do PostgreSQL.
- `redis_backup.rdb`: Snapshot do estado do Redis.

---

## 🛠️ Passo 1: Identificar os Novos Containers
Após subir o serviço no Easypanel (ou Docker local), identifique os nomes dos novos containers:
```bash
docker ps --format "table {{.Names}}"
```

---

## 🐘 Passo 2: Restaurar PostgreSQL
Certifique-se de que o container do Postgres está rodando. Execute o comando abaixo a partir da raiz deste projeto no seu terminal local (onde está o arquivo `.sql`):

```bash
# Comando para restaurar (Substitua <NOME_DO_CONTAINER_POSTGRES>)
cat database_backup.sql | docker exec -i <NOME_DO_CONTAINER_POSTGRES> psql -U whatsbenemax -d whatsbenemax
```

---

## 🔴 Passo 3: Restaurar Redis
O Redis lê o estado do arquivo `dump.rdb` ao iniciar.

1. **Pare o container do Redis** (para não sobrescrever o arquivo ao fechar):
   ```bash
   docker stop <NOME_DO_CONTAINER_REDIS>
   ```

2. **Envie o backup para o servidor** (se não estiver lá):
   ```bash
   scp ./redis_backup.rdb root@<IP_DO_SERVIDOR>:~/redis_backup.rdb
   ```

3. **Mova o arquivo para dentro do volume do Redis** (Geralmente em `/data/dump.rdb` no container):
   ```bash
   # Remova o antigo e coloque o novo (ajuste o caminho se necessário)
   docker cp ./redis_backup.rdb <NOME_DO_CONTAINER_REDIS>:/data/dump.rdb
   ```

4. **Inicie o container novamente**:
   ```bash
   docker start <NOME_DO_CONTAINER_REDIS>
   ```

---

## ⚙️ Passo 4: Variáveis de Ambiente
Verifique se o seu novo `.env` possui as credenciais que usamos no backup:

```env
DATABASE_URL=postgresql://whatsbenemax:@412Trocar@postgres:5432/whatsbenemax
REDIS_URL=redis://:@412Trocar@redis:6379
```

---

## 📝 Notas de Manutenção
- Os backups foram realizados com os containers originais do Easypanel.
- A senha padrão utilizada nas operações foi `@412Trocar`.
- Se os nomes dos bancos ou usuários mudarem na nova instalação, ajuste os comandos acima.

---
*Backup realizado por Antigravity AI - 2026*
