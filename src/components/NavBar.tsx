import { Link } from 'react-router'
import { Logo } from './Logo'

export function NavBar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="border-b-4 border-black bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="flex items-center gap-5 text-xs font-bold uppercase tracking-widest">{right}</nav>
      </div>
    </header>
  )
}
