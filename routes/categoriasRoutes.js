const express = require('express');
const Categoria = require('../models/Categoria');

const router = express.Router();
const TIPOS = ['entrada', 'saida'];

function validar({ nome, tipo }) {
  const campos = {};
  if (typeof nome !== 'string' || nome.trim() === '') {
    campos.nome = 'Informe o nome.';
  } else if (nome.trim().length > 60) {
    campos.nome = 'O nome deve ter no máximo 60 caracteres.';
  }
  if (!TIPOS.includes(tipo)) {
    campos.tipo = "O tipo deve ser 'entrada' ou 'saida'.";
  }
  return campos;
}

function respostaDuplicada(res) {
  return res.status(409).json({
    erro: 'Já existe uma categoria com esse nome para esse tipo.',
    campos: { nome: 'Nome já utilizado para esse tipo.' }
  });
}

// GET /categorias?tipo=saida
router.get('/', async (req, res) => {
  const { tipo } = req.query;
  if (tipo && !TIPOS.includes(tipo)) {
    return res.status(400).json({
      erro: 'Dados inválidos.',
      campos: { tipo: "O tipo deve ser 'entrada' ou 'saida'." }
    });
  }
  const categorias = await Categoria.listar(req.auth.id, tipo);
  res.json(categorias);
});

// POST /categorias
router.post('/', async (req, res) => {
  const body = req.body || {};
  const campos = validar(body);
  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }
  try {
    const categoria = await Categoria.criar(req.auth.id, {
      nome: body.nome.trim(),
      tipo: body.tipo
    });
    res.status(201).json(categoria);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return respostaDuplicada(res);
    throw err;
  }
});

// PUT /categorias/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const atual = await Categoria.buscarPorId(id, req.auth.id);
  if (!atual) {
    return res.status(404).json({ erro: 'Categoria não encontrada.' });
  }

  const body = req.body || {};
  const campos = validar(body);
  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }

  if (body.tipo !== atual.tipo && await Categoria.possuiLancamentos(id)) {
    return res.status(409).json({
      erro: 'Não é possível alterar o tipo de uma categoria que já possui lançamentos.',
      campos: { tipo: 'Categoria com lançamentos vinculados.' }
    });
  }

  try {
    const categoria = await Categoria.atualizar(id, req.auth.id, {
      nome: body.nome.trim(),
      tipo: body.tipo
    });
    res.json(categoria);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return respostaDuplicada(res);
    throw err;
  }
});

// DELETE /categorias/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const atual = await Categoria.buscarPorId(id, req.auth.id);
  if (!atual) {
    return res.status(404).json({ erro: 'Categoria não encontrada.' });
  }

  if (await Categoria.possuiLancamentos(id)) {
    return res.status(409).json({
      erro: 'Não é possível excluir: existem lançamentos vinculados a esta categoria.'
    });
  }

  await Categoria.excluir(id, req.auth.id);
  res.status(204).end();
});

module.exports = router;