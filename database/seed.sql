-- =====================================================================
-- API DE CONTROLE FINANCEIRO - SCRIPT DE POVOAMENTO (SEED)
-- Atende aos requisitos:
-- - Pelo menos 2 usuários distintos com hash real de senha (bcrypt)
-- - Pelo menos 3 meses contínuos de lançamentos (Setembro, Outubro e Novembro de 2026)
-- - Contas correntes, cartões de crédito e compras parceladas
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE lancamentos;
TRUNCATE TABLE categorias;
TRUNCATE TABLE fontes_destinos;
TRUNCATE TABLE usuarios;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 1. USUÁRIOS
-- Senha de ambos: "SenhaSegura123"
-- Hash gerado via bcrypt (salt 12): $2b$12$4BC0fzjW70Zjh9aRJn1jL.9ed6t897hZGnrdatCpWycxbopgrhNk2
-- ---------------------------------------------------------------------
INSERT INTO usuarios (id, nome, email, cpf, senha_hash, criado_em) VALUES
(1, 'Usuário Teste', 'usuario.teste@email.com', '52998224725', '$2b$12$4BC0fzjW70Zjh9aRJn1jL.9ed6t897hZGnrdatCpWycxbopgrhNk2', '2026-08-01 10:00:00'),
(2, 'Outro Usuário', 'outro.usuario@email.com', '85278145030', '$2b$12$4BC0fzjW70Zjh9aRJn1jL.9ed6t897hZGnrdatCpWycxbopgrhNk2', '2026-08-01 10:00:00');

-- ---------------------------------------------------------------------
-- 2. CATEGORIAS
-- Usuário 1: IDs 1 a 9
-- Usuário 2: IDs 10 a 18
-- ---------------------------------------------------------------------
INSERT INTO categorias (id, usuario_id, nome, tipo) VALUES
-- Categorias do Usuário 1
(1, 1, 'Salário', 'entrada'),
(2, 1, 'Outras entradas', 'entrada'),
(3, 1, 'Alimentação', 'saida'),
(4, 1, 'Moradia', 'saida'),
(5, 1, 'Saúde', 'saida'),
(6, 1, 'Mobilidade', 'saida'),
(7, 1, 'Lazer', 'saida'),
(8, 1, 'Educação', 'saida'),
(9, 1, 'Outras saídas', 'saida'),

-- Categorias do Usuário 2
(10, 2, 'Salário', 'entrada'),
(11, 2, 'Outras entradas', 'entrada'),
(12, 2, 'Alimentação', 'saida'),
(13, 2, 'Moradia', 'saida'),
(14, 2, 'Saúde', 'saida'),
(15, 2, 'Mobilidade', 'saida'),
(16, 2, 'Lazer', 'saida'),
(17, 2, 'Educação', 'saida'),
(18, 2, 'Outras saídas', 'saida');

-- ---------------------------------------------------------------------
-- 3. FONTES E DESTINOS
-- ---------------------------------------------------------------------
INSERT INTO fontes_destinos (id, usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite) VALUES
-- Fontes do Usuário 1
(1, 1, 'Conta Corrente Principal', 'conta', NULL, NULL, NULL),
(2, 1, 'Cartão Nubank', 'cartao_credito', 3, 10, 3000.00),
(3, 1, 'Reserva de Emergência', 'conta', NULL, NULL, NULL),

-- Fontes do Usuário 2
(4, 2, 'Conta Corrente Itaú', 'conta', NULL, NULL, NULL),
(5, 2, 'Cartão Inter', 'cartao_credito', 15, 22, 2000.00);

-- ---------------------------------------------------------------------
-- 4. LANÇAMENTOS (HISTÓRICO DE 3 MESES - USUÁRIO 1)
-- ---------------------------------------------------------------------

