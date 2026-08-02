// src/print-runtime-compact-fix.js

// 1. Injeta o CSS de layout compacto no cabeçalho do site
const compactPrintStyle = document.createElement('style')
compactPrintStyle.textContent = `
  .print-runtime-active,
  .print-runtime-active * {
    box-sizing: border-box !important;
  }

  .printRuntimePanel {
    width: 100% !important;
    max-width: 100% !important;
    overflow: hidden !important;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
    gap: 12px !important;
  }

  .printHeroBlock {
    min-width: 0 !important;
    gap: 12px !important;
    padding: 18px 20px !important;
  }

  .printHeroBlock h2 {
    font-size: clamp(28px, 3vw, 38px) !important;
    line-height: 1.05 !important;
  }

  .printHeroBlock p {
    font-size: 15px !important;
  }

  .printHeroBlock .addPrinterBtn,
  .printRuntimePanel .addPrinterBtn.solid {
    flex: 0 0 auto !important;
    min-height: 40px !important;
    padding: 0 16px !important;
    font-size: 13px !important;
    white-space: nowrap !important;
  }

  .printPrintersCard,
  .printRulesCard,
  .printTypesCard,
  .receiptModelCard {
    min-width: 0 !important;
    padding: 14px !important;
    overflow: hidden !important;
  }

  .printNumberTitle {
    gap: 8px !important;
  }

  .printNumberTitle h2 {
    font-size: 21px !important;
    line-height: 1.05 !important;
  }

  .prTable {
    width: 100% !important;
    overflow: hidden !important;
    border-radius: 14px !important;
  }

  .prHead,
  .prRow {
    width: 100% !important;
    grid-template-columns: 76px minmax(70px, 1fr) 86px 136px !important;
    gap: 6px !important;
    padding: 10px 12px !important;
    font-size: 13px !important;
  }

  .prHead span,
  .prRow b,
  .prRow strong,
  .prRow em {
    min-width: 0 !important;
  }

  .prRow b {
    font-size: 0 !important;
  }

  .prRow b::before {
    content: 'Impressora' !important;
    font-size: 13px !important;
  }

  .prRow strong {
    font-size: 14px !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .prRow em {
    padding: 6px 9px !important;
    font-size: 12px !important;
    white-space: nowrap !important;
  }

  .prRow span {
    gap: 5px !important;
    justify-content: flex-end !important;
    min-width: 0 !important;
  }

  .prRow button {
    min-height: 34px !important;
    padding: 0 8px !important;
    border-radius: 10px !important;
    font-size: 12px !important;
  }

  .prRow button[data-act="test"] {
    max-width: 62px !important;
  }

  .prRow button[data-act="edit"],
  .prRow button[data-act="del"] {
    width: 34px !important;
    padding: 0 !important;
    flex: 0 0 34px !important;
  }

  .prRules {
    grid-template-columns: minmax(0, 1fr) minmax(190px, 0.75fr) !important;
    gap: 12px !important;
  }

  .rulesFields {
    gap: 12px !important;
  }

  .prRules label {
    font-size: 14px !important;
  }

  .prRules select {
    width: 100% !important;
    height: 48px !important;
    font-size: 14px !important;
  }

  .currentRulesBox {
    min-width: 0 !important;
    padding: 16px !important;
  }

  .currentRulesBox strong {
    font-size: 20px !important;
  }

  .currentRulesBox li {
    font-size: 12px !important;
    line-height: 1.3 !important;
    margin: 8px 0 !important;
  }

  .receiptModelCard {
    padding: 12px 14px !important;
  }

  .receiptModelCard .printBlockHeader {
    gap: 10px !important;
    align-items: flex-start !important;
  }

  .receiptModelCard .printNumberTitle h2 {
    font-size: 20px !important;
    max-width: 260px !important;
  }

  .receiptModelCard .editReceiptBtn {
    min-height: 34px !important;
    padding: 0 12px !important;
    font-size: 12px !important;
    white-space: normal !important;
    max-width: 162px !important;
    line-height: 1.1 !important;
  }

  .receiptModelCard .receiptPreviewLayout {
    grid-template-columns: minmax(220px, 0.95fr) minmax(150px, 0.7fr) !important;
    gap: 10px !important;
    align-items: start !important;
  }

  .receiptModelCard .receiptPreviewThermal {
    width: 225px !important;
    max-width: 100% !important;
    padding: 14px 13px 16px !important;
    font-size: 11px !important;
  }

  .receiptModelCard .receiptPreviewThermal h3 {
    font-size: 15px !important;
  }

  .receiptModelCard .receiptPreviewThermal small,
  .receiptModelCard .receiptPreviewThermal p,
  .receiptModelCard .receiptPreviewThermal .receiptMeta,
  .receiptModelCard .receiptPreviewThermal em {
    font-size: 10.5px !important;
  }

  .receiptModelCard .receiptPreviewThermal .receiptTotal {
    font-size: 14px !important;
  }

  .receiptModelCard .receiptSideConfig {
    min-width: 0 !important;
    gap: 10px !important;
  }

  .receiptModelCard .receiptInfoList {
    min-width: 0 !important;
    gap: 6px !important;
    padding-left: 10px !important;
  }

  .receiptModelCard .receiptInfoList strong {
    font-size: 15px !important;
  }

  .receiptModelCard .receiptInfoList span {
    font-size: 11.5px !important;
    line-height: 1.2 !important;
  }

  .receiptModelCard .receiptMessageField {
    padding: 10px !important;
    border-radius: 14px !important;
    gap: 6px !important;
  }

  .receiptModelCard .receiptMessageField span {
    font-size: 13px !important;
    line-height: 1.15 !important;
  }

  .receiptModelCard .receiptMessageField textarea {
    min-height: 74px !important;
    font-size: 12px !important;
    padding: 10px !important;
  }

  .receiptModelCard .receiptMessageField small {
    font-size: 12px !important;
  }

  .printFooterBar {
    min-width: 0 !important;
    padding: 12px 16px !important;
  }

  .printFooterBar .primaryBtn {
    max-width: 360px !important;
    min-height: 42px !important;
  }

  @media (max-width: 1260px) {
    .printRuntimePanel {
      grid-template-columns: 1fr !important;
    }

    .printHeroBlock {
      align-items: flex-start !important;
      flex-direction: column !important;
    }

    .receiptModelCard .receiptPreviewLayout {
      grid-template-columns: minmax(220px, 0.9fr) minmax(180px, 0.8fr) !important;
    }
  }

  @media (max-width: 760px) {
    .prHead {
      display: none !important;
    }

    .prRow,
    .receiptModelCard .receiptPreviewLayout {
      grid-template-columns: 1fr !important;
    }

    .prRow span {
      justify-content: flex-start !important;
    }
  }
`
document.head.appendChild(compactPrintStyle)

// 2. Trava de proteção contra erro de WebSocket do QZ Tray em celulares
;(function () {
  try {
    const originalAlert = window.alert
    window.alert = function (msg) {
      if (
        msg &&
        (msg.includes('sendData is not a function') ||
          msg.includes('Erro na impressora') ||
          msg.includes('websocket'))
      ) {
        console.warn('Alerta de impressão ignorado no dispositivo móvel:', msg)
        return
      }
      originalAlert.apply(window, arguments)
    }
  } catch (err) {
    console.error('Erro ao aplicar proteção de alertas:', err)
  }
})()