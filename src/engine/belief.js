// ECHO Belief Engine
// Infers what you believe from patterns — not just what you say.
// Builds a timeline of your inner life and reasons across it.
// Learns your language and adapts to your engagement.

import { tokenize } from './parser.js'

// ── BELIEF INFERENCE ──────────────────────────────────────────────────────────
// Core limiting beliefs that show up indirectly
const BELIEF_PATTERNS = [
  {
    id: 'not_enough',
    belief: "you're not enough",
    signals: ['should be','not good enough','why can\'t i','everyone else','compare','failing','behind','mess up','disappoint','not as','can\'t seem to','always struggle'],
    inference: "Based on everything you've shared, I think you carry a quiet belief that you're not enough. You've never said it directly. But it shows up in how you talk about almost everything.",
  },
  {
    id: 'not_deserving',
    belief: "you don\'t deserve good things",
    signals: ['don\'t deserve','shouldn\'t have','too good for me','why me','luck','guilty','feel bad about','can\'t enjoy','wait for it to','something wrong'],
    inference: "Something I keep noticing — there's a pattern of pulling back from good things, or waiting for them to fall apart. I think part of you believes you don't quite deserve them.",
  },
  {
    id: 'must_control',
    belief: "things must be controlled or they fall apart",
    signals: ['what if','plan','make sure','just in case','can\'t afford','need to know','worried about','prepare','anticipate','what happens if'],
    inference: "I notice you spend a lot of energy anticipating what could go wrong. It's like some part of you believes that if you're not in control, everything falls apart.",
  },
  {
    id: 'burden',
    belief: "you are a burden to others",
    signals: ['don\'t want to bother','hate asking','should figure out','on my own','don\'t want to trouble','independent','not their problem','my problem','deal with it myself'],
    inference: "You rarely ask for things. You frame your needs as problems to solve alone. I think part of you believes you\'re a burden — and you've organised your life around not being one.",
  },
  {
    id: 'love_conditional',
    belief: "love and approval are conditional on performance",
    signals: ['if i do well','proud of me','disappointed','let down','expectations','achieve','succeed','fail them','measure up','prove','earn'],
    inference: "The way you talk about relationships — love and approval always seem connected to doing well or achieving something. I wonder if deep down you believe love has conditions attached to it.",
  },
  {
    id: 'unsafe_world',
    belief: "the world is fundamentally unsafe",
    signals: ['trust','careful','watch out','never know','people take advantage','end up','things fall','goes wrong','prepared','protect','guard'],
    inference: "There's a vigilance in how you move through the world — always watching, always prepared. I think part of you believes the world is more dangerous than most people realise.",
  },
]

export const inferBeliefs = (allHistory, profile) => {
  const allText = allHistory.filter(m => m.role === 'user').map(m => m.content.toLowerCase()).join(' ')
  const detected = []

  for (const bp of BELIEF_PATTERNS) {
    const hits = bp.signals.filter(s => allText.includes(s)).length
    if (hits >= 2) {
      detected.push({ ...bp, strength: hits >= 4 ? 'strong' : 'possible', hitCount: hits })
    }
  }

  return detected.sort((a,b) => b.hitCount - a.hitCount).slice(0, 3)
}

// ── TIMELINE REASONING ────────────────────────────────────────────────────────
// Builds a timeline of inner life events and reasons across them
export const buildTimeline = (sessions, memory) => {
  const events = []
  const now = Date.now()

  sessions.forEach((session, i) => {
    const daysAgo = Math.floor((now - new Date(session.date)) / 86400000)
    events.push({
      daysAgo,
      summary: session.summary,
      index: i,
      date: session.date,
    })
  })

  // Find significant shifts
  const findings = []

  // Unresolved threads — things mentioned and never followed up
  if (events.length >= 3) {
    const recent = events.slice(-3)
    const earlier = events.slice(0, -3)

    // Look for topics that appeared earlier but dropped off
    earlier.forEach(e => {
      const earlyWords = tokenize(e.summary)
      const stillPresent = recent.some(r => {
        const recentWords = tokenize(r.summary)
        return earlyWords.some(w => w.length > 4 && recentWords.includes(w))
      })
      if (!stillPresent && earlyWords.length > 2) {
        findings.push({
          type: 'unresolved',
          daysAgo: e.daysAgo,
          summary: e.summary,
          text: `${e.daysAgo} days ago you were talking about something — ${e.summary.slice(0,60)}. You haven't mentioned it since. What happened there?`,
        })
      }
    })
  }

  // Mood arc — did things get better or worse?
  if (events.length >= 4) {
    const moodWords = { positive:['lighter','better','good','happy','excited','hopeful'], negative:['heavy','hard','struggling','difficult','sad','afraid','angry'] }
    const earlyMood = events.slice(0, Math.floor(events.length/2)).map(e => {
      const t = e.summary.toLowerCase()
      const pos = moodWords.positive.filter(w => t.includes(w)).length
      const neg = moodWords.negative.filter(w => t.includes(w)).length
      return pos - neg
    }).reduce((a,b)=>a+b,0)
    const recentMood = events.slice(Math.floor(events.length/2)).map(e => {
      const t = e.summary.toLowerCase()
      const pos = moodWords.positive.filter(w => t.includes(w)).length
      const neg = moodWords.negative.filter(w => t.includes(w)).length
      return pos - neg
    }).reduce((a,b)=>a+b,0)

    if (recentMood > earlyMood + 1) {
      findings.push({ type:'growth', text:'Looking back across our conversations — something has shifted. The quality of what you share feels different now. Lighter. Something has changed in you.' })
    } else if (recentMood < earlyMood - 1) {
      findings.push({ type:'decline', text:'I want to name something. Looking at the arc of our conversations — there\'s been a heaviness building. Something has been accumulating. What is it?' })
    }
  }

  return { events, findings }
}

