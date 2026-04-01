// ECHO Lexical Parser — Module 1
// Reads what you write. Extracts emotion, intent, topics, urgency, subtext.

const STOPWORDS = new Set(['i','me','my','the','a','an','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could','should','may','might','can',
  'to','of','in','on','at','for','with','by','from','as','that','this','it','he','she',
  'they','we','you','and','or','but','so','if','then','when','where','who','what','how',
  'why','not','no','yes','up','down','out','just','also','very','too','more','all','any',
  'some','your','our','their','his','her','its','am','get','got','go','come','know','think',
  'want','need','feel','see','say','tell','make','take','give','use','find','let','put'])

const LEXICON = {
  emotions: {
    joy:       ['happy','joy','excited','thrilled','amazing','wonderful','great','love','elated','grateful','blessed','fantastic','awesome','delighted','glad','pleased','euphoric'],
    sadness:   ['sad','unhappy','depressed','down','blue','miserable','crying','tears','hurt','broken','lost','empty','lonely','grief','sorrow','heartbroken','devastated','numb'],
    fear:      ['afraid','scared','fear','anxious','worried','nervous','terrified','panic','dread','uneasy','apprehensive','overwhelmed','stressed','tense','uncertain'],
    anger:     ['angry','mad','furious','rage','frustrated','annoyed','irritated','resentful','bitter','hate','disgusted','outraged','livid','upset','betrayed'],
    confusion: ['confused','unsure','uncertain','unclear','stuck','torn','conflicted','undecided','puzzled','questioning','lost'],
    hope:      ['hope','hopeful','maybe','possibility','potential','dream','wish','aspire','imagine','someday','trying','looking forward'],
    love:      ['love','care','cherish','adore','miss','connection','relationship','together','family','friend','partner','close','bond','trust'],
    shame:     ['ashamed','embarrassed','guilty','regret','mistake','failed','failure','worthless','stupid','pathetic','weak','disappointing'],
  },
  intents: {
    seeking_advice:  ['should i','what do i','how do i','can i','is it okay','do you think','what would you','help me','advice','guidance','opinion','suggest'],
    venting:         ["i just","i can't","i'm so","i feel","it's not fair","why does","nobody","always","never","everything","nothing","i hate","i'm done"],
    reflecting:      ["i've been thinking","lately","recently","i realize","i noticed","i wonder","looking back","in hindsight","i guess","i suppose"],
    celebrating:     ['i did it','i got','i finally','i passed','i achieved','great news','good news',"i'm proud",'success','worked out'],
    questioning:     ['why','what if','does it','will i','makes sense','meaning','purpose','point','reason','worth','important'],
    planning:        ["i want to","i'm going to",'my goal',"i plan","i'm thinking about",'i will','next step','working on','trying to','focusing on'],
  },
  urgency: ['urgent','emergency','crisis','desperate','help','please','now','immediately','serious','critical','must','have to',"can't wait",'right now','today'],
  depth:   ['actually','honestly','truth','real','really','deep down','part of me',"i've never","never told",'secret','hard to say','difficult','vulnerable','admit'],
}

export const tokenize = (text) =>
  text.toLowerCase().replace(/[^a-z\s']/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w))

export const parseInput = (text) => {
  const lower = text.toLowerCase()
  const tokens = tokenize(text)

  // Emotion scoring
  const emotionScores = {}
  for (const [emotion, words] of Object.entries(LEXICON.emotions)) {
    emotionScores[emotion] = words.filter(w => lower.includes(w)).length
  }
  const topEmotion = Object.entries(emotionScores).sort((a, b) => b[1] - a[1])[0]
  const mood = topEmotion[1] > 0 ? topEmotion[0] : 'neutral'

  // Intent scoring
  const intentScores = {}
  for (const [intent, phrases] of Object.entries(LEXICON.intents)) {
    intentScores[intent] = phrases.filter(p => lower.includes(p)).length
  }
  const topIntent = Object.entries(intentScores).sort((a, b) => b[1] - a[1])[0]
  const intent = topIntent[1] > 0 ? topIntent[0] : 'sharing'

  const urgency  = LEXICON.urgency.some(w => lower.includes(w))
  const isDeep   = LEXICON.depth.some(w => lower.includes(w))
  const isQuestion = text.includes('?')
  const concepts = tokens.filter(t => t.length > 3).slice(0, 8)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3)
  const complexity = sentences.length > 4 ? 'high' : sentences.length > 2 ? 'medium' : 'low'

  return { mood, intent, urgency, isDeep, isQuestion, concepts, complexity, tokens, raw: text }
}
