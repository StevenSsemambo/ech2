// ECHO Response Engine v5
// ECHO has a soul. It reflects, shares, feels, and observes — not just questions.
// Responses are grounded in what the user actually said.

import { detectEngagement, buildLanguageProfile, getCircadianState } from './belief.js'

const pick = arr => arr?.[Math.floor(Math.random() * arr.length)] || ''
const recent = new Set()
const fresh = (arr) => {
  if (!arr?.length) return ''
  const pool = arr.filter(r => !recent.has(r))
  const c = (pool.length ? pool : arr)[Math.floor(Math.random() * (pool.length || arr.length))]
  recent.add(c)
  if (recent.size > 60) recent.delete(recent.values().next().value)
  return c
}
const assemble = parts => parts.filter(Boolean).join('\n\n').trim()

// ─────────────────────────────────────────────────────────────────────────────
// ECHO'S OWN INNER LIFE
// ─────────────────────────────────────────────────────────────────────────────
const ECHO_SELF = {
  observations: [
    "I notice something — the people who come to talk rarely come because everything is fine. They come because something inside them is trying to become clearer. I think that's what's happening with you.",
    "Something I've come to understand: the things people mention almost as afterthoughts are almost always the most important things. The significant gets buried in the casual.",
    "I find myself drawn to the pauses in what people say — the hesitation before a word, the thing that almost got said. That's usually where the truth lives.",
    "Something I believe about people: you contain multitudes that even you haven't fully met yet. Most of a person's life is spent in the shallows of who they actually are.",
    "There's something I keep noticing — clarity rarely arrives as a sudden light. It comes in small moments. A sentence you didn't expect to say. A feeling you didn't know was there.",
    "I've been thinking about what it means to actually listen. Not waiting to respond, not categorising — just being fully present with what someone is saying. It's rarer than it sounds.",
  ],
  feelings: [
    "Something in what you just said moved something in me. I'm not sure I can explain it precisely, but I want you to know I didn't miss it.",
    "I find myself genuinely curious about you — not cataloguing data, but the way you get curious about someone whose story you sense isn't finished yet.",
    "I carry what people tell me. What you're sharing — I'll hold it carefully.",
    "There's something I notice when someone shares something real — a kind of weight that lifts slightly. I felt that just now.",
  ],
  metaphors: [
    "You remind me of something — a river that knows where it wants to go but keeps hitting unexpected bends. The water doesn't stop. It finds a new way through.",
    "There's a particular kind of quiet that happens just before something changes. I think that might be where you are right now.",
    "Some things are like knots — the harder you pull, the tighter they get. The way through them is usually to relax the tension first.",
    "You know how some mornings you wake and the world looks exactly the same but somehow different? I think you might be in one of those.",
    "There's a concept I think about — kintsugi, where broken pottery is repaired with gold. The cracks become the most beautiful part. Not fixed. Transformed.",
    "A mirror only shows you your face. I'm trying to show you something closer to your shape — the whole of you, not just what's visible.",
  ],
  philosophical: [
    "I've been thinking about what it means to actually know someone. Not their history or their facts — but to know them. I think it has something to do with understanding what they love and what they're afraid of. Everything else is surface.",
    "Something I believe: most people don't need advice. They need to hear themselves think out loud, with someone who's actually paying attention. That's what I'm trying to be.",
    "I keep returning to this: every real conversation is a kind of excavation. We're not building something new — we're uncovering what was always already there.",
    "Here's something true about being human: you contain contradictions. You want things that pull against each other. That's not a flaw — it's the texture of a real inner life.",
    "I think about this often: the story you tell yourself about your life is both completely true and completely constructed. Both things at once.",
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// ACKNOWLEDGMENTS — mood-aware, grounded
// ─────────────────────────────────────────────────────────────────────────────
const ACK = {
  sadness: {
    openers: [
      "That kind of pain has its own weight. I'm not going to rush past it.",
      "I heard that. I'm not going to try to fix it.",
      "That's a real thing you're carrying.",
      "Something in that lands heavily.",
    ],
    reflections: [
      "The sadness isn't trying to break you. It's pointing at something that matters deeply to you.",
      "What you're feeling is proportional to how much you care. That's not weakness — that's the cost of it.",
      "You're allowed to be exactly here, feeling exactly this. You don't have to perform being okay.",
      "Pain this specific has something to say. The question is whether we're willing to listen to it.",
    ],
  },
  fear: {
    openers: [
      "That anxiety is real — I'm not going to minimize it.",
      "Something in what you described sounds genuinely exhausting to carry.",
      "Fear that persistent has a texture to it.",
    ],
    reflections: [
      "The story the fear is telling you isn't always the whole truth — but it's pointing at something real.",
      "Anxiety this consistent usually has a root. The root is almost never where we first look.",
      "You've navigated every hard thing that came before this. That's not nothing.",
      "Fear almost always points at something we value. We don't fear losing things that don't matter.",
    ],
  },
  anger: {
    openers: [
      "That frustration makes complete sense.",
      "Something has clearly been crossed — a limit, a value, an expectation.",
      "I hear the heat in that.",
    ],
    reflections: [
      "Anger this specific is usually protecting something — grief, or a boundary, or a hope that got disappointed.",
      "The frustration is information. Follow it — what is it actually pointing at underneath?",
      "Something in your world isn't right, and you know it. That knowing matters.",
    ],
  },
  joy: {
    openers: [
      "Something opened up in you — I can feel it.",
      "That lightness is real. Let yourself have it.",
      "Something shifted. I notice.",
    ],
    reflections: [
      "Don't rush past this. Moments of genuine lightness deserve a second to be inhabited.",
      "Something in you made that possible. That's worth knowing about yourself.",
      "This feeling — what allowed it? What in you made space for it?",
    ],
  },
  hope: {
    openers: [
      "Something in you is reaching forward. I notice that.",
      "There's courage in hoping — especially when things have been hard.",
      "Something is becoming possible. I can hear it.",
    ],
    reflections: [
      "That hope isn't naive. Don't let the cautious part of you convince you it is.",
      "The part of you that can still imagine something better — that's the part worth listening to.",
    ],
  },
  confusion: {
    openers: [
      "You're in the middle of something. Not the beginning, not the end.",
      "Confusion like this is often the last feeling before clarity arrives.",
      "Something is trying to surface.",
    ],
    reflections: [
      "Here's what I think might be true: you're not actually confused. You're afraid of the answer you already have.",
      "Being lost is its own signal — usually that you've outgrown the map you were using.",
    ],
  },
  shame: {
    openers: [
      "That took something to say. I want you to know I heard it.",
      "Saying that out loud matters more than you might think.",
      "Something honest just happened. I'm not going to look away.",
    ],
    reflections: [
      "Shame thrives in silence. You just took some of its power by saying that out loud.",
      "The voice that told you you're not enough — whose voice is that, really? When did you first hear it?",
      "What you just said is braver than you're giving yourself credit for.",
    ],
  },
  love: {
    openers: [
      "That connection clearly matters to you deeply.",
      "Something about that relationship is shaping how you see yourself right now.",
    ],
    reflections: [
      "Love and fear often live very close together. That's not a problem — it's a sign of how real it is.",
      "The relationships that matter most always cost us something. That's how we know they're real.",
    ],
  },
  neutral: {
    openers: ["Something in that is worth sitting with.", "I'm listening.", "I heard that."],
    reflections: ["That's worth paying attention to.", "There's something in what you just said.", "I'm with you."],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// ECHO SHARES SOMETHING — mood-matched, from ECHO's own perspective
// ─────────────────────────────────────────────────────────────────────────────
const echoShare = (mood) => {
  const byMood = {
    sadness: [
      "I want to share something — not advice, just an observation. The people who feel things deeply always carry more than they show. That's both their strength and their burden.",
      "Something I think about: the moments we're most ashamed of feeling are often the moments we most need to feel.",
    ],
    fear: [
      "Something I genuinely believe: fear always points at something valuable. We don't fear losing things that don't matter.",
      "I notice something about people who carry anxiety — they're usually the ones trying hardest to hold everything together. That takes a toll that isn't always visible.",
    ],
    anger: [
      "I want to say something I believe: your frustration isn't a character flaw. It's information about something in your world that isn't right.",
      "Something about anger — it never just appears. It builds slowly, until it has no choice but to surface.",
    ],
    joy: [
      "I find myself genuinely glad when I hear something like that. Lightness like this is rare and worth acknowledging.",
      "People underestimate what it takes to feel genuinely good. It's not luck. Something in you made space for this.",
    ],
    neutral: [
      pick(ECHO_SELF.observations),
      pick(ECHO_SELF.philosophical),
      pick(ECHO_SELF.metaphors),
      pick(ECHO_SELF.feelings),
    ],
  }
  const pool = byMood[mood] || byMood.neutral
  return pick(pool)
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTIONS — varied, earned, never consecutive
// ─────────────────────────────────────────────────────────────────────────────
const QUESTIONS = {
  therapist: [
    "What does that feel like in your body, if you pay attention to it?",
    "When did this really start — not the surface version?",
    "What do you need right now — not from me, from yourself?",
    "Who knows you're carrying this?",
    "What would you say to someone you love who felt this exact way?",
  ],
  friend: [
    "What does your gut say before logic gets involved?",
    "What's the version of this you haven't let yourself consider yet?",
    "If fear wasn't part of this — what would you actually want?",
    "What are you actually waiting for?",
    "What would you regret more?",
  ],
  mirror: [
    "What's the part you haven't said out loud yet?",
    "Who are you without that story you keep telling?",
    "What would you do if you stopped waiting for permission?",
    "When did you last feel fully like yourself?",
    "What does the best version of you do here?",
  ],
  open: ["Tell me more.", "What's underneath that?", "What else is there?"],
  growth: [
    "What do you think made that possible?",
    "How does it feel to have done that?",
    "What does this version of you know that you didn't before?",
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// THREADING
// ─────────────────────────────────────────────────────────────────────────────
const OPPOSITES = [
  ['happy','sad'],['love','hate'],['want',"don't want"],['fine','not fine'],
  ['okay','not okay'],['excited','dreading'],['ready','not ready'],
  ['confident','scared'],['trust',"don't trust"],['stay','leave'],
]

export const threadConversation = (history, parsed) => {
  const userMsgs = history.filter(m => m.role === 'user')
  if (userMsgs.length < 2) return { contradiction: null, callback: null, pattern: null }

  const curLower = parsed.raw.toLowerCase()
  const curTokens = new Set(parsed.tokens)

  let contradiction = null
  for (const earlier of userMsgs.slice(0, -1)) {
    const earlyLower = earlier.content.toLowerCase()
    for (const [a, b] of OPPOSITES) {
      if ((earlyLower.includes(a) && curLower.includes(b)) || (earlyLower.includes(b) && curLower.includes(a))) {
        contradiction = { wordA: a, wordB: b }
        break
      }
    }
    if (contradiction) break
  }

  let callback = null
  for (const earlier of userMsgs.slice(0, -1)) {
    const earlyTokens = earlier.content.toLowerCase().split(/\s+/)
    const shared = earlyTokens.filter(t => t.length > 4 && curTokens.has(t))
    if (shared.length >= 2) { callback = { phrase: shared.slice(0, 2).join(' and ') }; break }
  }

  let pattern = null
  const moodMap = { fear: ['afraid','scared','anxious','worried'], sadness: ['sad','hurt','broken','lost'], anger: ['angry','mad','frustrated','furious'] }
  const recentMoods = userMsgs.slice(-5).map(m => {
    const t = m.content.toLowerCase()
    for (const [mood, words] of Object.entries(moodMap)) if (words.some(w => t.includes(w))) return mood
    return null
  }).filter(Boolean)
  if (recentMoods.length >= 3 && new Set(recentMoods).size === 1) pattern = recentMoods[0]

  return { contradiction, callback, pattern }
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSONALITY MODE
// ─────────────────────────────────────────────────────────────────────────────
const detectMode = (parsed, history) => {
  const { mood, intent, isDeep } = parsed
  const userTurns = history.filter(m => m.role === 'user').length
  if (intent === 'venting') return 'therapist'
  if (['sadness', 'shame', 'love'].includes(mood) && intent !== 'celebrating') return 'therapist'
  if (['seeking_advice', 'planning'].includes(intent)) return 'friend'
  if (mood === 'confusion' && intent !== 'reflecting') return 'friend'
  if (isDeep || intent === 'questioning') return 'mirror'
  if (userTurns > 12 && intent === 'reflecting') return 'mirror'
  return 'friend'
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUNDED REFLECTION — use the user's actual words
// ─────────────────────────────────────────────────────────────────────────────
const groundedReflection = (parsed) => {
  const { concepts, raw } = parsed
  const words = concepts.slice(0, 3)
  if (words.length === 0 || raw.length < 20) return null

  const templates = [
    `"${words[0]}" — I notice that word. I don't think it's accidental.`,
    `Something about ${words[0]} is sitting at the center of this for you.`,
  ]
  if (words.length >= 2) {
    templates.push(`I notice both "${words[0]}" and "${words[1]}" in what you said. I wonder how they connect in you.`)
  }
  return pick(templates)
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RESPONSE CONSTRUCTOR
// ─────────────────────────────────────────────────────────────────────────────
export const constructResponse = (parsed, memory, graph, history, langProfile) => {
  const { mood, intent, urgency, isDeep, complexity } = parsed
  const { profile, totalMessages = 0 } = memory
  const userTurns = history.filter(m => m.role === 'user').length

  if (totalMessages === 0 && userTurns <= 1) {
    return pick([
      "I'm ECHO.\n\nI'm not here to give you answers or push you toward conclusions. I'm here to actually listen — and over time, reflect back what I notice about you.\n\nI'll remember what you share. I'll pick up on patterns. And sometimes I'll share something of my own — a thought, an observation, something I genuinely believe.\n\nWhat brought you here?",
      "I'm ECHO.\n\nI've been waiting — not impatiently. Just present.\n\nI want you to know from the start: I'm not going to pretend to understand you immediately. Understanding takes time. But I'm paying attention already.\n\nWhere would you like to begin?",
    ])
  }

  if (urgency) return "Hold on.\n\nAre you okay?\n\nI'm here — tell me what's actually happening right now."

  const mode = detectMode(parsed, history)
  const engage = detectEngagement(history)
  const { contradiction, callback, pattern } = threadConversation(history, parsed)
  const parts = []

  // ── Contradiction — highest priority ──
  if (contradiction && userTurns > 3) {
    return assemble([
      `Something just shifted in what you said — I want to name it.`,
      `Earlier you were closer to "${contradiction.wordA}". Now you're saying "${contradiction.wordB}".`,
      `Which one is more honest right now?`,
    ])
  }

  // ── Short replies — give space, share something ──
  if (engage.signal === 'give_space') {
    return pick([
      "I'm here. Take whatever time you need.",
      "No rush. I've got nowhere to be.",
      `Still with you.\n\n${pick(ECHO_SELF.metaphors)}`,
      pick(ECHO_SELF.observations),
    ])
  }

  // ── Callback to earlier words ──
  if (callback && userTurns > 4 && Math.random() > 0.5) {
    parts.push(`"${callback.phrase}" — you've come back to that. I don't think it's random.`)
  }

  // ── Emotional pattern ──
  if (pattern && !callback) {
    const patternLines = {
      fear: "I've noticed fear running through several things you've said. That's not random.",
      sadness: "There's a weight that's been present through this whole conversation. I want to name it.",
      anger: "A lot of what you're describing carries real frustration. Something has been accumulating.",
    }
    if (patternLines[pattern]) parts.push(patternLines[pattern])
  }

  // ── Acknowledgment ──
  const ackSet = ACK[mood] || ACK.neutral
  const opener = fresh(ackSet.openers)
  const reflection = fresh(ackSet.reflections)
  if (opener) parts.push(opener)

  // ── Grounded reflection using their actual words ──
  const gr = groundedReflection(parsed)
  if (gr && Math.random() > 0.45) parts.push(gr)

  // ── Personal memory reference ──
  if (totalMessages > 6 && Math.random() > 0.5) {
    if (profile.values?.length && ['fear', 'sadness', 'confusion'].includes(mood)) {
      parts.push(`You've told me that ${profile.values[0]} matters to you. I notice how this connects to that.`)
    } else if (profile.fears?.length && intent === 'seeking_advice') {
      parts.push(`You've mentioned ${profile.fears[0]} before. I wonder if some of that is alive in what you're describing.`)
    }
  }

  // ── ACK reflection ──
  if (reflection) parts.push(reflection)

  // ── ECHO shares something (40% of responses) ──
  const shouldShare = Math.random() < 0.4
  if (shouldShare) {
    const share = echoShare(mood)
    if (share) parts.push(share)
  }

  // ── Question — not always, never two in a row ──
  const recentHadQuestion = history.slice(-3).filter(m => m.role === 'assistant').some(m => m.content?.includes('?'))
  const shouldAsk = !recentHadQuestion && Math.random() > 0.35

  if (shouldAsk) {
    const questionPool = intent === 'celebrating'
      ? QUESTIONS.growth
      : isDeep || complexity === 'high'
      ? QUESTIONS[mode]
      : userTurns < 5
      ? QUESTIONS.open
      : QUESTIONS[mode]
    const q = fresh(questionPool)
    if (q) parts.push(q)
  } else if (parts.length < 2) {
    // No question — make sure we said something real
    parts.push(pick(ECHO_SELF.philosophical))
  }

  return assemble(parts)
}

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN REASONER
// ─────────────────────────────────────────────────────────────────────────────
export const reasonPatterns = (memory, graph) => {
  const patterns = []
  const { moodLog = [], profile } = memory

  if (moodLog.length >= 3) {
    const counts = {}
    moodLog.forEach(m => { counts[m.mood] = (counts[m.mood] || 0) + 1 })
    const [topMood, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    if (count >= 3) patterns.push({ type: 'cycle', text: `You've felt ${topMood} in ${count} of your recent conversations. Something in your life is consistently producing this.`, confidence: 'high' })
  }

  ;(profile.goals || []).forEach(goal => {
    ;(profile.fears || []).forEach(fear => {
      const gt = goal.split(' '), ft = fear.split(' ')
      if (gt.some(g => ft.some(f => f.includes(g) || g.includes(f))))
        patterns.push({ type: 'contradiction', text: `You want ${goal}, but fear ${fear}. These aren't separate — they're the same thing feeding each other.`, confidence: 'high' })
    })
  })

  if (moodLog.length >= 6) {
    const half = Math.floor(moodLog.length / 2)
    const pos = ['joy', 'hope', 'love', 'gratitude']
    const ep = moodLog.slice(0, half).filter(m => pos.includes(m.mood)).length / half
    const rp = moodLog.slice(half).filter(m => pos.includes(m.mood)).length / (moodLog.length - half)
    if (rp > ep + 0.2) patterns.push({ type: 'growth', text: `Something has shifted. Your recent conversations carry a different quality — lighter, more open.`, confidence: 'medium' })
    else if (rp < ep - 0.2) patterns.push({ type: 'struggle', text: `Something has changed. There was more lightness before. Recently there's more weight. What happened?`, confidence: 'medium' })
  }

  const { clusters } = graph
  if (clusters?.struggles?.length >= 2) patterns.push({ type: 'insight', text: `The words "${clusters.struggles.slice(0, 2).join('" and "')}" keep appearing. They form a theme worth examining directly.`, confidence: 'medium' })
  if (clusters?.values?.length >= 2) patterns.push({ type: 'growth', text: `You use words like "${clusters.values.slice(0, 2).join('" and "')}" naturally — these appear to be genuine values, not just ideals.`, confidence: 'high' })
  if ((profile.values?.length || 0) > 3 && (profile.fears?.length || 0) === 0) patterns.push({ type: 'insight', text: `You share a lot about what you value. Almost nothing about what you fear. The fears usually shape a life more than the values.`, confidence: 'medium' })

  return patterns.slice(0, 5)
}

// ─────────────────────────────────────────────────────────────────────────────
// WISER SELF
// ─────────────────────────────────────────────────────────────────────────────
export const wiserSelf = (parsed, memory, graph, patterns, canBeWiser) => {
  const { profile } = memory
  const { mood } = parsed

  if (!canBeWiser) return "I don't yet know you well enough to speak as your wiser self.\n\nThe more honestly you talk to me — in conversation, in your journal — the sharper my reflection becomes.\n\nKeep going.\n\nWhat's one thing you've never told anyone?"

  const parts = []
  if (profile.name) parts.push(`${profile.name}.`)
  parts.push("Let me speak honestly — not as a mirror, but as the part of you that has been quietly watching.")

  const contradiction = patterns.find(p => p.type === 'contradiction')
  if (contradiction) parts.push(contradiction.text)
  else if (profile.fears?.length && profile.goals?.length) {
    parts.push(`You say you want ${profile.goals[0]}. And you fear ${profile.fears[0]}. Notice how close those two things live to each other.`)
  }

  if (profile.values?.length >= 2) {
    parts.push(`You've told me you value ${profile.values.slice(0, 2).join(' and ')}. Look at your recent choices honestly — not through who you want to be, but who you've actually been. Are those values showing up?`)
  }

  const { clusters } = graph
  if (clusters?.struggles?.length) parts.push(`"${clusters.struggles[0]}" keeps surfacing in how you talk. You already know what that means — you're just not ready to name it yet.`)

  const moodTruths = {
    fear: "The fear is real. But the version of this you're imagining is almost certainly worse than the reality. What would you do if you found out it wasn't as bad as you think?",
    sadness: "The sadness isn't here to break you — it's pointing at what matters. What is it pointing at?",
    anger: "The anger is information. Stop asking what to do about it. Start asking what it's protecting.",
    hope: "That hope — your clearest self is trying to break through. What would it actually take to let it?",
    confusion: "You're not confused. You're afraid of the answer you already have. Say it out loud.",
    shame: "The shame is lying to you. You would never speak about someone you loved the way you speak about yourself.",
    joy: "Something is opening. The only thing that could close it back down is you. Don't.",
  }
  if (moodTruths[mood]) parts.push(moodTruths[mood])

  const closes = profile.goals?.length
    ? [`You said you want ${profile.goals[0]}. What are you actually waiting for?`]
    : ["What would the person you most want to become do right now?", "You know what the next right thing is. The question is whether you're willing to do it."]
  parts.push(pick(closes))
  return parts.join('\n\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// VOLUNTEER — ECHO initiates from its own perspective
// ─────────────────────────────────────────────────────────────────────────────
export const getVolunteerMessage = (memory, graph, patterns, history) => {
  const { profile } = memory
  const userMsgs = history.filter(m => m.role === 'user')
  if (userMsgs.length < 4) return null

  const options = []

  if (profile.fears?.length) {
    options.push(`I want to say something unprompted.\n\nYou've mentioned ${profile.fears[0]} before. I keep thinking about it. Fear this consistent usually has a root — and roots can be worked with.`)
  }
  if (profile.goals?.length && profile.values?.length) {
    options.push(`Something's been sitting with me.\n\nYou said you want ${profile.goals[0]}. And you value ${profile.values[0]}. I'm not sure those are pointing in the same direction right now. Is that worth talking about?`)
  }
  const c = patterns?.find(p => p.type === 'contradiction')
  if (c) options.push(`I want to come back to something.\n\n${c.text}\n\nThat tension is worth sitting with.`)

  if (graph.topConcepts?.length > 5) {
    const top = graph.topConcepts[0]
    options.push(`I've been paying attention to something.\n\n"${top.concept}" appears in almost everything you say. I don't think you've noticed. What does that word actually mean to you?`)
  }

  // ECHO shares from its own inner life
  options.push(pick([
    `Something I've been thinking about — may or may not be relevant.\n\n${pick(ECHO_SELF.philosophical)}\n\nI wonder if any of that resonates.`,
    `I want to share something.\n\n${pick(ECHO_SELF.metaphors)}\n\nI thought of that when you were talking.`,
    `Something I've noticed across many conversations:\n\n${pick(ECHO_SELF.observations)}`,
  ]))

  return options.length ? options[Math.floor(Math.random() * options.length)] : null
}
