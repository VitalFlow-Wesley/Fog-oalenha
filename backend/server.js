import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connectDatabase } from './src/config/database.js'
import { errorHandler } from './src/middleware/errorHandler.js'
import productRoutes from './src/routes/product.routes.js'
import tableRoutes from './src/routes/table.routes.js'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }))
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'Fogao a Lenha API' })
})

app.use('/api/products', productRoutes)
app.use('/api/tables', tableRoutes)

app.use(errorHandler)

connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      process.stdout.write(`Fogao a Lenha API rodando na porta ${PORT}\n`)
    })
  })
  .catch(error => {
    process.stderr.write(`${error.message}\n`)
    process.exit(1)
  })
