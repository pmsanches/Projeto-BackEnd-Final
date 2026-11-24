# Requisições de teste

Servidor rodando em `http://localhost:3000`.

## Preparação

Com o módulo de autenticação implementado, você pode obter o token real fazendo login:

```bash
# Faz login e extrai o token JWT (usando jq no Linux/Mac/Git Bash):
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario.teste@email.com","senha":"SenhaSegura123"}' | jq -r .token)
```

Caso precise testar com script mock sem passar pelo login:

```bash
TOKEN=$(node testes/gerarToken.js 1)
```

> No PowerShell, use `$token = node testes/gerarToken.js 1`, troque `curl` por `curl.exe`
> e escape as aspas do JSON: `-d "{\"nome\":\"Pets\",\"tipo\":\"saida\"}"`.

---

## Autenticação e Usuários

### Cadastrar novo usuário (201)
```bash
curl -i -X POST http://localhost:3000/auth/cadastro \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Usuário Teste",
    "email": "usuario.teste@email.com",
    "cpf": "52998224725",
    "senha": "SenhaSegura123"
  }'
```

### Cadastrar com e-mail ou CPF duplicado (409)
Repetir o comando anterior.

### Cadastrar com dados inválidos (400)
```bash
curl -i -X POST http://localhost:3000/auth/cadastro \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste Falha",
    "email": "email-invalido",
    "cpf": "11111111111",
    "senha": "123"
  }'
```

### Login com sucesso (200)
```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario.teste@email.com",
    "senha": "SenhaSegura123"
  }'
```

### Login com credenciais inválidas (401)
```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario.teste@email.com",
    "senha": "SenhaErrada999"
  }'
```

### Consultar perfil do usuário autenticado (200)
```bash
curl -i http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Consultar perfil sem token (401)
```bash
curl -i http://localhost:3000/auth/me
```

---

## Categorias

### Listar todas
```bash
curl -i http://localhost:3000/categorias -H "Authorization: Bearer $TOKEN"
```

### Filtrar por tipo
```bash
curl -i "http://localhost:3000/categorias?tipo=saida" -H "Authorization: Bearer $TOKEN"
```

### Criar (201)
```bash
curl -i -X POST http://localhost:3000/categorias \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"nome":"Pets","tipo":"saida"}'
```

### Criar duplicada (409)
Repetir o comando anterior.

### Criar com dados inválidos (400)
```bash
curl -i -X POST http://localhost:3000/categorias \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"nome":"","tipo":"xyz"}'
```

### Atualizar (200)
```bash
curl -i -X PUT http://localhost:3000/categorias/1 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"nome":"Animais","tipo":"saida"}'
```

### Excluir (204, ou 409 se houver lançamentos)
```bash
curl -i -X DELETE http://localhost:3000/categorias/1 -H "Authorization: Bearer $TOKEN"
```

---

## Fontes/destinos

### Listar todas
```bash
curl -i http://localhost:3000/fontes-destinos -H "Authorization: Bearer $TOKEN"
```

### Filtrar por tipo
```bash
curl -i "http://localhost:3000/fontes-destinos?tipo=cartao_credito" -H "Authorization: Bearer $TOKEN"
```

### Criar cartão de crédito (201)
```bash
curl -i -X POST http://localhost:3000/fontes-destinos \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"nome":"Nubank","tipo":"cartao_credito","dia_fechamento":3,"dia_vencimento":10,"limite":2000}'
```

### Criar cartão sem os campos obrigatórios (400)
```bash
curl -i -X POST http://localhost:3000/fontes-destinos \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"nome":"Inter","tipo":"cartao_credito"}'
```

### Criar conta (201, campos de cartão ficam null)
```bash
curl -i -X POST http://localhost:3000/fontes-destinos \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"nome":"Itaú","tipo":"conta"}'
```

### Nome duplicado (409)
```bash
curl -i -X POST http://localhost:3000/fontes-destinos \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"nome":"Nubank","tipo":"conta"}'
```

### Atualizar (200)
```bash
curl -i -X PUT http://localhost:3000/fontes-destinos/2 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"nome":"Itaú Conta","tipo":"conta"}'
```

### Excluir (204, ou 409 se houver lançamentos)
```bash
curl -i -X DELETE http://localhost:3000/fontes-destinos/2 -H "Authorization: Bearer $TOKEN"
```

---

## Lançamentos

### Criar lançamento à vista / entrada (201)
```bash
curl -i -X POST http://localhost:3000/lancamentos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "entrada",
    "descricao": "Salário Mensal",
    "valor": 5000.00,
    "data": "2026-11-05",
    "categoriaId": 1,
    "fonteDestinoId": 1
  }'
