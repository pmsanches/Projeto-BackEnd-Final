const crypto = require('crypto');
const connection = require('../database/connection');

/**
 * Função utilitária pura para dividir um valor monetário em parcelas sem perder centavos.
 * A diferença de arredondamento é atribuída integralmente à primeira parcela.
 * Exemplo: dividirEmParcelas(100.00, 3) -> [33.34, 33.33, 33.33]
 */
function dividirEmParcelas(valorTotal, quantidade) {
  const centavos = Math.round(Number(valorTotal) * 100);
  const base = Math.floor(centavos / quantidade);
  const resto = centavos - base * quantidade;

  return Array.from({ length: quantidade }, (_, i) =>
    (base + (i === 0 ? resto : 0)) / 100
  );
}

class Lancamento {
  /**
   * RF6: Cria um lançamento único ou parcelado (se parcelas > 1).
   * 100% async/await com mysql2/promise e transação atômica em compras parceladas.
   */
  async criar(dados) {
    const {
      usuarioId,
      tipo,
      descricao,
      valor,
      data,
      categoriaId,
      fonteDestinoId,
      parcelas = 1,
    } = dados;

    const totalParcelas = Math.max(1, Number(parcelas) || 1);

    // Lançamento à vista ou parcela única (1x)
    if (totalParcelas === 1) {
      const sql = `
        INSERT INTO lancamentos (
          usuario_id, tipo, descricao, valor, data,
          categoria_id, fonte_destino_id, parcela_atual, total_parcelas
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
      `;
      const parametros = [
        usuarioId,
        tipo,
        descricao.trim(),
        Number(valor),
        data,
        categoriaId,
        fonteDestinoId,
      ];

      const [resultado] = await connection.query(sql, parametros);

      return {
        id: resultado.insertId,
        tipo,
        descricao: descricao.trim(),
        valor: Number(valor),
        data,
        categoriaId,
        fonteDestinoId,
        parcela: '1/1',
      };
    }

    // Lançamento parcelado no cartão de crédito (transação atômica com mysql2/promise)
    const grupoParcelamento = crypto.randomUUID();
    const valoresParcelas = dividirEmParcelas(valor, totalParcelas);

    // Obtém conexão dedicada se for pool, ou usa a própria conexão
    const conn = connection.getConnection ? await connection.getConnection() : connection;

    try {
      await conn.beginTransaction();

      const linhas = valoresParcelas.map((valorParcela, index) => [
        usuarioId,
        tipo,
        descricao.trim(),
        valorParcela,
        data,
        categoriaId,
        fonteDestinoId,
        index + 1, // parcela_atual (1 a N)
        totalParcelas,
        grupoParcelamento,
      ]);

      const sql = `
        INSERT INTO lancamentos (
          usuario_id, tipo, descricao, valor, data,
          categoria_id, fonte_destino_id, parcela_atual, total_parcelas, grupo_parcelamento
        ) VALUES ?
      `;

      const [resultado] = await conn.query(sql, [linhas]);

      await conn.commit();

      return {
        mensagem: 'Compra parcelada criada com sucesso.',
        primeiroId: resultado.insertId,
        grupoParcelamento,
        totalParcelas,
        parcelasCriadas: valoresParcelas.length,
      };
    } catch (erro) {
      await conn.rollback();
      throw erro;
    } finally {
      if (conn.release) {
        conn.release();
      }
    }
  }

  /**
   * RF6: Listagem com paginação (20 por página), filtros opcionais e resumo financeiro.
   */
  async listar(filtros) {
    const {
      usuarioId,
      inicio,
      fim,
      tipo,
      categoriaId,
      fonteDestinoId,
      pagina = 1,
    } = filtros;

    const limite = 20;
    const paginaNum = Math.max(1, Number(pagina) || 1);
    const offset = (paginaNum - 1) * limite;

    // Montagem dinâmica das cláusulas WHERE
    const condicoes = ['l.usuario_id = ?'];
    const parametros = [usuarioId];

    if (inicio && fim) {
      condicoes.push('l.data BETWEEN ? AND ?');
      parametros.push(inicio, fim);
    } else if (inicio) {
      condicoes.push('l.data >= ?');
      parametros.push(inicio);
    } else if (fim) {
      condicoes.push('l.data <= ?');
      parametros.push(fim);
    }

    if (tipo) {
      condicoes.push('l.tipo = ?');
      parametros.push(tipo);
    }

    if (categoriaId) {
      condicoes.push('l.categoria_id = ?');
      parametros.push(Number(categoriaId));
    }

    if (fonteDestinoId) {
      condicoes.push('l.fonte_destino_id = ?');
      parametros.push(Number(fonteDestinoId));
    }

    const whereSql = condicoes.join(' AND ');

    // 1. Resumo financeiro do período filtrado
    const sqlResumo = `
      SELECT 
        COUNT(*) AS totalRegistros,
        COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) AS totalEntradas,
        COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) AS totalSaidas
      FROM lancamentos l
      WHERE ${whereSql}
    `;

    const [resumoResultados] = await connection.query(sqlResumo, parametros);
    const resumo = resumoResultados[0] || {};

    const totalRegistros = Number(resumo.totalRegistros || 0);
    const entradas = Number(resumo.totalEntradas || 0);
    const saidas = Number(resumo.totalSaidas || 0);
    const saldo = Number((entradas - saidas).toFixed(2));
    const totalPaginas = Math.ceil(totalRegistros / limite) || 1;

    // 2. Consulta paginada dos itens com JOIN
    const sqlItens = `
      SELECT 
        l.id,
        l.tipo,
        l.descricao,
        l.valor,
        DATE_FORMAT(l.data, '%Y-%m-%d') AS data,
        l.parcela_atual,
        l.total_parcelas,
        l.grupo_parcelamento,
        c.id AS categoria_id,
        c.nome AS categoria_nome,
        f.id AS fonte_destino_id,
        f.nome AS fonte_destino_nome
      FROM lancamentos l
      JOIN categorias c ON c.id = l.categoria_id
      JOIN fontes_destinos f ON f.id = l.fonte_destino_id
      WHERE ${whereSql}
      ORDER BY l.data DESC, l.id DESC
      LIMIT ? OFFSET ?
    `;

    const [itensResultados] = await connection.query(sqlItens, [...parametros, limite, offset]);

    const itens = itensResultados.map((item) => ({
      id: item.id,
      tipo: item.tipo,
      descricao: item.descricao,
      valor: Number(item.valor),
      data: item.data,
      categoria: {
        id: item.categoria_id,
        nome: item.categoria_nome,
      },
      fonteDestino: {
        id: item.fonte_destino_id,
        nome: item.fonte_destino_nome,
      },
      parcela: `${item.parcela_atual}/${item.total_parcelas}`,
      grupoParcelamento: item.grupo_parcelamento,
    }));

    return {
      resumo: {
        entradas,
        saidas,
        saldo,
      },
      pagina: paginaNum,
      totalPaginas,
      totalRegistros,
      itens,
    };
  }

