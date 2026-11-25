const connection = require('../database/connection');

// Datas em UTC para evitar problemas de fuso horário
function ultimoDiaDoMes(ano, mes) {
  // mes: 0 a 11
  return new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
}

function dataSegura(ano, mes, dia) {
  // aceita mes > 11 e ajusta dia 31 em meses curtos
  const a = ano + Math.floor(mes / 12);
  const m = ((mes % 12) + 12) % 12;
  return new Date(Date.UTC(a, m, Math.min(dia, ultimoDiaDoMes(a, m))));
}

// dataCompra: 'AAAA-MM-DD'; cartao: { diaFechamento, diaVencimento }
function calcularFatura(dataCompra, cartao, numeroParcela = 1) {
  const [ano, mes, dia] = dataCompra.split('-').map(Number);
  const m = mes - 1;
  const fechamentoDoMes = Math.min(cartao.diaFechamento, ultimoDiaDoMes(ano, m));
  let mesFechamento = dia < fechamentoDoMes ? m : m + 1; // antes do fechamento: fatura deste mês
  mesFechamento += numeroParcela - 1; // parcelas seguintes: meses seguintes
  const fechamento = dataSegura(ano, mesFechamento, cartao.diaFechamento);
  const mesVencimento = cartao.diaVencimento > cartao.diaFechamento ? mesFechamento : mesFechamento + 1;
  const vencimento = dataSegura(ano, mesVencimento, cartao.diaVencimento);
  const iso = (d) => d.toISOString().slice(0, 10);
  return {
    referencia: iso(vencimento).slice(0, 7),
    fechamento: iso(fechamento),
    vencimento: iso(vencimento),
  };
}

/**
 * Utilitário interno para calcular o período anterior equivalente.
 * Se o período for um mês fechado (ex: 2026-10-01 a 2026-10-31),
 * calcula o mês civil anterior (ex: 2026-09-01 a 2026-09-30).
 * Para intervalos genéricos de N dias, subtrai a mesma quantidade de dias.
 */
function calcularPeriodoAnterior(inicio, fim) {
  const [anoIni, mesIni, diaIni] = inicio.split('-').map(Number);
  const [anoFim, mesFim, diaFim] = fim.split('-').map(Number);

  // Verifica se é um mês calendário completo
  const ultimoDiaMesIni = new Date(Date.UTC(anoIni, mesIni, 0)).getUTCDate();
  const ehMesCompleto =
    diaIni === 1 &&
    anoIni === anoFim &&
    mesIni === mesFim &&
    diaFim === ultimoDiaMesIni;

  if (ehMesCompleto) {
    const dataAnterior = new Date(Date.UTC(anoIni, mesIni - 2, 1));
    const anoAnt = dataAnterior.getUTCFullYear();
    const mesAnt = String(dataAnterior.getUTCMonth() + 1).padStart(2, '0');
    const ultimoDiaAnt = new Date(Date.UTC(anoAnt, dataAnterior.getUTCMonth() + 1, 0)).getUTCDate();

    return {
      inicio: `${anoAnt}-${mesAnt}-01`,
      fim: `${anoAnt}-${mesAnt}-${String(ultimoDiaAnt).padStart(2, '0')}`,
    };
  }

  // Intervalo genérico: calcula a diferença em milissegundos
  const dtInicio = new Date(`${inicio}T00:00:00Z`);
  const dtFim = new Date(`${fim}T00:00:00Z`);
  const duracaoMs = dtFim.getTime() - dtInicio.getTime();

  const dtFimAnterior = new Date(dtInicio.getTime() - 24 * 60 * 60 * 1000);
  const dtInicioAnterior = new Date(dtFimAnterior.getTime() - duracaoMs);

  return {
    inicio: dtInicioAnterior.toISOString().slice(0, 10),
    fim: dtFimAnterior.toISOString().slice(0, 10),
  };
}

