import type { DetailRoute } from '../context/NavigationContext'
import { useNavigation } from '../context/NavigationContext'
import { Icon } from './icons'
import { SafeText } from './SafeText'

interface LinkCardProps {
  title: string
  subtitle: string
  meta?: string
  route: DetailRoute
}

export function LinkCard({ title, subtitle, meta, route }: LinkCardProps) {
  const { openDetail } = useNavigation()

  return (
    <button
      type="button"
      className="link-card pressable"
      onClick={() => openDetail(route)}
    >
      <div className="link-card-body">
        <SafeText as="strong">{title}</SafeText>
        <SafeText as="span">{subtitle}</SafeText>
      </div>
      {meta && (
        <SafeText as="span" className="link-card-meta" variant="amount">
          {meta}
        </SafeText>
      )}
      <Icon name="chevron-right" size={20} className="link-card-chevron" />
    </button>
  )
}
