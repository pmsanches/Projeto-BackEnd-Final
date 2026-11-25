const connection = require('../database/connection');

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
}

module.exports = new Relatorio();
