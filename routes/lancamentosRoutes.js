const express = require('express');
const router = express.Router();
const connection = require('../database/connection');
const Lancamento = require('../models/Lancamento');

/**
 * Função auxiliar para validar se a categoria e a fonte/destino pertencem ao usuário autenticado.
 */
async function obterEntidadesUsuario(usuarioId, categoriaId, fonteDestinoId) {
  const [categorias] = await connection.query(
    'SELECT id, nome, tipo FROM categorias WHERE id = ? AND usuario_id = ?',
    [categoriaId, usuarioId]
  );

  const [fontes] = await connection.query(
    'SELECT id, nome, tipo FROM fontes_destinos WHERE id = ? AND usuario_id = ?',
    [fonteDestinoId, usuarioId]
  );

  return {
    categoria: categorias[0]  || null,
    fonteDestino: fontes[0]   || null,
  };
}

/**
 * RF6: Criar lançamento (à vista ou parcelado)
 * POST /lancamentos
 */
router.post('/', async (req, res) => {
  try {
    const usuarioId = req.auth.id;
    const { tipo, descricao, valor, data, categoriaId, fonteDestinoId, parcelas } = req.body;
    const erros = {};

    // 1. Validações dos campos obrigatórios
    if (!tipo || !['entrada', 'saida'].includes(tipo)) {
      erros.tipo = "O tipo deve ser 'entrada' ou 'saida'.";
    }

    if (!descricao || typeof descricao !== 'string' || !descricao.trim()) {
      erros.descricao = 'Informe uma descrição válida.';
    }

    const valorNumerico = Number(valor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      erros.valor = 'O valor deve ser um número maior que zero.';
    }

    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data) || isNaN(Date.parse(data))) {
      erros.data = 'A data deve estar no formato AAAA-MM-DD e ser válida.';
    }

    const catIdNum = Number(categoriaId);
    if (!catIdNum || !Number.isInteger(catIdNum) || catIdNum <= 0) {
      erros.categoriaId = 'Informe um ID de categoria válido.';
    }

    const fonteIdNum = Number(fonteDestinoId);
    if (!fonteIdNum || !Number.isInteger(fonteIdNum) || fonteIdNum <= 0) {
      erros.fonteDestinoId = 'Informe um ID de fonte/destino válido.';
    }

    const totalParcelas = parcelas !== undefined ? Number(parcelas) : 1;
    if (isNaN(totalParcelas) || !Number.isInteger(totalParcelas) || totalParcelas < 1 || totalParcelas > 48) {
      erros.parcelas = 'A quantidade de parcelas deve ser um número inteiro entre 1 e 48.';
    }

    if (Object.keys(erros).length > 0) {
      return res.status(400).json({
        erro: 'Dados de lançamento inválidos.',
        campos: erros,
      });
    }

    // 2. Validação de pertencimento (RF3: Isolamento entre usuários)
    const { categoria, fonteDestino } = await obterEntidadesUsuario(usuarioId, catIdNum, fonteIdNum);

    if (!categoria) {
      return res.status(404).json({ erro: 'Categoria não encontrada ou não pertence ao usuário.' });
    }

    if (!fonteDestino) {
      return res.status(404).json({ erro: 'Fonte/destino não encontrada ou não pertence ao usuário.' });
    }

    // 3. Validação de compatibilidade de tipo
    if (tipo !== categoria.tipo) {
      return res.status(400).json({
        erro: `Incompatibilidade de tipos: lançamento de '${tipo}' não pode usar categoria de '${categoria.tipo}'.`,
      });
    }

    // 4. Validação das regras de parcelamento
    if (totalParcelas > 1) {
      if (tipo !== 'saida') {
        return res.status(400).json({ erro: 'Apenas lançamentos do tipo saída podem ser parcelados.' });
      }

      if (fonteDestino.tipo !== 'cartao_credito') {
        return res.status(400).json({
          erro: "Parcelamento é permitido exclusivamente para fontes do tipo 'cartao_credito'.",
        });
      }
    }

    // 5. Persistência via Model
    const resultado = await Lancamento.criar({
      usuarioId,
      tipo,
      descricao: descricao.trim(),
      valor: valorNumerico,
      data,
      categoriaId: catIdNum,
      fonteDestinoId: fonteIdNum,
      parcelas: totalParcelas,
    });

    return res.status(201).json(resultado);
  } catch (erro) {
    console.error('Erro ao criar lançamento:', erro);
    return res.status(500).json({ erro: 'Erro interno ao criar lançamento.' });
  }
});

/**
 * RF6: Listagem de lançamentos com paginação, filtros e resumo do período
 * GET /lancamentos
 */
