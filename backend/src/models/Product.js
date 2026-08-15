import express from 'express';

const router = express.Router();

// Lista estática com os 59 produtos resgatados (com _id falso para o React não quebrar)
const produtosCadastrados = [
  { _id: "p1", name: "Agua 1,5L", category: "Bebidas", sector: "Bar / Caixa", price: 5.00, prepare: false, status: "Ativo" },
  { _id: "p2", name: "Light 1L", category: "Sorvetes", sector: "Bar / Caixa", price: 25.00, prepare: false, status: "Ativo" },
  { _id: "p3", name: "Pote 1L", category: "Sorvetes", sector: "Bar / Caixa", price: 35.00, prepare: false, status: "Ativo" },
  { _id: "p4", name: "Pote 1,5L", category: "Sorvetes", sector: "Bar / Caixa", price: 30.00, prepare: false, status: "Ativo" },
  { _id: "p5", name: "Pote 2L", category: "Sorvetes", sector: "Bar / Caixa", price: 27.00, prepare: false, status: "Ativo" },
  { _id: "p6", name: "Kids", category: "Sorvetes", sector: "Bar / Caixa", price: 8.00, prepare: false, status: "Ativo" },
  { _id: "p7", name: "Frutas", category: "Sorvetes", sector: "Bar / Caixa", price: 5.00, prepare: false, status: "Ativo" },
  { _id: "p8", name: "Copão", category: "Sorvetes", sector: "Bar / Caixa", price: 10.00, prepare: false, status: "Ativo" },
  { _id: "p9", name: "Napolitano", category: "Sorvetes", sector: "Bar / Caixa", price: 6.00, prepare: false, status: "Ativo" },
  { _id: "p10", name: "Tapioca", category: "Sorvetes", sector: "Bar / Caixa", price: 6.00, prepare: false, status: "Ativo" },
  { _id: "p11", name: "Cremoso", category: "Sorvetes", sector: "Bar / Caixa", price: 5.00, prepare: false, status: "Ativo" },
  { _id: "p12", name: "Copinho", category: "Sorvetes", sector: "Bar / Caixa", price: 6.00, prepare: false, status: "Ativo" },
  { _id: "p13", name: "Amendoim", category: "Sorvetes", sector: "Bar / Caixa", price: 7.00, prepare: false, status: "Ativo" },
  { _id: "p14", name: "Grego", category: "Sorvetes", sector: "Bar / Caixa", price: 6.00, prepare: false, status: "Ativo" },
  { _id: "p15", name: "Açai", category: "Sorvetes", sector: "Bar / Caixa", price: 7.00, prepare: false, status: "Ativo" },
  { _id: "p16", name: "Leitinho Trufado", category: "Sorvetes", sector: "Bar / Caixa", price: 7.00, prepare: false, status: "Ativo" },
  { _id: "p17", name: "Trufa Morango", category: "Sorvetes", sector: "Bar / Caixa", price: 7.00, prepare: false, status: "Ativo" },
  { _id: "p18", name: "Flocante", category: "Sorvetes", sector: "Bar / Caixa", price: 7.00, prepare: false, status: "Ativo" },
  { _id: "p19", name: "Trufa Chocolate", category: "Sorvetes", sector: "Bar / Caixa", price: 7.00, prepare: false, status: "Ativo" },
  { _id: "p20", name: "Tablete", category: "Sorvetes", sector: "Bar / Caixa", price: 8.00, prepare: false, status: "Ativo" },
  { _id: "p21", name: "Brigadeiro", category: "Salgadinhos", sector: "Bar / Caixa", price: 8.00, prepare: false, status: "Ativo" },
  { _id: "p22", name: "Sundae", category: "Sorvetes", sector: "Bar / Caixa", price: 8.00, prepare: false, status: "Ativo" },
  { _id: "p23", name: "Cone Show", category: "Sorvetes", sector: "Bar / Caixa", price: 10.00, prepare: false, status: "Ativo" },
  { _id: "p24", name: "Avelã", category: "Sorvetes", sector: "Bar / Caixa", price: 10.00, prepare: false, status: "Ativo" },
  { _id: "p25", name: "Mare Show", category: "Sorvetes", sector: "Bar / Caixa", price: 10.00, prepare: false, status: "Ativo" },
  { _id: "p26", name: "Pistache", category: "Sorvetes", sector: "Bar / Caixa", price: 10.00, prepare: false, status: "Ativo" },
  { _id: "p27", name: "Oistache", category: "Outros", sector: "Bar / Caixa", price: 0.00, prepare: false, status: "Ativo" },
  { _id: "p28", name: "Peixe Cozido", category: "Refeições", sector: "Cozinha", price: 85.00, prepare: true, status: "Ativo" },
  { _id: "p29", name: "Peixe Frito", category: "Refeições", sector: "Cozinha", price: 80.00, prepare: true, status: "Ativo" },
  { _id: "p30", name: "Rufles", category: "Salgadinhos", sector: "Bar / Caixa", price: 6.00, prepare: false, status: "Ativo" },
  { _id: "p31", name: "Fandangos", category: "Salgadinhos", sector: "Bar / Caixa", price: 5.00, prepare: false, status: "Ativo" },
  { _id: "p32", name: "Doritos", category: "Salgadinhos", sector: "Bar / Caixa", price: 6.00, prepare: false, status: "Ativo" },
  { _id: "p33", name: "cheetos onda", category: "Salgadinhos", sector: "Bar / Caixa", price: 5.00, prepare: false, status: "Ativo" },
  { _id: "p34", name: "cheetos lua", category: "Salgadinhos", sector: "Bar / Caixa", price: 5.00, prepare: false, status: "Ativo" },
  { _id: "p35", name: "Suco de cajá Copo", category: "Sucos", sector: "Sucos", price: 6.00, prepare: true, status: "Ativo" },
  { _id: "p36", name: "Suco de cajá J-G", category: "Sucos", sector: "Sucos", price: 22.00, prepare: true, status: "Ativo" },
  { _id: "p37", name: "Porco", category: "Churrasco", sector: "Churrasco", price: 35.00, prepare: true, status: "Ativo" },
  { _id: "p38", name: "Boi", category: "Churrasco", sector: "Churrasco", price: 40.00, prepare: true, status: "Ativo" },
  { _id: "p39", name: "Misto", category: "Churrasco", sector: "Churrasco", price: 35.00, prepare: true, status: "Ativo" },
  { _id: "p40", name: "Galinha Completa", category: "Refeições", sector: "Cozinha", price: 130.00, prepare: true, status: "Ativo" },
  { _id: "p41", name: "Suco de cajá J-M", category: "Sucos", sector: "Sucos", price: 16.00, prepare: true, status: "Ativo" },
  { _id: "p42", name: "Coca-Cola 600ml", category: "Bebidas", sector: "Bar / Caixa", price: 9.00, prepare: false, status: "Ativo" },
  { _id: "p43", name: "Água mineral 500ml", category: "Bebidas", sector: "Bar / Caixa", price: 3.00, prepare: false, status: "Ativo" },
  { _id: "p44", name: "Batata frita", category: "Petiscos", sector: "Cozinha", price: 15.00, prepare: true, status: "Ativo" },
  { _id: "p45", name: "Porção de arroz", category: "Refeições", sector: "Cozinha", price: 12.00, prepare: true, status: "Ativo" },
  { _id: "p46", name: "Porção de Baião", category: "Refeições", sector: "Cozinha", price: 12.00, prepare: true, status: "Ativo" },
  { _id: "p47", name: "Macaxeira frita", category: "Petiscos", sector: "Cozinha", price: 15.00, prepare: true, status: "Ativo" },
  { _id: "p48", name: "Linguiça Und", category: "Churrasco", sector: "Churrasco", price: 5.00, prepare: true, status: "Ativo" },
  { _id: "p49", name: "Suco de acerola Copo", category: "Sucos", sector: "Sucos", price: 6.00, prepare: true, status: "Ativo" },
  { _id: "p50", name: "Suco de goiaba Copo", category: "Sucos", sector: "Sucos", price: 6.00, prepare: true, status: "Ativo" },
  { _id: "p51", name: "Suco de maracujá Copo", category: "Sucos", sector: "Sucos", price: 6.00, prepare: true, status: "Ativo" },
  { _id: "p52", name: "Coca-Cola 1L", category: "Bebidas", sector: "Bar / Caixa", price: 11.00, prepare: false, status: "Ativo" },
  { _id: "p53", name: "Guarana 1L", category: "Bebidas", sector: "Bar / Caixa", price: 11.00, prepare: false, status: "Ativo" },
  { _id: "p54", name: "Refrigerante lata", category: "Bebidas", sector: "Bar / Caixa", price: 6.00, prepare: false, status: "Ativo" },
  { _id: "p55", name: "Cerveja Brahma", category: "Bebidas", sector: "Bar / Caixa", price: 13.00, prepare: false, status: "Ativo" },
  { _id: "p56", name: "Água com gas", category: "Bebidas", sector: "Bar / Caixa", price: 4.00, prepare: false, status: "Ativo" },
  { _id: "p57", name: "Cebolitos", category: "Salgadinhos", sector: "Bar / Caixa", price: 6.00, prepare: false, status: "Ativo" },
  { _id: "p58", name: "Sorvete copo", category: "Sorvetes", sector: "Bar / Caixa", price: 7.00, prepare: false, status: "Ativo" },
  { _id: "p59", name: "Pudim", category: "Sobremesas", sector: "Bar / Caixa", price: 8.00, prepare: false, status: "Ativo" }
];

// 1. ROTA GET - Puxa os produtos da lista acima (ignora o MongoDB hoje)
router.get('/', (req, res) => {
  try {
    res.status(200).json(produtosCadastrados);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. ROTA POST - Falsa (Se alguém tentar adicionar, o sistema finge que salvou e não quebra)
router.post('/', (req, res) => {
  res.status(201).json({ message: "Modo temporário: Produto reconhecido." });
});

// 3. ROTA PUT - Falsa (Se alguém tentar editar)
router.put('/:id', (req, res) => {
  res.status(200).json({ message: "Modo temporário: Edição reconhecida." });
});

// 4. ROTA DELETE - Falsa (Se alguém tentar excluir)
router.delete('/:id', (req, res) => {
  res.status(200).json({ message: "Modo temporário: Exclusão reconhecida." });
});

export default router;