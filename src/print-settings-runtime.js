const PKEY = 'fogao-printers-v2'
const MKEY = 'fogao-receipt-message-v2'
const emptyState = { printers: [], rules: { cozinha: '', churrasco: '', cliente: '' } }
let isRenderingPrintRuntime = false

function readPrint() {
  try {
    const saved = JSON.parse(localStorage.getItem(PKEY) || 'null') || {}
    return { ...emptyState, ...saved, printers: Array.isArray(saved.printers) ? saved.printers : [], rules: { ...emptyState.rules, ...(saved.rules || {}) } }
  } catch { return emptyState }
}
function writePrint(v) { localStorage.setItem(PKEY, JSON.stringify(v)) }
function opts(s, selected) { return s.printers.length ? '<option value="">Selecione uma impressora</option>' + s.printers.map(p => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${p.name}</option>`).join('') : '<option value="">Nenhuma impressora cadastrada</option>' }
function clean(s) { const ids = s.printers.map(p => p.id); const r = { cozinha: s.rules?.cozinha || '', churrasco: s.rules?.churrasco || '', cliente: s.rules?.cliente || '' }; Object.keys(r).forEach(k => { if (!ids.includes(r[k])) r[k] = '' }); return { ...s, rules: r } }

function renderPrintPage(page, nav) {
  if (!page || !nav) return
  isRenderingPrintRuntime = true
  page.classList.add('print-runtime-active')
  const s = clean(readPrint()); writePrint(s)
  nav.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.textContent.includes('Impressão')))
  page.querySelector('[data-print-runtime]')?.remove()
  const rows = s.printers.length ? s.printers.map(p => `<div class="prRow" data-id="${p.id}"><b>🖨️ Impressora</b><strong>${p.name}</strong><em>● Online</em><span><button data-act="test">Testar</button><button data-act="edit" title="Editar">✎</button><button data-act="del" class="danger" title="Excluir">🗑</button></span></div>`).join('') : '<div class="prEmpty"><strong>Nenhuma impressora cadastrada</strong><span>Clique em “Adicionar impressora” para cadastrar Caixa, Cozinha ou outra impressora real.</span></div>'
  const wrapper = document.createElement('div')
  wrapper.className = 'printRuntimePanel'
  wrapper.dataset.printRuntime = 'true'
  wrapper.innerHTML = `
    <section class="settingsPanel printHeroBlock"><div><span class="prEyebrow">IMPRESSÃO</span><h2>Controle das impressoras</h2><p>Cadastre apenas impressoras reais e defina para onde cada tipo de pedido deve sair.</p></div><button class="addPrinterBtn solid" data-add-printer>+ Adicionar impressora</button></section>
    <section class="settingsPanel printPrintersCard"><div class="printBlockHeader"><div class="printNumberTitle"><span>🖨️</span><h2>1. Impressoras cadastradas</h2></div></div><div class="prTable"><div class="prHead"><span>Tipo</span><span>Nome</span><span>Status</span><span>Ações</span></div>${rows}</div></section>
    <section class="settingsPanel printRulesCard"><div class="printNumberTitle"><span>🧭</span><h2>2. Regras por setor</h2></div><div class="prRules"><div class="rulesFields"><label>Pedidos da cozinha saem em<select data-rule="cozinha">${opts(s, s.rules.cozinha)}</select></label><label>Pedidos do churrasco saem em<select data-rule="churrasco">${opts(s, s.rules.churrasco)}</select></label><label>Comanda do cliente sai em<select data-rule="cliente">${opts(s, s.rules.cliente)}</select></label><div class="juiceInfo">🥤 Sucos seguem a mesma regra da cozinha. Não precisa configurar separado.</div></div><div class="currentRulesBox"><strong>Regras atuais</strong><ul><li>O sistema começa sem impressora cadastrada.</li><li>Cadastre somente as impressoras que existem.</li><li>Itens do bar ficam apenas na comanda do cliente.</li></ul></div></div></section>
    <section class="settingsPanel printTypesCard"><div class="printNumberTitle"><span>📄</span><h2>3. Tipos de impressão</h2></div><div class="printTypeList"><div class="printTypeRow"><div><strong>Pedido de preparo</strong><span>Itens enviados para cozinha ou churrasco.</span></div><button class="printToggle active"><span></span></button></div><div class="printTypeRow"><div><strong>Comanda do cliente</strong><span>Comanda completa no caixa.</span></div><button class="printToggle active"><span></span></button></div><div class="printTypeRow"><div><strong>Reimpressão</strong><span>Permitir reimpressão de pedidos e comandas.</span></div><button class="printToggle active"><span></span></button></div></div></section>
    <section class="settingsPanel receiptModelCard"><div class="printBlockHeader"><div class="printNumberTitle"><span>🧾</span><h2>4. Modelo da comanda do cliente</h2></div><button class="editReceiptBtn" data-edit-model>✎ Editar modelo</button></div><div class="receiptPreviewLayout"><div class="receiptPreview"><h3>FOGÃO A LENHA</h3><p>Churrascaria & Restaurante</p><hr><p>1x Picanha <b>R$ 85,00</b></p><hr><strong class="receiptTotal">TOTAL <b>R$ 85,00</b></strong><em>${localStorage.getItem(MKEY) || 'Obrigado pela preferência! Volte sempre.'}</em></div><div class="receiptInfoList"><strong>Informações exibidas</strong><span>✓ Nome do estabelecimento</span><span>✓ Mesa</span><span>✓ Data e hora</span><span>✓ Itens do pedido</span><span>✓ Total</span><span>✓ Mensagem final</span></div></div></section>
    <div class="printFooterBar"><div><strong>Dica:</strong> configure primeiro a impressora da cozinha e a do caixa.</div><button class="primaryBtn" data-save-print>Salvar configurações</button></div>`
  nav.insertAdjacentElement('afterend', wrapper)
  bindPrint(page, nav)
  setTimeout(() => { isRenderingPrintRuntime = false }, 50)
}

function bindPrint(page, nav) {
  const panel = page.querySelector('[data-print-runtime]')
  panel.querySelector('[data-add-printer]')?.addEventListener('click', () => { const n = prompt('Nome da impressora:', ''); if (!n?.trim()) return; const s = readPrint(); const p = { id: String(Date.now()), name: n.trim() }; const next = clean({ ...s, printers: [...s.printers, p] }); if (!next.rules.cozinha) next.rules.cozinha = p.id; if (!next.rules.cliente) next.rules.cliente = p.id; writePrint(next); renderPrintPage(page, nav) })
  panel.querySelectorAll('[data-rule]').forEach(sel => sel.addEventListener('change', () => { const s = readPrint(); writePrint(clean({ ...s, rules: { ...s.rules, [sel.dataset.rule]: sel.value } })) }))
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
st.textContent = '.print-runtime-active>.printSettingsTabV2{display:none!important}.printRuntimePanel{display:grid;grid-template-columns:1.05fr .95fr;gap:18px}.printHeroBlock{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;padding:22px 26px!important;background:linear-gradient(135deg,#fffaf2,#fff3df)!important}.printHeroBlock h2{font-size:34px;margin:4px 0 6px}.printHeroBlock p{color:#8a6b58;margin:0}.prEyebrow{font-size:12px;font-weight:900;letter-spacing:.18em;color:#d84a2b}.printPrintersCard,.printRulesCard,.printTypesCard,.receiptModelCard{padding:20px!important}.printRuntimePanel .printFooterBar{grid-column:1/-1}.prTable{border:1px solid #efd9bd;border-radius:16px;overflow:hidden;background:#fffdf8}.prHead,.prRow{display:grid;grid-template-columns:1fr 1.2fr .7fr 1.1fr;gap:10px;align-items:center;padding:13px}.prHead{background:#fff0d7;font-weight:900}.prRow{border-top:1px solid #f1dfc8}.prRow em{background:#e6f7df;color:#237a35;border-radius:999px;padding:7px 12px;font-style:normal;font-weight:900;width:max-content}.prRow span{display:flex;gap:8px;justify-content:flex-end}.prRow button{border:1px solid #e9d0b3;border-radius:12px;background:#fffaf2;padding:9px 11px;font-weight:900;cursor:pointer}.prRow .danger{color:#ef4444;background:#fff1ee;border-color:#ffd0ca}.prEmpty{padding:34px 24px;text-align:center;color:#8a6b58;display:flex;flex-direction:column;gap:8px}.prEmpty strong{font-size:20px;color:#3b1d15}.prRules{display:grid;grid-template-columns:1fr 260px;gap:18px;align-items:stretch}.rulesFields{display:flex;flex-direction:column;gap:15px}.prRules label{display:flex;flex-direction:column;gap:8px;font-weight:900;color:#2d140e}.prRules select{height:56px;border:1px solid #e7d0b3;border-radius:15px;padding:0 16px;background:#fffaf5;font-size:16px}.juiceInfo{background:#fff4e2;border:1px dashed #e4c49a;border-radius:14px;padding:13px 15px;color:#7a5b47;font-weight:800}.prRules .currentRulesBox{background:#eff9ea;border:1px solid #d6eccd;border-radius:18px;padding:20px;color:#3d6b3c}.currentRulesBox strong{font-size:21px}.currentRulesBox li{margin:10px 0}.printTypeList{display:grid;gap:12px}.printTypeRow{display:grid!important;grid-template-columns:1fr auto!important;align-items:center!important;padding:18px!important;border-radius:16px!important}.printTypeRow span{display:block!important;max-width:none!important}.receiptPreviewLayout{display:grid;grid-template-columns:280px 1fr;gap:22px;align-items:start}.receiptPreview{background:#fffdf8;border:1px dashed #d8b98c;padding:20px;text-align:center;box-shadow:0 18px 30px rgba(80,40,10,.08)}.receiptInfoList{display:flex;flex-direction:column;gap:10px}.printFooterBar{display:flex;justify-content:space-between;gap:16px;align-items:center;background:#fffdf8;border:1px solid #ecd6bd;border-radius:18px;padding:16px 20px}.printFooterBar .primaryBtn{max-width:420px}@media(max-width:1100px){.printRuntimePanel,.prRules,.receiptPreviewLayout{grid-template-columns:1fr}.prHead,.prRow{grid-template-columns:1fr}.prRow span{justify-content:flex-start}.printHeroBlock{flex-direction:column;align-items:flex-start}.printFooterBar{flex-direction:column;align-items:stretch}}'
document.head.appendChild(st)
new MutationObserver(enhancePrint).observe(document.body,{childList:true,subtree:true})
window.addEventListener('DOMContentLoaded',enhancePrint)
setTimeout(enhancePrint,300)
