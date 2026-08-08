import './env.js'
import { synchronize } from './sync.js'

const direction = process.argv[2] || 'push'
try {
  const status = await synchronize(direction)
  process.stdout.write(`Sincronização ${direction} concluída.\n`)
  process.stdout.write(`${JSON.stringify(status.counts, null, 2)}\n`)
} catch (error) {
  process.stderr.write(`Sincronização não realizada: ${error.message}\n`)
  process.exit(1)
}
