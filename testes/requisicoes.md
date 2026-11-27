# Requisições de teste

Servidor rodando em `http://localhost:3100`.

## Dica para Windows CMD vs PowerShell / Bash

No **CMD do Windows (`cmd.exe`)**:
1. Não utilize aspas simples `'...'` no parâmetro `-d`. O CMD não as reconhece como delimitadores de string, quebra o JSON nos espaços e causa o erro `{"erro":"JSON inválido."}`.
2. Utilize **aspas duplas externas** e **escape as aspas internas do JSON com barra invertida (`\"`)**:
   `-d "{\"campo\": \"valor\"}"`
3. Defina variáveis com `set TOKEN=...` e use `%TOKEN%`.
4. Os comandos abaixo estão formatados para compatibilidade total com o **CMD do Windows** (em linha única, sem risco de quebra de linha).

> No **PowerShell**, use `$token = "..."`, troque `curl` por `curl.exe` e mantenha as aspas escapadas: `-d "{\"nome\":\"Pets\",\"tipo\":\"saida\"}"`.
> No **Git Bash / Linux / macOS**, use `$TOKEN` e aspas simples `'{"nome":"Pets"}'`.

---

## Preparação

### Obter o token via Login no CMD:
Faça o login com as credenciais cadastradas para copiar o token retornado:

```cmd
curl -i -X POST http://localhost:3100/auth/login -H "Content-Type: application/json" -d "{\"email\":\"usuario.teste@email.com\",\"senha\":\"SenhaSegura123\"}"
```

Defina a variável no CMD:
```cmd
set TOKEN=seu_token_jwt_aqui
```

Caso precise testar com script mock sem passar pelo login:
```cmd
for /f "tokens=*" %i in ('node testes/gerarToken.js 1') do set TOKEN=%i
```

---

## Autenticação e Usuários

### Cadastrar novo usuário (201)
```cmd
curl -i -X POST http://localhost:3100/auth/cadastro -H "Content-Type: application/json" -d "{\"nome\": \"Usuário Teste\", \"email\": \"usuario.teste@email.com\", \"cpf\": \"52998224725\", \"senha\": \"SenhaSegura123\"}"
```

### Cadastrar com e-mail ou CPF duplicado (409)
Repetir o comando anterior.

### Cadastrar com dados inválidos (400)
```cmd
curl -i -X POST http://localhost:3100/auth/cadastro -H "Content-Type: application/json" -d "{\"nome\": \"Teste Falha\", \"email\": \"email-invalido\", \"cpf\": \"11111111111\", \"senha\": \"123\"}"
```

### Login com sucesso (200)
```cmd
curl -i -X POST http://localhost:3100/auth/login -H "Content-Type: application/json" -d "{\"email\": \"usuario.teste@email.com\", \"senha\": \"SenhaSegura123\"}"
```

### Login com credenciais inválidas (401)
```cmd
curl -i -X POST http://localhost:3100/auth/login -H "Content-Type: application/json" -d "{\"email\": \"usuario.teste@email.com\", \"senha\": \"SenhaErrada999\"}"
```

### Consultar perfil do usuário autenticado (200)
```cmd
curl -i http://localhost:3100/auth/me -H "Authorization: Bearer %TOKEN%"
```

### Consultar perfil sem token (401)
```cmd
curl -i http://localhost:3100/auth/me
```

---

## Categorias

### Listar todas (200)
```cmd
curl -i http://localhost:3100/categorias -H "Authorization: Bearer %TOKEN%"
```

### Filtrar por tipo (200)
```cmd
curl -i "http://localhost:3100/categorias?tipo=saida" -H "Authorization: Bearer %TOKEN%"
```

### Criar (201)
```cmd
curl -i -X POST http://localhost:3100/categorias -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"nome\":\"Pets\",\"tipo\":\"saida\"}"
```

### Criar duplicada (409)
Repetir o comando anterior.

### Criar com dados inválidos (400)
```cmd
curl -i -X POST http://localhost:3100/categorias -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"nome\":\"\",\"tipo\":\"xyz\"}"
```

### Atualizar (200)
```cmd
curl -i -X PUT http://localhost:3100/categorias/1 -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"nome\":\"Animais\",\"tipo\":\"saida\"}"
```

### Excluir (204, ou 409 se houver lançamentos)
```cmd
curl -i -X DELETE http://localhost:3100/categorias/1 -H "Authorization: Bearer %TOKEN%"
```

---

