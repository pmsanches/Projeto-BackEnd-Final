require('dotenv').config();

const express = require('express');
const pool = require('./database/connection');
const protegerRota = require('./middleware/auth');
const categoriasRoutes = require('./routes/categoriasRoutes');
const fonteDestinoRoutes = require('./routes/fonteDestinoRoutes');

const app = express();
app.use(express.json());

app.use('/categorias', protegerRota, categoriasRoutes);
app.use('/fontes-destinos', protegerRota, fonteDestinoRoutes);
// app.use('/auth', authRoutes);
// app.use('/lancamentos', protegerRota, lancamentosRoutes);
// app.use('/relatorios', protegerRota, relatoriosRoutes);

// Rota inexistente
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// Middleware de erro (4 parâmetros, sempre por último)
app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ erro: 'Token ausente, inválido ou expirado.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido.' });
  }
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  try {
    await pool.query('SELECT 1');
    console.log('Conectado ao MySQL');
  } catch (err) {
    console.error('Erro ao conectar no MySQL:', err.message);
  }
});