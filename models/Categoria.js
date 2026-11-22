const pool = require('../database/connection');

async function listar(usuarioId, tipo) {
  let sql = 'SELECT id, nome, tipo FROM categorias WHERE usuario_id = ?';
  const params = [usuarioId];

  if (tipo) {
    sql += ' AND tipo = ?';
    params.push(tipo);
  }

  sql += ' ORDER BY tipo, nome';
  const [linhas] = await pool.query(sql, params);
  return linhas;
}

async function buscarPorId(id, usuarioId) {
  const [linhas] = await pool.query(
    'SELECT id, nome, tipo FROM categorias WHERE id = ? AND usuario_id = ?',
    [id, usuarioId]
  );
  return linhas[0] || null;
}

async function criar(usuarioId, { nome, tipo }) {
  const [resultado] = await pool.query(
    'INSERT INTO categorias (usuario_id, nome, tipo) VALUES (?, ?, ?)',
    [usuarioId, nome, tipo]
  );
  return { id: resultado.insertId, nome, tipo };
}

async function atualizar(id, usuarioId, { nome, tipo }) {
  await pool.query(
    'UPDATE categorias SET nome = ?, tipo = ? WHERE id = ? AND usuario_id = ?',
    [nome, tipo, id, usuarioId]
  );
  return { id: Number(id), nome, tipo };
}

async function possuiLancamentos(id) {
  const [linhas] = await pool.query(
    'SELECT COUNT(*) AS total FROM lancamentos WHERE categoria_id = ?',
    [id]
  );
  return linhas[0].total > 0;
}

async function excluir(id, usuarioId) {
  await pool.query(
    'DELETE FROM categorias WHERE id = ? AND usuario_id = ?',
    [id, usuarioId]
  );
}

module.exports = { listar, buscarPorId, criar, atualizar, possuiLancamentos, excluir };