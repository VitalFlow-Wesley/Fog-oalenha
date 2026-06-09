const closingBottomFixStyle = document.createElement('style')
closingBottomFixStyle.textContent = `
  .closingPage,
  .closingPage * {
    box-sizing: border-box !important;
  }

  .closingDetailsGrid {
    grid-template-columns: 1.2fr 1fr 1.05fr 1fr !important;
    gap: 16px !important;
    align-items: stretch !important;
  }

  .closingDetailsGrid .closingPanel {
    min-width: 0 !important;
    overflow: hidden !important;
    min-height: 290px !important;
  }

  .paymentPanel .paymentVisual {
    display: grid !important;
    grid-template-columns: 150px minmax(0, 1fr) !important;
    gap: 16px !important;
    align-items: center !important;
  }

  .paymentPanel .donut {
    width: 145px !important;
    height: 145px !important;
  }

  .paymentPanel .donut > div {
    width: 86px !important;
    height: 86px !important;
  }

  .paymentPanel .donut strong {
    font-size: 13px !important;
    line-height: 1 !important;
  }

  .paymentPanel .donut span {
    font-size: 10.5px !important;
  }

  .paymentPanel .paymentLegend {
    min-width: 0 !important;
    display: grid !important;
    gap: 8px !important;
  }

  .paymentPanel .paymentLegend div {
    display: grid !important;
    grid-template-columns: 10px minmax(70px, 1fr) minmax(74px, auto) !important;
    gap: 8px !important;
    align-items: center !important;
    font-size: 12px !important;
  }

  .paymentPanel .paymentLegend span {
    min-width: 0 !important;
    line-height: 1.1 !important;
  }

  .paymentPanel .paymentLegend small {
    font-size: 10px !important;
  }

  .paymentPanel .paymentLegend b {
    text-align: right !important;
    white-space: nowrap !important;
    font-size: 12px !important;
    line-height: 1.1 !important;
  }

  .categoryPanel .categoryBars {
    gap: 12px !important;
  }

  .categoryPanel .categoryLine {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) 78px !important;
    grid-template-areas:
      'label value'
      'bar value' !important;
    gap: 4px 10px !important;
    align-items: center !important;
    font-size: 12px !important;
  }

  .categoryPanel .categoryLine > div:first-child {
    grid-area: label !important;
    min-width: 0 !important;
    display: flex !important;
    justify-content: space-between !important;
    gap: 8px !important;
  }

  .categoryPanel .categoryLine > div:first-child span {
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .categoryPanel .categoryLine .progress {
    grid-area: bar !important;
    width: 100% !important;
  }

  .categoryPanel .categoryLine small {
    grid-area: value !important;
    display: block !important;
    text-align: right !important;
    white-space: nowrap !important;
    font-size: 11px !important;
  }

  .topProductsPanel .productRank {
    grid-template-columns: 28px minmax(0, 1fr) 30px minmax(72px, auto) !important;
    gap: 8px !important;
    padding: 10px 0 !important;
    font-size: 12px !important;
  }

  .topProductsPanel .productRank span {
    min-width: 0 !important;
    line-height: 1.15 !important;
    word-break: normal !important;
  }

  .topProductsPanel .productRank b {
    text-align: center !important;
    white-space: nowrap !important;
  }

  .topProductsPanel .productRank strong {
    text-align: right !important;
    white-space: nowrap !important;
    font-size: 12px !important;
  }

  .otherDetailsPanel p {
    grid-template-columns: 24px minmax(0, 1fr) 32px 64px !important;
    gap: 8px !important;
    padding: 11px 0 !important;
    min-height: 46px !important;
  }

  .otherDetailsPanel p span {
    min-width: 0 !important;
    line-height: 1.15 !important;
  }

  .otherDetailsPanel strong {
    text-align: center !important;
    font-size: 18px !important;
    line-height: 1 !important;
  }

  .otherDetailsPanel small {
    text-align: right !important;
    font-size: 11px !important;
    white-space: nowrap !important;
  }

  .closingActions {
    grid-template-columns: 1fr 1fr 1.25fr !important;
    gap: 14px !important;
    align-items: center !important;
  }

  .closingActions button {
    min-width: 0 !important;
    width: 100% !important;
    height: 54px !important;
    border-radius: 16px !important;
    font-size: 15px !important;
    white-space: nowrap !important;
  }

  @media (max-width: 1280px) {
    .closingDetailsGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }

    .paymentPanel .paymentVisual {
      grid-template-columns: 160px minmax(0, 1fr) !important;
    }
  }

  @media (max-width: 760px) {
    .closingDetailsGrid,
    .closingActions {
      grid-template-columns: 1fr !important;
    }

    .paymentPanel .paymentVisual {
      grid-template-columns: 1fr !important;
      justify-items: center !important;
    }

    .paymentPanel .paymentLegend {
      width: 100% !important;
    }
  }
`
document.head.appendChild(closingBottomFixStyle)
