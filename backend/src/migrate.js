import { MongoClient } from 'mongodb';

// String oficial de conexão com o cluster do MongoDB Atlas
const MONGODB_URI = "mongodb+srv://fogao_admin:%40Wesley383944@fogaoalenha.33wluw0.mongodb.net/fogao_a_lenha?retryWrites=true&w=majority";

async function runMigration() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("🔄 Conectando ao MongoDB Atlas...");
    await client.connect();
    const db = client.db('fogao_a_lenha');

    // 1. Busca o documento com todo o estado atual
    const mainDoc = await db.collection('app_state').findOne({ _id: 'main' });

    if (!mainDoc || !mainDoc.state) {
      console.error("❌ Documento 'app_state' com _id: 'main' não foi encontrado.");
      return;
    }

    const { products, users, tables } = mainDoc.state;

    // 2. Migra os Produtos (incluindo 'merenda')
    if (products && products.length > 0) {
      await db.collection('products').deleteMany({});
      await db.collection('products').insertMany(products);
      console.log(`✅ ${products.length} produtos migrados com sucesso para a coleção 'products'!`);
    }

    // 3. Migra os Usuários
    if (users && users.length > 0) {
      await db.collection('users').deleteMany({});
      await db.collection('users').insertMany(users);
      console.log(`✅ ${users.length} usuários migrados com sucesso para a coleção 'users'!`);
    }

    // 4. Migra as Mesas
    if (tables && tables.length > 0) {
      await db.collection('tables').deleteMany({});
      await db.collection('tables').insertMany(tables);
      console.log(`✅ ${tables.length} mesas migradas com sucesso para a coleção 'tables'!`);
    }

    console.log("\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!");

  } catch (error) {
    console.error("❌ Erro durante a migração:", error);
  } finally {
    await client.close();
  }
}

runMigration();