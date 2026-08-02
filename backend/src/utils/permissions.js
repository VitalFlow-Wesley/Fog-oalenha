export const ROLE_PERMISSIONS = {
  administrador: {
    launchOrders: true,
    requestBill: true,
    cancelItems: true,
    closeTable: true,
    viewReports: true,
    manageUsers: true,
    manageSettings: true,
    closeCash: true,
  },
  gerente: {
    launchOrders: true,
    requestBill: true,
    cancelItems: true,
    closeTable: true,
    viewReports: true,
    manageUsers: true, // 👈 Liberado para criar/editar/excluir usuários!
    manageSettings: true,
    closeCash: true,
  },
  caixa: {
    launchOrders: true,
    requestBill: true,
    cancelItems: true,
    closeTable: true,
    viewReports: true,
    manageUsers: false,
    manageSettings: false,
    closeCash: true,
  },
  garcom: {
    launchOrders: true,
    requestBill: true,
    cancelItems: false,
    closeTable: false,
    viewReports: false,
    manageUsers: false,
    manageSettings: false,
    closeCash: false,
  },
}

export function permissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.garcom
}

export function canAuthorizeSensitiveAction(user) {
  return ['administrador', 'gerente', 'caixa'].includes(user?.role) && user?.status === 'Ativo'
}