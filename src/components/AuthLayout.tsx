import { NavBar } from './NavBar'

export function AuthLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <NavBar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm border-4 border-black bg-white p-8 shadow-hard-lg">
          <h1 className="text-2xl font-black uppercase tracking-tight">{title}</h1>
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  )
}