class Relatorio {
  /**
   * RF7: Relatório analítico por categoria
   * - Total de saídas por categoria com percentual sobre o total (decrescente).
   * - Total de entradas por categoria com percentual.
   * - Comparação de cada categoria de saída com o período anterior (valor anterior e variação percentual).
   * 
   * @param {number} usuarioId - ID do usuário autenticado (req.auth.id)
   * @param {string} inicio - Data de início (AAAA-MM-DD)
   * @param {string} fim - Data de término (AAAA-MM-DD)
   */
  async porCategoria(usuarioId, inicio, fim) {
    const periodoAnterior = calcularPeriodoAnterior(inicio, fim);

    // 1. Saídas do período atual agrupadas por categoria
    const sqlSaidasAtual = `
      SELECT 
        c.id, 
        c.nome, 
        SUM(l.valor) AS total 
      FROM lancamentos l 
      JOIN categorias c ON c.id = l.categoria_id 
      WHERE l.usuario_id = ? 
        AND l.tipo = 'saida' 
        AND l.data BETWEEN ? AND ? 
      GROUP BY c.id, c.nome 
      ORDER BY total DESC
    `;

    // 2. Saídas do período anterior para efeito de comparação
    const sqlSaidasAnterior = `
      SELECT 
        c.id, 
        c.nome, 
        SUM(l.valor) AS total 
      FROM lancamentos l 
      JOIN categorias c ON c.id = l.categoria_id 
      WHERE l.usuario_id = ? 
        AND l.tipo = 'saida' 
        AND l.data BETWEEN ? AND ? 
      GROUP BY c.id, c.nome
    `;

    // 3. Entradas do período atual agrupadas por categoria
    const sqlEntradasAtual = `
      SELECT 
        c.id, 
        c.nome, 
        SUM(l.valor) AS total 
      FROM lancamentos l 
      JOIN categorias c ON c.id = l.categoria_id 
      WHERE l.usuario_id = ? 
        AND l.tipo = 'entrada' 
        AND l.data BETWEEN ? AND ? 
      GROUP BY c.id, c.nome 
      ORDER BY total DESC
    `;

    // Executa as consultas de forma assíncrona
    const [saidasAtualRows] = await connection.query(sqlSaidasAtual, [usuarioId, inicio, fim]);
    const [saidasAnteriorRows] = await connection.query(sqlSaidasAnterior, [
      usuarioId,
      periodoAnterior.inicio,
      periodoAnterior.fim,
    ]);
    const [entradasAtualRows] = await connection.query(sqlEntradasAtual, [usuarioId, inicio, fim]);

    // Mapeia os totais do período anterior por ID da categoria para busca O(1)
    const mapaAnterior = new Map();
    for (const row of saidasAnteriorRows) {
      mapaAnterior.set(row.id, Number(row.total));
    }

    // Calcula o total geral de saídas do período atual
    const totalGeralSaidas = saidasAtualRows.reduce(
      (acumulador, row) => acumulador + Number(row.total),
      0
    );

    // Formata cada categoria de saída com percentual, anterior e variação
    const categoriasSaidas = saidasAtualRows.map((row) => {
      const totalAtual = Number(row.total);
      const anterior = mapaAnterior.has(row.id) ? mapaAnterior.get(row.id) : 0;

      const percentual =
        totalGeralSaidas > 0
          ? Number(((totalAtual / totalGeralSaidas) * 100).toFixed(2))
          : 0;

      let variacao = 0;
      if (anterior > 0) {
        variacao = Number((((totalAtual - anterior) / anterior) * 100).toFixed(2));
      } else if (totalAtual > 0) {
        variacao = 100; // categoria sem gastos no período anterior
      }

      return {
        id: row.id,
        nome: row.nome,
        total: Number(totalAtual.toFixed(2)),
        percentual,
        anterior: Number(anterior.toFixed(2)),
        variacao,
      };
    });

    // Calcula o total geral de entradas
    const totalGeralEntradas = entradasAtualRows.reduce(
      (acumulador, row) => acumulador + Number(row.total),
      0
    );

    // Formata cada categoria de entrada
    const categoriasEntradas = entradasAtualRows.map((row) => {
      const totalAtual = Number(row.total);
      const percentual =
        totalGeralEntradas > 0
          ? Number(((totalAtual / totalGeralEntradas) * 100).toFixed(2))
          : 0;

      return {
        id: row.id,
        nome: row.nome,
        total: Number(totalAtual.toFixed(2)),
        percentual,
      };
    });

    return {
      periodo: {
        inicio,
        fim,
      },
      periodoAnterior: {
        inicio: periodoAnterior.inicio,
        fim: periodoAnterior.fim,
      },
      saidas: {
        total: Number(totalGeralSaidas.toFixed(2)),
        categorias: categoriasSaidas,
      },
      entradas: {
        total: Number(totalGeralEntradas.toFixed(2)),
        categorias: categoriasEntradas,
      },
    };
  }

