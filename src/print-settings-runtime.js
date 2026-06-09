const PKEY = 'fogao-printers-v2'
const MKEY = 'fogao-receipt-message-v2'
const emptyState = { printers: [], rules: { cozinha: '', churrasco: '', sucos: '', cliente: '' } }
let isRenderingPrintRuntime = false

function readPrint() {
  try {
    const saved = JSON.parse(localStorage.getItem(PKEY) || 'null') || {}
    return { ...emptyState, ...saved, printers: Array.isArray(saved.printers) ? saved.printers : [], rules: { ...emptyState.rules, ...(saved.rules || {}) } }
  } catch { return emptyState }
}
function writePrint(v) { localStorage.setItem(PKEY, JSON.stringify(v)) }
function opts(s, selected) { return s.printers.length ? '<option value="">Selecione</option>' + s.printers.map(p => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${p.name}</option>`).join('') : '<option value="">Nenhuma impressora cadastrada</option>' }
function clean(s) { const ids = s.printers.map(p => p.id); const r = { ...s.rules }; Object.keys(r).forEach(k => { if (!ids.includes(r[k])) r[k] = '' }); if (!r.sucos && r.cozinha) r.sucos = r.cozinha; return { ...s, rules: r } }

function renderPrintPage(page, nav) {
  if (!page || !nav) return
  isRenderingPrintRuntime = true
  page.classList.add('print-runtime-active')
  const s = clean(readPrint()); writePrint(s)
  nav.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.textContent.includes('Impressão')))
  page.querySelector('[data-print-runtime]')?.remove()
  const rows = s.printers.length ? s.printers.map(p => `<div class="prRow" data-id="${p.id}"><b>🖨️ Impressora</b><strong>${p.name}</strong><em>● Online</em><span><button data-act="test">Testar</button><button data-act="edit">✎</button><button data-act="del" class="danger">🗑</button></span></div>`).join('') : '<div class="prEmpty">Nenhuma impressora cadastrada. Clique em adicionar impressora para começar.</div>'
  const wrapper = document.createElement('div')
  wrapper.className = 'printRuntimePanel'
  wrapper.dataset.printRuntime = 'true'
  wrapper.innerHTML = `
    <section class="settingsPanel"><div class="printBlockHeader"><div class="printNumberTitle"><span>🖨️</span><h2>1. Impressoras cadastradas</h2></div><button class="addPrinterBtn solid" data-add-printer>+ Adicionar impressora</button></div><div class="prTable"><div class="prHead"><span>Tipo</span><span>Nome</span><span>Status</span><span>Ações</span></div>${rows}</div></section>
    <section class="settingsPanel"><div class="printNumberTitle"><span>🖨️</span><h2>2. Regras de impressão por setor</h2></div><div class="prRules"><label>Pedidos da cozinha saem em<select data-rule="cozinha">${opts(s, s.rules.cozinha)}</select></label><label>Pedidos do churrasco saem em<select data-rule="churrasco">${opts(s, s.rules.churrasco)}</select></label><label>Pedidos dos sucos saem em<select data-rule="sucos">${opts(s, s.rules.sucos || s.rules.cozinha)}</select><small>Sucos podem usar a mesma impressora da cozinha.</small></label><label>Comanda do cliente sai em<select data-rule="cliente">${opts(s, s.rules.cliente)}</select></label><div class="currentRulesBox"><strong>Regras atuais</strong><ul><li>O sistema começa sem impressora cadastrada.</li><li>Cadastre apenas as impressoras que existem.</li><li>Sucos podem sair na mesma impressora da cozinha.</li></ul></div></div></section>
    <section class="settingsPanel"><div class="printNumberTitle"><span>📄</span><h2>3. Tipos de impressão</h2></div><div class="printTypeList"><div class="printTypeRow"><div><strong>Pedido de preparo</strong><span>Itens enviados para cozinha, churrasco ou sucos.</span></div><button class="printToggle active"><span></span></button></div><div class="printTypeRow"><div><strong>Comanda do cliente</strong><span>Comanda completa no caixa.</span></div><button class="printToggle active"><span></span></button></div><div class="printTypeRow"><div><strong>Reimpressão</strong><span>Permitir reimpressão de pedidos e comandas.</span></div><button class="printToggle active"><span></span></button></div></div></section>
    <section class="settingsPanel"><div class="printBlockHeader"><div class="printNumberTitle"><span>🧾</span><h2>4. Modelo da comanda do cliente</h2></div><button class="editReceiptBtn" data-edit-model>✎ Editar modelo</button></div><div class="receiptPreviewLayout"><div class="receiptPreview"><h3>FOGÃO A LENHA</h3><p>Churrascaria & Restaurante</p><hr><p>1x Picanha <b>R$ 85,00</b></p><hr><strong class="receiptTotal">TOTAL <b>R$ 85,00</b></strong><em>${localStorage.getItem(MKEY) || 'Obrigado pela preferência! Volte sempre.'}</em></div><div class="receiptInfoList"><strong>Informações exibidas</strong><span>✓ Nome do estabelecimento</span><span>✓ Mesa</span><span>✓ Data e hora</span><span>✓ Itens do pedido</span><span>✓ Total</span><span>✓ Mensagem final</span></div></div></section>
    <div class="printFooterBar"><div><strong>Dica:</strong> configure as impressoras por setor.</div><button class="primaryBtn" data-save-print>Salvar configurações</button></div>`
  nav.insertAdjacentElement('afterend', wrapper)
  bindPrint(page, nav)
  setTimeout(() => { isRenderingPrintRuntime = false }, 50)
}

function bindPrint(page, nav) {
  const panel = page.querySelector('[data-print-runtime]')
  panel.querySelector('[data-add-printer]')?.addEventListener('click', () => { const n = prompt('Nome da impressora:', ''); if (!n?.trim()) return; const s = readPrint(); const p = { id: String(Date.now()), name: n.trim() }; const next = clean({ ...s, printers: [...s.printers, p] }); if (!next.rules.cozinha) next.rules.cozinha = p.id; if (!next.rules.sucos) next.rules.sucos = next.rules.cozinha; writePrint(next); renderPrintPage(page, nav) })
  panel.querySelectorAll('[data-rule]').forEach(sel => sel.addEventListener('change', () => { const s = readPrint(); writePrint({ ...s, rules: { ...s.rules, [sel.dataset.rule]: sel.value } }) }))
  panel.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', () => { const id = btn.closest('[data-id]')?.dataset.id; const s = readPrint(); const p = s.printers.find(x => x.id === id); if (!p) return; if (btn.dataset.act === 'test') return alert(`Teste preparado para ${p.name}.`); if (btn.dataset.act === 'edit') { const n = prompt('Nome da impressora:', p.name); if (!n?.trim()) return; writePrint({ ...s, printers: s.printers.map(x => x.id === id ? { ...x, name: n.trim() } : x) }) } else { if (!confirm(`Excluir a impressora ${p.name}?`)) return; writePrint(clean({ ...s, printers: s.printers.filter(x => x.id !== id) })) } renderPrintPage(page, nav) }))
  panel.querySelector('[data-edit-model]')?.addEventListener('click', () => { const current = localStorage.getItem(MKEY) || 'Obrigado pela preferência! Volte sempre.'; const n = prompt('Mensagem final da comanda:', current); if (n !== null) { localStorage.setItem(MKEY, n); renderPrintPage(page, nav) } })
  panel.querySelector('[data-save-print]')?.addEventListener('click', () => alert('Configurações de impressão salvas.'))
}

function restoreNative(page) { page.classList.remove('print-runtime-active'); page.querySelector('[data-print-runtime]')?.remove() }
function enhancePrint() {
  const page = document.querySelector('.settingsPremiumPage')
  const nav = page?.querySelector('.settingsTabs')
  const btn = nav && Array.from(nav.querySelectorAll('button')).find(b => b.textContent.includes('Impressão'))
  if (!page || !nav || !btn) return
  if (!btn.dataset.runtimePrint) {
    btn.dataset.runtimePrint = '1'
    btn.addEventListener('click', e => { e.preventDefault(); setTimeout(() => renderPrintPage(page, nav), 0) })
    nav.querySelectorAll('button').forEach(b => { if (b !== btn) b.addEventListener('click', () => restoreNative(page)) })
  }
  if (btn.classList.contains('active') && !page.querySelector('[data-print-runtime]') && !isRenderingPrintRuntime) renderPrintPage(page, nav)
}

const st = document.createElement('style')
st.textContent = '.print-runtime-active>.printSettingsTabV2{display:none!important}.printRuntimePanel{display:grid;grid-template-columns:1fr 1fr;gap:18px}.printRuntimePanel .printFooterBar{grid-column:1/-1}.prTable{border:1px solid #efd9bd;border-radius:16px;overflow:hidden}.prHead,.prRow{display:grid;grid-template-columns:1fr 1.2fr .7fr 1.1fr;gap:10px;align-items:center;padding:13px}.prHead{background:#fff0d7;font-weight:800}.prRow{border-top:1px solid #f1dfc8}.prRow span{display:flex;gap:8px}.prRow button{border:1px solid #e9d0b3;border-radius:10px;background:#fffaf2;padding:8px 10px;font-weight:800}.prRow .danger{color:#ef4444;background:#fff1ee}.prEmpty{padding:24px;text-align:center;color:#8a6b58}.prRules{display:grid;grid-template-columns:1fr 1fr;gap:16px}.prRules label{display:flex;flex-direction:column;gap:8px;font-weight:800}.prRules select{height:52px;border:1px solid #e7d0b3;border-radius:12px;padding:0 14px;background:#fffaf5}.prRules small{color:#8a6b58}.prRules .currentRulesBox{grid-row:1/5;grid-column:2;background:#eff9ea;border:1px solid #d6eccd;border-radius:16px;padding:18px}@media(max-width:1100px){.printRuntimePanel,.prRules{grid-template-columns:1fr}.prRules .currentRulesBox{grid-row:auto;grid-column:auto}.prHead,.prRow{grid-template-columns:1fr}}'
document.head.appendChild(st)
new MutationObserver(enhancePrint).observe(document.body,{childList:true,subtree:true})
window.addEventListener('DOMContentLoaded',enhancePrint)
setTimeout(enhancePrint,300)