```

### Criar despesa à vista (201)
```bash
curl -i -X POST http://localhost:3000/lancamentos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "saida",
    "descricao": "Compras do Mês Supermercado",
    "valor": 450.50,
    "data": "2026-11-10",
    "categoriaId": 3,
    "fonteDestinoId": 1
  }'
```

### Criar compra parcelada no cartão de crédito (201)
```bash
curl -i -X POST http://localhost:3000/lancamentos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "saida",
    "descricao": "Notebook Trabalho",
    "valor": 3000.00,
    "data": "2026-11-15",
    "categoriaId": 7,
    "fonteDestinoId": 2,
    "parcelas": 10
  }'
```

### Criar com dados inválidos (400)
```bash
curl -i -X POST http://localhost:3000/lancamentos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "invalido",
    "descricao": "",
    "valor": -50,
    "data": "15/11/2026",
    "categoriaId": "abc"
  }'
```

### Criar com incompatibilidade de tipo entre categoria e lançamento (400)
> Tenta associar uma despesa (`saida`) com uma categoria de receita (`entrada`):
```bash
curl -i -X POST http://localhost:3000/lancamentos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "saida",
    "descricao": "Tentativa Incompatível",
    "valor": 100.00,
    "data": "2026-11-20",
    "categoriaId": 1,
    "fonteDestinoId": 1
  }'
```

### Criar com categoria ou fonte inexistente / de outro usuário (404)
```bash
curl -i -X POST http://localhost:3000/lancamentos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "saida",
    "descricao": "Teste 404",
    "valor": 100.00,
    "data": "2026-11-20",
    "categoriaId": 9999,
    "fonteDestinoId": 1
  }'
```

### Listar lançamentos do mês corrente com resumo (200)
```bash
curl -i http://localhost:3000/lancamentos \
  -H "Authorization: Bearer $TOKEN"
```

### Filtrar lançamentos por período (200)
```bash
curl -i "http://localhost:3000/lancamentos?inicio=2026-11-01&fim=2026-11-30" \
  -H "Authorization: Bearer $TOKEN"
```

### Filtrar por tipo (200)
```bash
curl -i "http://localhost:3000/lancamentos?tipo=saida" \
  -H "Authorization: Bearer $TOKEN"
```

### Filtrar por categoria, fonte/destino e paginação (200)
```bash
curl -i "http://localhost:3000/lancamentos?categoriaId=3&fonteDestinoId=1&pagina=1" \
  -H "Authorization: Bearer $TOKEN"
```

### Consultar lançamento específico por ID (200)
```bash
curl -i http://localhost:3000/lancamentos/1 \
  -H "Authorization: Bearer $TOKEN"
```

### Atualizar lançamento (200)
```bash
curl -i -X PUT http://localhost:3000/lancamentos/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "entrada",
    "descricao": "Salário Mensal com Bônus",
    "valor": 5500.00,
    "data": "2026-11-05",
    "categoriaId": 1,
    "fonteDestinoId": 1
  }'
```

### Excluir uma única parcela/lançamento (204)
```bash
curl -i -X DELETE http://localhost:3000/lancamentos/1 \
  -H "Authorization: Bearer $TOKEN"
```

### Excluir todas as parcelas de uma compra parcelada (204)
```bash
curl -i -X DELETE "http://localhost:3000/lancamentos/3?todasParcelas=true" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Isolamento entre usuários (404)

### Tentar alterar categoria de outro usuário
```bash
TOKEN2=$(node testes/gerarToken.js 2)
curl -i -X PUT http://localhost:3000/categorias/1 \
  -H "Authorization: Bearer $TOKEN2" -H "Content-Type: application/json" \
  -d '{"nome":"Hack","tipo":"saida"}'
```

### Tentar consultar lançamento de outro usuário
```bash
curl -i http://localhost:3000/lancamentos/1 \
  -H "Authorization: Bearer $TOKEN2"
```

### Tentar excluir lançamento de outro usuário
```bash
curl -i -X DELETE http://localhost:3000/lancamentos/1 \
  -H "Authorization: Bearer $TOKEN2"
```
