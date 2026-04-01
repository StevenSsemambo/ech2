// ── ECHO Voice Engine ─────────────────────────────────────────────────────────
// Handles speech synthesis, speech recognition, and ambient audio.

let synth = window.speechSynthesis || null
let voices = []
let selectedVoice = null
let onSpeakStart = null
let onSpeakEnd = null
let currentUtterance = null
let audioCtx = null
let ambientGain = null
let ambientOscillators = []
let recognition = null

// ── AUDIO CONTEXT ─────────────────────────────────────────────────────────────
export function resumeAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
}

// ── AMBIENT SOUND ─────────────────────────────────────────────────────────────
export function initAmbient() {
  try {
    if (audioCtx) return
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    ambientGain = audioCtx.createGain()
    ambientGain.gain.setValueAtTime(0.018, audioCtx.currentTime)
    ambientGain.connect(audioCtx.destination)

    const freqs = [60, 120, 180]
    freqs.forEach(freq => {
      const osc = audioCtx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime)
      osc.connect(ambientGain)
      osc.start()
      ambientOscillators.push(osc)
    })
  } catch (_) {
    // Audio not available; silently skip
  }
}

// ── VOICE INIT ────────────────────────────────────────────────────────────────
export async function initVoice() {
  if (!synth) return

  return new Promise(resolve => {
    const load = () => {
      voices = synth.getVoices()
      // Prefer a natural-sounding English voice
      const preferred = [
        v => v.name.toLowerCase().includes('samantha'),
        v => v.name.toLowerCase().includes('karen'),
        v => v.name.toLowerCase().includes('moira'),
        v => v.name.toLowerCase().includes('daniel'),
        v => v.lang === 'en-GB' && !v.localService === false,
        v => v.lang.startsWith('en') && v.localService,
        v => v.lang.startsWith('en'),
      ]
      for (const test of preferred) {
        const match = voices.find(test)
        if (match) { selectedVoice = match; break }
      }
      if (!selectedVoice && voices.length > 0) selectedVoice = voices[0]
      resolve()
    }

    if (synth.getVoices().length > 0) {
      load()
    } else {
      synth.addEventListener('voiceschanged', load, { once: true })
      // Fallback in case event never fires
      setTimeout(load, 800)
    }
  })
}

// ── CALLBACKS ─────────────────────────────────────────────────────────────────
export function setVoiceCallbacks(onStart, onEnd) {
  onSpeakStart = onStart
  onSpeakEnd = onEnd
}

// ── SPEAK ─────────────────────────────────────────────────────────────────────
export function speak(text, opts = {}) {
  return new Promise(resolve => {
    if (!synth || !text) { resolve(); return }

    stopSpeaking()

    const utterance = new SpeechSynthesisUtterance(text)
    if (selectedVoice) utterance.voice = selectedVoice
    utterance.rate  = opts.rate  ?? 0.76
    utterance.pitch = opts.pitch ?? 1.0
    utterance.volume = opts.volume ?? 0.92

    utterance.onstart = () => { onSpeakStart?.() }
    utterance.onend   = () => { onSpeakEnd?.(); currentUtterance = null; resolve() }
    utterance.onerror = () => { onSpeakEnd?.(); currentUtterance = null; resolve() }

    currentUtterance = utterance
    synth.speak(utterance)
  })
}

// ── STOP ──────────────────────────────────────────────────────────────────────
export function stopSpeaking() {
  if (!synth) return
  try { synth.cancel() } catch (_) {}
  if (currentUtterance) {
    onSpeakEnd?.()
    currentUtterance = null
  }
}

// ── RECOGNITION ───────────────────────────────────────────────────────────────
export function initRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return false

  recognition = new SR()
  recognition.continuous    = false
  recognition.interimResults = true
  recognition.lang          = 'en-US'
  recognition.maxAlternatives = 1
  return true
}

export function startListening({ onInterim, onFinal, onEnd, onError } = {}) {
  if (!recognition) return false

  recognition.onresult = e => {
    let interim = ''
    let final   = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript
      if (e.results[i].isFinal) final += t
      else interim += t
    }
    if (interim) onInterim?.(interim)
    if (final)   onFinal?.(final)
  }

  recognition.onend   = () => onEnd?.()
  recognition.onerror = e  => {
    if (e.error !== 'no-speech') onError?.(e.error)
    onEnd?.()
  }

  try {
    recognition.start()
    return true
  } catch (_) {
    return false
  }
}

export function stopListening() {
  try { recognition?.stop() } catch (_) {}
}