  /**
   * RF8: Relatório analítico por fontes/destinos
   * - Total de entradas por fonte.
   * - Total de saídas por destino.
   * - Saldo do período (entradas - saídas) para fontes/destinos do tipo 'conta'.
   * 
   * @param {number} usuarioId - ID do usuário autenticado (req.auth.id)
   * @param {string} inicio - Data de início (AAAA-MM-DD)
   * @param {string} fim - Data de término (AAAA-MM-DD)
   */
  async porFontesDestinos(usuarioId, inicio, fim) {
    // 1. Entradas por fonte
    const sqlEntradas = `
      SELECT 
        f.id,
        f.nome,
        f.tipo,
        SUM(l.valor) AS total
      FROM lancamentos l
      JOIN fontes_destinos f ON f.id = l.fonte_destino_id
      WHERE l.usuario_id = ?
        AND l.tipo = 'entrada'
        AND l.data BETWEEN ? AND ?
      GROUP BY f.id, f.nome, f.tipo
      ORDER BY total DESC
    `;

    // 2. Saídas por destino
    const sqlSaidas = `
      SELECT 
        f.id,
        f.nome,
        f.tipo,
        SUM(l.valor) AS total
      FROM lancamentos l
      JOIN fontes_destinos f ON f.id = l.fonte_destino_id
      WHERE l.usuario_id = ?
        AND l.tipo = 'saida'
        AND l.data BETWEEN ? AND ?
      GROUP BY f.id, f.nome, f.tipo
      ORDER BY total DESC
    `;

    // 3. Saldo do período para contas correntes/poupança (tipo = 'conta')
    const sqlContas = `
      SELECT 
        f.id,
        f.nome,
        COALESCE(SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor ELSE 0 END), 0) AS entradas,
        COALESCE(SUM(CASE WHEN l.tipo = 'saida' THEN l.valor ELSE 0 END), 0) AS saidas
      FROM fontes_destinos f
      LEFT JOIN lancamentos l ON l.fonte_destino_id = f.id 
        AND l.usuario_id = f.usuario_id 
        AND l.data BETWEEN ? AND ?
      WHERE f.usuario_id = ? 
        AND f.tipo = 'conta'
      GROUP BY f.id, f.nome
      ORDER BY f.nome ASC
    `;

    // Executa as consultas com mysql2/promise
    const [entradasRows] = await connection.query(sqlEntradas, [usuarioId, inicio, fim]);
    const [saidasRows] = await connection.query(sqlSaidas, [usuarioId, inicio, fim]);
    const [contasRows] = await connection.query(sqlContas, [inicio, fim, usuarioId]);

    const entradas = entradasRows.map((item) => ({
      id: item.id,
      nome: item.nome,
      tipo: item.tipo,
      total: Number(Number(item.total).toFixed(2)),
    }));

    const saidas = saidasRows.map((item) => ({
      id: item.id,
      nome: item.nome,
      tipo: item.tipo,
      total: Number(Number(item.total).toFixed(2)),
    }));

    const contas = contasRows.map((item) => {
      const totalEntradas = Number(Number(item.entradas).toFixed(2));
      const totalSaidas = Number(Number(item.saidas).toFixed(2));
      const saldo = Number((totalEntradas - totalSaidas).toFixed(2));

      return {
        id: item.id,
        nome: item.nome,
        entradas: totalEntradas,
        saidas: totalSaidas,
        saldo,
      };
    });

    return {
      periodo: {
        inicio,
        fim,
      },
      entradas,
      saidas,
      contas,
    };
  }

