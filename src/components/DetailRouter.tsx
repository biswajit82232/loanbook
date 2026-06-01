import type { DetailRoute } from '../context/NavigationContext'
import { LoanDetail } from '../pages/details/LoanDetail'
import { BorrowerDetail } from '../pages/details/BorrowerDetail'
import { PaymentDetail } from '../pages/details/PaymentDetail'
import { ReportDetail } from '../pages/details/ReportDetail'
import { RecordPaymentPage } from '../pages/forms/RecordPaymentPage'
import { LoanFormPage } from '../pages/forms/LoanFormPage'
import { BorrowerFormPage } from '../pages/forms/BorrowerFormPage'
import { PartnerDetail } from '../pages/details/PartnerDetail'
import { PartnerFormPage } from '../pages/forms/PartnerFormPage'

export function DetailRouter({ route }: { route: DetailRoute }) {
  switch (route.type) {
    case 'loan':
      return <LoanDetail id={route.id} />
    case 'borrower':
      return <BorrowerDetail id={route.id} />
    case 'partner':
      return <PartnerDetail id={route.id} />
    case 'payment':
      return <PaymentDetail id={route.id} />
    case 'report':
      return <ReportDetail id={route.id} />
    case 'record-payment':
      return (
        <RecordPaymentPage
          key={`${route.scope ?? 'loan'}-${route.borrowerId ?? route.loanId ?? ''}-${route.paymentType ?? 'interest_only'}`}
          scope={route.scope ?? 'loan'}
          borrowerId={route.borrowerId}
          loanId={route.loanId}
          paymentType={route.paymentType}
        />
      )
    case 'loan-form':
      return (
        <LoanFormPage
          mode={route.mode}
          loanId={route.mode === 'edit' ? route.id : undefined}
          borrowerId={route.mode === 'create' ? route.borrowerId : undefined}
        />
      )
    case 'borrower-form':
      return (
        <BorrowerFormPage
          mode={route.mode}
          borrowerId={route.mode === 'edit' ? route.id : undefined}
          initialName={route.mode === 'create' ? route.prefillName : undefined}
        />
      )
    case 'partner-form':
      return (
        <PartnerFormPage
          mode={route.mode}
          partnerId={route.mode === 'edit' ? route.id : undefined}
        />
      )
  }
}
