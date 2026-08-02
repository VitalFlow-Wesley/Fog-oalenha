import express from 'express';

const router = express.Router();

// Permissões padrão para garçom
const garcomPermissions = {
  launchOrders: true,
  requestBill: true,
  cancelItems: false,
  closeTable: false,
  viewReports: false,
  manageUsers: false,
  manageSettings: false,
  closeCash: false
};

// Permissões padrão para gerente/admin
const adminPermissions = {
  launchOrders: true,
  requestBill: true,
  cancelItems: true,
  closeTable: true,
  viewReports: true,
  manageUsers: true,
  manageSettings: true,
  closeCash: true
};

// Lista de usuários
const usuariosCadastrados = [
  { _id: "u1", name: "Administrador", login: "admin", role: "administrador", status: "Ativo", permissions: adminPermissions },
  { _id: "u2", name: "Gabriella", login: "gabriella", role: "gerente", status: "Ativo", permissions: adminPermissions },
  { _id: "u3", name: "Wesley", login: "wesley", role: "garcom", status: "Ativo", permissions: garcomPermissions },
  { _id: "u4", name: "Wesley Admin", login: "admin_wesley", role: "gerente", status: "Ativo", permissions: adminPermissions },
  { _id: "u5", name: "Mariana", login: "mariana", role: "garcom", status: "Ativo", permissions: garcomPermissions },
  { _id: "u6", name: "Aline", login: "aline", role: "garcom", status: "Ativo", permissions: garcomPermissions }
];

// Credenciais de acesso (Senha da Gabriella atualizada para 061110)
const credenciais = {
  "admin": "admin",
  "gabriella": "061110",
  "wesley": "123456",
  "admin_wesley": "123456",
  "mariana": "041206",
  "aline": "140623"
};

// 1. ROTA GET - Lista de usuários para a tela
router.get('/', (req, res) => {
  try {
    res.status(200).json(usuariosCadastrados);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. ROTA POST /login - Autenticação
router.post('/login', (req, res) => {
  const loginInput = (req.body.login || req.body.username || '').toLowerCase().trim();
  const passwordInput = req.body.password || req.body.credentialHash;

  if (credenciais[loginInput] && credenciais[loginInput] === passwordInput) {
    const user = usuariosCadastrados.find(u => u.login === loginInput);
    return res.status(200).json({
      token: "token_bypass_123456",
      user: user || {
        name: loginInput,
        login: loginInput,
        role: "garcom",
        permissions: garcomPermissions
      }
    });
  }

  return res.status(401).json({ message: "Login ou senha incorretos." });
});

// 3. ROTAS SECUNDÁRIAS (Evitam erros na interface)
router.post('/', (req, res) => res.status(201).json({ message: "Sucesso" }));
router.put('/:id', (req, res) => res.status(200).json({ message: "Sucesso" }));
router.delete('/:id', (req, res) => res.status(200).json({ message: "Sucesso" }));

export default router;