## Fontes/destinos

### Listar todas (200)
```cmd
curl -i http://localhost:3100/fontes-destinos -H "Authorization: Bearer %TOKEN%"
```

### Filtrar por tipo (200)
```cmd
curl -i "http://localhost:3100/fontes-destinos?tipo=cartao_credito" -H "Authorization: Bearer %TOKEN%"
```

### Criar cartão de crédito (201)
```cmd
curl -i -X POST http://localhost:3100/fontes-destinos -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"nome\":\"Nubank\",\"tipo\":\"cartao_credito\",\"dia_fechamento\":3,\"dia_vencimento\":10,\"limite\":2000}"
```

### Criar cartão sem os campos obrigatórios (400)
```cmd
curl -i -X POST http://localhost:3100/fontes-destinos -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"nome\":\"Inter\",\"tipo\":\"cartao_credito\"}"
```

### Criar conta (201, campos de cartão ficam null)
```cmd
curl -i -X POST http://localhost:3100/fontes-destinos -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"nome\":\"Itaú\",\"tipo\":\"conta\"}"
```

### Nome duplicado (409)
```cmd
curl -i -X POST http://localhost:3100/fontes-destinos -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"nome\":\"Nubank\",\"tipo\":\"conta\"}"
```

### Atualizar (200)
```cmd
curl -i -X PUT http://localhost:3100/fontes-destinos/2 -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"nome\":\"Itaú Conta\",\"tipo\":\"conta\"}"
```

### Excluir (204, ou 409 se houver lançamentos)
```cmd
curl -i -X DELETE http://localhost:3100/fontes-destinos/2 -H "Authorization: Bearer %TOKEN%"
```

---

## Lançamentos

### Criar lançamento à vista / entrada (201)
```cmd
curl -i -X POST http://localhost:3100/lancamentos -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"tipo\":\"entrada\",\"descricao\":\"Salário Mensal\",\"valor\":5000.00,\"data\":\"2026-11-05\",\"categoriaId\":1,\"fonteDestinoId\":1}"
```

### Criar despesa à vista (201)
```cmd
curl -i -X POST http://localhost:3100/lancamentos -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"tipo\":\"saida\",\"descricao\":\"Compras do Mês Supermercado\",\"valor\":450.50,\"data\":\"2026-11-10\",\"categoriaId\":3,\"fonteDestinoId\":1}"
```

### Criar compra parcelada no cartão de crédito (201)
```cmd
curl -i -X POST http://localhost:3100/lancamentos -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"tipo\":\"saida\",\"descricao\":\"Notebook Trabalho\",\"valor\":3100.00,\"data\":\"2026-11-15\",\"categoriaId\":7,\"fonteDestinoId\":2,\"parcelas\":10}"
```

### Criar com dados inválidos (400)
```cmd
curl -i -X POST http://localhost:3100/lancamentos -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"tipo\":\"invalido\",\"descricao\":\"\",\"valor\":-50,\"data\":\"15/11/2026\",\"categoriaId\":\"abc\"}"
```

### Criar com incompatibilidade de tipo entre categoria e lançamento (400)
```cmd
curl -i -X POST http://localhost:3100/lancamentos -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"tipo\":\"saida\",\"descricao\":\"Tentativa Incompatível\",\"valor\":100.00,\"data\":\"2026-11-20\",\"categoriaId\":1,\"fonteDestinoId\":1}"
```

### Criar com categoria ou fonte inexistente / de outro usuário (404)
```cmd
curl -i -X POST http://localhost:3100/lancamentos -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"tipo\":\"saida\",\"descricao\":\"Teste 404\",\"valor\":100.00,\"data\":\"2026-11-20\",\"categoriaId\":9999,\"fonteDestinoId\":1}"
```

### Listar lançamentos do mês corrente com resumo (200)
```cmd
curl -i http://localhost:3100/lancamentos -H "Authorization: Bearer %TOKEN%"
```

### Filtrar lançamentos por período (200)
```cmd
curl -i "http://localhost:3100/lancamentos?inicio=2026-11-01&fim=2026-11-30" -H "Authorization: Bearer %TOKEN%"
```

### Filtrar por tipo (200)
```cmd
curl -i "http://localhost:3100/lancamentos?tipo=saida" -H "Authorization: Bearer %TOKEN%"
```

### Filtrar por categoria, fonte/destino e paginação (200)
```cmd
curl -i "http://localhost:3100/lancamentos?categoriaId=3&fonteDestinoId=1&pagina=1" -H "Authorization: Bearer %TOKEN%"
```