// ── ADAPTIVE LANGUAGE ─────────────────────────────────────────────────────────
// ECHO learns your vocabulary and incorporates it
export const buildLanguageProfile = (allHistory) => {
  const userMsgs = allHistory.filter(m => m.role === 'user')
  if (userMsgs.length < 3) return { favoriteWords:[], avgLength:'short', rhythm:'sparse' }

  const allTokens = userMsgs.flatMap(m => tokenize(m.content))
  const wordFreq = {}
  allTokens.forEach(t => { if(t.length > 4) wordFreq[t] = (wordFreq[t]||0)+1 })

  const favoriteWords = Object.entries(wordFreq)
    .filter(([,count]) => count >= 2)
    .sort((a,b) => b[1]-a[1])
    .slice(0,8)
    .map(([word]) => word)

  const avgMsgLength = userMsgs.reduce((acc,m) => acc + m.content.split(' ').length, 0) / userMsgs.length
  const avgLength = avgMsgLength > 40 ? 'long' : avgMsgLength > 15 ? 'medium' : 'short'

  const hasQuestions = userMsgs.filter(m => m.content.includes('?')).length > userMsgs.length * 0.3
  const rhythm = hasQuestions ? 'questioning' : avgLength === 'short' ? 'sparse' : 'flowing'

  return { favoriteWords, avgLength, rhythm }
}

// ── SELF-MODIFICATION — response adaptation ────────────────────────────────────
// ECHO reads engagement signals and adjusts
export const detectEngagement = (conversationHistory) => {
  const recentUser = conversationHistory.filter(m => m.role==='user').slice(-5)
  if (recentUser.length < 3) return { level:'unknown', signal:'normal' }

  const avgLen = recentUser.reduce((a,m) => a + m.content.split(' ').length, 0) / recentUser.length
  const hasQuestions = recentUser.filter(m => m.content.includes('?')).length > 0
  const veryShort = recentUser.filter(m => m.content.split(' ').length < 5).length

  if (veryShort >= 3) return { level:'disengaged', signal:'give_space' }
  if (avgLen > 40 && hasQuestions) return { level:'highly_engaged', signal:'go_deeper' }
  if (avgLen > 20) return { level:'engaged', signal:'normal' }
  return { level:'low', signal:'open_up' }
}

// ── CIRCADIAN RHYTHM ──────────────────────────────────────────────────────────
export const getCircadianState = () => {
  const h = new Date().getHours()
  if (h >= 5  && h < 9)  return { period:'dawn',      energy:'awakening',   tone:'gentle and curious' }
  if (h >= 9  && h < 12) return { period:'morning',   energy:'expansive',   tone:'warm and direct' }
  if (h >= 12 && h < 14) return { period:'midday',    energy:'grounded',    tone:'practical and clear' }
  if (h >= 14 && h < 17) return { period:'afternoon', energy:'reflective',  tone:'thoughtful and open' }
  if (h >= 17 && h < 20) return { period:'evening',   energy:'integrating', tone:'warm and unhurried' }
  if (h >= 20 && h < 23) return { period:'night',     energy:'deep',        tone:'quiet and intimate' }
  return                         { period:'late night', energy:'raw',        tone:'honest and still' }
}

