import { Router } from 'express'

const router = Router()

// Estado das mesas sincronizado para todos os aparelhos
let memoryTables = Array.from({ length: 20 }, (_, i) => ({
  _id: `tbl_${i + 1}`,
  number: i + 1,
  status: 'livre',
  guests: 0,
  openedAt: null
}))

router.get('/', (_req, res) => {
  try {
    res.json(memoryTables)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/', (req, res) => {
  try {
    const newTable = {
      _id: `tbl_${req.body.number || Date.now()}`,
      number: req.body.number,
      status: req.body.status || 'livre',
      guests: req.body.guests || 0,
      openedAt: null
    }
    memoryTables.push(newTable)
    res.status(201).json(newTable)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.put('/:id', (req, res) => {
  try {
    const table = memoryTables.find(t => String(t._id) === String(req.params.id) || String(t.number) === String(req.params.id))
    if (!table) return res.status(404).json({ message: 'Mesa não encontrada' })

    if (req.body.status) table.status = req.body.status
    if (req.body.guests !== undefined) table.guests = req.body.guests
    if (req.body.openedAt) table.openedAt = req.body.openedAt

    res.json(table)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router