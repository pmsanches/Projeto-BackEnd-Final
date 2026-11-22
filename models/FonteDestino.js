const pool = require('../database/connection');

const CAMPOS = 'id, nome, tipo, dia_fechamento, dia_vencimento, limite';

function formatar(linha) {
  return {
    ...linha,
    limite: linha.limite === null ? null : Number(linha.limite)
  };
}

async function listar(usuarioId, tipo) {
  let sql = `SELECT ${CAMPOS} FROM fontes_destinos WHERE usuario_id = ?`;
  const params = [usuarioId];

  if (tipo) {
    sql += ' AND tipo = ?';
    params.push(tipo);
  }

  sql += ' ORDER BY tipo, nome';
  const [linhas] = await pool.query(sql, params);
  return linhas.map(formatar);
}

async function buscarPorId(id, usuarioId) {
  const [linhas] = await pool.query(
    `SELECT ${CAMPOS} FROM fontes_destinos WHERE id = ? AND usuario_id = ?`,
    [id, usuarioId]
  );
  return linhas[0] ? formatar(linhas[0]) : null;
}

async function criar(usuarioId, dados) {
  const { nome, tipo, dia_fechamento, dia_vencimento, limite } = dados;
  const [resultado] = await pool.query(
    `INSERT INTO fontes_destinos
       (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [usuarioId, nome, tipo, dia_fechamento, dia_vencimento, limite]
  );
  return { id: resultado.insertId, ...dados };
}

async function atualizar(id, usuarioId, dados) {
  const { nome, tipo, dia_fechamento, dia_vencimento, limite } = dados;
  await pool.query(
    `UPDATE fontes_destinos
     SET nome = ?, tipo = ?, dia_fechamento = ?, dia_vencimento = ?, limite = ?
     WHERE id = ? AND usuario_id = ?`,
    [nome, tipo, dia_fechamento, dia_vencimento, limite, id, usuarioId]
  );
  return { id: Number(id), ...dados };
}

async function possuiLancamentos(id) {
  const [linhas] = await pool.query(
    'SELECT COUNT(*) AS total FROM lancamentos WHERE fonte_destino_id = ?',
    [id]
  );
  return linhas[0].total > 0;
}

async function excluir(id, usuarioId) {
  await pool.query(
    'DELETE FROM fontes_destinos WHERE id = ? AND usuario_id = ?',
    [id, usuarioId]
  );
}

module.exports = { listar, buscarPorId, criar, atualizar, possuiLancamentos, excluir };