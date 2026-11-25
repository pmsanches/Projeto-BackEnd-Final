const express = require('express');
const Relatorio = require('../models/Relatorio');
const protegerRota = require('../middleware/auth');

const router = express.Router();

// Garante que todas as rotas de relatórios exijam token JWT válido
router.use(protegerRota);

/**
 * Função utilitária para validação dos parâmetros de período (inicio e fim).
 * Requisitos:
 * - Obrigatórios
 * - Formato AAAA-MM-DD com calendário válido
 * - inicio <= fim
 */
function validarPeriodo(inicio, fim) {
  const erros = {};
  const regexData = /^\d{4}-\d{2}-\d{2}$/;

  if (!inicio) {
    erros.inicio = 'A data inicial é obrigatória (formato AAAA-MM-DD).';
  } else if (!regexData.test(inicio) || isNaN(new Date(`${inicio}T00:00:00Z`).getTime())) {
    erros.inicio = 'Data inicial inválida. Utilize o formato AAAA-MM-DD.';
  }

  if (!fim) {
    erros.fim = 'A data final é obrigatória (formato AAAA-MM-DD).';
  } else if (!regexData.test(fim) || isNaN(new Date(`${fim}T00:00:00Z`).getTime())) {
    erros.fim = 'Data final inválida. Utilize o formato AAAA-MM-DD.';
  }

  if (!erros.inicio && !erros.fim && inicio > fim) {
    erros.periodo = 'A data inicial não pode ser posterior à data final.';
  }

  return {
    valido: Object.keys(erros).length === 0,
    erros,
  };
}

/**
 * RF7: Relatório analítico de gastos e receitas por categoria
 * GET /relatorios/categorias?inicio=AAAA-MM-DD&fim=AAAA-MM-DD
 */
router.get('/categorias', async (req, res) => {
  const { inicio, fim } = req.query;

  const validacao = validarPeriodo(inicio, fim);
  if (!validacao.valido) {
    return res.status(400).json({
      erro: 'Parâmetros de período inválidos.',
      campos: validacao.erros,
    });
  }

  try {
    const usuarioId = req.auth.id;
    const resultado = await Relatorio.porCategoria(usuarioId, inicio, fim);

    return res.status(200).json(resultado);
  } catch (erro) {
    console.error('Erro ao gerar relatório por categoria:', erro);
    return res.status(500).json({ erro: 'Erro interno ao gerar relatório por categoria.' });
  }
});

/**
 * RF8: Relatório analítico por fontes e destinos
 * GET /relatorios/fontes-destinos?inicio=AAAA-MM-DD&fim=AAAA-MM-DD
 */
router.get('/fontes-destinos', async (req, res) => {
  const { inicio, fim } = req.query;

  const validacao = validarPeriodo(inicio, fim);
  if (!validacao.valido) {
    return res.status(400).json({
      erro: 'Parâmetros de período inválidos.',
      campos: validacao.erros,
    });
  }

  try {
    const usuarioId = req.auth.id;
    const resultado = await Relatorio.porFontesDestinos(usuarioId, inicio, fim);

    return res.status(200).json(resultado);
  } catch (erro) {
    console.error('Erro ao gerar relatório por fontes/destinos:', erro);
    return res.status(500).json({ erro: 'Erro interno ao gerar relatório por fontes/destinos.' });
  }
});

module.exports = router;
