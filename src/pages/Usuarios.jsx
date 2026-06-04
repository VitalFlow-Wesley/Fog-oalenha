import { useState } from 'react'
import { Plus, Trash2, UserCog } from 'lucide-react'

const roleLabel = {
  admin: 'Administrador',
  gerente: 'Gerente',
  garcom: 'Garçom'
}

export default function Usuarios({ users, setUsers, currentUser }) {
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'garcom' })

  const canManage = currentUser?.role === 'admin'

  function handleSubmit(event) {
    event.preventDefault()
    if (!canManage) return
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) return

    const newUser = {
      id: Date.now(),
      name: form.name.trim(),
      username: form.username.trim(),
      password: form.password.trim(),
      role: form.role,
      active: true
    }

    setUsers(prev => [...prev, newUser])
    setForm({ name: '', username: '', password: '', role: 'garcom' })
  }

  function removeUser(id) {
    if (!canManage) return
    if (id === currentUser?.id) return
    setUsers(prev => prev.filter(user => user.id !== id))
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <span className="eyebrow">Controle de acesso</span>
          <h1>Usuários do sistema</h1>
          <p className="pageDescription">
            Cadastre os acessos de administrador, gerente e garçom. Cada colaborador entra com seu próprio login para o sistema reconhecer quem está trabalhando.
          </p>
        </div>
      </div>

      {!canManage && (
        <section className="panel blockedPanel">
          <strong>Acesso restrito</strong>
          <span>Somente o administrador pode criar, remover ou editar usuários.</span>
        </section>
      )}

      {canManage && (
        <section className="panel userFormPanel">
          <div className="sectionTitle">
            <UserCog size={22} />
            <h2>Criar novo acesso</h2>
          </div>

          <form className="userForm" onSubmit={handleSubmit}>
            <label>
              <span>Nome do colaborador</span>
              <input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ex: João Silva" />
            </label>

            <label>
              <span>Login</span>
              <input value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} placeholder="Ex: joao" />
            </label>

            <label>
              <span>Senha</span>
              <input value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} placeholder="Ex: 123456" />
            </label>

            <label>
              <span>Função</span>
              <select value={form.role} onChange={event => setForm({ ...form, role: event.target.value })}>
                <option value="admin">Administrador</option>
                <option value="gerente">Gerente</option>
                <option value="garcom">Garçom</option>
              </select>
            </label>

            <button className="primaryBtn fit" type="submit">
              <Plus size={18} /> Criar acesso
            </button>
          </form>
        </section>
      )}

      <section className="panel">
        <h2>Acessos cadastrados</h2>
        <div className="usersGrid">
          {users.map(user => (
            <div className="userCard" key={user.id}>
              <div className="userAvatar">{user.name.slice(0, 2).toUpperCase()}</div>
              <div className="userInfo">
                <strong>{user.name}</strong>
                <span>Login: {user.username}</span>
                <small>{roleLabel[user.role]}</small>
              </div>
              {canManage && user.id !== currentUser?.id && (
                <button className="iconDanger" onClick={() => removeUser(user.id)} title="Remover usuário">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
