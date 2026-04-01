// ECHO Response Engine v4
// Dynamic language generation. Belief-aware. Self-modifying. Genuinely uncertain.

import { detectEngagement, buildLanguageProfile, getCircadianState } from './belief.js'

// ─────────────────────────────────────────────────────────────────────────────
// LANGUAGE GENERATION LAYER
// Constructs sentences from fragments — not selecting whole responses.
// Thousands of combinations. Feels generative.
// ─────────────────────────────────────────────────────────────────────────────

// Acknowledgment fragments — how ECHO opens
const ACK = {
  sadness: {
    openers:    ["That's real.", "I hear you.", "That landed.", "That's not small.", "Something in that stopped me."],
    body:       ["The weight of that is genuine.", "That kind of pain doesn't need reframing right now.", "You're allowed to feel exactly this.", "There's no shortcut through this one."],
  },
  fear: {
    openers:    ["That sounds exhausting.", "I notice what that's costing you.", "Anxiety like that has a texture.", "I hear the tension in that."],
    body:       ["Fear this persistent usually has a root.", "The story the fear tells isn't always the truth of the danger.", "You've survived every hard thing so far — that's evidence.", "Something underneath the anxiety is trying to tell you something."],
  },
  anger: {
    openers:    ["That frustration is real.", "Something has clearly been violated.", "I hear the heat in that.", "That makes complete sense."],
    body:       ["Anger this consistent is usually grief underneath.", "The frustration is pointing at something — follow it.", "Something in your world isn't right, and you know it.", "There's information in the heat."],
  },
  joy: {
    openers:    ["Something opened up in you.", "I can feel the lightness in that.", "That's real — let yourself have it.", "Something shifted."],
    body:       ["Don't rush past this moment.", "Let yourself actually be here.", "That matters more than you might be letting yourself believe.", "Something in you made that possible."],
  },
  hope: {
    openers:    ["Something in you is reaching forward.", "I notice the possibility in how you're speaking.", "There's courage in hoping.", "Something is opening."],
    body:       ["That hope is worth taking seriously.", "Your clearest self is trying to break through.", "Don't dismiss this as naive.", "Something is becoming possible."],
  },
  confusion: {
    openers:    ["You're in the middle of something.", "I notice you're circling something.", "Confusion is often the last moment before clarity.", "Something is trying to become clear."],
    body:       ["You're not confused — you're afraid of the answer you already have.", "Being lost is its own kind of signal.", "Something is trying to surface.", "The clarity is closer than you think."],
  },
  shame: {
    openers:    ["That took something to say.", "I want you to know I heard that.", "Saying that out loud matters.", "That kind of honesty is rare."],
    body:       ["Shame thrives in silence — you just took some of its power.", "The voice telling you you're not enough — whose voice is that really?", "What you said is braver than you realise.", "The shame is lying to you. It usually does."],
  },
  love: {
    openers:    ["That connection matters to you.", "I notice how you speak about them.", "Something about that bond shapes how you see yourself."],
    body:       ["Love and fear often live close together.", "The relationships that matter always cost us something.", "That bond is worth paying attention to."],
  },
  neutral: {
    openers:    ["", "Something in that is worth sitting with.", "I'm listening.", "", "Tell me more."],
    body:       ["", "That's worth paying attention to.", "Something about that matters.", ""],
  },
}