-- ==========================================
-- MÊS 1: SETEMBRO DE 2026
-- ==========================================
INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id, parcela_atual, total_parcelas, grupo_parcelamento) VALUES
(1, 'entrada', 'Salário Mensal', 5000.00, '2026-09-05', 1, 1, 1, 1, NULL),
(1, 'saida', 'Aluguel do Apartamento', 1500.00, '2026-09-06', 4, 1, 1, 1, NULL),
(1, 'saida', 'Compras Supermercado', 680.40, '2026-09-10', 3, 1, 1, 1, NULL),
(1, 'saida', 'Combustível Posto', 220.00, '2026-09-12', 6, 1, 1, 1, NULL),
(1, 'saida', 'Medicamentos Farmácia', 145.90, '2026-09-15', 5, 1, 1, 1, NULL),
(1, 'saida', 'Jantar Restaurante', 180.00, '2026-09-20', 7, 2, 1, 1, NULL),
(1, 'saida', 'Curso Online Node.js', 199.90, '2026-09-25', 8, 2, 1, 1, NULL);

-- ==========================================
-- MÊS 2: OUTUBRO DE 2026
-- Inclui Compra Parcelada no Cartão de Crédito (3 parcelas de R$ 400.00)
-- ==========================================
INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id, parcela_atual, total_parcelas, grupo_parcelamento) VALUES
(1, 'entrada', 'Salário Mensal', 5000.00, '2026-10-05', 1, 1, 1, 1, NULL),
(1, 'saida', 'Aluguel do Apartamento', 1500.00, '2026-10-06', 4, 1, 1, 1, NULL),
(1, 'saida', 'Compras Supermercado', 740.80, '2026-10-08', 3, 1, 1, 1, NULL),
(1, 'saida', 'Plano de Saúde', 350.00, '2026-10-12', 5, 1, 1, 1, NULL),
(1, 'saida', 'Revisão do Carro', 420.00, '2026-10-15', 6, 1, 1, 1, NULL),
(1, 'saida', 'Cinema e Lazer', 95.00, '2026-10-18', 7, 2, 1, 1, NULL),

-- Compra Parcelada: Smartphone (1200.00 em 3x no Cartão Nubank)
-- Grupo Parcelamento UUID: a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d
(1, 'saida', 'Smartphone Novo', 400.00, '2026-10-20', 9, 2, 1, 3, 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'),
(1, 'saida', 'Smartphone Novo', 400.00, '2026-10-20', 9, 2, 2, 3, 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'),
(1, 'saida', 'Smartphone Novo', 400.00, '2026-10-20', 9, 2, 3, 3, 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d');

-- ==========================================
-- MÊS 3: NOVEMBRO DE 2026
-- ==========================================
INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id, parcela_atual, total_parcelas, grupo_parcelamento) VALUES
(1, 'entrada', 'Salário Mensal', 5500.00, '2026-11-05', 1, 1, 1, 1, NULL),
(1, 'entrada', 'Rendimento Investimentos', 120.50, '2026-11-08', 2, 3, 1, 1, NULL),
(1, 'saida', 'Aluguel do Apartamento', 1500.00, '2026-11-06', 4, 1, 1, 1, NULL),
(1, 'saida', 'Compras Supermercado', 680.50, '2026-11-10', 3, 1, 1, 1, NULL),
(1, 'saida', 'Combustível Posto', 240.00, '2026-11-12', 6, 1, 1, 1, NULL),
(1, 'saida', 'Assinaturas de Streaming', 79.90, '2026-11-15', 7, 2, 1, 1, NULL),
(1, 'saida', 'Livros Técnicos', 160.00, '2026-11-18', 8, 2, 1, 1, NULL);

-- ==========================================
-- LANÇAMENTOS DO USUÁRIO 2 (PARA TESTES DE ISOLAMENTO RF3)
-- ==========================================
INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id, parcela_atual, total_parcelas, grupo_parcelamento) VALUES
(2, 'entrada', 'Salário Mensal', 4200.00, '2026-11-05', 10, 4, 1, 1, NULL),
(2, 'saida', 'Mercado Semanal', 315.00, '2026-11-10', 12, 4, 1, 1, NULL),
(2, 'saida', 'Almoço Trabalho', 65.00, '2026-11-15', 12, 5, 1, 1, NULL);
