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
        className="w-full resize-none border-2 border-black bg-white p-3 text-sm font-medium outline-none placeholder:text-foreground/40 focus:border-primary-blue"
      />
      <button
        onClick={submit}
        disabled={disabled}
        className="border-2 border-black bg-primary-blue px-4 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-hard transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
      >
        Score candidates
      </button>
    </div>
  )
}
