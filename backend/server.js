import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connectDatabase } from './src/config/database.js'
import { errorHandler } from './src/middleware/errorHandler.js'
import authRoutes from './src/routes/auth.routes.js'
import productRoutes from './src/routes/product.routes.js'
import tableRoutes from './src/routes/table.routes.js'
import commandRoutes from './src/routes/command.routes.js'
import kitchenOrderRoutes from './src/routes/kitchenOrder.routes.js'
import cashClosingRoutes from './src/routes/cashClosing.routes.js'
import settingsRoutes from './src/routes/settings.routes.js'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }))
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'Fogao a Lenha API' })
})

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/tables', tableRoutes)
app.use('/api/commands', commandRoutes)
app.use('/api/kitchen-orders', kitchenOrderRoutes)
app.use('/api/cash-closings', cashClosingRoutes)
app.use('/api/settings', settingsRoutes)

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