  /**
   * RF6: Busca um lançamento específico por ID garantindo o isolamento de usuário (RF3).
   */
  async buscarPorId(id, usuarioId) {
    const sql = `
      SELECT 
        l.id,
        l.usuario_id,
        l.tipo,
        l.descricao,
        l.valor,
        DATE_FORMAT(l.data, '%Y-%m-%d') AS data,
        l.categoria_id,
        c.nome AS categoria_nome,
        c.tipo AS categoria_tipo,
        l.fonte_destino_id,
        f.nome AS fonte_destino_nome,
        f.tipo AS fonte_destino_tipo,
        l.parcela_atual,
        l.total_parcelas,
        l.grupo_parcelamento
      FROM lancamentos l
      JOIN categorias c ON c.id = l.categoria_id
      JOIN fontes_destinos f ON f.id = l.fonte_destino_id
      WHERE l.id = ? AND l.usuario_id = ?
    `;

    const [resultados] = await connection.query(sql, [id, usuarioId]);

    if (!resultados || resultados.length === 0) {
      return null;
    }

    const item = resultados[0];
    return {
      id: item.id,
      tipo: item.tipo,
      descricao: item.descricao,
      valor: Number(item.valor),
      data: item.data,
      categoria: {
        id: item.categoria_id,
        nome: item.categoria_nome,
        tipo: item.categoria_tipo,
      },
      fonteDestino: {
        id: item.fonte_destino_id,
        nome: item.fonte_destino_nome,
        tipo: item.fonte_destino_tipo,
      },
      parcela: `${item.parcela_atual}/${item.total_parcelas}`,
      grupoParcelamento: item.grupo_parcelamento,
    };
  }

  /**
   * RF6: Atualiza os dados de um lançamento existente pertencente ao usuário.
   */
  async atualizar(id, usuarioId, dados) {
    const { tipo, descricao, valor, data, categoriaId, fonteDestinoId } = dados;

    const sql = `
      UPDATE lancamentos
      SET 
        tipo = ?,
        descricao = ?,
        valor = ?,
        data = ?,
        categoria_id = ?,
        fonte_destino_id = ?
      WHERE id = ? AND usuario_id = ?
    `;

    const parametros = [
      tipo,
      descricao.trim(),
      Number(valor),
      data,
      categoriaId,
      fonteDestinoId,
      id,
      usuarioId,
    ];

    const [resultado] = await connection.query(sql, parametros);
    return resultado.affectedRows > 0;
  }

  /**
   * RF6: Exclui um lançamento individual ou todas as parcelas do grupo (todasParcelas=true).
   */
  async excluir(id, usuarioId, todasParcelas = false) {
    const lancamento = await this.buscarPorId(id, usuarioId);
    if (!lancamento) {
      return { encontrado: false };
    }

    // Se solicitado excluir todas as parcelas e for compra parcelada
    if (todasParcelas && lancamento.grupoParcelamento) {
      const sqlTodas = 'DELETE FROM lancamentos WHERE grupo_parcelamento = ? AND usuario_id = ?';
      const [resultado] = await connection.query(sqlTodas, [lancamento.grupoParcelamento, usuarioId]);
      return {
        encontrado: true,
        removidas: resultado.affectedRows,
        todasParcelas: true,
      };
    }

    // Exclusão de apenas uma parcela/lançamento individual
    const sqlUnico = 'DELETE FROM lancamentos WHERE id = ? AND usuario_id = ?';
    const [resultado] = await connection.query(sqlUnico, [id, usuarioId]);
    return {
      encontrado: resultado.affectedRows > 0,
      removidas: resultado.affectedRows,
      todasParcelas: false,
    };
  }
}

module.exports = new Lancamento();
