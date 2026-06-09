function refineClosingCashPage() {
  const page = document.querySelector('.closingPage')
  if (!page) return

  document.querySelectorAll('.closingHeaderActions button').forEach(button => {
    if (button.textContent.trim().includes('Atualizar')) button.remove()
  })

  document.querySelectorAll('.closingHeaderActions label').forEach(label => {
    label.classList.add('closingDateControl')
  })
}

const closingRefineStyle = document.createElement('style')
closingRefineStyle.textContent = `
  .closingPage {
    max-width: 1180px !important;
    margin: 0 auto !important;
    padding: 22px 28px 28px !important;
  }

  .closingHeader {
    align-items: center !important;
    margin-bottom: 18px !important;
  }

  .closingHeader h1 {
    font-size: clamp(38px, 4vw, 54px) !important;
    margin: 6px 0 8px !important;
  }

  .closingHeader p {
    max-width: 640px !important;
    line-height: 1.35 !important;
  }

  .closingHeaderActions {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 0 !important;
  }

  .closingHeaderActions button {
    display: none !important;
  }

  .closingDateControl,
  .closingHeaderActions label {
    height: 54px !important;
    min-width: 236px !important;
    padding: 0 18px !important;
    border-radius: 16px !important;
    background: rgba(255, 253, 248, .96) !important;
    box-shadow: 0 12px 26px rgba(80, 42, 22, .07) !important;
  }

  .closingDateControl input,
  .closingHeaderActions input {
    font-size: 18px !important;
    width: 100% !important;
  }

  .closingPanel {
    border-radius: 20px !important;
    padding: 20px !important;
  }

  .daySummary h2,
  .cashConference h2 {
    font-size: 22px !important;
    margin-bottom: 18px !important;
  }

  .closingMiniCard {
    min-height: 92px !important;
    padding: 14px !important;
    border-radius: 16px !important;
    box-shadow: 0 8px 18px rgba(80, 42, 22, .04) !important;
  }

  .closingMiniIcon {
    width: 42px !important;
    height: 42px !important;
  }

  .closingMiniCard span {
    font-size: 13px !important;
  }

  .closingMiniCard strong {
    font-size: 23px !important;
  }

  .ticketAverage {
    min-height: 58px !important;
    border-radius: 16px !important;
    padding: 12px 18px !important;
  }

  .ticketAverage strong {
    font-size: 27px !important;
  }

  .cashConference {
    padding: 24px !important;
  }

  .conferenceHint {
    font-size: 16px !important;
    color: #745a49 !important;
  }

  .paymentConferenceGrid input {
    height: 52px !important;
    border-radius: 14px !important;
    font-size: 18px !important;
    background: rgba(255, 253, 248, .92) !important;
  }

  .cashTotalsGrid p {
    min-height: 76px !important;
    border-radius: 16px !important;
    padding: 15px !important;
  }

  .cashTotalsGrid p span {
    font-size: 13px !important;
    font-weight: 900 !important;
  }

  .cashTotalsGrid p strong {
    font-size: 24px !important;
  }

  .noteField textarea {
    min-height: 82px !important;
    border-radius: 14px !important;
  }

  .primaryClosingBtn {
    height: 58px !important;
    border-radius: 14px !important;
    font-size: 18px !important;
  }

  .closingDetailsGrid {
    grid-template-columns: 1.15fr .9fr 1fr .9fr !important;
    gap: 14px !important;
    align-items: stretch !important;
  }

  .closingDetailsGrid .closingPanel {
    min-height: 280px !important;
    overflow: hidden !important;
  }

  .closingDetailsGrid h3 {
    font-size: 22px !important;
    line-height: 1.08 !important;
    margin-bottom: 16px !important;
  }

  .paymentVisual {
    grid-template-columns: 132px 1fr !important;
    gap: 14px !important;
  }

  .donut {
    width: 128px !important;
    height: 128px !important;
  }

  .donut > div {
    width: 78px !important;
    height: 78px !important;
  }

  .paymentLegend div {
    grid-template-columns: 10px minmax(0, 1fr) auto !important;
    gap: 8px !important;
    font-size: 12px !important;
  }

  .categoryLine {
    grid-template-columns: minmax(72px, .85fr) minmax(70px, 1fr) 74px !important;
    gap: 7px !important;
    font-size: 12px !important;
  }

  .productRank {
    grid-template-columns: 26px minmax(0, 1fr) 32px 78px !important;
    gap: 7px !important;
    padding: 9px 0 !important;
  }

  .productRank span {
    line-height: 1.15 !important;
  }

  .otherDetailsPanel p {
    grid-template-columns: 22px minmax(0, 1fr) 30px 66px !important;
    gap: 7px !important;
    padding: 10px 0 !important;
  }

  .otherDetailsPanel strong {
    font-size: 18px !important;
  }

  .otherDetailsPanel small {
    font-size: 11px !important;
  }

  .closingActions {
    grid-template-columns: 1fr 1fr 1.2fr !important;
    gap: 14px !important;
  }

  .closingActions button {
    height: 52px !important;
    border-radius: 14px !important;
  }

  @media (max-width: 1180px) {
    .closingDetailsGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
  }

  @media (max-width: 760px) {
    .closingHeader {
      align-items: stretch !important;
      flex-direction: column !important;
    }

    .closingDateControl,
    .closingHeaderActions label {
      width: 100% !important;
      min-width: 0 !important;
    }

    .closingDetailsGrid,
    .closingActions {
      grid-template-columns: 1fr !important;
    }
  }
`
document.head.appendChild(closingRefineStyle)

new MutationObserver(refineClosingCashPage).observe(document.body, { childList: true, subtree: true })
window.addEventListener('DOMContentLoaded', refineClosingCashPage)
setTimeout(refineClosingCashPage, 300)
