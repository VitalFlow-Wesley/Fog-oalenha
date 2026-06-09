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
function readReceiptMessage() { return localStorage.getItem(MKEY) || 'Obrigado pela preferência!\nVolte sempre.' }
function escapeHtml(v = '') { return String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
function opts(s, selected) { return s.printers.length ? '<option value="">Selecione uma impressora</option>' + s.printers.map(p => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('') : '<option value="">Nenhuma impressora cadastrada</option>' }
function clean(s) { const ids = s.printers.map(p => p.id); const r = { cozinha: s.rules?.cozinha || '', churrasco: s.rules?.churrasco || '', cliente: s.rules?.cliente || '' }; Object.keys(r).forEach(k => { if (!ids.includes(r[k])) r[k] = '' }); return { ...s, rules: r } }

function showToast(message) {
  const old = document.querySelector('.printToast')
  old?.remove()
  const toast = document.createElement('div')
  toast.className = 'printToast'
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => toast.classList.add('show'), 20)
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 200) }, 2600)
}

function openReceiptMessageModal(current) {
  return new Promise(resolve => {
    document.querySelector('.receiptModalOverlay')?.remove()
    const overlay = document.createElement('div')
    overlay.className = 'receiptModalOverlay'
    overlay.innerHTML = `<div class="receiptModalBox" role="dialog" aria-modal="true"><div class="receiptModalIcon">🧾</div><h3>Editar mensagem final</h3><p>Essa mensagem aparece no final da comanda do cliente.</p><textarea maxlength="160">${escapeHtml(current)}</textarea><small>${current.length}/160</small><div><button class="receiptModalCancel" type="button">Cancelar</button><button class="receiptModalSave" type="button">Salvar mensagem</button></div></div>`
    document.body.appendChild(overlay)
    const textarea = overlay.querySelector('textarea')
    const counter = overlay.querySelector('small')
    const close = value => { overlay.remove(); resolve(value) }
    textarea.addEventListener('input', () => { counter.textContent = `${textarea.value.length}/160` })
    overlay.querySelector('.receiptModalCancel').addEventListener('click', () => close(null))
    overlay.querySelector('.receiptModalSave').addEventListener('click', () => close(textarea.value))
    overlay.addEventListener('click', e => { if (e.target === overlay) close(null) })
    setTimeout(() => textarea.focus(), 50)
  })
}

