const directReplacements = [
  ['FogÃ£o', 'Fogão'],
  ['fogÃ£o', 'fogão'],
  ['GestÃ£o', 'Gestão'],
  ['gestÃ£o', 'gestão'],
  ['garÃ§om', 'garçom'],
  ['GarÃ§om', 'Garçom'],
  ['garÃ§ons', 'garçons'],
  ['GarÃ§ons', 'Garçons'],
  ['RefeiÃ§Ãµes', 'Refeições'],
  ['refeiÃ§Ãµes', 'refeições'],
  ['Ã�gua', 'Água'],
  ['Ã¡gua', 'água'],
  ['cajÃ¡', 'cajá'],
  ['CajÃ¡', 'Cajá'],
  ['nÃ£o', 'não'],
  ['NÃ£o', 'Não'],
  ['invÃ¡lido', 'inválido'],
  ['invÃ¡lida', 'inválida'],
  ['possÃ­vel', 'possível'],
  ['Ã§', 'ç'],
  ['Ã£', 'ã'],
  ['Ãµ', 'õ'],
  ['Ã¡', 'á'],
  ['Ã©', 'é'],
  ['Ã­', 'í'],
  ['Ã³', 'ó'],
  ['Ãº', 'ú'],
  ['Ã‡', 'Ç'],
]

const patternReplacements = [
  [/caj�/gi, value => value[0] === 'C' ? 'Cajá' : 'cajá'],
  [/�gua/g, 'Água'],
  [/refei��es/gi, value => value[0] === 'R' ? 'Refeições' : 'refeições'],
  [/gar�om/gi, value => value[0] === 'G' ? 'Garçom' : 'garçom'],
  [/gar�ons/gi, value => value[0] === 'G' ? 'Garçons' : 'garçons'],
  [/n�o/gi, value => value[0] === 'N' ? 'Não' : 'não'],
]

export function repairText(value) {
  if (typeof value !== 'string') return value
  let next = value
  directReplacements.forEach(([from, to]) => {
    next = next.split(from).join(to)
  })
  patternReplacements.forEach(([pattern, replacement]) => {
    next = next.replace(pattern, replacement)
  })
  return next
}

export function repairData(value) {
  if (typeof value === 'string') return repairText(value)
  if (Array.isArray(value)) return value.map(repairData)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, repairData(entry)]))
}