router.get('/', async (req, res) => {
  try {
    const usuarioId = req.auth.id;
    let { inicio, fim, tipo, categoriaId, fonteDestinoId, pagina = 1 } = req.query;

    // Se nenhum período for informado, utiliza por padrão o mês corrente (RF6)
    if (!inicio && !fim) {
      const agora = new Date();
      const ano = agora.getFullYear();
      const mes = String(agora.getMonth() + 1).padStart(2, '0');
      const ultimoDia = new Date(ano, agora.getMonth() + 1, 0).getDate();

      inicio = `${ano}-${mes}-01`;
      fim = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`;
    }

    // Validação de intervalo se fornecido
    if (inicio && fim && inicio > fim) {
      return res.status(400).json({ erro: 'A data inicial não pode ser superior à data final.' });
    }

    const resultado = await Lancamento.listar({
      usuarioId,
      inicio,
      fim,
      tipo,
      categoriaId,
      fonteDestinoId,
      pagina,
    });

    return res.status(200).json(resultado);
  } catch (erro) {
    console.error('Erro ao listar lançamentos:', erro);
    return res.status(500).json({ erro: 'Erro interno ao listar lançamentos.' });
  }
});

/**
 * RF6: Buscar lançamento específico por ID
 * GET /lancamentos/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const usuarioId = req.auth.id;
    const { id } = req.params;

    const lancamento = await Lancamento.buscarPorId(id, usuarioId);

    if (!lancamento) {
      return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    }

    return res.status(200).json(lancamento);
  } catch (erro) {
    console.error('Erro ao buscar lançamento por ID:', erro);
    return res.status(500).json({ erro: 'Erro interno ao buscar lançamento.' });
  }
});

/**
 * RF6: Atualizar lançamento existente
 * PUT /lancamentos/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const usuarioId = req.auth.id;
    const { id } = req.params;
    const { tipo, descricao, valor, data, categoriaId, fonteDestinoId } = req.body;

    // 1. Verifica se o lançamento existe e pertence ao usuário
    const lancamentoAtual = await Lancamento.buscarPorId(id, usuarioId);
    if (!lancamentoAtual) {
      return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    }

    const erros = {};

    if (!tipo || !['entrada', 'saida'].includes(tipo)) {
      erros.tipo = "O tipo deve ser 'entrada' ou 'saida'.";
    }

    if (!descricao || typeof descricao !== 'string' || !descricao.trim()) {
      erros.descricao = 'Informe uma descrição válida.';
    }

    const valorNumerico = Number(valor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      erros.valor = 'O valor deve ser um número maior que zero.';
    }

    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data) || isNaN(Date.parse(data))) {
      erros.data = 'A data deve estar no formato AAAA-MM-DD e ser válida.';
    }

    const catIdNum = Number(categoriaId);
    if (!catIdNum || !Number.isInteger(catIdNum) || catIdNum <= 0) {
      erros.categoriaId = 'Informe um ID de categoria válido.';
    }

    const fonteIdNum = Number(fonteDestinoId);
    if (!fonteIdNum || !Number.isInteger(fonteIdNum) || fonteIdNum <= 0) {
      erros.fonteDestinoId = 'Informe um ID de fonte/destino válido.';
    }

    if (Object.keys(erros).length > 0) {
      return res.status(400).json({
        erro: 'Dados de atualização inválidos.',
        campos: erros,
      });
    }

    // 2. Validação de pertencimento de categoria e fonte/destino
    const { categoria, fonteDestino } = await obterEntidadesUsuario(usuarioId, catIdNum, fonteIdNum);

    if (!categoria) {
      return res.status(404).json({ erro: 'Categoria não encontrada ou não pertence ao usuário.' });
    }

    if (!fonteDestino) {
      return res.status(404).json({ erro: 'Fonte/destino não encontrada ou não pertence ao usuário.' });
    }

    // 3. Validação de compatibilidade de tipo
    if (tipo !== categoria.tipo) {
      return res.status(400).json({
        erro: `Incompatibilidade de tipos: lançamento de '${tipo}' não pode usar categoria de '${categoria.tipo}'.`,
      });
    }

    // 4. Executa a atualização
    await Lancamento.atualizar(id, usuarioId, {
      tipo,
      descricao: descricao.trim(),
      valor: valorNumerico,
      data,
      categoriaId: catIdNum,
      fonteDestinoId: fonteIdNum,
    });

    const lancamentoAtualizado = await Lancamento.buscarPorId(id, usuarioId);
    return res.status(200).json(lancamentoAtualizado);
  } catch (erro) {
    console.error('Erro ao atualizar lançamento:', erro);
    return res.status(500).json({ erro: 'Erro interno ao atualizar lançamento.' });
  }
});

/**
 * RF6: Excluir lançamento
 * DELETE /lancamentos/:id
 * Suporta o parâmetro opcional ?todasParcelas=true para compras parceladas
 */
router.delete('/:id', async (req, res) => {
  try {
    const usuarioId = req.auth.id;
    const { id } = req.params;
    const todasParcelas = req.query.todasParcelas === 'true';

    const resultado = await Lancamento.excluir(id, usuarioId, todasParcelas);

    if (!resultado.encontrado) {
      return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    }

    // Retorna 204 No Content conforme o padrão REST e a especificação do projeto
    return res.status(204).send();
  } catch (erro) {
    console.error('Erro ao excluir lançamento:', erro);
    return res.status(500).json({ erro: 'Erro interno ao excluir lançamento.' });
  }
});

module.exports = router;