function renderPrintPage(page, nav) {
  if (!page || !nav) return
  isRenderingPrintRuntime = true
  page.classList.add('print-runtime-active')
  const s = clean(readPrint()); writePrint(s)
  const receiptMessage = readReceiptMessage()
  nav.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.textContent.includes('Impressão')))
  page.querySelector('[data-print-runtime]')?.remove()
  const rows = s.printers.length ? s.printers.map(p => `<div class="prRow" data-id="${p.id}"><b>🖨️ Impressora</b><strong>${escapeHtml(p.name)}</strong><em>● Online</em><span><button data-act="test">Testar</button><button data-act="edit" title="Editar">✎</button><button data-act="del" class="danger" title="Excluir">🗑</button></span></div>`).join('') : '<div class="prEmpty"><strong>Nenhuma impressora cadastrada</strong><span>Clique em “Adicionar impressora” para cadastrar Caixa, Cozinha ou outra impressora real.</span></div>'
  const wrapper = document.createElement('div')
  wrapper.className = 'printRuntimePanel'
  wrapper.dataset.printRuntime = 'true'
  wrapper.innerHTML = `
    <section class="settingsPanel printHeroBlock"><div><span class="prEyebrow">IMPRESSÃO</span><h2>Controle das impressoras</h2><p>Cadastre apenas impressoras reais e personalize a comanda do cliente.</p></div><button class="addPrinterBtn solid" data-add-printer>+ Adicionar impressora</button></section>
    <section class="settingsPanel printPrintersCard"><div class="printBlockHeader"><div class="printNumberTitle"><span>🖨️</span><h2>1. Impressoras cadastradas</h2></div></div><div class="prTable"><div class="prHead"><span>Tipo</span><span>Nome</span><span>Status</span><span>Ações</span></div>${rows}</div></section>
    <section class="settingsPanel printRulesCard"><div class="printNumberTitle"><span>🧭</span><h2>2. Regras por setor</h2></div><div class="prRules"><div class="rulesFields"><label>Pedidos da cozinha saem em<select data-rule="cozinha">${opts(s, s.rules.cozinha)}</select></label><label>Pedidos do churrasco saem em<select data-rule="churrasco">${opts(s, s.rules.churrasco)}</select></label><label>Comanda do cliente sai em<select data-rule="cliente">${opts(s, s.rules.cliente)}</select></label><div class="juiceInfo">🥤 Sucos seguem a mesma regra da cozinha. Não precisa configurar separado.</div></div><div class="currentRulesBox"><strong>Regras atuais</strong><ul><li>O sistema começa sem impressora cadastrada.</li><li>Cadastre somente as impressoras que existem.</li><li>Itens do bar ficam apenas na comanda do cliente.</li></ul></div></div></section>
    <section class="settingsPanel printTypesCard"><div class="printNumberTitle"><span>📄</span><h2>3. Tipos de impressão</h2></div><div class="printTypeList"><div class="printTypeRow"><div><strong>Pedido de preparo</strong><span>Itens enviados para cozinha ou churrasco.</span></div><button class="printToggle active"><span></span></button></div><div class="printTypeRow"><div><strong>Comanda do cliente</strong><span>Comanda completa no caixa.</span></div><button class="printToggle active"><span></span></button></div><div class="printTypeRow"><div><strong>Reimpressão</strong><span>Permitir reimpressão de pedidos e comandas.</span></div><button class="printToggle active"><span></span></button></div></div></section>
    <section class="settingsPanel receiptModelCard"><div class="printBlockHeader"><div class="printNumberTitle"><span>🧾</span><h2>4. Modelo da comanda do cliente</h2></div><button class="editReceiptBtn" data-edit-model>✎ Editar mensagem final</button></div><div class="receiptPreviewLayout"><div class="receiptPreview receiptPreviewThermal"><h3>FOGÃO A LENHA</h3><small>Churrascaria & Restaurante</small><hr><div class="receiptMeta"><span>Mesa 05</span><span>13:45</span></div><p><span>1x Picanha</span><b>R$ 85,00</b></p><p><span>2x Refrigerante</span><b>R$ 18,00</b></p><p><span>1x Suco Natural</span><b>R$ 12,00</b></p><hr><strong class="receiptTotal">TOTAL <b>R$ 115,00</b></strong><em>${escapeHtml(receiptMessage)}</em></div><div class="receiptSideConfig"><div class="receiptInfoList"><strong>Informações exibidas</strong><span>✓ Nome do estabelecimento</span><span>✓ Mesa</span><span>✓ Data e hora</span><span>✓ Itens do pedido</span><span>✓ Total</span><span>✓ Mensagem final</span></div><label class="receiptMessageField"><span>Mensagem final da comanda</span><textarea maxlength="160" data-receipt-message>${escapeHtml(receiptMessage)}</textarea><small>${receiptMessage.length}/160</small></label></div></div></section>
    <div class="printFooterBar"><div><strong>Dica:</strong> configure primeiro a impressora da cozinha e a do caixa.</div><button class="primaryBtn" data-save-print>Salvar configurações</button></div>`
  nav.insertAdjacentElement('afterend', wrapper)
  bindPrint(page, nav)
  setTimeout(() => { isRenderingPrintRuntime = false }, 50)
}

