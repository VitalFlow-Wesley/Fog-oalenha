export const products = [
  { id: 1, name: 'Galinha caipira', category: 'Refeições', price: 55, localSaida: 'cozinha', imprimeCozinha: true },
  { id: 2, name: 'Peixe frito', category: 'Refeições', price: 48, localSaida: 'cozinha', imprimeCozinha: true },
  { id: 3, name: 'Batata frita', category: 'Refeições', price: 22, localSaida: 'cozinha', imprimeCozinha: true },
  { id: 4, name: 'Porção mista de churrasco', category: 'Churrasco', price: 65, localSaida: 'churrasqueira', imprimeCozinha: true },
  { id: 5, name: 'Picanha', category: 'Churrasco', price: 85, localSaida: 'churrasqueira', imprimeCozinha: true },
  { id: 6, name: 'Linguiça', category: 'Churrasco', price: 28, localSaida: 'churrasqueira', imprimeCozinha: true },
  { id: 7, name: 'Suco de cajá', category: 'Sucos', price: 8, localSaida: 'cozinha', imprimeCozinha: true },
  { id: 8, name: 'Suco de acerola', category: 'Sucos', price: 8, localSaida: 'cozinha', imprimeCozinha: true },
  { id: 9, name: 'Coca-Cola 600ml', category: 'Bebidas', price: 9, localSaida: 'bar', imprimeCozinha: false },
  { id: 10, name: 'Água mineral', category: 'Bebidas', price: 4, localSaida: 'bar', imprimeCozinha: false },
  { id: 11, name: 'Cerveja', category: 'Bebidas', price: 10, localSaida: 'bar', imprimeCozinha: false },
  { id: 12, name: 'Bombom', category: 'Bombons', price: 3, localSaida: 'bar', imprimeCozinha: false },
  { id: 13, name: 'Salgadinho', category: 'Salgadinhos', price: 5, localSaida: 'bar', imprimeCozinha: false },
  { id: 14, name: 'Sorvete', category: 'Sorvetes', price: 7, localSaida: 'bar', imprimeCozinha: false },
  { id: 15, name: 'Sobremesa da casa', category: 'Sobremesas', price: 12, localSaida: 'bar', imprimeCozinha: false }
]

export const initialTables = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  number: String(index + 1).padStart(2, '0'),
  status: index < 4 ? 'ocupada' : 'livre',
  guests: index < 4 ? index + 2 : 0,
  openedAt: index < 4 ? `12:3${index}` : null,
  items: index === 0 ? [
    { ...products[0], qty: 1, observation: 'Sem cebola' },
    { ...products[6], qty: 2, observation: '' },
    { ...products[8], qty: 2, observation: '' },
  ] : index === 1 ? [
    { ...products[3], qty: 1, observation: 'Ao ponto' },
    { ...products[10], qty: 3, observation: '' },
  ] : index === 2 ? [
    { ...products[1], qty: 1, observation: '' },
    { ...products[2], qty: 1, observation: '' },
  ] : index === 3 ? [
    { ...products[14], qty: 2, observation: '' },
    { ...products[9], qty: 2, observation: '' },
  ] : [],
  kitchenSent: index === 1 || index === 2,
  billRequested: false
}))
