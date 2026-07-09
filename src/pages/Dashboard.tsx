import { useState } from 'react'
import { useAuth, logout } from 'wasp/client/auth'
import { createApiKey, revokeApiKey, listMyApiKeys, useQuery } from 'wasp/client/operations'
import { NavBar } from '../components/NavBar'
import '../Main.css'

export function DashboardPage() {
  const { data: user } = useAuth()
  const { data: keys, refetch } = useQuery(listMyApiKeys)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [pendingRevoke, setPendingRevoke] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const create = async () => {
    setError(null)
    try {
      const result = await createApiKey({ name: newName.trim() || undefined })
      setRevealedKey(result.plaintextKey)
      setNewName('')
      setCreating(false)
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create key')
    }
  }

  const revoke = async (keyId: string) => {
    setError(null)
    try {
      await revokeApiKey({ keyId })
      setPendingRevoke(null)
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke key')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar
        right={
          <>
            {user && !user.emailVerified && <span className="text-primary-red">unverified</span>}
            <button onClick={() => logout()} className="hover:text-primary-blue">
              Log out
            </button>
          </>
        }
      />

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-black uppercase tracking-tight">MCP API keys</h1>
        <p className="mt-2 text-sm font-medium leading-relaxed text-foreground/70">
          Each key authenticates as you against <span className="font-mono font-bold text-black">POST /mcp</span> via
          the <span className="font-mono font-bold text-black">X-MCP-Secret</span> header.
        </p>

        {user && !user.emailVerified && (
          <div className="mt-6 border-2 border-black bg-primary-yellow p-4 text-sm font-bold">
            Verify your email before you can create a key. Check your inbox for the verification link.
          </div>
        )}

        {error && <p className="mt-4 text-sm font-bold text-primary-red">{error}</p>}

        <div className="mt-6 space-y-3">
          {(keys ?? []).length === 0 && <p className="text-sm font-medium text-foreground/50">No keys yet.</p>}
          {(keys ?? []).map((key) => {
            const revoked = key.revokedAt !== null
            return (
              <div key={key.id} className="flex items-center justify-between border-2 border-black bg-white p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">{key.keyFingerprint ? `fp:${key.keyFingerprint}` : 'legacy key'}</span>
                    <span className="border border-black bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                      {key.tier}
                    </span>
                    {revoked && (
                      <span className="border border-black bg-primary-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        revoked
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs font-medium text-foreground/50">
                    {key.name ? `${key.name} · ` : ''}
                    created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt ? ` · last used ${new Date(key.lastUsedAt).toLocaleDateString()}` : ' · never used'}
                  </div>
                </div>
                {!revoked &&
                  (pendingRevoke === key.id ? (
                    <div className="flex items-center gap-2 text-xs font-bold uppercase">
                      <span>Revoke?</span>
                      <button onClick={() => revoke(key.id)} className="border-2 border-black bg-primary-red px-2 py-1 text-white">
                        Yes
                      </button>
                      <button onClick={() => setPendingRevoke(null)} className="border-2 border-black bg-white px-2 py-1">
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setPendingRevoke(key.id)}
                      className="border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide shadow-hard-sm hover:bg-muted"
                    >
                      Revoke
                    </button>
                  ))}
              </div>
            )
          })}
        </div>

        {user?.emailVerified && (
          <button
            onClick={() => setCreating(true)}
            className="mt-6 border-2 border-black bg-primary-blue px-4 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-hard transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            + New key
          </button>
        )}
      </main>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={() => setCreating(false)}>
          <div className="w-full max-w-sm border-4 border-black bg-white p-6 shadow-hard-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-black uppercase">New key</h2>
            <label className="mb-1 mt-4 block text-xs font-bold uppercase tracking-widest text-foreground/50">
              Name (optional)
            </label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. laptop, CI"
              className="w-full border-2 border-black bg-white px-3 py-2 font-medium outline-none focus:border-primary-blue"
            />
            <button
              onClick={create}
              className="mt-4 w-full border-2 border-black bg-primary-blue py-2 font-bold uppercase tracking-wider text-white shadow-hard"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {revealedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-lg border-4 border-black bg-white p-6 shadow-hard-lg">
            <h2 className="text-lg font-black uppercase text-primary-red">Copy this key now</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-foreground/70">
              This is the only time it will be shown. It is not stored anywhere you can retrieve it again — if you
              lose it, revoke it and create a new one.
            </p>
            <div className="mt-4 flex items-center gap-2 border-2 border-black bg-[#121212] p-3">
              <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-white">{revealedKey}</code>
              <button
                onClick={() => navigator.clipboard.writeText(revealedKey)}
                className="shrink-0 border-2 border-white bg-primary-yellow px-3 py-1.5 text-xs font-bold uppercase text-black"
              >
                Copy
              </button>
            </div>
            <button
              onClick={() => setRevealedKey(null)}
              className="mt-4 w-full border-2 border-black bg-white py-2 font-bold uppercase tracking-wider shadow-hard"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
