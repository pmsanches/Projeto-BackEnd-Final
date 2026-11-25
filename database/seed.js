require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

/**
 * Script automatizado para executar o povoamento (seed) do banco de dados.
 * Lê o arquivo seed.sql e executa em lote através da flag multipleStatements.
 */
async function executarSeed() {
  console.log('>> Iniciando povoamento do banco de dados (Seed)...');

  const caminhoSql = path.join(__dirname, 'seed.sql');

  if (!fs.existsSync(caminhoSql)) {
    console.error(`>> Arquivo SQL não encontrado em: ${caminhoSql}`);
    process.exit(1);
  }

  const sqlConteudo = fs.readFileSync(caminhoSql, 'utf-8');

  // Cria uma conexão direta permitindo múltiplas declarações SQL
  const conexao = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'api_financas',
    multipleStatements: true,
  });

  try {
    console.log(`>> Conectado ao banco "${process.env.DB_NAME || 'api_financas'}" com sucesso.`);
    console.log('>> Executando instruções SQL do seed.sql...');

    await conexao.query(sqlConteudo);

    console.log('>> Povoamento concluído com sucesso!');
    console.log('👥 Usuários criados:');
    console.log('   1. usuario.teste@email.com (Senha: SenhaSegura123)');
    console.log('   2. outro.usuario@email.com (Senha: SenhaSegura123)');
    console.log('📅 Histórico: 3 meses de lançamentos (Setembro, Outubro e Novembro de 2026).');
    console.log('💳 Inclui: Conta corrente, cartões de crédito e compra parcelada em 3x.');
  } catch (erro) {
    console.error('>> Erro ao executar o script de seed:', erro);
    process.exit(1);
  } finally {
    await conexao.end();
  }
}

executarSeed();
