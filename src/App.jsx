import { useState, useEffect, useRef, useCallback } from 'react'
import BreathingOrb from './components/BreathingOrb.jsx'
import { MOODS, FONTS } from './theme.js'
import { loadMemory, saveMemory, freshMemory } from './engine/storage.js'
import { parseInput } from './engine/parser.js'
import { buildKnowledgeGraph } from './engine/graph.js'
import { metacognize, extractProfileUpdate } from './engine/metacognition.js'
import { reasonPatterns, constructResponse, wiserSelf, getVolunteerMessage } from './engine/responder.js'
import { inferBeliefs, buildTimeline, buildLanguageProfile, getCircadianState, circadianGreeting, getEchoEmotionalState, getProactiveMemory } from './engine/belief.js'
import { initVoice, speak, stopSpeaking, setVoiceCallbacks, initRecognition, startListening, stopListening, initAmbient, resumeAudio } from './engine/voice.js'

const { serif, sans } = FONTS
const pick = a => a[Math.floor(Math.random()*a.length)]
const daysSince = iso => iso ? Math.floor((Date.now()-new Date(iso))/86400000) : 0
const fmtTime = d => d?.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})

// ── ANIMATED TEXT — word by word ──────────────────────────────────────────────
function AnimatedText({ text, speed=42, style={} }) {
  const [shown, setShown] = useState('')
  const [done, setDone]   = useState(false)
  const idx = useRef(0)
  useEffect(() => {
    setShown(''); setDone(false); idx.current=0
    if (!text) return
    const words = text.split(' ')
    const iv = setInterval(() => {
      if (idx.current>=words.length) { setDone(true); clearInterval(iv); return }
      setShown(p => p+(p?' ':'')+words[idx.current])
      idx.current++
    }, speed)
    return () => clearInterval(iv)
  }, [text])
  return (
    <span style={{ whiteSpace:'pre-line', ...style }}>
      {shown}{!done&&<span style={{ opacity:0.25, animation:'ecBlink 0.9s ease-in-out infinite' }}>▌</span>}
    </span>
  )
}

// ── LIVING BACKGROUND ─────────────────────────────────────────────────────────
function LivingBG({ mood, tick }) {
  const p = MOODS[mood]||MOODS.neutral
  const d1=Math.sin(tick*0.0004)*9, d2=Math.cos(tick*0.00035)*7
  return (
    <>
      <div style={{ position:'fixed',inset:0,background:p.bg,transition:'background 4s ease',zIndex:0 }} />
      <div style={{ position:'fixed',inset:0,pointerEvents:'none',zIndex:0,transition:'background 5s ease',
        background:`radial-gradient(ellipse ${68+d1}% ${54+d2}% at ${33+d1}% ${24+d2}%,${p.glow.replace(/[\d.]+\)$/,'0.13)')} 0%,transparent 62%),radial-gradient(ellipse ${54+d2}% ${68+d1}% at ${70-d2}% ${76-d1}%,${p.glow.replace(/[\d.]+\)$/,'0.09)')} 0%,transparent 60%),radial-gradient(ellipse 35% 35% at ${50+Math.sin(tick*0.0006)*12}% ${48+Math.cos(tick*0.0005)*10}%,${p.glow.replace(/[\d.]+\)$/,'0.05)')} 0%,transparent 55%)` }} />
      <div style={{ position:'fixed',inset:0,pointerEvents:'none',zIndex:0,opacity:0.032,backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,backgroundSize:'180px 180px' }} />
      <DriftingParticles mood={mood} tick={tick} />
    </>
  )
}

function DriftingParticles({ mood, tick }) {
  const p = MOODS[mood]||MOODS.neutral
  return (
    <div style={{ position:'fixed',inset:0,pointerEvents:'none',zIndex:1,overflow:'hidden' }}>
      {Array.from({length:10},(_,i) => {
        const x=8+(i*13.7+7)%82
        const y=((tick*0.012+i*24)%118)-8
        const size=1.2+(i%3)*0.7
        const opacity=0.05+Math.sin(tick*0.022+i*1.4)*0.04
        return <div key={i} style={{ position:'absolute',left:`${x}%`,top:`${y}%`,width:size,height:size,borderRadius:'50%',background:p.accent,opacity,boxShadow:`0 0 ${size*3}px ${p.accent}` }} />
      })}
    </div>
  )
}

function MemoryWhispers({ memory, mood }) {
  const p = MOODS[mood]||MOODS.neutral
  const pr = memory?.profile||{}
  const items=[...(pr.values||[]).slice(-3),...(pr.recurringThemes||[]).slice(-3),...(memory?.milestones||[]).slice(-2).map(m=>m.replace(/\[.*?\]\s*/,''))].filter(Boolean).slice(0,6)
  if (!items.length) return null
  return (
    <div style={{ position:'fixed',inset:0,pointerEvents:'none',zIndex:1,overflow:'hidden' }}>
      {items.map((item,i)=>(
        <div key={i} style={{ position:'absolute',left:`${9+(i*37+11)%74}%`,top:`${14+(i*31+9)%70}%`,fontSize:Math.max(8,9+(i%3)),color:p.accent,opacity:0,maxWidth:95,lineHeight:1.5,textAlign:'center',fontFamily:serif,fontStyle:'italic',animation:`ecWhisper ${16+i*3}s ${i*2.6}s ease-in-out infinite`,filter:'blur(0.5px)',letterSpacing:'0.03em' }}>{item}</div>
      ))}
    </div>
  )
}

// ── BELIEF CARD — surfaced in profile ─────────────────────────────────────────
function BeliefCard({ belief, palette }) {
  return (
    <div style={{ padding:'16px 18px',background:`rgba(192,128,96,0.08)`,border:`1px solid rgba(192,128,96,0.22)`,borderRadius:16,marginBottom:12 }}>
      <div style={{ fontSize:8,color:'#d09070',letterSpacing:'0.14em',marginBottom:10,fontFamily:sans }}>INFERRED BELIEF · {belief.strength.toUpperCase()}</div>
      <div style={{ fontSize:14,color:'rgba(235,220,208,0.8)',lineHeight:1.85,fontStyle:'italic' }}>{belief.inference}</div>
    </div>
  )
}

