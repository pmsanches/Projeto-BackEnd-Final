const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { cpfValido } = require('../utils/cpf');
const protegerRota = require('../middleware/auth');

const router = express.Router();

router.post('/cadastro', async (req, res) => {
  const { nome, email, cpf, senha } = req.body;
  const erros = {};

  // Validações de campos obrigatórios e formatos
  if (!nome || !nome.trim()) {
    erros.nome = 'Informe o nome.';
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    erros.email = 'E-mail inválido.';
  }

  if (!cpf || !cpfValido(cpf)) {
    erros.cpf = 'CPF inválido.';
  }

  if (!senha || senha.length < 8 || !/[A-Za-z]/.test(senha) || !/\d/.test(senha)) {
    erros.senha = 'A senha deve ter ao menos 8 caracteres, com letras e números.';
  }

  if (Object.keys(erros).length > 0) {
    return res.status(400).json({
      erro: 'Dados inválidos.',
      campos: erros,
    });
  }

  try {
    // Hash da senha com bcrypt (10 rounds de salt)
    const senhaHash = await bcrypt.hash(senha, 10);

    const dados = {
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      cpf: cpf.replace(/\D/g, ''),
      senhaHash,
    };

    await Usuario.cadastrar(dados, (erro, usuario) => {
      if (erro) {
        // Tratamento da restrição UNIQUE no MySQL
        if (erro.code === 'ER_DUP_ENTRY') {
          const campo = erro.sqlMessage.includes('uq_usuarios_cpf') ? 'cpf' : 'email';
          return res.status(409).json({
            erro: 'Usuário já cadastrado.',
            campos: {
              [campo]: `Já existe um usuário com este ${campo === 'cpf' ? 'CPF' : 'e-mail'}.`,
            },
          });
        }

        console.error(erro);
        return res.status(500).json({ erro: 'Erro ao cadastrar usuário.' });
      }

      return res.status(201).json(usuario);
    });
  } catch (erroInterno) {
    console.error(erroInterno);
    return res.status(500).json({ erro: 'Erro interno ao processar cadastro.' });
  }
});


router.post('/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({
      erro: 'Dados inválidos.',
      campos: {
        email: !email ? 'Informe o e-mail.' : undefined,
        senha: !senha ? 'Informe a senha.' : undefined,
      },
    });
  }

  const emailNormalizado = email.trim().toLowerCase();

  Usuario.buscarPorEmail(emailNormalizado, async (erro, usuario) => {
    if (erro) {
      console.error(erro);
      return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }

    if (!usuario) {
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    const confere = await bcrypt.compare(senha, usuario.senha_hash);

    if (!confere) {
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    const payload = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    return res.status(200).json({
      token,
      usuario: payload,
    });
  });
});


router.get('/me', protegerRota, (req, res) => {
  // O id do usuário vem estritamente do token via req.auth
  const usuarioId = req.auth.id;

  Usuario.buscarPorId(usuarioId, (erro, usuario) => {
    if (erro) {
      console.error(erro);
      return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    return res.status(200).json(usuario);
  });
});

module.exports = router;