### Consultar lançamento específico por ID (200)
```cmd
curl -i http://localhost:3100/lancamentos/1 -H "Authorization: Bearer %TOKEN%"
```

### Atualizar lançamento (200)
```cmd
curl -i -X PUT http://localhost:3100/lancamentos/1 -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"tipo\":\"entrada\",\"descricao\":\"Salário Mensal com Bônus\",\"valor\":5500.00,\"data\":\"2026-11-05\",\"categoriaId\":1,\"fonteDestinoId\":1}"
```

### Excluir uma única parcela/lançamento (204)
```cmd
curl -i -X DELETE http://localhost:3100/lancamentos/1 -H "Authorization: Bearer %TOKEN%"
```

### Excluir todas as parcelas de uma compra parcelada (204)
```cmd
curl -i -X DELETE "http://localhost:3100/lancamentos/3?todasParcelas=true" -H "Authorization: Bearer %TOKEN%"
```

---

## Relatórios

### Relatório por categoria (RF7 - 200)
```cmd
curl -i "http://localhost:3100/relatorios/categorias?inicio=2026-11-01&fim=2026-11-30" -H "Authorization: Bearer %TOKEN%"
```

### Relatório por categoria - Comparação com mês anterior (200)
```cmd
curl -i "http://localhost:3100/relatorios/categorias?inicio=2026-10-01&fim=2026-10-31" -H "Authorization: Bearer %TOKEN%"
```

### Relatório por categoria - Falta de parâmetros de data (400)
```cmd
curl -i "http://localhost:3100/relatorios/categorias" -H "Authorization: Bearer %TOKEN%"
```

### Relatório por categoria - Formato de data inválido (400)
```cmd
curl -i "http://localhost:3100/relatorios/categorias?inicio=01-11-2026&fim=30-11-2026" -H "Authorization: Bearer %TOKEN%"
```

### Relatório por categoria - Data inicial posterior à data final (400)
```cmd
curl -i "http://localhost:3100/relatorios/categorias?inicio=2026-11-30&fim=2026-11-01" -H "Authorization: Bearer %TOKEN%"
```

### Relatório por fontes/destinos (RF8 - 200)
```cmd
curl -i "http://localhost:3100/relatorios/fontes-destinos?inicio=2026-11-01&fim=2026-11-30" -H "Authorization: Bearer %TOKEN%"
```

### Relatório por fontes/destinos - Falta de parâmetros de data (400)
```cmd
curl -i "http://localhost:3100/relatorios/fontes-destinos" -H "Authorization: Bearer %TOKEN%"
```

### Relatórios sem autenticação (401)
```cmd
curl -i "http://localhost:3100/relatorios/categorias?inicio=2026-11-01&fim=2026-11-30"
```

---

### Previsão de faturas de cartão de crédito - Padrão 3 meses (RF9 - 200)
```cmd
curl -i "http://localhost:3100/relatorios/faturas" -H "Authorization: Bearer %TOKEN%"
```

### Previsão de faturas - Especificando quantidade de meses (ex: 6 meses) (200)
```cmd
curl -i "http://localhost:3100/relatorios/faturas?meses=6" -H "Authorization: Bearer %TOKEN%"
```

### Previsão de faturas - Parâmetro meses inválido (400)
```cmd
curl -i "http://localhost:3100/relatorios/faturas?meses=0" -H "Authorization: Bearer %TOKEN%"
```

```cmd
curl -i "http://localhost:3100/relatorios/faturas?meses=15" -H "Authorization: Bearer %TOKEN%"
```

### Previsão de faturas sem autenticação (401)
```cmd
curl -i "http://localhost:3100/relatorios/faturas"
```

---

## Isolamento entre usuários (404)

### Tentar alterar categoria de outro usuário
```cmd
curl -i -X PUT http://localhost:3100/categorias/1 -H "Authorization: Bearer %TOKEN2%" -H "Content-Type: application/json" -d "{\"nome\":\"Hack\",\"tipo\":\"saida\"}"
```

### Tentar consultar lançamento de outro usuário
```cmd
curl -i http://localhost:3100/lancamentos/1 -H "Authorization: Bearer %TOKEN2%"
```

### Tentar excluir lançamento de outro usuário
```cmd
curl -i -X DELETE http://localhost:3100/lancamentos/1 -H "Authorization: Bearer %TOKEN2%"
```
