import { Icon, WhatsAppIcon } from './icons'
import { hasCallablePhone, openPhoneCall } from '../utils/phone'

interface BorrowerContactButtonsProps {
  phone: string
  onWhatsApp: () => void
  size?: 'md' | 'sm'
  className?: string
}

export function BorrowerContactButtons({
  phone,
  onWhatsApp,
  size = 'md',
  className = '',
}: BorrowerContactButtonsProps) {
  if (!hasCallablePhone(phone)) return null

  const sm = size === 'sm'

  return (
    <div className={`contact-actions ${className}`.trim()} role="group" aria-label="Contact borrower">
      <button
        type="button"
        className={`topbar-icon-btn topbar-icon-btn--whatsapp${sm ? ' topbar-icon-btn--sm' : ''}`}
        onClick={onWhatsApp}
        aria-label="Send reminder on WhatsApp"
        title="WhatsApp"
      >
        <WhatsAppIcon size={sm ? 18 : 22} />
      </button>
      <button
        type="button"
        className={`topbar-icon-btn topbar-icon-btn--call${sm ? ' topbar-icon-btn--sm' : ''}`}
        onClick={() => openPhoneCall(phone)}
        aria-label="Call borrower"
        title="Call"
      >
        <Icon name="phone" size={sm ? 18 : 22} />
      </button>
    </div>
  )
}