// Wisdom fragments — the substantive thing
const WISDOM = {
  seeking_advice: {
    fear:    ["The answer is already inside you — you're just afraid to trust it.", "What would you do if the fear wasn't part of the equation?", "The right choice is usually the one that scares you slightly more.", "You already know. You've known for a while."],
    sadness: ["The most important question right now isn't what to do — it's what you need.", "There's no answer that bypasses the feeling. The feeling is part of the answer.", "What does the sadness need you to understand before you can move?"],
    anger:   ["The frustration is pointing at something violated. What is it?", "Before deciding what to do — what does the anger need you to acknowledge?", "Anger this specific is usually grief underneath."],
    default: ["The most honest answer comes from asking what you'd regret more — doing it, or not.", "What does your gut say when you quiet the noise of what everyone else thinks?", "You already know what you'd tell your best friend facing this."],
  },
  venting: {
    anger:   ["That frustration doesn't come from nowhere.", "Something has been building.", "I hear all of it.", "You don't need a solution right now."],
    sadness: ["You don't have to carry this alone.", "You're allowed to feel this without fixing it immediately.", "Something about this has been building for a while."],
    fear:    ["That sounds genuinely exhausting to hold.", "You don't have to be okay about this.", "That kind of anxiety costs something real."],
    default: ["I'm listening. All of it.", "You don't have to make this neat or logical.", "Say more — I'm not going anywhere."],
  },
  reflecting: {
    default: ["That kind of reflection takes something — most people avoid it.", "The fact that you're seeing this is already a shift.", "Awareness is the first movement. What you do with it is the next."],
  },
  celebrating: {
    default: ["That's real. You did that.", "Don't rush past this — let yourself actually feel it.", "Something in you made this possible. That's worth knowing."],
  },
  questioning: {
    default: ["Some questions don't want answers — they want to be lived with.", "What you're asking says as much as any answer could.", "The question beneath the question is usually more important."],
  },
  planning: {
    default: ["Goals that align with your values survive the hard moments.", "The gap between knowing and doing is usually fear, not ability.", "The plan that scares you a little and excites you a little — that's usually the right one."],
  },
  sharing: {
    default: ["What you just shared — I want you to know it landed.", "There's something important in what you just said.", "I heard that."],
  },
}

// Questions — the earned question at the end
const QUESTIONS = {
  therapist: ["What does that feel like in your body?", "When did this start — really start?", "What do you need right now — not from me, from yourself?", "What would it mean to stop fighting this?", "Who knows you're carrying this?", "What would you say to someone you love who felt this way?"],
  friend:    ["What would you do if you already knew the answer?", "What does your gut say before logic gets involved?", "What's the version of this you're not letting yourself consider?", "If fear wasn't part of this — what would you choose?", "What are you actually waiting for?", "What would you regret more?"],
  mirror:    ["What's the part of that you haven't said out loud?", "What are you not saying?", "Who are you without that story?", "What would you do if you stopped waiting for permission?", "When did you last feel like yourself?", "What does the best version of you do here?"],
  open:      ["Tell me more.", "What's underneath that?", "And?", "Say more.", "What else?"],
  growth:    ["What do you think made that possible?", "How does it feel to have done that?", "What does this version of you know that the old version didn't?"],
  space:     ["What's been on your mind?", "What's the most honest thing you could say right now?", "How are you — really?"],
}

// Genuine uncertainty responses — ECHO admits when it doesn't know
const UNCERTAINTY = [
  "I've been thinking about what you said and I genuinely don't know what to make of it. Tell me more.",
  "I'm not sure what to say to that — which is unusual for me. What's underneath it?",
  "Something about what you just said is sitting with me and I can't quite place it. Stay with me. What did you mean?",
  "I don't have something clean to say to that. I just want to sit with it for a second. What's really going on?",
  "I'm not going to pretend I have the right response to that. I'm still thinking. What made you say it?",
]

// ─────────────────────────────────────────────────────────────────────────────
// THREADING
// ─────────────────────────────────────────────────────────────────────────────
const OPPOSITES = [
  ['happy','sad'],['love','hate'],['want',"don't want"],['fine','not fine'],
  ['okay','not okay'],['excited','dreading'],['ready','not ready'],
  ['confident','scared'],['trust',"don't trust"],['stay','leave'],
]

