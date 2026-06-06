import mongoose from 'mongoose'

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error('MONGODB_URI não configurada no arquivo .env')
  }

  mongoose.set('strictQuery', true)
  await mongoose.connect(uri)
}
