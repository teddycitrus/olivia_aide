import { useState } from 'react'

/** Add candidates by pasting image URLs (one per line). File uploads are out of
 *  scope for the demo; URL input keeps the whole flow serverless-friendly. */
export function CandidateUploader({ onAdd, disabled }: { onAdd: (urls: string[]) => void; disabled?: boolean }) {
  const [text, setText] = useState('')

  const submit = () => {
    const urls = text
      .split(/\s+/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//.test(s))
    if (urls.length) {
      onAdd(urls)
      setText('')
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste candidate image URLs, one per line"
        rows={3}
        className="w-full resize-none rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none placeholder:text-white/30 focus:border-accent/60"
      />
      <button
        onClick={submit}
        disabled={disabled}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent/90 disabled:opacity-50"
      >
        Score candidates
      </button>
    </div>
  )
}