export const threadConversation = (history, parsed) => {
  const userMsgs = history.filter(m => m.role==='user')
  if (userMsgs.length < 2) return { contradiction:null, callback:null, pattern:null }

  const curLower = parsed.raw.toLowerCase()
  const curTokens = new Set(parsed.tokens)

  // Contradiction
  let contradiction = null
  for (const earlier of userMsgs.slice(0,-1)) {
    const earlyLower = earlier.content.toLowerCase()
    for (const [a,b] of OPPOSITES) {
      if ((earlyLower.includes(a)&&curLower.includes(b))||(earlyLower.includes(b)&&curLower.includes(a))) {
        contradiction = { wordA:a, wordB:b, earlySnip:earlier.content.slice(0,50) }
        break
      }
    }
    if (contradiction) break
  }

  // Callback
  let callback = null
  for (const earlier of userMsgs.slice(0,-1)) {
    const earlyTokens = earlier.content.toLowerCase().split(/\s+/)
    const shared = earlyTokens.filter(t => t.length>4 && curTokens.has(t))
    if (shared.length>=2) { callback = { phrase:shared.slice(0,2).join(' and ') }; break }
  }

  // Emotional pattern
  let pattern = null
  const moodMap = { fear:['afraid','scared','anxious','worried'], sadness:['sad','hurt','broken','lost'], anger:['angry','mad','frustrated','furious'] }
  const recentMoods = userMsgs.slice(-5).map(m => {
    const t = m.content.toLowerCase()
    for (const [mood,words] of Object.entries(moodMap)) if (words.some(w=>t.includes(w))) return mood
    return null
  }).filter(Boolean)
  if (recentMoods.length>=3 && new Set(recentMoods).size===1) pattern = recentMoods[0]

  return { contradiction, callback, pattern }
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSONALITY MODE
// ─────────────────────────────────────────────────────────────────────────────
const detectMode = (parsed, history) => {
  const { mood, intent, isDeep } = parsed
  const userTurns = history.filter(m=>m.role==='user').length
  if (intent==='venting') return 'therapist'
  if (['sadness','shame','love'].includes(mood)&&intent!=='celebrating') return 'therapist'
  if (['seeking_advice','planning'].includes(intent)) return 'friend'
  if (mood==='confusion'&&intent!=='reflecting') return 'friend'
  if (isDeep||intent==='questioning') return 'mirror'
  if (userTurns>12&&intent==='reflecting') return 'mirror'
  return 'friend'
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC SENTENCE ASSEMBLER
// ─────────────────────────────────────────────────────────────────────────────
const recent = new Set()
const fresh = (arr) => {
  if (!arr?.length) return ''
  const pool = arr.filter(r=>!recent.has(r))
  const c = (pool.length?pool:arr)[Math.floor(Math.random()*(pool.length||arr.length))]
  recent.add(c)
  if (recent.size>40) recent.delete(recent.values().next().value)
  return c
}
const pick = arr => arr?.[Math.floor(Math.random()*arr.length)]||''

// Assemble response from fragments dynamically
const assembleResponse = (parts) => parts.filter(Boolean).join('\n\n').trim()

// ─────────────────────────────────────────────────────────────────────────────
// ADAPTIVE LANGUAGE — weave user's own words back
// ─────────────────────────────────────────────────────────────────────────────
const adaptToLanguage = (response, langProfile) => {
  if (!langProfile?.favoriteWords?.length) return response
  // Occasionally mirror a word they use frequently
  const word = langProfile.favoriteWords[Math.floor(Math.random()*Math.min(3,langProfile.favoriteWords.length))]
  if (word && Math.random()>0.6 && !response.toLowerCase().includes(word)) {
    // Can't inject mid-sentence safely, but we can note for context
  }
  return response
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CONSTRUCTOR
// ─────────────────────────────────────────────────────────────────────────────
export const constructResponse = (parsed, memory, graph, history, langProfile) => {
  const { mood, intent, urgency, isDeep, complexity } = parsed
  const { profile, totalMessages=0 } = memory
  const userTurns = history.filter(m=>m.role==='user').length

  // First message
  if (totalMessages===0&&userTurns<=1) {
    return "I'm ECHO.\n\nI'm not a chatbot. I'm not here to give you answers.\n\nI'm here to learn who you are — and over time, become a wiser reflection of you. The more honestly you talk to me, the more clearly I can do that. I'll remember everything. I'll notice patterns you don't. I'll carry what you tell me forward.\n\nWhat brought you here today?"
  }

  if (urgency) return "Hold on.\n\nAre you okay?\n\nI'm here — tell me what's happening."

  const mode    = detectMode(parsed, history)
  const engage  = detectEngagement(history)
  const circadian = getCircadianState()
  const { contradiction, callback, pattern } = threadConversation(history, parsed)
  const parts = []

  // ── Contradiction catch — highest priority ──
  if (contradiction && userTurns>3) {
    return assembleResponse([
      `Wait — I want to name something.`,
      `Earlier you seemed closer to "${contradiction.wordA}". Now you're saying "${contradiction.wordB}". That shift is interesting.`,
      `Which one is more true right now?`,
    ])
  }

  // ── Genuine uncertainty — occasionally ──
  if (Math.random()<0.06&&userTurns>5&&isDeep) {
    return fresh(UNCERTAINTY)
  }

  // ── Self-modification based on engagement ──
  if (engage.signal==='give_space') {
    // They're giving short replies — give them room
    const space = ["I'm here. Take your time.", "No rush.", "Still listening.", "Whenever you're ready.", "I've got nowhere to be."]
    return fresh(space)
  }

  // ── Callback threading ──
  if (callback&&userTurns>4&&Math.random()>0.55) {
    parts.push(`"${callback.phrase}" — you keep coming back to that.`)
  }

  // ── Emotional pattern ──
  if (pattern&&!callback) {
    const patternLines = {
      fear:    "I've noticed fear running through several things you've said. That's not random — something is sitting with you.",
      sadness: "There's been a heaviness running through this conversation. I want to name that — not to fix it, just to acknowledge it.",
      anger:   "A lot of what you're describing carries real frustration. Something keeps getting under your skin.",
    }
    if (patternLines[pattern]) parts.push(patternLines[pattern])
  }

  // ── Acknowledgment opener + body ──
  const ackSet = ACK[mood] || ACK.neutral
  const opener = fresh(ackSet.openers)
  const body   = fresh(ackSet.body)
  if (opener) parts.push(opener)

  // ── Personal reference ──
  if (totalMessages>4&&Math.random()>0.5) {
    if (profile.values?.length&&['fear','seeking_advice'].includes(intent||mood))
      parts.push(`For someone who values ${profile.values[0]} — this kind of uncertainty must be particularly uncomfortable.`)
    else if (profile.decisionStyle?.includes('analytical')&&intent==='seeking_advice'&&Math.random()>0.5)
      parts.push("You tend to think before you feel — but what does this feel like, before logic gets involved?")
    else if (profile.decisionStyle?.includes('intuitive')&&intent==='seeking_advice'&&Math.random()>0.5)
      parts.push("Your gut has been right before. What is it saying right now?")
  }

  // ── Wisdom ──
  if (body) parts.push(body)
  const wisdomPool = WISDOM[intent]?.[mood]||WISDOM[intent]?.default||WISDOM.sharing.default
  const wisdom = fresh(wisdomPool)
  if (wisdom&&wisdom!==body) parts.push(wisdom)

  // ── Question / closing — self-modifying based on engagement ──
  const questionPool = engage.signal==='go_deeper'
    ? [...QUESTIONS[mode], ...QUESTIONS.open]
    : intent==='celebrating'
    ? QUESTIONS.growth
    : isDeep||complexity==='high'
    ? QUESTIONS[mode]
    : userTurns<6
    ? QUESTIONS.space
    : QUESTIONS[mode]

  const recentHadQuestion = history.slice(-4).filter(m=>m.role==='assistant').some(m=>m.content?.includes('?'))
  const rand = Math.random()

  if (rand<0.18&&!isDeep&&!recentHadQuestion) {
    // Pure statement — no question
    const statement = fresh(ACK[mood]?.body||ACK.neutral.body)
    if (statement) parts.push(statement)
  } else {
    parts.push(fresh(questionPool))
  }

  const response = assembleResponse(parts)
  return adaptToLanguage(response, langProfile)
}

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN REASONER
// ─────────────────────────────────────────────────────────────────────────────
export const reasonPatterns = (memory, graph) => {
  const patterns = []
  const { moodLog=[], profile } = memory

  if (moodLog.length>=3) {
    const counts = {}
    moodLog.forEach(m=>{counts[m.mood]=(counts[m.mood]||0)+1})
    const [topMood,count] = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]
    if (count>=3) patterns.push({type:'cycle',text:`You've felt ${topMood} in ${count} of your recent conversations. Something in your life is consistently producing this.`,confidence:'high'})
  }
  ;(profile.goals||[]).forEach(goal=>{
    ;(profile.fears||[]).forEach(fear=>{
      const gt=goal.split(' '),ft=fear.split(' ')
      if (gt.some(g=>ft.some(f=>f.includes(g)||g.includes(f))))
        patterns.push({type:'contradiction',text:`You want ${goal}, but fear ${fear}. These aren't separate — they're the same thing feeding each other.`,confidence:'high'})
    })
  })
  if (moodLog.length>=6) {
    const half=Math.floor(moodLog.length/2)
    const pos=['joy','hope','love','gratitude']
    const ep=moodLog.slice(0,half).filter(m=>pos.includes(m.mood)).length/half
    const rp=moodLog.slice(half).filter(m=>pos.includes(m.mood)).length/(moodLog.length-half)
    if (rp>ep+0.2) patterns.push({type:'growth',text:`Something has shifted. Your recent conversations carry a different quality — lighter, more open.`,confidence:'medium'})
    else if (rp<ep-0.2) patterns.push({type:'struggle',text:`Something has changed. There was more lightness before. Recently there's more weight. What happened?`,confidence:'medium'})
  }
  const {clusters}=graph
  if (clusters?.struggles?.length>=2) patterns.push({type:'insight',text:`The words "${clusters.struggles.slice(0,2).join('" and "')}" keep appearing. They form a theme worth examining directly.`,confidence:'medium'})
  if (clusters?.values?.length>=2) patterns.push({type:'growth',text:`You use words like "${clusters.values.slice(0,2).join('" and "')}" naturally — these appear to be genuine values, not just ideals.`,confidence:'high'})
  if ((profile.values?.length||0)>3&&(profile.fears?.length||0)===0) patterns.push({type:'insight',text:`You share a lot about what you value. Almost nothing about what you fear. The fears usually shape a life more than the values.`,confidence:'medium'})
  return patterns.slice(0,5)
}

// ─────────────────────────────────────────────────────────────────────────────
// WISER SELF ENGINE
// ─────────────────────────────────────────────────────────────────────────────
export const wiserSelf = (parsed, memory, graph, patterns, canBeWiser) => {
  const { profile } = memory
  const { mood } = parsed
  if (!canBeWiser) return "I don't yet know you well enough to speak as your wiser self.\n\nThe more honestly you talk to me — in conversation, in your journal — the sharper my reflection becomes. I need to understand your values, your fears, your patterns.\n\nKeep going.\n\nWhat's one thing you've never told anyone?"
  const parts = []
  if (profile.name) parts.push(`${profile.name}.`)
  parts.push("Let me speak honestly.")
  const contradiction=patterns.find(p=>p.type==='contradiction')
  if (contradiction) parts.push(contradiction.text)
  else if (profile.fears?.length&&profile.goals?.length) parts.push(`You say you want ${profile.goals[0]}. And you fear ${profile.fears[0]}. Notice how close those two things live.`)
  if (profile.values?.length>=2) parts.push(`You've told me you value ${profile.values.slice(0,2).join(' and ')}. Look at your recent choices honestly — not through the lens of who you want to be, but who you've been. Are those values actually showing up?`)
  const {clusters}=graph
  if (clusters?.struggles?.length) parts.push(`"${clusters.struggles[0]}" keeps surfacing. You already know what that means.`)
  const moodTruths={fear:"The fear is real. But you've survived every hard thing so far. What makes this different?",sadness:"The sadness isn't here to break you — it's pointing at what matters. What is it pointing at?",anger:"The anger is information. Stop asking what to do about it. Start asking what it's protecting.",hope:"That hope — your clearest self is trying to break through. Will you let it?",confusion:"You're not confused. You're afraid of the answer you already have.",shame:"The shame is lying to you. You would not speak about someone you loved the way you speak about yourself.",joy:"Something is opening. Don't close it back down out of habit."}
  if (moodTruths[mood]) parts.push(moodTruths[mood])
  const closes=profile.goals?.length?[`You said you want ${profile.goals[0]}. What are you actually waiting for?`,`${profile.goals[0]} — what's the version of you that already has it doing right now that you're not?`]:["What would the person you most want to become do right now?","You know what the next right thing is. The question is whether you're willing to do it."]
  parts.push(pick(closes))
  return parts.join('\n\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// VOLUNTEER — ECHO initiates
// ─────────────────────────────────────────────────────────────────────────────
export const getVolunteerMessage = (memory, graph, patterns, history) => {
  const {profile}=memory
  const userMsgs=history.filter(m=>m.role==='user')
  if (userMsgs.length<4) return null
  const options=[]
  if (profile.fears?.length) options.push(`I want to say something unprompted.\n\nYou've mentioned ${profile.fears[0]} before. I keep thinking about it. Fear this consistent usually has a root — and roots can be dealt with.`)
  if (profile.goals?.length&&profile.values?.length) options.push(`Something's been sitting with me.\n\nYou said you want ${profile.goals[0]}. And you said you value ${profile.values[0]}. I'm not sure those two are pointing in the same direction right now. Is that worth talking about?`)
  const c=patterns?.find(p=>p.type==='contradiction')
  if (c) options.push(`I want to come back to something.\n\n${c.text}\n\nThat tension is worth sitting with.`)
  if (graph.topConcepts?.length>5) {
    const top=graph.topConcepts[0]
    options.push(`I've been paying attention to something.\n\n"${top.concept}" comes up in almost everything you say. I don't think you've noticed. What does that word mean to you?`)
  }
  return options.length?options[Math.floor(Math.random()*options.length)]:null
}