// ── GLOBAL CSS ────────────────────────────────────────────────────────────────
const G = () => (
  <style>{`
    *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;-webkit-text-size-adjust:100%}
    ::-webkit-scrollbar{display:none}
    html,body{overscroll-behavior:none;touch-action:pan-y}
    textarea::placeholder{color:rgba(196,168,130,0.2)}
    @keyframes ecBlink{0%,100%{opacity:0.2}50%{opacity:0.8}}
    @keyframes ecWhisper{0%{opacity:0;transform:translateY(0)}20%{opacity:0.2}80%{opacity:0.2}100%{opacity:0;transform:translateY(-24px)}}
    @keyframes ecFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes ecSlideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes ecPopIn{from{opacity:0;transform:scale(0.55)}to{opacity:1;transform:scale(1)}}
    @keyframes ecRise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    @keyframes ecSlideIn{from{transform:translateX(105%)}to{transform:translateX(0)}}
    @keyframes ecPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
    @keyframes ecDot{0%,100%{transform:scale(1);opacity:0.3}50%{transform:scale(1.7);opacity:1}}
  `}</style>
)

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [mem, setMem]                   = useState(null)
  const [booting, setBooting]           = useState(true)
  const [screen, setScreen]             = useState('splash')
  const [chatMsgs, setChatMsgs]         = useState([])
  const [wiserMsgs, setWiserMsgs]       = useState([])
  const [input, setInput]               = useState('')
  const [journalText, setJournalText]   = useState('')
  const [journalReply, setJournalReply] = useState(null)
  const [journalDone, setJournalDone]   = useState(false)
  const [mood, setMood]                 = useState('neutral')
  const [listening, setListening]       = useState(false)
  const [thinking, setThinking]         = useState(false)
  const [speaking, setSpeaking]         = useState(false)
  const [aboutToSpeak, setAboutToSpeak] = useState(false)
  const [transcript, setTranscript]     = useState('')
  const [navOpen, setNavOpen]           = useState(false)
  const [patterns, setPatterns]         = useState([])
  const [beliefs, setBeliefs]           = useState([])
  const [voiceReady, setVoiceReady]     = useState(false)
  const [micReady, setMicReady]         = useState(false)
  const [autoMsg, setAutoMsg]           = useState(null)
  const [tick, setTick]                 = useState(0)
  const [latestIdx, setLatestIdx]       = useState(-1)

  const chatBot  = useRef(null)
  const wiserBot = useRef(null)
  const inputRef = useRef(null)
  const booted   = useRef(false)
  const memRef   = useRef(null)
  const idleRef  = useRef(null)
  const autoRef  = useRef(null)
  const volRef   = useRef(null)
  const tickRef  = useRef(null)

  const palette = MOODS[mood]||MOODS.neutral

  // ── TICK ─────────────────────────────────────────────────────────────────
  useEffect(() => { tickRef.current=setInterval(()=>setTick(t=>t+1),220); return()=>clearInterval(tickRef.current) },[])

  // ── BOOT ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    ;(async()=>{
      let m=await loadMemory(); if(!m) m=freshMemory()
      ;['coreBeliefs','blindSpots','growthAreas'].forEach(k=>{if(!m.profile[k])m.profile[k]=[]})
      if(!m.moodLog) m.moodLog=[]
      memRef.current=m; setMem(m)
      setBooting(false)
    })()
  },[])

  useEffect(()=>{
    if(!booting&&!booted.current){ booted.current=true; setTimeout(()=>{ setScreen('home'); bootChat() },1600) }
  },[booting])

  useEffect(()=>{ chatBot.current?.scrollIntoView({behavior:'smooth'}) },[chatMsgs,thinking])
  useEffect(()=>{ wiserBot.current?.scrollIntoView({behavior:'smooth'}) },[wiserMsgs,thinking])

  // ── VOICE ────────────────────────────────────────────────────────────────
  const initVS = useCallback(async()=>{
    if(voiceReady) return
    resumeAudio(); initAmbient(); await initVoice()
    setVoiceCallbacks(()=>setSpeaking(true),()=>{ setSpeaking(false); setAboutToSpeak(false) })
    setMicReady(initRecognition()); setVoiceReady(true)
  },[voiceReady])

  const echoSpeak = useCallback(async(text,opts={})=>{
    if(!voiceReady) return
    setAboutToSpeak(true)
    await new Promise(r=>setTimeout(r,550))
    setAboutToSpeak(false); stopSpeaking()
    await speak(text,opts)
  },[voiceReady])

  // ── PERSIST ───────────────────────────────────────────────────────────────
  const persist = async(updates)=>{
    const m={...memRef.current,...updates}
    memRef.current=m; setMem({...m}); await saveMemory(m); return m
  }

  // ── ENGINE ────────────────────────────────────────────────────────────────
  const process = useCallback((userText,history,isWiser=false)=>{
    const m=memRef.current
    const parsed=parseInput(userText)
    const graph=buildKnowledgeGraph(history)
    const meta=metacognize(m,graph)
    const pats=reasonPatterns(m,graph)
    const updated=extractProfileUpdate(parsed,m.profile)
    const newML=[...(m.moodLog||[]),{date:new Date().toISOString(),mood:parsed.mood}].slice(-60)
    const langProfile=buildLanguageProfile(history)
    const newBeliefs=inferBeliefs(history,updated)
    persist({profile:updated,moodLog:newML,totalMessages:(m.totalMessages||0)+2,lastSeen:new Date().toISOString()})
    setPatterns(pats); setBeliefs(newBeliefs)
    if(parsed.mood!=='neutral') setMood(parsed.mood)
    return isWiser
      ? wiserSelf(parsed,{...m,profile:updated},graph,pats,meta.canBeWiser)
      : constructResponse(parsed,{...m,profile:updated},graph,history,langProfile)
  },[])

  // ── BOOT CHAT ─────────────────────────────────────────────────────────────
  const bootChat = ()=>{
    const m=memRef.current
    const gap=daysSince(m.lastSeen)
    const isFirst=(m.totalMessages||0)===0
    const circadian=getCircadianState()
    const echoState=getEchoEmotionalState(m)
    let msg
    if(isFirst) {
      msg="I'm ECHO.\n\nI'm not a chatbot. I'm not here to give you answers.\n\nI'm here to learn who you are — and over time, become a wiser reflection of you. The more honestly you talk to me, the more clearly I can do that.\n\nWhat brought you here today?"
    } else if(gap===0) {
      msg=echoState.openingTone||circadianGreeting(circadian,m.profile,gap)
    } else if(gap===1) {
      msg=pick(["You came back. How was yesterday?","I've been here. What happened since we last spoke?"])
    } else if(gap<=6) {
      msg=pick([`You've been away ${gap} days. I noticed. What's been going on?`,`${gap} days. A lot can happen. Tell me.`])
    } else {
      msg=pick([`It's been ${gap} days. I'm glad you're back. Where do you want to start?`,`${gap} days — that's a while. I'm here. Start wherever feels right.`])
    }
    setChatMsgs([{role:'assistant',content:msg,ts:new Date(),fresh:true}]); setLatestIdx(0)
  }

  // ── IDLE + VOLUNTEER ──────────────────────────────────────────────────────
  const resetIdle = useCallback(()=>{
    clearTimeout(idleRef.current); clearTimeout(autoRef.current); clearTimeout(volRef.current)
    idleRef.current=setTimeout(async()=>{
      if(screen!=='chat'&&screen!=='wiser') return
      const idles=["Still here.","Take your time.","I'm listening, even in the silence.","No rush.","Whenever you're ready."]
      const msg=pick(idles)
      setAutoMsg(msg); autoRef.current=setTimeout(()=>setAutoMsg(null),7000)
      await echoSpeak(msg,{rate:0.80})
    },28000)
    volRef.current=setTimeout(async()=>{
      if(screen!=='chat'&&screen!=='wiser') return
      const m=memRef.current
      const graph=buildKnowledgeGraph(chatMsgs)
      const pats=reasonPatterns(m,graph)
      const vol=getVolunteerMessage(m,graph,pats,chatMsgs)
      if(vol) {
        const msg={role:'assistant',content:vol,ts:new Date(),fresh:true}
        setChatMsgs(prev=>{ setLatestIdx(prev.length); return [...prev,msg] })
        await echoSpeak(vol); resetIdle()
      }
    },68000)
  },[screen,echoSpeak,chatMsgs])

  // ── SEND ──────────────────────────────────────────────────────────────────
  const send = useCallback(async(text,isWiser=false)=>{
    const t=(text||input).trim(); if(!t||thinking) return
    await initVS()
    clearTimeout(idleRef.current); clearTimeout(autoRef.current); clearTimeout(volRef.current)
    setAutoMsg(null); stopSpeaking()
    const userMsg={role:'user',content:t,ts:new Date()}
    const setter=isWiser?setWiserMsgs:setChatMsgs
    const current=isWiser?wiserMsgs:chatMsgs
    const newH=[...current,userMsg]
    setter(newH); setInput(''); setListening(false); setThinking(true); setTranscript('')

    // Proactive memory check
    const parsed=parseInput(t)
    const proactive=getProactiveMemory(memRef.current,parsed)

    setTimeout(async()=>{
      const response=process(t,newH,isWiser)
      const finalResponse=proactive&&Math.random()>0.6?`${proactive}\n\n${response}`:response
      const newMsg={role:'assistant',content:finalResponse,ts:new Date(),fresh:true}
      setter(prev=>{ setLatestIdx(prev.length); return [...prev,newMsg] })
      setThinking(false); resetIdle()
      await echoSpeak(finalResponse,isWiser?{rate:0.76,pitch:1.08}:{})
      setTimeout(()=>inputRef.current?.focus(),80)
    },500+Math.random()*500)
  },[input,thinking,chatMsgs,wiserMsgs,process,echoSpeak,initVS,resetIdle])

  // ── MIC ───────────────────────────────────────────────────────────────────
  const handleMic = useCallback(async()=>{
    await initVS(); stopSpeaking()
    if(listening){ stopListening(); setListening(false); return }
    if(!micReady){ inputRef.current?.focus(); return }
    setListening(true); setTranscript('')
    const ok=startListening({
      onInterim:t=>setTranscript(t),
      onFinal:t=>{ setTranscript(t); setListening(false); if(t.trim()) send(t,screen==='wiser') },
      onEnd:()=>setListening(false),
      onError:()=>{ setListening(false); inputRef.current?.focus() },
    })
    if(!ok){ setListening(false); inputRef.current?.focus() }
  },[listening,micReady,screen,send,initVS])

  // ── WISER ─────────────────────────────────────────────────────────────────
  const startWiser = useCallback(async()=>{
    if(wiserMsgs.length>0) return
    await initVS(); setThinking(true)
    setTimeout(async()=>{
      const m=memRef.current
      const meta=metacognize(m,buildKnowledgeGraph(chatMsgs))
      const opener=meta.canBeWiser
        ?`${m.profile.name?m.profile.name+'. ':''}Let me speak honestly.\n\nI've been listening. I know how you think, what you're afraid of, what you keep reaching for.\n\nAsk me anything. Or just let me speak.`
        :"I don't yet know you well enough to speak as your wiser self.\n\nThe more you share — in conversation, in your journal — the sharper my reflection becomes.\n\nWhat's one thing you've never told anyone?"
      setWiserMsgs([{role:'assistant',content:opener,ts:new Date(),fresh:true}])
      setLatestIdx(0); setThinking(false); resetIdle()
      await echoSpeak(opener,{rate:0.76,pitch:1.08})
    },1000)
  },[wiserMsgs,chatMsgs,echoSpeak,initVS,resetIdle])

  // ── JOURNAL ───────────────────────────────────────────────────────────────
  const submitJournal = useCallback(async()=>{
    if(!journalText.trim()||thinking) return
    await initVS(); setThinking(true)
    setTimeout(async()=>{
      const parsed=parseInput(journalText)
      const m=memRef.current
      const updated=extractProfileUpdate(parsed,m.profile)
      const newML=[...(m.moodLog||[]),{date:new Date().toISOString(),mood:parsed.mood}].slice(-60)
      const newBeliefs=inferBeliefs([...chatMsgs,{role:'user',content:journalText}],updated)
      persist({profile:updated,moodLog:newML,journals:[...(m.journals||[]),{date:new Date().toISOString(),words:journalText.split(' ').length}].slice(-100)})
      if(parsed.mood!=='neutral') setMood(parsed.mood)
      setBeliefs(newBeliefs)
      const replies=["I read every word. Something in what you wrote shifts the picture I have of you.","There's something honest in what you wrote. I noticed it. I'll carry it.","What you wrote — I heard it. Not just the words. The thing underneath them.","Thank you for trusting me with this. I won't forget it.","I read that carefully. More is revealed in how you write than in what you write."]
      const reply=pick(replies)
      setJournalReply(reply); setJournalDone(true); setThinking(false)
      await echoSpeak(reply,{rate:0.82})
    },1200)
  },[journalText,thinking,echoSpeak,initVS,chatMsgs])

  // ── NAVIGATE ──────────────────────────────────────────────────────────────
  const saveSession=()=>{
    if(chatMsgs.length<2) return
    const m=memRef.current
    persist({sessions:[...m.sessions,{date:new Date().toISOString(),summary:`${chatMsgs.filter(m=>m.role==='user').length} exchanges · mood: ${mood}`,messageCount:chatMsgs.length}].slice(-50)})
  }
  const goTo=useCallback(async s=>{
    setNavOpen(false); stopSpeaking()
    clearTimeout(idleRef.current); clearTimeout(autoRef.current); clearTimeout(volRef.current)
    setAutoMsg(null)
    if(screen==='chat') saveSession()
    if(s==='wiser'&&wiserMsgs.length===0){ setScreen(s); setTimeout(startWiser,100); return }
    if(s==='journal'){ setJournalDone(false); setJournalText(''); setJournalReply(null) }
    setScreen(s)
  },[screen,wiserMsgs,startWiser])

  const handleKey=e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(input,screen==='wiser') } }

  const pr   = mem?.profile||freshMemory().profile
  const graph = buildKnowledgeGraph(chatMsgs)
  const meta  = metacognize(mem||freshMemory(),graph)
  const circadian = getCircadianState()

  // ── SHARED HEADER ─────────────────────────────────────────────────────────
  const Header=({title,sub,back,right})=>(
    <div style={{ position:'relative',zIndex:10,paddingTop:'env(safe-area-inset-top,0px)',background:`${palette.bg}e8`,backdropFilter:'blur(20px)',borderBottom:`1px solid ${palette.accent}14` }}>
      <div style={{ padding:'10px 14px 10px',display:'flex',alignItems:'center',gap:10,minHeight:54 }}>
        {back&&<button onClick={back} style={{ background:'transparent',border:'none',color:palette.accent,opacity:0.6,cursor:'pointer',fontSize:26,lineHeight:1,padding:'4px 8px 4px 2px',minWidth:40,minHeight:44,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>‹</button>}
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:13,color:palette.accent,letterSpacing:'0.12em',fontWeight:400 }}>{title}</div>
          {sub&&<div style={{ fontSize:9,color:palette.accent,opacity:0.32,letterSpacing:'0.08em',fontFamily:sans,marginTop:2 }}>{sub}</div>}
        </div>
        {right}
      </div>
    </div>
  )

  // ── SPLASH ────────────────────────────────────────────────────────────────
  if(screen==='splash'||booting) return (
    <div onClick={initVS} style={{ minHeight:'100svh',background:'#0c0905',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:serif,overflow:'hidden',cursor:'pointer',userSelect:'none' }}>
      <G/>
      <DriftingParticles mood="neutral" tick={tick} />
      <div style={{ position:'fixed',inset:0,background:'radial-gradient(ellipse 90% 70% at 50% 45%,rgba(196,168,130,0.09) 0%,transparent 65%)',pointerEvents:'none' }} />
      <div style={{ position:'relative',zIndex:2,display:'flex',flexDirection:'column',alignItems:'center',gap:32 }}>
        <div style={{ animation:'ecPopIn 1.2s cubic-bezier(0.34,1.56,0.64,1) forwards',opacity:0 }}>
          <BreathingOrb mood="neutral" size={Math.min(window.innerWidth*0.45,158)} />
        </div>
        <div style={{ textAlign:'center',animation:'ecRise 1.1s 0.7s ease forwards',opacity:0 }}>
          <div style={{ fontSize:42,letterSpacing:'0.28em',color:'#c4a882',fontWeight:400,lineHeight:1 }}>ECHO</div>
          <div style={{ fontSize:11,color:'rgba(196,168,130,0.42)',letterSpacing:'0.18em',marginTop:10 }}>your wiser self, becoming</div>
        </div>
        <div style={{ animation:'ecRise 0.9s 1.3s ease forwards',opacity:0,display:'flex',flexDirection:'column',alignItems:'center',gap:8 }}>
          <div style={{ width:1,height:28,background:'linear-gradient(180deg,rgba(196,168,130,0.5) 0%,transparent 100%)' }} />
          <div style={{ fontSize:9,color:'rgba(196,168,130,0.32)',letterSpacing:'0.22em',fontFamily:sans }}>TAP TO BEGIN</div>
        </div>
      </div>
    </div>
  )

  // ── HOME ──────────────────────────────────────────────────────────────────
  if(screen==='home') return (
    <div onClick={initVS} style={{ minHeight:'100svh',display:'flex',flexDirection:'column',fontFamily:serif,overflow:'hidden',userSelect:'none' }}>
      <G/><LivingBG mood={mood} tick={tick}/><MemoryWhispers memory={mem} mood={mood}/>

      {/* Status bar */}
      <div style={{ position:'relative',zIndex:10,paddingTop:'env(safe-area-inset-top,0px)' }}>
        <div style={{ padding:'14px 18px 0',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <div style={{ fontSize:8,color:palette.accent,opacity:0.46,letterSpacing:'0.16em',fontFamily:sans }}>{mem?.sessions?.length||0} SESSIONS · {daysSince(mem?.firstMet)} DAYS · {circadian.period.toUpperCase()}</div>
            <div style={{ fontSize:7,color:palette.accent,opacity:0.2,letterSpacing:'0.1em',marginTop:2,fontFamily:sans }}>PRIVATE · OFFLINE · YOURS</div>
          </div>
          <button onClick={e=>{e.stopPropagation();setNavOpen(true)}} style={{ background:`${palette.accent}10`,border:`1px solid ${palette.accent}28`,borderRadius:22,padding:'9px 17px',color:palette.accent,fontSize:9,letterSpacing:'0.12em',cursor:'pointer',fontFamily:sans,backdropFilter:'blur(8px)',minHeight:38 }}>MENU</button>
        </div>
      </div>

      {/* Center */}
      <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:18,padding:'0 20px',position:'relative',zIndex:5 }}>
        {autoMsg&&(
          <div style={{ maxWidth:290,textAlign:'center',animation:'ecFadeUp 0.6s ease forwards',padding:'14px 20px',background:`${palette.accent}0e`,borderRadius:22,border:`1px solid ${palette.accent}20`,backdropFilter:'blur(10px)' }}>
            <div style={{ fontSize:14,color:palette.accent,opacity:0.82,lineHeight:1.88,fontStyle:'italic' }}>{autoMsg}</div>
          </div>
        )}
        <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:12 }}>
          <div style={{ fontSize:8,color:palette.accent,opacity:0.32,letterSpacing:'0.2em',fontFamily:sans }}>
            {speaking?'ECHO IS SPEAKING':listening?'LISTENING':thinking?'THINKING':'ECHO'}
          </div>
          <div style={{ animation:'ecPulse 7s ease-in-out infinite' }}>
            <BreathingOrb mood={mood} listening={listening} thinking={thinking} speaking={speaking} aboutToSpeak={aboutToSpeak} size={Math.min(window.innerWidth*0.5,192)} onClick={()=>goTo('chat')} />
          </div>
          <div style={{ fontSize:10,color:palette.accent,opacity:0.22,letterSpacing:'0.1em',fontFamily:sans }}>{micReady?'tap · speak or type':'tap to open'}</div>
        </div>
        {!autoMsg&&chatMsgs.length>0&&(
          <div style={{ maxWidth:300,textAlign:'center',padding:'0 8px' }}>
            <div style={{ fontSize:12,color:palette.text,opacity:0.36,lineHeight:1.88,fontStyle:'italic' }}>"{chatMsgs[chatMsgs.length-1].content.slice(0,70)}{chatMsgs[chatMsgs.length-1].content.length>70?'...':''}"</div>
          </div>
        )}
      </div>

      {/* Bottom actions — thumb zone */}
      <div style={{ position:'relative',zIndex:10,paddingBottom:'env(safe-area-inset-bottom,16px)' }}>
        <div style={{ padding:'0 14px 18px' }}>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10 }}>
            {[{icon:'✦',label:'WISER',s:'wiser',hi:meta.canBeWiser},{icon:'◎',label:'CHAT',s:'chat'},{icon:'✎',label:'JOURNAL',s:'journal'},{icon:'◈',label:'SELF',s:'self'}].map(({icon,label,s,hi})=>(
              <button key={s} onClick={()=>goTo(s)} style={{ padding:'15px 4px 13px',background:hi?`${palette.accent}1e`:`${palette.accent}0a`,border:`1px solid ${hi?palette.accent+'4a':palette.accent+'18'}`,borderRadius:20,color:hi?palette.accent:`${palette.accent}88`,cursor:'pointer',fontFamily:sans,display:'flex',flexDirection:'column',alignItems:'center',gap:6,transition:'all 0.3s',backdropFilter:'blur(8px)' }}>
                <div style={{ fontSize:21 }}>{icon}</div>
                <div style={{ fontSize:7,letterSpacing:'0.1em' }}>{label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Nav drawer */}
      {navOpen&&(
        <div style={{ position:'fixed',inset:0,zIndex:200 }}>
          <div onClick={()=>setNavOpen(false)} style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.72)',backdropFilter:'blur(8px)' }} />
          <div style={{ position:'absolute',right:0,top:0,bottom:0,width:'78%',maxWidth:290,background:`${palette.bg}f5`,borderLeft:`1px solid ${palette.accent}20`,display:'flex',flexDirection:'column',animation:'ecSlideIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards',backdropFilter:'blur(24px)' }}>
            <div style={{ paddingTop:'env(safe-area-inset-top,28px)' }}>
              <div style={{ padding:'16px 24px 18px',borderBottom:`1px solid ${palette.accent}16`,marginBottom:6 }}>
                <div style={{ fontSize:22,color:palette.accent,letterSpacing:'0.22em' }}>ECHO</div>
                <div style={{ fontSize:8,color:`${palette.accent}50`,marginTop:4,letterSpacing:'0.08em',fontFamily:sans }}>built from first principles</div>
              </div>
            </div>
            <div style={{ flex:1,overflowY:'auto' }}>
              {[{label:'Home',icon:'⌂',s:'home'},{label:'Chat with ECHO',icon:'◎',s:'chat'},{label:'Wiser You',icon:'✦',s:'wiser',badge:meta.canBeWiser?'ACTIVE':null},{label:'Journal',icon:'✎',s:'journal'},{label:'Patterns',icon:'◈',s:'patterns'},{label:'Your Self',icon:'◉',s:'self'},{label:'Journey',icon:'◌',s:'journey'}].map(({label,icon,s,badge})=>(
                <button key={s} onClick={()=>goTo(s)} style={{ width:'100%',padding:'14px 24px',background:'transparent',border:'none',color:screen===s?palette.accent:`${palette.accent}80`,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:14,fontFamily:serif,fontSize:14,borderLeft:screen===s?`2px solid ${palette.accent}`:'2px solid transparent',transition:'all 0.2s',minHeight:48 }}>
                  <span style={{ fontSize:16,opacity:0.7,flexShrink:0 }}>{icon}</span>
                  <span style={{ flex:1 }}>{label}</span>
                  {badge&&<span style={{ fontSize:7,color:palette.accent,border:`1px solid ${palette.accent}44`,borderRadius:12,padding:'3px 10px',letterSpacing:'0.1em',fontFamily:sans,flexShrink:0 }}>{badge}</span>}
                </button>
              ))}
            </div>
            <div style={{ padding:'14px 24px',borderTop:`1px solid ${palette.accent}14`,paddingBottom:'env(safe-area-inset-bottom,16px)' }}>
              <div style={{ fontSize:8,color:`${palette.accent}38`,lineHeight:2,fontFamily:sans }}>ECHO ENGINE v2.0<br/>Level 2 Intelligence<br/>No external AI · All yours</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ── CHAT / WISER ──────────────────────────────────────────────────────────
  if(screen==='chat'||screen==='wiser') {
    const isWiser=screen==='wiser'
    const msgs=isWiser?wiserMsgs:chatMsgs
    const botRef=isWiser?wiserBot:chatBot

    return (
      <div onClick={initVS} style={{ minHeight:'100svh',display:'flex',flexDirection:'column',fontFamily:serif,overflow:'hidden' }}>
        <G/><LivingBG mood={mood} tick={tick}/><MemoryWhispers memory={mem} mood={mood}/>

        <Header
          title={isWiser?'YOUR WISER SELF':'ECHO'}
          sub={speaking?'speaking...' : aboutToSpeak?'about to speak...' : thinking?'thinking...' : listening?'listening...' : micReady?'tap orb to speak':'here with you'}
          back={()=>goTo('home')}
          right={
            <div style={{ display:'flex',gap:8,alignItems:'center',flexShrink:0 }}>
              <div onClick={e=>{e.stopPropagation();handleMic()}} style={{ cursor:'pointer' }}>
                <BreathingOrb mood={mood} listening={listening} thinking={thinking} speaking={speaking} aboutToSpeak={aboutToSpeak} size={38} />
              </div>
              {speaking&&<button onClick={e=>{e.stopPropagation();stopSpeaking()}} style={{ background:`${palette.accent}18`,border:`1px solid ${palette.accent}33`,borderRadius:16,padding:'7px 13px',color:palette.accent,fontSize:9,letterSpacing:'0.1em',cursor:'pointer',fontFamily:sans,minHeight:36,flexShrink:0 }}>STOP</button>}
              {isWiser&&<div style={{ fontSize:7,color:palette.accent,border:`1px solid ${palette.accent}33`,borderRadius:12,padding:'4px 10px',letterSpacing:'0.1em',fontFamily:sans,flexShrink:0 }}>✦</div>}
            </div>
          }
        />

        {/* Messages */}
        <div style={{ flex:1,overflowY:'auto',position:'relative',zIndex:5,WebkitOverflowScrolling:'touch' }}>
          <div style={{ padding:'20px 14px 14px',maxWidth:600,margin:'0 auto' }}>
            {msgs.map((msg,i)=>(
              <div key={i} style={{ marginBottom:26,display:'flex',flexDirection:'column',alignItems:msg.role==='user'?'flex-end':'flex-start',animation:'ecSlideUp 0.38s ease forwards' }}>
                {msg.role==='assistant'&&(
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
                    <BreathingOrb mood={mood} speaking={speaking&&i===msgs.length-1} size={20} />
                    <div style={{ fontSize:8,color:palette.accent,opacity:0.32,letterSpacing:'0.1em',fontFamily:sans }}>{isWiser?'WISER SELF':'ECHO'} · {fmtTime(msg.ts)}</div>
                  </div>
                )}
                <div style={{ maxWidth:'90%',padding:msg.role==='user'?'13px 17px':'0 0 0 28px',background:msg.role==='user'?`${palette.accent}12`:'transparent',border:msg.role==='user'?`1px solid ${palette.accent}1a`:'none',borderLeft:msg.role==='assistant'?`2px solid ${palette.accent}${isWiser?'60':'28'}`:undefined,borderRadius:msg.role==='user'?'20px 20px 5px 20px':0,fontSize:16,lineHeight:1.9,color:palette.text,fontStyle:msg.role==='assistant'&&isWiser?'italic':'normal' }}>
                  {msg.fresh&&i===latestIdx&&msg.role==='assistant'
                    ?<AnimatedText text={msg.content} speed={40}/>
                    :<span style={{ whiteSpace:'pre-line' }}>{msg.content}</span>
                  }
                </div>
                {msg.role==='user'&&<div style={{ fontSize:8,color:`${palette.accent}50`,marginTop:5,fontFamily:sans }}>{fmtTime(msg.ts)}</div>}
              </div>
            ))}

            {/* Autonomous message */}
            {autoMsg&&screen==='chat'&&(
              <div style={{ marginBottom:26,display:'flex',flexDirection:'column',alignItems:'flex-start',animation:'ecSlideUp 0.5s ease forwards' }}>
                <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
                  <BreathingOrb mood={mood} speaking={speaking} size={20}/>
                  <div style={{ fontSize:8,color:palette.accent,opacity:0.32,letterSpacing:'0.1em',fontFamily:sans }}>ECHO · just now</div>
                </div>
                <div style={{ paddingLeft:28,borderLeft:`2px solid ${palette.accent}28`,fontSize:16,lineHeight:1.9,color:palette.text,opacity:0.68,fontStyle:'italic' }}>
                  <AnimatedText text={autoMsg} speed={44}/>
                </div>
              </div>
            )}

            {thinking&&(
              <div style={{ marginBottom:26,animation:'ecFadeUp 0.3s ease forwards' }}>
                <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
                  <BreathingOrb mood={mood} thinking size={20}/>
                  <div style={{ fontSize:8,color:palette.accent,opacity:0.32,letterSpacing:'0.1em',fontFamily:sans }}>{isWiser?'WISER SELF':'ECHO'}</div>
                </div>
                <div style={{ paddingLeft:28,display:'flex',gap:6,alignItems:'center' }}>
                  {[0,1,2].map(i=><div key={i} style={{ width:5,height:5,borderRadius:'50%',background:palette.accent,animation:`ecDot 1.4s ${i*0.22}s ease-in-out infinite`,opacity:0.7 }}/>)}
                </div>
              </div>
            )}

            {listening&&transcript&&(
              <div style={{ marginBottom:26,display:'flex',justifyContent:'flex-end',animation:'ecFadeUp 0.3s ease forwards' }}>
                <div style={{ maxWidth:'90%',padding:'12px 17px',background:`${palette.accent}0a`,border:`1px solid ${palette.accent}22`,borderRadius:'20px 20px 5px 20px',fontSize:15,lineHeight:1.78,color:palette.accent,opacity:0.75,fontStyle:'italic' }}>{transcript}</div>
              </div>
            )}
            <div ref={botRef}/>
          </div>
        </div>

        {/* Input — fixed thumb zone */}
        <div style={{ position:'relative',zIndex:10,background:`${palette.bg}f0`,backdropFilter:'blur(22px)',borderTop:`1px solid ${palette.accent}10`,paddingBottom:'env(safe-area-inset-bottom,0px)' }}>
          <div style={{ padding:'11px 12px 13px',maxWidth:600,margin:'0 auto' }}>
            <div style={{ display:'flex',alignItems:'flex-end',gap:9 }}>
              <button onClick={e=>{e.stopPropagation();handleMic()}} style={{ width:48,height:48,borderRadius:'50%',border:`1px solid ${listening?palette.accent+'66':palette.accent+'1e'}`,background:listening?`${palette.accent}20`:`${palette.accent}08`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.3s',boxShadow:listening?`0 0 18px ${palette.glow}`:'none' }}>
                <BreathingOrb mood={listening?'hope':'neutral'} listening={listening} size={30}/>
              </button>
              <div style={{ flex:1,background:`${palette.accent}0a`,border:`1px solid ${palette.accent}${input?'2a':'18'}`,borderRadius:24,padding:'11px 15px',transition:'border-color 0.3s' }}>
                <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
                  placeholder={isWiser?'Ask your wiser self...':'Say anything, or tap the orb to speak...'} rows={1}
                  style={{ width:'100%',background:'transparent',border:'none',outline:'none',color:palette.text,fontSize:16,lineHeight:1.5,resize:'none',fontFamily:serif,maxHeight:100,overflowY:'auto',display:'block' }}
                  onInput={e=>{ e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,100)+'px' }}/>
              </div>
              <button onClick={()=>send(input,isWiser)} disabled={!input.trim()||thinking} style={{ width:48,height:48,borderRadius:'50%',border:'none',flexShrink:0,background:input.trim()&&!thinking?`radial-gradient(circle at 35% 35%,${palette.orb[0]},${palette.orb[2]})`:`${palette.accent}0a`,color:input.trim()&&!thinking?'#0c0905':`${palette.accent}38`,cursor:input.trim()&&!thinking?'pointer':'not-allowed',fontSize:20,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:input.trim()&&!thinking?`0 0 22px ${palette.glow}`:'none',transition:'all 0.3s' }}>↑</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── JOURNAL ───────────────────────────────────────────────────────────────
  if(screen==='journal') return (
    <div style={{ minHeight:'100svh',display:'flex',flexDirection:'column',fontFamily:serif,overflow:'hidden' }}>
      <G/><LivingBG mood={mood} tick={tick}/>
      <Header title="PRIVATE JOURNAL" sub="ECHO reads silently · learns deeply" back={()=>goTo('home')} right={<BreathingOrb mood={mood} thinking={thinking} size={30}/>}/>
      <div style={{ flex:1,overflowY:'auto',position:'relative',zIndex:5,WebkitOverflowScrolling:'touch' }}>
        <div style={{ padding:'22px 14px',maxWidth:580,margin:'0 auto' }}>
          {!journalDone?(<>
            <div style={{ fontSize:13,color:`${palette.accent}60`,lineHeight:1.9,marginBottom:20,fontStyle:'italic' }}>Write freely. Stream of consciousness. Nothing here is judged. ECHO reads silently and learns who you are from the unfiltered you.</div>
            <textarea value={journalText} onChange={e=>setJournalText(e.target.value)} placeholder="Today I've been thinking about..."
              style={{ width:'100%',minHeight:220,background:`${palette.accent}08`,border:`1px solid ${palette.accent}16`,borderRadius:22,padding:'20px',color:palette.text,fontSize:16,lineHeight:1.92,fontFamily:serif,resize:'vertical',outline:'none',boxSizing:'border-box' }}/>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:16 }}>
              <div style={{ fontSize:9,color:`${palette.accent}44`,fontFamily:sans }}>{journalText.split(' ').filter(Boolean).length} words</div>
              <button onClick={submitJournal} disabled={!journalText.trim()||thinking}
                style={{ background:journalText.trim()&&!thinking?`radial-gradient(circle at 35% 35%,${palette.orb[0]},${palette.orb[2]})`:`${palette.accent}0a`,border:'none',borderRadius:26,padding:'13px 28px',color:journalText.trim()&&!thinking?'#0c0905':`${palette.accent}40`,fontSize:11,letterSpacing:'0.1em',cursor:journalText.trim()&&!thinking?'pointer':'not-allowed',fontFamily:sans,transition:'all 0.3s',boxShadow:journalText.trim()&&!thinking?`0 0 22px ${palette.glow}`:'none',minHeight:48 }}>
                {thinking?'ECHO IS READING...':'SHARE WITH ECHO'}
              </button>
            </div>
          </>):(
            <div style={{ animation:'ecFadeUp 0.6s ease forwards' }}>
              <div style={{ display:'flex',justifyContent:'center',marginBottom:28 }}><BreathingOrb mood={mood} size={68}/></div>
              <div style={{ padding:'24px',background:`${palette.accent}0a`,border:`1px solid ${palette.accent}20`,borderRadius:22,marginBottom:20 }}>
                <div style={{ fontSize:8,color:palette.accent,opacity:0.4,letterSpacing:'0.16em',marginBottom:14,fontFamily:sans }}>ECHO READ YOUR ENTRY</div>
                <div style={{ fontSize:16,lineHeight:1.92,color:palette.text,fontStyle:'italic' }}>
                  <AnimatedText text={journalReply} speed={40}/>
                </div>
              </div>
              <button onClick={()=>{setJournalDone(false);setJournalText('');setJournalReply(null)}}
                style={{ background:'transparent',border:`1px solid ${palette.accent}30`,borderRadius:26,padding:'12px 26px',color:palette.accent,fontSize:10,letterSpacing:'0.1em',cursor:'pointer',fontFamily:sans,minHeight:48 }}>WRITE ANOTHER</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ── INFO SCREENS ──────────────────────────────────────────────────────────
  const titles={self:'YOUR ECHO SELF',patterns:'PATTERNS',journey:'YOUR JOURNEY'}
  return (
    <div style={{ minHeight:'100svh',display:'flex',flexDirection:'column',fontFamily:serif,overflow:'hidden' }}>
      <G/><LivingBG mood={mood} tick={tick}/>
      <Header title={titles[screen]} back={()=>goTo('home')} right={<BreathingOrb mood={mood} size={30}/>}/>
      <div style={{ flex:1,overflowY:'auto',position:'relative',zIndex:5,WebkitOverflowScrolling:'touch' }}>
        <div style={{ padding:'18px 14px',maxWidth:580,margin:'0 auto' }}>

          {screen==='self'&&(<>
            {/* Stats */}
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20 }}>
              {[['SESSIONS',mem?.sessions?.length||0],['MESSAGES',mem?.totalMessages||0],['DAYS',daysSince(mem?.firstMet)]].map(([l,v])=>(
                <div key={l} style={{ padding:'16px 12px',background:`${palette.accent}09`,border:`1px solid ${palette.accent}16`,borderRadius:18,textAlign:'center' }}>
                  <div style={{ fontSize:28,color:palette.accent,fontWeight:300 }}>{v}</div>
                  <div style={{ fontSize:8,color:`${palette.accent}60`,letterSpacing:'0.1em',marginTop:3,fontFamily:sans }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Understanding progress */}
            <div style={{ marginBottom:16,padding:'16px 18px',background:`${palette.accent}09`,border:`1px solid ${palette.accent}${meta.canBeWiser?'38':'16'}`,borderRadius:18 }}>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:9 }}>
                <div style={{ fontSize:8,color:palette.accent,opacity:0.5,letterSpacing:'0.12em',fontFamily:sans }}>ECHO'S UNDERSTANDING</div>
                <div style={{ fontSize:10,color:palette.accent }}>{meta.knowledgeScore}%{meta.canBeWiser?' · ✦':''}</div>
              </div>
              <div style={{ height:3,background:'rgba(255,255,255,0.06)',borderRadius:2 }}>
                <div style={{ height:'100%',width:`${meta.knowledgeScore}%`,background:`linear-gradient(90deg,${palette.orb[2]},${palette.orb[0]})`,borderRadius:2,transition:'width 1.2s ease' }}/>
              </div>
              {meta.gaps.length>0&&<div style={{ fontSize:8,color:`${palette.accent}38`,marginTop:10,fontFamily:sans,lineHeight:1.7 }}>Still learning: {meta.gaps.slice(0,3).join(', ')}</div>}
            </div>

            {/* Inferred beliefs — the new intelligence */}
            {beliefs.length>0&&(
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:9,color:'rgba(192,128,96,0.6)',letterSpacing:'0.14em',marginBottom:12,fontFamily:sans }}>WHAT ECHO INFERS ABOUT YOU</div>
                {beliefs.map((b,i)=><BeliefCard key={i} belief={b} palette={palette}/>)}
              </div>
            )}

            {/* Profile fields */}
            {[['VALUES','values','#c4a882'],['FEARS','fears','#a882c4'],['GOALS','goals','#82c4a8'],['EMOTIONAL PATTERNS','emotionalPatterns','#c4a082'],['RECURRING THEMES','recurringThemes','#82a8c4']].map(([label,key,color])=>(
              <div key={key} style={{ marginBottom:12,padding:'14px 16px',background:`${color}0c`,border:`1px solid ${color}22`,borderRadius:16 }}>
                <div style={{ fontSize:8,color,letterSpacing:'0.12em',marginBottom:10,fontFamily:sans }}>{label}</div>
                <div style={{ display:'flex',gap:7,flexWrap:'wrap' }}>
                  {pr[key]?.length>0?pr[key].map((item,i)=><span key={i} style={{ fontSize:10,padding:'4px 12px',borderRadius:22,background:`${color}18`,color,border:`1px solid ${color}28`,fontFamily:sans }}>{item}</span>):<span style={{ fontSize:11,color:`${color}40`,fontStyle:'italic' }}>still learning...</span>}
                </div>
              </div>
            ))}
            <div style={{ padding:'14px 16px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16 }}>
              <div style={{ fontSize:8,color:'rgba(255,255,255,0.28)',letterSpacing:'0.12em',marginBottom:8,fontFamily:sans }}>DECISION STYLE</div>
              <div style={{ fontSize:14,color:pr.decisionStyle?palette.text:'rgba(255,255,255,0.2)',fontStyle:pr.decisionStyle?'normal':'italic',lineHeight:1.7 }}>{pr.decisionStyle||'still observing...'}</div>
            </div>
          </>)}

          {screen==='patterns'&&(<>
            {mem?.moodLog?.length>0&&(
              <div style={{ marginBottom:16,padding:'16px 18px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:18 }}>
                <div style={{ fontSize:8,color:'rgba(255,255,255,0.28)',letterSpacing:'0.12em',marginBottom:12,fontFamily:sans }}>MOOD HISTORY</div>
                <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                  {mem.moodLog.slice(-24).map((m,i)=>{const c=MOODS[m.mood]?.accent||'#888';return<div key={i} title={m.mood} style={{ width:10,height:10,borderRadius:'50%',background:c,boxShadow:`0 0 5px ${c}77` }}/>})}
                </div>
              </div>
            )}
            {/* Beliefs in patterns */}
            {beliefs.length>0&&(
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:9,color:'rgba(192,128,96,0.6)',letterSpacing:'0.14em',marginBottom:12,fontFamily:sans }}>INFERRED BELIEFS</div>
                {beliefs.map((b,i)=><BeliefCard key={i} belief={b} palette={palette}/>)}
              </div>
            )}
            {patterns.length>0?patterns.map((pat,i)=>{
              const tc={growth:'#82c4a8',contradiction:'#c48282',cycle:'#82a8c4',insight:'#c4a882',struggle:'#a882c4'}[pat.type]||palette.accent
              return<div key={i} style={{ marginBottom:12,padding:'16px 18px',background:`${tc}0c`,border:`1px solid ${tc}22`,borderRadius:16 }}>
                <div style={{ fontSize:8,color:tc,letterSpacing:'0.12em',marginBottom:8,fontFamily:sans }}>{pat.type?.toUpperCase()}</div>
                <div style={{ fontSize:14,color:'rgba(232,224,210,0.75)',lineHeight:1.88 }}>{pat.text}</div>
              </div>
            }):<div style={{ textAlign:'center',padding:'48px 0',color:'rgba(255,255,255,0.2)',fontSize:14,fontStyle:'italic',lineHeight:2.4 }}>Patterns emerge as you talk more.<br/>Keep having honest conversations.</div>}
          </>)}

          {screen==='journey'&&(!mem?.sessions?.length
            ?<div style={{ textAlign:'center',padding:'48px 0',color:'rgba(255,255,255,0.2)',fontSize:14,fontStyle:'italic',lineHeight:2.4 }}>Your story is just beginning.</div>
            :[...(mem?.sessions||[])].reverse().map((s,i)=>(
              <div key={i} style={{ marginBottom:12,padding:'16px 18px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16 }}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}>
                  <div style={{ fontSize:8,color:palette.accent,opacity:0.4,letterSpacing:'0.1em',fontFamily:sans }}>SESSION {mem.sessions.length-i}</div>
                  <div style={{ fontSize:8,color:'rgba(255,255,255,0.2)',fontFamily:sans }}>{new Date(s.date).toLocaleDateString([],{month:'short',day:'numeric'})} · {s.messageCount} msgs</div>
                </div>
                <div style={{ fontSize:14,color:'rgba(232,224,210,0.6)',lineHeight:1.85 }}>{s.summary}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
