const pool = require('../database/connection');

const CATEGORIAS_PADRAO = [
  ['Salário', 'entrada'],
  ['Outras entradas', 'entrada'],
  ['Alimentação', 'saida'],
  ['Moradia', 'saida'],
  ['Saúde', 'saida'],
  ['Mobilidade', 'saida'],
  ['Lazer', 'saida'],
  ['Educação', 'saida'],
  ['Outras saídas', 'saida'],
];

class Usuario {
  async cadastrar({ nome, email, cpf, senhaHash }, callback) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Inserção do usuário
      const sqlUsuario =
        'INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES (?, ?, ?, ?)';
      const [resultado] = await connection.query(sqlUsuario, [
        nome,
        email,
        cpf,
        senhaHash,
      ]);

      const usuarioId = resultado.insertId;

      // 2. Inserção em lote das 9 categorias padrão
      const linhasCategorias = CATEGORIAS_PADRAO.map(([nomeCat, tipo]) => [
        usuarioId,
        nomeCat,
        tipo,
      ]);

      const sqlCategorias =
        'INSERT INTO categorias (usuario_id, nome, tipo) VALUES ?';
      await connection.query(sqlCategorias, [linhasCategorias]);

      // 3. Inserção da fonte/destino padrão
      const sqlFonte =
        "INSERT INTO fontes_destinos (usuario_id, nome, tipo) VALUES (?, 'Conta corrente', 'conta')";
      await connection.query(sqlFonte, [usuarioId]);

      // Confirma todas as operações
      await connection.commit();

      callback(null, {
        id: usuarioId,
        nome,
        email,
      });
    } catch (erro) {
      await connection.rollback();
      callback(erro);
    } finally {
      connection.release(); // Sempre devolve a conexão ao pool
    }
  }

  async buscarPorEmail(email, callback) {
    try {
      const sql =
        'SELECT id, nome, email, senha_hash FROM usuarios WHERE email = ?';
      const [resultados] = await pool.query(sql, [email]);
      callback(null, resultados[0] || null);
    } catch (erro) {
      callback(erro);
    }
  }

  async buscarPorId(id, callback) {
    try {
      const sql =
        'SELECT id, nome, email, cpf, criado_em FROM usuarios WHERE id = ?';
      const [resultados] = await pool.query(sql, [id]);
      callback(null, resultados[0] || null);
    } catch (erro) {
      callback(erro);
    }
  }
}

module.exports = new Usuario();