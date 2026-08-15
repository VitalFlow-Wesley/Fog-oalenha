export function resetTables(tables) {
  return tables.map(table => ({ ...table, status: 'livre', guests: 0, items: [] }))
}