  /**
   * RF9: Previsão de faturas de cartão de crédito
   * - Para cada cartão: fatura atual (aberta) e as próximas faturas projetadas (meses de 1 a 12).
   * - Lista os lançamentos de cada fatura ("Descrição — X/Y").
   * - Calcula: limite total, limite utilizado (parcelas com fatura a vencer) e limite disponível.
   * 
   * @param {number} usuarioId - ID do usuário autenticado (req.auth.id)
   * @param {number} meses - Quantidade de faturas a projetar (1 a 12, padrão 3)
   */
  async faturas(usuarioId, meses = 3) {
    const qtdMeses = Math.min(12, Math.max(1, Number(meses) || 3));
    const hoje = new Date();
    const hojeISO = hoje.toISOString().slice(0, 10);

    // 1. Busca todos os cartões de crédito pertencentes ao usuário
    const sqlCartoes = `
      SELECT 
        id, 
        nome, 
        dia_fechamento, 
        dia_vencimento, 
        limite 
      FROM fontes_destinos 
      WHERE usuario_id = ? AND tipo = 'cartao_credito' 
      ORDER BY nome ASC
    `;
    const [cartoes] = await connection.query(sqlCartoes, [usuarioId]);

    if (!cartoes || cartoes.length === 0) {
      return { cartoes: [] };
    }

    const resultadoCartoes = [];

    for (const cartao of cartoes) {
      const cartaoProps = {
        diaFechamento: Number(cartao.dia_fechamento),
        diaVencimento: Number(cartao.dia_vencimento),
      };
      const limiteTotal = Number(Number(cartao.limite).toFixed(2));

      // 2. Busca todos os lançamentos de saída registrados para este cartão
      const sqlLancamentos = `
        SELECT 
          l.id, 
          l.descricao, 
          l.valor, 
          DATE_FORMAT(l.data, '%Y-%m-%d') AS data, 
          l.parcela_atual, 
          l.total_parcelas 
        FROM lancamentos l 
        WHERE l.usuario_id = ? 
          AND l.tipo = 'saida' 
          AND l.fonte_destino_id = ? 
        ORDER BY l.data ASC, l.parcela_atual ASC
      `;
      const [lancamentos] = await connection.query(sqlLancamentos, [usuarioId, cartao.id]);

      // 3. Agrupa os lançamentos por fatura utilizando reduce
      let limiteUtilizado = 0;

      const faturasPorReferencia = lancamentos.reduce((mapa, lancamento) => {
        const infoFatura = calcularFatura(lancamento.data, cartaoProps, lancamento.parcela_atual);

        // Limite utilizado: soma de todas as parcelas cuja fatura ainda não venceu
        if (infoFatura.vencimento >= hojeISO) {
          limiteUtilizado += Number(lancamento.valor);
        }

        if (!mapa[infoFatura.referencia]) {
          mapa[infoFatura.referencia] = {
            referencia: infoFatura.referencia,
            fechamento: infoFatura.fechamento,
            vencimento: infoFatura.vencimento,
            itens: [],
            total: 0,
          };
        }

        mapa[infoFatura.referencia].itens.push({
          id: lancamento.id,
          descricao: `${lancamento.descricao} — ${lancamento.parcela_atual}/${lancamento.total_parcelas}`,
          valor: Number(Number(lancamento.valor).toFixed(2)),
          data: lancamento.data,
        });

        mapa[infoFatura.referencia].total = Number(
          (mapa[infoFatura.referencia].total + Number(lancamento.valor)).toFixed(2)
        );

        return mapa;
      }, {});

      // 4. Projeta as N faturas a partir da fatura atual (aberta)
      const faturasProjetadas = [];
      for (let i = 1; i <= qtdMeses; i++) {
        const faturaBase = calcularFatura(hojeISO, cartaoProps, i);
        const faturaExistente = faturasPorReferencia[faturaBase.referencia];

        faturasProjetadas.push({
          referencia: faturaBase.referencia,
          fechamento: faturaBase.fechamento,
          vencimento: faturaBase.vencimento,
          itens: faturaExistente ? faturaExistente.itens : [],
          total: faturaExistente ? faturaExistente.total : 0.0,
        });
      }

      limiteUtilizado = Number(limiteUtilizado.toFixed(2));
      const limiteDisponivel = Number((limiteTotal - limiteUtilizado).toFixed(2));

      resultadoCartoes.push({
        id: cartao.id,
        nome: cartao.nome,
        dia_fechamento: cartao.dia_fechamento,
        dia_vencimento: cartao.dia_vencimento,
        limite_total: limiteTotal,
        limite_utilizado: limiteUtilizado,
        limite_disponivel: limiteDisponivel,
        faturas: faturasProjetadas,
      });
    }

    return { cartoes: resultadoCartoes };
  }
}

module.exports = new Relatorio();
