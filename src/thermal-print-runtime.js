const nativePrint = window.print.bind(window)
let thermalPrintRunning = false

function getPrintTitle(printArea) {
  const title = printArea?.querySelector('h1')?.textContent?.trim()
  return title || 'Impressão Fogão a Lenha'
}

function buildThermalDocument(printArea) {
  const title = getPrintTitle(printArea)
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.35;
    }
    body {
      width: 80mm;
      padding: 6mm;
    }
    h1 {
      margin: 0 0 8px;
      text-align: center;
      font-size: 14px;
      line-height: 1.15;
      letter-spacing: .03em;
    }
    p { margin: 3px 0; }
    hr {
      border: 0;
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    .printLine,
    .printTotal {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 6px;
      padding: 2px 0;
    }
    .printLine span {
      max-width: 62mm;
      overflow-wrap: anywhere;
    }
    .printTotal {
      margin-top: 4px;
      font-size: 13px;
      font-weight: 800;
    }
    .printFooter {
      margin-top: 8px !important;
      text-align: center;
      font-size: 10px;
    }
  </style>
</head>
<body>${printArea.innerHTML}</body>
</html>`
}

function printIsolatedCoupon(printArea) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', 'Impressão do pedido')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '1px'
  iframe.style.height = '1px'
  iframe.style.border = '0'
  iframe.style.opacity = '0'
  iframe.style.pointerEvents = 'none'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(buildThermalDocument(printArea))
  doc.close()

  window.setTimeout(() => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } finally {
      window.setTimeout(() => iframe.remove(), 1200)
    }
  }, 180)
}

if (!window.__fogaoThermalPrintRuntimeInstalled) {
  window.__fogaoThermalPrintRuntimeInstalled = true

  window.print = function patchedPrint() {
    if (thermalPrintRunning) return nativePrint()

    const printArea = document.querySelector('.printOnly')
    const hasContent = printArea && printArea.textContent.trim().length > 0

    if (!hasContent) return nativePrint()

    thermalPrintRunning = true
    try {
      printIsolatedCoupon(printArea)
    } finally {
      window.setTimeout(() => { thermalPrintRunning = false }, 1000)
    }
  }
}
