const express = require('express');
const FonteDestino = require('../models/FonteDestino');

const router = express.Router();
const TIPOS = ['renda', 'conta', 'cartao_credito'];

function diaValido(dia) {
  return Number.isInteger(dia) && dia >= 1 && dia <= 31;
}

function validar(body) {
  const { nome, tipo, dia_fechamento, dia_vencimento, limite } = body;
  const campos = {};

  if (typeof nome !== 'string' || nome.trim() === '') {
    campos.nome = 'Informe o nome.';
  } else if (nome.trim().length > 60) {
    campos.nome = 'O nome deve ter no máximo 60 caracteres.';
  }

  if (!TIPOS.includes(tipo)) {
    campos.tipo = "O tipo deve ser 'renda', 'conta' ou 'cartao_credito'.";
  }

  if (tipo === 'cartao_credito') {
    if (!diaValido(dia_fechamento)) {
      campos.dia_fechamento = 'Para cartão de crédito, informe o dia de fechamento (1 a 31).';
    }
    if (!diaValido(dia_vencimento)) {
      campos.dia_vencimento = 'Para cartão de crédito, informe o dia de vencimento (1 a 31).';
    }
    if (typeof limite !== 'number' || !(limite > 0)) {
      campos.limite = 'Para cartão de crédito, informe um limite maior que zero.';
    }
  }

  return campos;
}

function montarDados(body) {
  const ehCartao = body.tipo === 'cartao_credito';
  return {
    nome: body.nome.trim(),
    tipo: body.tipo,
    dia_fechamento: ehCartao ? body.dia_fechamento : null,
    dia_vencimento: ehCartao ? body.dia_vencimento : null,
    limite: ehCartao ? body.limite : null
  };
}

function respostaDuplicada(res) {
  return res.status(409).json({
    erro: 'Já existe uma fonte/destino com esse nome.',
    campos: { nome: 'Nome já utilizado.' }
  });
}

// GET /fontes-destinos?tipo=conta
router.get('/', async (req, res) => {
  const { tipo } = req.query;
  if (tipo && !TIPOS.includes(tipo)) {
    return res.status(400).json({
      erro: 'Dados inválidos.',
      campos: { tipo: "O tipo deve ser 'renda', 'conta' ou 'cartao_credito'." }
    });
  }
  const fontes = await FonteDestino.listar(req.auth.id, tipo);
  res.json(fontes);
});

// POST /fontes-destinos
router.post('/', async (req, res) => {
  const body = req.body || {};
  const campos = validar(body);
  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }
  try {
    const fonte = await FonteDestino.criar(req.auth.id, montarDados(body));
    res.status(201).json(fonte);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return respostaDuplicada(res);
    throw err;
  }
});

// PUT /fontes-destinos/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const atual = await FonteDestino.buscarPorId(id, req.auth.id);
  if (!atual) {
    return res.status(404).json({ erro: 'Fonte/destino não encontrada.' });
  }

  const body = req.body || {};
  const campos = validar(body);
  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }

  try {
    const fonte = await FonteDestino.atualizar(id, req.auth.id, montarDados(body));
    res.json(fonte);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return respostaDuplicada(res);
    throw err;
  }
});

// DELETE /fontes-destinos/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const atual = await FonteDestino.buscarPorId(id, req.auth.id);
  if (!atual) {
    return res.status(404).json({ erro: 'Fonte/destino não encontrada.' });
  }

  if (await FonteDestino.possuiLancamentos(id)) {
    return res.status(409).json({
      erro: 'Não é possível excluir: existem lançamentos vinculados a esta fonte/destino.'
    });
  }

  await FonteDestino.excluir(id, req.auth.id);
  res.status(204).end();
});

module.exports = router;