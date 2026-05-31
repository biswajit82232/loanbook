import {
  formatCurrency,
  formatDaysLent,
  getBorrowerInterestDue,
  getBorrowerOutstanding,
  getBorrowerPrincipalDue,
  getLoanLentDays,
  getLoanListAmountLabel,
  getPaymentTypeLabel,
} from '../../data/helpers'
import { BorrowerContactButtons } from '../../components/BorrowerContactButtons'
import { BtnIcon } from '../../components/BtnIcon'
import { useNavigation } from '../../context/NavigationContext'
import { useLoanBook } from '../../context/LoanBookContext'
import { DetailField, DetailGrid, DetailSection } from '../../components/DetailSection'
import { KpiCard } from '../../components/KpiCard'
import { LinkCard } from '../../components/LinkCard'
import {
  buildBorrowerReminderMessage,
  openWhatsApp,
} from '../../utils/whatsapp'
import { formatDisplayPhone } from '../../utils/phone'

export function BorrowerDetail({ id }: { id: string }) {
  const {
    getBorrower,
    getLoansByBorrower,
    getPaymentsByBorrower,
    loans,
    settings,
  } = useLoanBook()
  const { openLoanForm, openBorrowerForm, openPaymentForm } = useNavigation()
  const borrower = getBorrower(id)

  if (!borrower) {
    return <p className="empty-state">Borrower not found.</p>
  }

  const person = borrower
  const borrowerLoans = getLoansByBorrower(person.id)
  const borrowerPayments = getPaymentsByBorrower(person.id)
  const totalDue = getBorrowerOutstanding(loans, person.id)

  function sendBorrowerWhatsApp() {
    const message = buildBorrowerReminderMessage(
      person,
      borrowerLoans,
      settings.businessName,
    )
    if (!openWhatsApp(person.phone, message)) {
      window.alert('Could not open WhatsApp. Check the phone number.')
    }
  }

  return (
    <div className="page detail-page">
      <div className="detail-hero borrower-hero">
        <div className="avatar avatar-lg">{person.name.charAt(0)}</div>
        <div className="detail-hero-text">
          <p className="detail-hero-amount">{person.name}</p>
          <p
            className={`detail-hero-sub${!person.phone.trim() ? ' detail-hero-sub--muted' : ''}`}
          >
            {formatDisplayPhone(person.phone)}
          </p>
        </div>
        <BorrowerContactButtons
          className="detail-hero-contact"
          phone={person.phone}
          onWhatsApp={sendBorrowerWhatsApp}
        />
      </div>

      <section className="kpi-grid kpi-grid--3">
        <KpiCard
          label="Principal due"
          value={formatCurrency(getBorrowerPrincipalDue(loans, person.id))}
          variant="accent"
        />
        <KpiCard
          label="Interest due"
          value={formatCurrency(getBorrowerInterestDue(loans, person.id))}
          variant="interest"
        />
        <KpiCard label="Total due" value={formatCurrency(totalDue)} variant="success" />
      </section>

      <DetailSection title="Contact">
        <DetailGrid>
          <DetailField label="Address" value={person.address} full />
          <DetailField label="Notes" value={person.notes || '—'} full />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Loans">
        <div className="link-card-list">
          {borrowerLoans.map((loan) => (
            <LinkCard
              key={loan.id}
              title={loan.id}
              subtitle={`${loan.purpose ? `${loan.purpose} · ` : ''}${formatDaysLent(getLoanLentDays(loan), loan)}`}
              meta={getLoanListAmountLabel(loan)}
              route={{ type: 'loan', id: loan.id }}
            />
          ))}
        </div>
      </DetailSection>

      <DetailSection title="Payments">
        {borrowerPayments.length === 0 ? (
          <p className="empty-inline">No payments.</p>
        ) : (
          <div className="link-card-list">
            {borrowerPayments.map((p) => (
              <LinkCard
                key={p.id}
                title={getPaymentTypeLabel(p.type)}
                subtitle={p.date}
                meta={formatCurrency(p.amount)}
                route={{ type: 'payment', id: p.id }}
              />
            ))}
          </div>
        )}
      </DetailSection>

      <div className="detail-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => openLoanForm({ mode: 'create', borrowerId: person.id })}
        >
          <BtnIcon icon="landmark">New loan</BtnIcon>
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => openBorrowerForm({ mode: 'edit', borrowerId: person.id })}
        >
          <BtnIcon icon="pencil">Edit</BtnIcon>
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => openPaymentForm()}>
          <BtnIcon icon="wallet">Record payment</BtnIcon>
        </button>
      </div>
    </div>
  )
}
