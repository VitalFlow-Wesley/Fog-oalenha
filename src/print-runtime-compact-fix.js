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

  .printFooterBar {
    min-width: 0 !important;
  }

  @media (max-width: 1260px) {
    .printRuntimePanel {
      grid-template-columns: 1fr !important;
    }

    .printHeroBlock {
      align-items: flex-start !important;
      flex-direction: column !important;
    }
  }

  @media (max-width: 760px) {
    .prHead {
      display: none !important;
    }

    .prRow {
      grid-template-columns: 1fr !important;
    }

    .prRow span {
      justify-content: flex-start !important;
    }
  }
`
document.head.appendChild(compactPrintStyle)
