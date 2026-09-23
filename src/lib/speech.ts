import { useEffect, useState } from 'react'

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
}

export function polishVoice(): SpeechSynthesisVoice | null {
  return synth()?.getVoices().find((v) => /^pl/i.test(v.lang)) ?? null
}

export function speak(text: string, slow = false): void {
  const s = synth()
  const voice = polishVoice()
  if (!s || !voice || !text.trim()) return
  s.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.voice = voice
  u.lang = voice.lang
  u.rate = slow ? 0.75 : 0.95
  s.speak(u)
}

// Voices load asynchronously in Safari and Chrome; re-check on voiceschanged.
export function useSpeechAvailable(): boolean {
  const [available, setAvailable] = useState(() => polishVoice() !== null)
  useEffect(() => {
    const s = synth()
    if (!s) return
    const update = () => setAvailable(polishVoice() !== null)
    update()
    s.addEventListener('voiceschanged', update)
    return () => s.removeEventListener('voiceschanged', update)
  }, [])
  return available
}
