import type { DetailRoute } from '../context/NavigationContext'
import { useNavigation } from '../context/NavigationContext'
import { Icon } from './icons'

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
      className="link-card"
      onClick={() => openDetail(route)}
    >
      <div className="link-card-body">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      {meta && <span className="link-card-meta">{meta}</span>}
      <Icon name="chevron-right" size={20} className="link-card-chevron" />
    </button>
  )
}
