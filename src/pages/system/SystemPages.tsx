import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'

export function ForbiddenPage() {
  return (
    <div className="system-page">
      <Icon name="shield" size={28} />
      <h1>403</h1>
      <p>Your role cannot open this page. The backend would refuse it too.</p>
      <Link className="button button-primary" to="/">
        Go to dashboard
      </Link>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="system-page">
      <Icon name="search" size={28} />
      <h1>404</h1>
      <p>That route isn’t in the product. Check the sidebar or go home.</p>
      <Link className="button button-primary" to="/">
        Go to dashboard
      </Link>
    </div>
  )
}
