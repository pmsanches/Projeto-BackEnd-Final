# Requisições de teste

Servidor rodando em `http://localhost:3000`.

## Preparação

Enquanto o login não estiver pronto, gere um token de teste (id do usuário no final):

```bash
TOKEN=$(node testes/gerarToken.js 1)
```

> No PowerShell, use `$token = node testes/gerarToken.js 1`, troque `curl` por `curl.exe`
> e escape as aspas do JSON: `-d '{\"nome\":\"Pets\",\"tipo\":\"saida\"}'`.

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

## Isolamento entre usuários (404)

```bash
TOKEN2=$(node testes/gerarToken.js 2)
curl -i -X PUT http://localhost:3000/categorias/1 \
  -H "Authorization: Bearer $TOKEN2" -H "Content-Type: application/json" \
  -d '{"nome":"Hack","tipo":"saida"}'
```