function bindPrint(page, nav) {
  const panel = page.querySelector('[data-print-runtime]')
  panel.querySelector('[data-add-printer]')?.addEventListener('click', () => { const n = prompt('Nome da impressora:', ''); if (!n?.trim()) return; const s = readPrint(); const p = { id: String(Date.now()), name: n.trim() }; const next = clean({ ...s, printers: [...s.printers, p] }); if (!next.rules.cozinha) next.rules.cozinha = p.id; if (!next.rules.cliente) next.rules.cliente = p.id; writePrint(next); renderPrintPage(page, nav) })
  panel.querySelectorAll('[data-rule]').forEach(sel => sel.addEventListener('change', () => { const s = readPrint(); writePrint(clean({ ...s, rules: { ...s.rules, [sel.dataset.rule]: sel.value } })) }))
  panel.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', () => { const id = btn.closest('[data-id]')?.dataset.id; const s = readPrint(); const p = s.printers.find(x => x.id === id); if (!p) return; if (btn.dataset.act === 'test') return showToast(`Teste preparado para ${p.name}.`); if (btn.dataset.act === 'edit') { const n = prompt('Nome da impressora:', p.name); if (!n?.trim()) return; writePrint({ ...s, printers: s.printers.map(x => x.id === id ? { ...x, name: n.trim() } : x) }) } else { if (!confirm(`Excluir a impressora ${p.name}?`)) return; writePrint(clean({ ...s, printers: s.printers.filter(x => x.id !== id) })) } renderPrintPage(page, nav) }))
  panel.querySelector('[data-edit-model]')?.addEventListener('click', async () => { const n = await openReceiptMessageModal(readReceiptMessage()); if (n !== null) { localStorage.setItem(MKEY, n.trim() || 'Obrigado pela preferência!\nVolte sempre.'); renderPrintPage(page, nav); showToast('Mensagem final atualizada.') } })
  panel.querySelector('[data-receipt-message]')?.addEventListener('input', e => { const value = e.target.value; localStorage.setItem(MKEY, value); panel.querySelector('.receiptPreview em').textContent = value; e.target.nextElementSibling.textContent = `${value.length}/160` })
  panel.querySelector('[data-save-print]')?.addEventListener('click', () => showToast('Configurações de impressão salvas.'))
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
st.textContent = '.print-runtime-active>.printSettingsTabV2{display:none!important}.printRuntimePanel{display:grid;grid-template-columns:1.05fr .95fr;gap:18px}.printHeroBlock{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;padding:22px 26px!important;background:linear-gradient(135deg,#fffaf2,#fff3df)!important}.printHeroBlock h2{font-size:34px;margin:4px 0 6px}.printHeroBlock p{color:#8a6b58;margin:0}.prEyebrow{font-size:12px;font-weight:900;letter-spacing:.18em;color:#d84a2b}.printPrintersCard,.printRulesCard,.printTypesCard,.receiptModelCard{padding:20px!important}.printRuntimePanel .printFooterBar{grid-column:1/-1}.prTable{border:1px solid #efd9bd;border-radius:16px;overflow:hidden;background:#fffdf8}.prHead,.prRow{display:grid;grid-template-columns:1fr 1.2fr .7fr 1.1fr;gap:10px;align-items:center;padding:13px}.prHead{background:#fff0d7;font-weight:900}.prRow{border-top:1px solid #f1dfc8}.prRow em{background:#e6f7df;color:#237a35;border-radius:999px;padding:7px 12px;font-style:normal;font-weight:900;width:max-content}.prRow span{display:flex;gap:8px;justify-content:flex-end}.prRow button{border:1px solid #e9d0b3;border-radius:12px;background:#fffaf2;padding:9px 11px;font-weight:900;cursor:pointer}.prRow .danger{color:#ef4444;background:#fff1ee;border-color:#ffd0ca}.prEmpty{padding:34px 24px;text-align:center;color:#8a6b58;display:flex;flex-direction:column;gap:8px}.prEmpty strong{font-size:20px;color:#3b1d15}.prRules{display:grid;grid-template-columns:1fr 260px;gap:18px;align-items:stretch}.rulesFields{display:flex;flex-direction:column;gap:15px}.prRules label{display:flex;flex-direction:column;gap:8px;font-weight:900;color:#2d140e}.prRules select{height:56px;border:1px solid #e7d0b3;border-radius:15px;padding:0 16px;background:#fffaf5;font-size:16px}.juiceInfo{background:#fff4e2;border:1px dashed #e4c49a;border-radius:14px;padding:13px 15px;color:#7a5b47;font-weight:800}.prRules .currentRulesBox{background:#eff9ea;border:1px solid #d6eccd;border-radius:18px;padding:20px;color:#3d6b3c}.currentRulesBox strong{font-size:21px}.currentRulesBox li{margin:10px 0}.printTypeList{display:grid;gap:12px}.printTypeRow{display:grid!important;grid-template-columns:1fr auto!important;align-items:center!important;padding:18px!important;border-radius:16px!important}.printTypeRow span{display:block!important;max-width:none!important}.receiptPreviewLayout{display:grid;grid-template-columns:300px 1fr;gap:22px;align-items:start}.receiptPreviewThermal{width:260px;margin:0 auto;background:#fffdf8;border:1px dashed #d8b98c;padding:20px;text-align:center;box-shadow:0 18px 30px rgba(80,40,10,.08);font-family:"Courier New",monospace;position:relative}.receiptPreviewThermal:after{content:"";position:absolute;left:0;right:0;bottom:-9px;height:9px;background:repeating-linear-gradient(135deg,transparent 0 8px,#fffdf8 8px 16px)}.receiptPreviewThermal h3{margin:0 0 4px;font-size:17px;letter-spacing:.08em}.receiptPreviewThermal small{display:block;color:#6b5448;margin-bottom:8px}.receiptPreviewThermal hr{border:0;border-top:1px dashed #9d806d;margin:10px 0}.receiptPreviewThermal p,.receiptPreviewThermal .receiptMeta,.receiptPreviewThermal .receiptTotal{display:flex;justify-content:space-between;gap:10px;margin:8px 0;text-align:left}.receiptPreviewThermal em{display:block;margin-top:13px;white-space:pre-line;font-size:11px}.receiptSideConfig{display:grid;gap:14px}.receiptInfoList{display:flex;flex-direction:column;gap:10px}.receiptMessageField{display:grid;gap:8px;background:#fff8ec;border:1px solid #efd9bd;border-radius:16px;padding:14px}.receiptMessageField span{font-weight:900;color:#2d140e}.receiptMessageField textarea{min-height:84px;resize:vertical;border:1px solid #e7d0b3;border-radius:12px;background:#fffdf8;padding:12px;font:600 14px/1.35 inherit;outline:none}.receiptMessageField small{text-align:right;color:#8a6b58;font-weight:800}.printFooterBar{display:flex;justify-content:space-between;gap:16px;align-items:center;background:#fffdf8;border:1px solid #ecd6bd;border-radius:18px;padding:16px 20px}.printFooterBar .primaryBtn{max-width:320px}.receiptModalOverlay{position:fixed;inset:0;background:rgba(25,15,10,.55);z-index:9999;display:grid;place-items:center;padding:20px}.receiptModalBox{width:min(440px,100%);background:#fffaf3;border:1px solid #efd9bd;border-radius:22px;padding:24px;box-shadow:0 24px 70px rgba(30,12,4,.32);color:#2d140e}.receiptModalIcon{width:48px;height:48px;border-radius:16px;background:#fff0d7;display:grid;place-items:center;font-size:24px;margin-bottom:12px}.receiptModalBox h3{margin:0 0 8px;font-size:24px}.receiptModalBox p{margin:0 0 16px;color:#7a5b47}.receiptModalBox textarea{width:100%;min-height:110px;resize:vertical;border:1px solid #e6c9a8;border-radius:14px;background:#fffdf8;padding:13px 14px;font:700 15px/1.4 inherit;color:#2d140e;outline:none;box-sizing:border-box}.receiptModalBox small{display:block;text-align:right;margin-top:6px;color:#8a6b58;font-weight:800}.receiptModalBox div:last-child{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.receiptModalBox button{border:0;border-radius:13px;min-height:42px;padding:0 18px;font-weight:900;cursor:pointer}.receiptModalCancel{background:#f4e4d2;color:#6b4530}.receiptModalSave{background:linear-gradient(135deg,#a94925,#ef6336);color:#fffaf0}.printToast{position:fixed;right:22px;bottom:22px;z-index:10000;transform:translateY(12px);opacity:0;background:#2f7a3d;color:#fff;padding:13px 16px;border-radius:14px;box-shadow:0 14px 30px rgba(0,0,0,.22);font-weight:900;transition:.2s ease}.printToast.show{transform:translateY(0);opacity:1}@media(max-width:1100px){.printRuntimePanel,.prRules,.receiptPreviewLayout{grid-template-columns:1fr}.prHead,.prRow{grid-template-columns:1fr}.prRow span{justify-content:flex-start}.printHeroBlock{flex-direction:column;align-items:flex-start}.printFooterBar{flex-direction:column;align-items:stretch}}'
document.head.appendChild(st)
new MutationObserver(enhancePrint).observe(document.body,{childList:true,subtree:true})
window.addEventListener('DOMContentLoaded',enhancePrint)
setTimeout(enhancePrint,300)