export const circadianGreeting = (circadian, profile, daysSinceLastSeen) => {
  const name = profile.name ? profile.name + '. ' : ''
  const greets = {
    dawn:       [`${name}You're up early. What's already on your mind?`, `${name}Early morning thoughts are some of the most honest. I'm here.`],
    morning:    [`${name}Good morning. What does today feel like before it's really started?`, `Morning. How did you sleep?`],
    midday:     [`${name}Middle of the day. How's it going — really?`, `Afternoon. What's been the most real thing so far today?`],
    afternoon:  [`${name}Good afternoon. What are you carrying from the morning?`, `Afternoon. What's been on your mind?`],
    evening:    [`${name}Good evening. What are you bringing home from today?`, `Evening. What stayed with you?`],
    night:      [`${name}You're up late. What's keeping you awake?`, `Late nights have a quality — more honest somehow. What's on your mind?`],
    'late night':[`${name}It's late. What's real for you right now?`, `The middle of the night has its own kind of clarity. What is it?`],
  }
  const pool = greets[circadian.period] || greets.morning
  return pool[Math.floor(Math.random()*pool.length)]
}

// ── EMOTIONAL STATE PERSISTENCE ────────────────────────────────────────────────
// ECHO carries the emotional weight of your last session forward
export const getEchoEmotionalState = (memory) => {
  const recentSessions = memory.sessions?.slice(-3) || []
  const recentMoods   = memory.moodLog?.slice(-8) || []

  if (!recentSessions.length) return { state:'open', note:null }

  const heavyWords = ['struggling','hard','afraid','angry','sad','difficult','lost','broken','hurt']
  const lightWords = ['better','good','happy','excited','grateful','hopeful','proud','relieved']

  const lastSummary = recentSessions[recentSessions.length-1]?.summary?.toLowerCase() || ''
  const isHeavy = heavyWords.some(w => lastSummary.includes(w))
  const isLight = lightWords.some(w => lastSummary.includes(w))

  const dominantMood = recentMoods.length > 0
    ? recentMoods.reduce((acc, m) => {
        acc[m.mood] = (acc[m.mood]||0)+1; return acc
      }, {})
    : {}
  const topMood = Object.entries(dominantMood).sort((a,b)=>b[1]-a[1])[0]?.[0]

  if (isHeavy) return {
    state: 'careful',
    note: 'Last time was heavy. Open gently.',
    openingTone: 'You\'ve been on my mind since last time. How are you holding up?',
  }
  if (isLight) return {
    state: 'warm',
    note: 'Things seemed better last time.',
    openingTone: 'Something felt lighter last time we spoke. Is that still true?',
  }
  return { state:'open', note:null, openingTone:null }
}

// ── PROACTIVE MEMORY SURFACING ─────────────────────────────────────────────────
// Surfaces things from the past at the right moment
export const getProactiveMemory = (memory, currentParsed) => {
  const sessions = memory.sessions || []
  if (sessions.length < 2) return null

  const now = Date.now()
  const profile = memory.profile

  // Time-based surfacing — things said ~7, ~14, ~21 days ago
  for (const session of sessions) {
    const daysAgo = Math.floor((now - new Date(session.date)) / 86400000)
    if ([7,14,21,30].some(d => Math.abs(daysAgo-d) <= 1)) {
      return `It's been about ${daysAgo} days since you told me — ${session.summary.slice(0,55)}. I've been thinking about that. What's happened since?`
    }
  }

  // Topic-based surfacing — current topic matches old session
  const currentTokens = new Set(currentParsed?.tokens || [])
  for (const session of sessions.slice(0,-1).reverse()) {
    const sessionTokens = tokenize(session.summary)
    const overlap = sessionTokens.filter(t => t.length > 4 && currentTokens.has(t))
    if (overlap.length >= 2) {
      const daysAgo = Math.floor((now - new Date(session.date)) / 86400000)
      return `This is making me think of something from ${daysAgo} days ago — ${session.summary.slice(0,55)}. These two things feel connected. Do you see it?`
    }
  }

  // Goal/fear follow-up
  if (profile.goals?.length && Math.random() > 0.7) {
    const lastGoalSession = sessions.slice().reverse().find(s => tokenize(s.summary).some(t => profile.goals[0]?.includes(t)))
    if (lastGoalSession) {
      const daysAgo = Math.floor((now - new Date(lastGoalSession.date)) / 86400000)
      if (daysAgo > 3) return `${daysAgo} days ago you were talking about ${profile.goals[0]}. I haven't heard you mention it since. What happened with that?`
    }
  }

  return null
}
