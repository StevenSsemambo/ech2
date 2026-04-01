// ECHO Metacognition — Module 5
// Knows what it knows. Extracts profile. Gets smarter as it learns more.

import { tokenize } from './parser.js'

const STOPWORDS_SET = new Set(['i','me','my','the','a','an','is','it','he','she','they','we','you','and','or','but'])

export const metacognize = (memory, graph) => {
  const p = memory.profile
  const gaps = []
  const strengths = []

  if (!p.name) gaps.push('your name')
  if (!p.values?.length) gaps.push('your values')
  if (!p.fears?.length) gaps.push('your fears')
  if (!p.goals?.length) gaps.push('your goals')
  if (!p.decisionStyle) gaps.push('how you make decisions')
  if (!p.coreBeliefs?.length) gaps.push('your core beliefs')

  if (p.values?.length >= 2) strengths.push('values')
  if (p.fears?.length >= 2) strengths.push('fears')
  if (p.goals?.length >= 2) strengths.push('goals')
  if (p.emotionalPatterns?.length >= 2) strengths.push('emotional patterns')
  if (graph.topConcepts?.length >= 10) strengths.push('recurring themes')
  if (p.decisionStyle) strengths.push('decision style')

  const knowledgeScore = Math.min(100, Math.round((strengths.length / 6) * 100))
  const canBeWiser = knowledgeScore >= 33
  const confidence = knowledgeScore < 20 ? 'low' : knowledgeScore < 60 ? 'medium' : 'high'

  return { gaps, strengths, knowledgeScore, canBeWiser, confidence }
}

export const extractProfileUpdate = (parsed, currentProfile) => {
  const updated = { ...currentProfile }
  const lower = parsed.raw.toLowerCase()
  const tokens = parsed.tokens

  // Name extraction
  const namePatterns = [/my name is (\w+)/i, /i'm (\w+)/i, /call me (\w+)/i]
  for (const pattern of namePatterns) {
    const match = parsed.raw.match(pattern)
    if (match && match[1].length > 1 && !STOPWORDS_SET.has(match[1].toLowerCase())) {
      updated.name = match[1]; break
    }
  }

  // Values
  if (['i value','i believe in','important to me','i care about','matters to me','i stand for'].some(p => lower.includes(p))) {
    const concept = tokens.find(t => t.length > 3 && !(updated.values||[]).includes(t))
    if (concept) updated.values = [...(updated.values||[]), concept].slice(-10)
  }

  // Fears
  if (["i'm afraid","i fear","scared of","terrified","worried about","anxiety about","i dread","i can't lose"].some(p => lower.includes(p))) {
    const concept = tokens.find(t => t.length > 3 && !(updated.fears||[]).includes(t))
    if (concept) updated.fears = [...(updated.fears||[]), concept].slice(-10)
  }

  // Goals
  if (["i want to","my goal","i hope to","i dream of","i'm trying to","i plan to","someday i","i'm working toward"].some(p => lower.includes(p))) {
    const concept = tokens.find(t => t.length > 3 && !(updated.goals||[]).includes(t))
    if (concept) updated.goals = [...(updated.goals||[]), concept].slice(-10)
  }

  // Decision style
  if (!updated.decisionStyle) {
    if (lower.includes('i think') || lower.includes('logically') || lower.includes('rationally'))
      updated.decisionStyle = 'analytical — you tend to think before feeling'
    else if (lower.includes('i feel') || lower.includes('gut') || lower.includes('intuition'))
      updated.decisionStyle = 'intuitive — you trust your gut more than logic'
    else if (lower.includes('what others') || lower.includes('people think') || lower.includes('told me'))
      updated.decisionStyle = 'relational — others\' opinions shape your choices'
  }

  // Emotional patterns
  if (parsed.mood !== 'neutral') {
    const existing = updated.emotionalPatterns || []
    if (!existing.includes(parsed.mood))
      updated.emotionalPatterns = [...existing, parsed.mood].slice(-8)
  }

  // Recurring themes
  if (parsed.concepts.length > 0)
    updated.recurringThemes = [...new Set([...(updated.recurringThemes||[]), ...parsed.concepts.slice(0,2)])].slice(-12)

  return updated
}
