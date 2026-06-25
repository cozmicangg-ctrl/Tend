import { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================
   TEND — React app with Supabase auth + persistence
   All backend calls go through your deployed Node/Express server.
   The BACKEND_URL is saved in localStorage so users only type it once.
   ============================================================ */

// ---------------------------------------------------------------------------
// PWA install prompt hook
// ---------------------------------------------------------------------------
function usePWAInstall() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };
  return { canInstall: !!prompt && !installed, install, installed };
}

// ---------------------------------------------------------------------------
// Science section content (cited from real research)
// ---------------------------------------------------------------------------
const SCIENCE_SECTIONS = [
  {
    id: "decisions",
    emoji: "🧠",
    title: "Your brain decides before you do",
    body: `Neuroscientist John-Dylan Haynes and colleagues at the Max Planck Institute published a landmark study in Nature Neuroscience showing that brain activity predicts a decision up to 7 seconds before a person consciously becomes aware of making it. Participants freely chose when to press a button — yet the outcome was already encoded in unconscious brain regions well before they "decided."

This isn't a glitch. It's efficiency. Your brain runs enormous amounts of processing below the surface so your conscious mind doesn't have to. Researchers estimate the subconscious handles around 11 million bits of information per second, while conscious awareness manages roughly 40.`,
    citation: "Soon et al., Nature Neuroscience, 2008. Haynes Lab, Max Planck Institute for Human Cognitive and Brain Sciences.",
    source: "https://www.sciencedaily.com/releases/2008/04/080414145705.htm",
  },
  {
    id: "behavior",
    emoji: "🔄",
    title: "~95% of daily behavior runs on autopilot",
    body: `Cognitive neuroscience research consistently estimates that the vast majority of our daily decisions, habits, and reactions — somewhere between 90–95% — are driven by subconscious processes rather than deliberate conscious thought. These aren't random; they're learned patterns built from your life experience, running like a deeply personalized operating system beneath everything you do.

This is why change feels hard: you're not just convincing your conscious mind. You're rewriting patterns in a system that runs far deeper and faster. The good news is the same mechanism that automates old patterns can automate new ones — that's neuroplasticity, and it works throughout your entire life.`,
    citation: "Neuroba, 2025. Sutil-Martín & Rienda-Gómez, Frontiers in Psychology, 2020 (doi:10.3389/fpsyg.2020.01728).",
    source: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7438726/",
  },
  {
    id: "body",
    emoji: "❤️",
    title: "Your mind runs your body's systems",
    body: `The autonomic nervous system — which controls heart rate, digestion, immune response, breathing, and dozens of other "automatic" body functions — is not as separate from your mind as once thought. Research published in Philosophical Transactions of the Royal Society shows that placebo and nocebo interventions (belief-based, not chemical) can measurably alter gastrointestinal, cardiovascular, and pulmonary functions by influencing autonomic pathways.

In plain terms: what you believe about your body's condition sends real signals through your nervous system that change how your organs actually function. Expectation is a biological event, not just a thought.`,
    citation: "Meissner K., Phil. Trans. R. Soc. B, 2011. Reviewed in Journal of Neuropsychiatry and Clinical Neurosciences, 2014.",
    source: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3130407/",
  },
  {
    id: "placebo",
    emoji: "💊",
    title: "Belief changes gene expression",
    body: `A 2024 transcriptomic study (Colloca et al.) found that placebo pain relief is associated with measurable changes in gene expression — specifically in pathways related to RNA metabolism. This means the biological machinery of belief reaches all the way down to which genes are switched on or off in your cells.

Earlier research showed that psoriasis patients maintained full clinical response when active medication was replaced with a placebo 50–75% of the time, after a conditioning period — their bodies had learned the response. The autonomic nervous system appears to be a key pathway through which expectation conditions the immune system.`,
    citation: "Colloca et al., 2024 (gene expression). Tu, Zhang & Kong, Translational Psychiatry, 2022 (doi:10.1038/s41398-022-02293-2). Journal of Neuropsychiatry, 2014 (psoriasis conditioning).",
    source: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9789123/",
  },
  {
    id: "interoception",
    emoji: "🫀",
    title: "Your body talks to your mind, too",
    body: `A 2023 study in Scientific Reports (Sakuragi et al.) found that subconscious changes in bodily responses — happening without participants' awareness — influenced their thought patterns and attention. A 2024 follow-up in NeuroImage confirmed that autonomic nervous activity shapes thought-state transitions, and that this relationship is modulated by how accurately a person perceives their own internal bodily signals (interoception).

This creates a two-way street: your thoughts change your body's automatic systems, and your body's automatic systems shape your thoughts. Stories and imagery that shift how you feel about your body's capacity may work partly through this loop — changing the internal signal, which changes the thought, which changes the body.`,
    citation: "Sakuragi et al., Scientific Reports, 2023 (doi:10.1038/s41598-023-43861-w). Sakuragi et al., NeuroImage, 2024.",
    source: "https://www.ebsco.com/research-starters/history/subconscious",
  },
  {
    id: "pygmalion",
    emoji: "✨",
    title: "What this means for Tend",
    body: `Tend is built on a simple premise: if the subconscious mind runs most of your body and behavior, and if belief measurably changes your body's systems through unconscious pathways — then the stories you carry about yourself matter in a physical, biological sense.

The Pygmalion Effect — originally observed when teachers' expectations changed students' measured IQ — shows that expectation shapes performance through effort, persistence, and self-reinforcing behavior. Tend applies the same principle to recovery: not by promising a cure, but by helping your subconscious build a more capable, steady, persistent picture of who you are — one that your nervous system, immune response, and daily habits can grow toward.

This is not magic. It's neuroscience.`,
    citation: "Rosenthal & Jacobson, Pygmalion in the Classroom, 1968. Pagnini et al., 2023 (Bayesian brain and placebo). Nature/Springer.",
    source: "https://www.nature.com/articles/s41599-024-03492-6",
  },
];


// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FOCUS_AREAS = [
  { id: "physical",  label: "Physical recovery",  hint: "injury, surgery, illness, chronic condition" },
  { id: "mental",    label: "Mental health",       hint: "anxiety, depression, trauma, burnout" },
  { id: "emotional", label: "Emotional healing",   hint: "grief, heartbreak, life transition" },
  { id: "addiction", label: "Addiction recovery",  hint: "substance, behavioral, early sobriety" },
  { id: "other",     label: "Something else",      hint: "tell me in your own words" },
];
const MOTIVATORS = [
  "Proving people wrong","Being there for someone I love","Becoming who I used to be",
  "Becoming someone new","Small daily wins","A future I can picture clearly",
  "Faith or spirituality","Plain stubbornness",
];
const BELIEF_STYLES = [
  { id: "scientific",   label: "Grounded & evidence-based", hint: "explain the why behind it" },
  { id: "metaphorical", label: "Symbolic & metaphorical",   hint: "speak in images and story logic" },
  { id: "spiritual",    label: "Spiritual or soulful",      hint: "something larger than me is at work" },
  { id: "practical",    label: "Plain & practical",         hint: "no flourishes, just say it straight" },
];
const VOICE_PRESETS = ["Calm & steady","Warm & maternal","Quiet & deep","Bright & encouraging"];
const ELEVEN_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel — calm & steady" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella — warm & soft" },
  { id: "ErXwobaYiN019PkySvjV",  name: "Antoni — quiet & deep" },
  { id: "MF3mGyEYCl7XYWbV9V6O",  name: "Elli — bright & encouraging" },
];
const EDGE_VOICES = [
  { id: "en-US-AriaNeural",  name: "Aria — warm & clear (US)" },
  { id: "en-US-GuyNeural",   name: "Guy — steady & calm (US)" },
  { id: "en-GB-SoniaNeural", name: "Sonia — gentle (UK)" },
  { id: "en-US-JennyNeural", name: "Jenny — bright & encouraging (US)" },
];

const SYSTEM_PROMPT_BASE = `You write short second-person narrative audio scripts for a recovery app called Tend.
Hard rules:
- Never imply belief alone cures a medical condition. Frame belief as fuel for effort, consistency, and resilience.
- Use steady, capable, persistent framing — not "chosen one" or grandiose language.
- Second person, present/near-future tense, sensory and concrete, never preachy.
- Length: ~600-700 words (~5 minutes read aloud slowly).
- End on a grounded, quiet image.
- Output ONLY the story text. No titles, headers, stage directions, or markdown.`;

function buildSystem(profile) {
  const names = profile.mode === "together"
    ? (profile.participantNames || []).join(" and ")
    : (profile.participantNames || [""])[0];
  return `${SYSTEM_PROMPT_BASE}\n\nListener profile:
- Name(s): ${names}
- Mode: ${profile.mode === "together" ? "shared story, address both by name" : "solo"}
- Recovering from: ${profile.focusLabel}${profile.focusDetail ? " — " + profile.focusDetail : ""}
- Motivators: ${(profile.motivators || []).join(", ")}
- What they find believable: ${profile.beliefLabel} (${profile.beliefHint})
- Imaginativeness (1-5): ${profile.imagination}/5
- Tone: ${profile.voicePreset}`;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
function useApi(backendUrl) {
  const [token, setToken] = useState(() => localStorage.getItem("tend:token") || "");
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem("tend:refresh") || "");

  useEffect(() => { localStorage.setItem("tend:token", token); }, [token]);
  useEffect(() => { localStorage.setItem("tend:refresh", refreshToken); }, [refreshToken]);

  const base = (backendUrl || "").replace(/\/$/, "");

  async function call(path, opts = {}, retry = true) {
    const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${base}${path}`, { ...opts, headers });
    if (res.status === 401 && retry && refreshToken) {
      // try to refresh session
      const rr = await fetch(`${base}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (rr.ok) {
        const d = await rr.json();
        setToken(d.token);
        setRefreshToken(d.refresh_token);
        return call(path, opts, false);
      } else {
        setToken(""); setRefreshToken("");
        throw new Error("Session expired. Please sign in again.");
      }
    }
    return res;
  }

  async function get(path) {
    const res = await call(path);
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "Request failed");
    return j;
  }

  async function post(path, body) {
    const res = await call(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "Request failed");
    return j;
  }

  async function signup(email, password) {
    const j = await post("/auth/signup", { email, password });
    return j;
  }

  async function signin(email, password) {
    const j = await post("/auth/signin", { email, password });
    setToken(j.token);
    setRefreshToken(j.refresh_token);
    return j.user;
  }

  function signout() {
    setToken(""); setRefreshToken("");
    localStorage.removeItem("tend:token");
    localStorage.removeItem("tend:refresh");
  }

  return { token, call, get, post, signup, signin, signout, base };
}

// ---------------------------------------------------------------------------
// Claude story generation (still called from browser — Anthropic API)
// ---------------------------------------------------------------------------
async function callClaude(messages, system) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system, messages }),
  });
  const data = await res.json();
  return (data.content || []).map((b) => b.text || "").join("\n").trim();
}

// ---------------------------------------------------------------------------
// TTS hooks
// ---------------------------------------------------------------------------
function useNarration() {
  const [voices, setVoices] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState(0.92);
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load(); window.speechSynthesis.onvoiceschanged = load;
  }, []);
  const speak = useCallback((text, voiceURI) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = voices.find((v) => v.voiceURI === voiceURI);
    if (v) u.voice = v;
    u.rate = rate;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, [voices, rate]);
  const stop = useCallback(() => { window.speechSynthesis.cancel(); setSpeaking(false); }, []);
  return { voices, speaking, speak, stop, rate, setRate };
}

function useElevenLabs() {
  const [apiKey, setApiKey] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [error, setError] = useState("");
  const audioRef = useRef(null);
  const speak = useCallback(async (text, voiceId) => {
    if (!apiKey) { setError("Paste your ElevenLabs API key above."); return; }
    setError(""); setLoadingAudio(true);
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
        body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.55, similarity_boost: 0.75 } }),
      });
      if (!res.ok) throw new Error(res.status === 401 ? "Invalid API key." : "ElevenLabs failed.");
      const url = URL.createObjectURL(await res.blob());
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url); audioRef.current = audio;
      audio.onplay = () => setSpeaking(true);
      audio.onended = () => setSpeaking(false);
      audio.onpause = () => setSpeaking(false);
      await audio.play();
    } catch (e) { setError(e.message); }
    finally { setLoadingAudio(false); }
  }, [apiKey]);
  const stop = useCallback(() => { if (audioRef.current) audioRef.current.pause(); setSpeaking(false); }, []);
  return { apiKey, setApiKey, speaking, loadingAudio, error, speak, stop };
}

function useBackendTTS(base) {
  const [speaking, setSpeaking] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [error, setError] = useState("");
  const audioRef = useRef(null);
  const speak = useCallback(async (text, { path, body }) => {
    if (!base) { setError("Set a backend URL first."); return; }
    setError(""); setLoadingAudio(true);
    try {
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, ...body }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || "Failed."); }
      const url = URL.createObjectURL(await res.blob());
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url); audioRef.current = audio;
      audio.onplay = () => setSpeaking(true);
      audio.onended = () => setSpeaking(false);
      audio.onpause = () => setSpeaking(false);
      await audio.play();
    } catch (e) { setError(e.message); }
    finally { setLoadingAudio(false); }
  }, [base]);
  const stop = useCallback(() => { if (audioRef.current) audioRef.current.pause(); setSpeaking(false); }, []);
  return { speaking, loadingAudio, error, speak, stop };
}

// ---------------------------------------------------------------------------
// Ambient tone generator
// ---------------------------------------------------------------------------
function useAmbientTone() {
  const ctxRef = useRef(null); const nodesRef = useRef([]);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.25);
  const stop = useCallback(() => {
    nodesRef.current.forEach((n) => { try { n.osc.stop(); n.osc.disconnect(); n.gain.disconnect(); } catch (e) {} });
    nodesRef.current = []; setPlaying(false);
  }, []);
  const start = useCallback(() => {
    if (playing) return;
    const ctx = ctxRef.current || new (window.AudioContext || window.webkitAudioContext)();
    ctxRef.current = ctx;
    const nodes = [174, 285].map((f, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = f;
      gain.gain.value = (volume / 2) * (i === 0 ? 1 : 0.6);
      osc.connect(gain); gain.connect(ctx.destination); osc.start();
      return { osc, gain };
    });
    nodesRef.current = nodes; setPlaying(true);
  }, [playing, volume]);
  useEffect(() => {
    nodesRef.current.forEach((n, i) => { n.gain.gain.value = (volume / 2) * (i === 0 ? 1 : 0.6); });
  }, [volume]);
  useEffect(() => stop, [stop]);
  return { playing, start, stop, volume, setVolume };
}

// ---------------------------------------------------------------------------
// Ember visual
// ---------------------------------------------------------------------------
function Ember({ active, speaking }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "24px 0" }}>
      <div style={{
        width: 84, height: 84, borderRadius: "50%",
        background: "radial-gradient(circle at 35% 30%, #FBD9A0, #E8B567 55%, #B97A2F 100%)",
        boxShadow: active ? "0 0 40px 6px rgba(232,181,103,0.45)" : "0 0 18px 2px rgba(232,181,103,0.2)",
        animation: speaking ? "tend-pulse 1.6s ease-in-out infinite"
          : active ? "tend-breathe 4.5s ease-in-out infinite" : "none",
      }} />
      <style>{`
        @keyframes tend-breathe { 0%,100%{transform:scale(0.92);opacity:0.85} 50%{transform:scale(1.08);opacity:1} }
        @keyframes tend-pulse   { 0%,100%{transform:scale(1)}                  50%{transform:scale(1.15)} }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------
const BLANK_PROFILE = {
  mode: null, participantNames: [""], focusId: "", focusLabel: "", focusDetail: "",
  motivators: [], beliefId: "", beliefLabel: "", beliefHint: "", imagination: 3, voicePreset: VOICE_PRESETS[0],
};

export default function App() {
  const pwa = usePWAInstall();
  const [scienceOpen, setScienceOpen] = useState(null); // id of open card or null

  // Setup / auth
  const [backendUrl, setBackendUrl] = useState(() => localStorage.getItem("tend:backendUrl") || "");
  const [backendInput, setBackendInput] = useState(backendUrl);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("signin"); // 'signin'|'signup'
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Navigation
  const [screen, setScreen] = useState("setup"); // setup|auth|onboard-*|loading|story|library
  const [profile, setProfile] = useState(BLANK_PROFILE);
  const [sessionId, setSessionId] = useState(null);
  const [storyText, setStoryText] = useState("");
  const [history, setHistory] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [room, setRoom] = useState("");
  const [mode, setMode] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState("");
  const [showAmbient, setShowAmbient] = useState(false);

  // Voice
  const [voiceEngine, setVoiceEngine] = useState("browser");
  const [selectedVoice, setSelectedVoice] = useState("");
  const [elevenVoiceId, setElevenVoiceId] = useState(ELEVEN_VOICES[0].id);
  const [edgeVoiceId, setEdgeVoiceId] = useState(EDGE_VOICES[0].id);

  const api = useApi(backendUrl);
  const narration = useNarration();
  const eleven = useElevenLabs();
  const edgeTTS = useBackendTTS(backendUrl);
  const elevenBackend = useBackendTTS(backendUrl);
  const ambient = useAmbientTone();
  const pollRef = useRef(null);

  useEffect(() => { localStorage.setItem("tend:backendUrl", backendUrl); }, [backendUrl]);

  // On mount — check if we have a valid token → load profile
  useEffect(() => {
    if (!backendUrl || !api.token) return;
    api.get("/api/profile").then((p) => {
      if (p) {
        setProfile({ ...BLANK_PROFILE, ...{
          mode: p.mode, participantNames: [p.display_name],
          focusId: p.focus_id, focusLabel: p.focus_label, focusDetail: p.focus_detail || "",
          motivators: p.motivators || [], beliefId: p.belief_id,
          beliefLabel: p.belief_label, beliefHint: p.belief_hint,
          imagination: p.imagination, voicePreset: p.voice_preset,
        }});
        setUser({ email: "" });
        setScreen("library");
      }
    }).catch(() => setScreen("auth"));
    if (!api.token) setScreen("auth");
  }, [backendUrl]); // eslint-disable-line

  // Couple realtime polling
  useEffect(() => {
    if (!sessionId || !room || screen !== "story") return;
    pollRef.current = setInterval(async () => {
      try {
        const s = await api.get(`/api/sessions/${sessionId}`);
        if (s.story_text && s.story_text !== storyText) {
          setStoryText(s.story_text);
          setHistory(s.history || []);
        }
      } catch (e) {}
    }, 4000);
    return () => clearInterval(pollRef.current);
  }, [sessionId, room, screen, storyText]); // eslint-disable-line

  // Helpers
  const speaking = voiceEngine === "eleven"
    ? (backendUrl ? elevenBackend.speaking : eleven.speaking)
    : voiceEngine === "edge" ? edgeTTS.speaking : narration.speaking;

  const stopSpeaking = () => { narration.stop(); eleven.stop(); edgeTTS.stop(); elevenBackend.stop(); };

  const playStory = () => {
    if (voiceEngine === "eleven") {
      if (backendUrl) elevenBackend.speak(storyText, { path: "/api/tts/elevenlabs", body: { voiceId: elevenVoiceId } });
      else eleven.speak(storyText, elevenVoiceId);
    } else if (voiceEngine === "edge") {
      edgeTTS.speak(storyText, { path: "/api/tts/edge", body: { voice: edgeVoiceId } });
    } else {
      narration.speak(storyText, selectedVoice);
    }
  };

  async function saveSession(text, hist, sid) {
    if (!api.token) return sid;
    try {
      const title = profile.participantNames[0]
        ? `${profile.participantNames[0]}'s story — ${new Date().toLocaleDateString()}`
        : `Story — ${new Date().toLocaleDateString()}`;
      const s = await api.post("/api/sessions", { id: sid || undefined, title, storyText: text, history: hist, roomCode: room || undefined });
      return s.id;
    } catch (e) { return sid; }
  }

  async function generateStory(instruction) {
    setGenLoading(true); setGenError(""); stopSpeaking();
    try {
      const system = buildSystem(profile);
      const msg = instruction || "Write the first chapter of this story now.";
      const newHistory = [...history, { role: "user", content: msg }];
      const text = await callClaude(newHistory, system);
      if (!text) throw new Error("empty");
      const fullHistory = [...newHistory, { role: "assistant", content: text }];
      setHistory(fullHistory); setStoryText(text);
      const sid = await saveSession(text, fullHistory, sessionId);
      setSessionId(sid);
      setShowAmbient(false); setScreen("story");
    } catch (e) { setGenError(e.message || "Couldn't generate story."); }
    finally { setGenLoading(false); }
  }

  function toggleMotivator(m) {
    setProfile((p) => ({
      ...p,
      motivators: p.motivators.includes(m) ? p.motivators.filter((x) => x !== m) : [...p.motivators, m],
    }));
  }

  async function saveProfileToDB() {
    if (!api.token) return;
    try { await api.post("/api/profile", profile); } catch (e) {}
  }

  function startFresh() {
    setProfile(BLANK_PROFILE); setHistory([]); setStoryText(""); setSessionId(null); setRoom(""); setMode(null);
    setScreen("onboard-mode");
  }

  // ---------------------------------------------------------------------------
  // SCREENS
  // ---------------------------------------------------------------------------

  // 0. Setup — first time only: ask for backend URL
  if (screen === "setup") {
    return (
      <Shell>
        <Ember active={false} speaking={false} />
        <h1 style={s.h1}>Tend</h1>
        <p style={s.lead}>To get started, enter the URL of your Tend backend server.</p>
        <input style={s.input} placeholder="https://your-app.onrender.com" value={backendInput}
          onChange={(e) => setBackendInput(e.target.value)} />
        <button style={s.primaryBtn} disabled={!backendInput.trim()} onClick={() => {
          const url = backendInput.trim().replace(/\/$/, "");
          setBackendUrl(url);
          setBackendInput(url);
          setScreen("auth");
        }}>Continue</button>
        <p style={{ color: "#8C97A6", fontSize: 12, textAlign: "center", marginTop: 12 }}>
          Don't have a backend yet? See the deploy guide included with your files.
        </p>
      </Shell>
    );
  }

  // 1. Auth
  if (screen === "auth") {
    return (
      <Shell>
        <Ember active={false} speaking={false} />
        <h1 style={s.h1}>Tend</h1>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
          {["signin", "signup"].map((m) => (
            <button key={m} onClick={() => { setAuthMode(m); setAuthError(""); }}
              style={{ ...s.engineToggle, ...(authMode === m ? s.engineToggleActive : {}) }}>
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
        <input style={s.input} type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} />
        <input style={s.input} type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)} />
        {authError && <p style={s.error}>{authError}</p>}
        <button style={s.primaryBtn} disabled={authLoading || !email || !password}
          onClick={async () => {
            setAuthLoading(true); setAuthError("");
            try {
              if (authMode === "signup") {
                await api.signup(email, password);
                setAuthMode("signin");
                setAuthError("Account created — sign in now.");
              } else {
                const u = await api.signin(email, password);
                setUser(u);
                const p = await api.get("/api/profile").catch(() => null);
                if (p) {
                  setProfile({ ...BLANK_PROFILE, ...{
                    mode: p.mode, participantNames: [p.display_name],
                    focusId: p.focus_id, focusLabel: p.focus_label, focusDetail: p.focus_detail || "",
                    motivators: p.motivators || [], beliefId: p.belief_id,
                    beliefLabel: p.belief_label, beliefHint: p.belief_hint,
                    imagination: p.imagination, voicePreset: p.voice_preset,
                  }});
                  setScreen("library");
                } else {
                  setScreen("onboard-mode");
                }
              }
            } catch (e) { setAuthError(e.message); }
            finally { setAuthLoading(false); }
          }}>
          {authLoading ? "..." : authMode === "signup" ? "Create account" : "Sign in"}
        </button>
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button style={s.linkBtn} onClick={() => { setScreen("setup"); }}>← change backend URL</button>
        </div>
      </Shell>
    );
  }

  // 2. Library — past sessions
  if (screen === "library") {
    return (
      <Shell>
        <BottomNav screen={screen} setScreen={setScreen} pwa={pwa} />
        <div style={{ paddingBottom: 80 }}>
          <h1 style={{ ...s.h1, fontSize: 28, margin: 0 }}>Tend</h1>
          <button style={s.linkBtn} onClick={() => { api.signout(); setUser(null); setScreen("auth"); }}>Sign out</button>
        </div>
        <button style={s.primaryBtn} onClick={startFresh}>+ New story</button>
        {sessions.length > 0 && (
          <>
            <p style={{ color: "#8C97A6", fontSize: 13, margin: "20px 0 10px", textAlign: "center" }}>Your stories</p>
            {sessions.map((sess) => (
              <button key={sess.id} style={s.cardBtn} onClick={async () => {
                try {
                  const full = await api.get(`/api/sessions/${sess.id}`);
                  setStoryText(full.story_text || "");
                  setHistory(full.history || []);
                  setSessionId(full.id);
                  setRoom(full.room_code || "");
                  setScreen("story");
                } catch (e) {}
              }}>
                <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16 }}>{sess.title}</div>
                <div style={{ color: "#8C97A6", fontSize: 12, marginTop: 3 }}>
                  {new Date(sess.updated_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </>
        )}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button style={s.linkBtn} onClick={async () => {
            try { const list = await api.get("/api/sessions"); setSessions(list); } catch (e) {}
          }}>Load my stories</button>
        </div>
        </div>
      </Shell>
    );
  }

  // 3. Onboarding flow
  if (screen === "onboard-mode") {
    return (
      <Shell>
        <Eyebrow text="Step 1 · How are you listening?" />
        <h2 style={s.h2}>Who is this story for?</h2>
        {[
          { key: "solo",     title: "Just me",                desc: "A solo recovery story, shaped around you." },
          { key: "together", title: "Me and someone else",    desc: "A shared story for a couple or care partner." },
          { key: "join",     title: "Join with a room code",  desc: "Someone already started a shared story." },
        ].map((opt) => (
          <CardOption key={opt.key} title={opt.title} desc={opt.desc} onClick={async () => {
            if (opt.key === "join") { setScreen("join"); return; }
            setMode(opt.key);
            setProfile((p) => ({ ...p, mode: opt.key, participantNames: opt.key === "together" ? ["", ""] : [""] }));
            setScreen("onboard-name");
          }} />
        ))}
      </Shell>
    );
  }

  if (screen === "join") {
    return (
      <Shell>
        <Eyebrow text="Join a shared story" />
        <h2 style={s.h2}>Enter the room code</h2>
        <input style={s.input} placeholder="e.g. 7XQRT" value={room}
          onChange={(e) => setRoom(e.target.value.toUpperCase())} />
        {genError && <p style={s.error}>{genError}</p>}
        <button style={s.primaryBtn} disabled={room.length < 4} onClick={async () => {
          try {
            const { session } = await api.post(`/api/rooms/${room}/join`, {});
            if (session) {
              setStoryText(session.story_text || "");
              setHistory(session.history || []);
              setSessionId(session.id);
              setScreen("story");
            } else {
              setGenError("Room exists but has no story yet.");
            }
          } catch (e) { setGenError(e.message); }
        }}>Join story</button>
        <div style={{ textAlign: "center" }}>
          <button style={s.linkBtn} onClick={() => setScreen("onboard-mode")}>← back</button>
        </div>
      </Shell>
    );
  }

  if (screen === "onboard-name") {
    return (
      <Shell>
        <Eyebrow text="Step 1 · Your name" />
        <h2 style={s.h2}>{mode === "together" ? "What are your names?" : "What should we call you?"}</h2>
        {profile.participantNames.map((n, i) => (
          <input key={i} style={s.input} placeholder={mode === "together" ? `Name ${i + 1}` : "Your name"}
            value={n} onChange={(e) => {
              const names = [...profile.participantNames]; names[i] = e.target.value;
              setProfile((p) => ({ ...p, participantNames: names }));
            }} />
        ))}
        <button style={s.primaryBtn} disabled={profile.participantNames.some((n) => !n.trim())}
          onClick={() => setScreen("onboard-focus")}>Continue</button>
      </Shell>
    );
  }

  if (screen === "onboard-focus") {
    return (
      <Shell>
        <Eyebrow text="Step 2 · About your recovery" />
        <h2 style={s.h2}>What are you recovering from?</h2>
        {FOCUS_AREAS.map((f) => (
          <CardOption key={f.id} title={f.label} desc={f.hint} selected={profile.focusId === f.id}
            onClick={() => setProfile((p) => ({ ...p, focusId: f.id, focusLabel: f.label }))} />
        ))}
        {profile.focusId && (
          <input style={s.input} placeholder="A sentence or two in your own words (optional)"
            value={profile.focusDetail} onChange={(e) => setProfile((p) => ({ ...p, focusDetail: e.target.value }))} />
        )}
        <button style={s.primaryBtn} disabled={!profile.focusId}
          onClick={() => setScreen("onboard-motivate")}>Continue</button>
      </Shell>
    );
  }

  if (screen === "onboard-motivate") {
    return (
      <Shell>
        <Eyebrow text="Step 3 · What drives you" />
        <h2 style={s.h2}>Pick what motivates you</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {MOTIVATORS.map((m) => (
            <button key={m} onClick={() => toggleMotivator(m)}
              style={{ ...s.chip, ...(profile.motivators.includes(m) ? s.chipActive : {}) }}>{m}</button>
          ))}
        </div>
        <button style={{ ...s.primaryBtn, marginTop: 24 }} disabled={profile.motivators.length === 0}
          onClick={() => setScreen("onboard-belief")}>Continue</button>
      </Shell>
    );
  }

  if (screen === "onboard-belief") {
    return (
      <Shell>
        <Eyebrow text="Step 4 · What feels true to you" />
        <h2 style={s.h2}>What kind of words land for you?</h2>
        {BELIEF_STYLES.map((b) => (
          <CardOption key={b.id} title={b.label} desc={b.hint} selected={profile.beliefId === b.id}
            onClick={() => setProfile((p) => ({ ...p, beliefId: b.id, beliefLabel: b.label, beliefHint: b.hint }))} />
        ))}
        <button style={s.primaryBtn} disabled={!profile.beliefId}
          onClick={() => setScreen("onboard-imagine")}>Continue</button>
      </Shell>
    );
  }

  if (screen === "onboard-imagine") {
    return (
      <Shell>
        <Eyebrow text="Step 5 · Last two things" />
        <h2 style={s.h2}>How vivid should the imagery be?</h2>
        <input type="range" min="1" max="5" value={profile.imagination}
          onChange={(e) => setProfile((p) => ({ ...p, imagination: Number(e.target.value) }))}
          style={{ width: "100%", margin: "16px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", color: "#8C97A6", fontSize: 13 }}>
          <span>Plain & literal</span><span>Rich & vivid</span>
        </div>
        <h2 style={{ ...s.h2, marginTop: 32 }}>What tone of voice fits?</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {VOICE_PRESETS.map((v) => (
            <button key={v} onClick={() => setProfile((p) => ({ ...p, voicePreset: v }))}
              style={{ ...s.chip, ...(profile.voicePreset === v ? s.chipActive : {}) }}>{v}</button>
          ))}
        </div>
        <button style={{ ...s.primaryBtn, marginTop: 28 }} onClick={async () => {
          await saveProfileToDB();
          setScreen("loading");
          generateStory();
        }}>Create my story</button>
      </Shell>
    );
  }

  if (screen === "loading") {
    return (
      <Shell>
        <Ember active speaking />
        <p style={{ ...s.lead, textAlign: "center" }}>Writing your story...</p>
      </Shell>
    );
  }

  // Science screen
  if (screen === "science") {
    return (
      <Shell wide>
        <BottomNav screen={screen} setScreen={setScreen} pwa={pwa} />
        <div style={{ paddingBottom: 80 }}>
          <Eyebrow text="The research behind Tend" />
          <h2 style={s.h2}>Your subconscious mind</h2>
          <p style={{ color: "#8C97A6", fontSize: 15, lineHeight: 1.6, textAlign: "center", marginBottom: 28 }}>
            Tend is grounded in real neuroscience. Here's what the research says about how much happens below your conscious awareness — and why that matters for recovery.
          </p>
          {SCIENCE_SECTIONS.map((sec) => (
            <div key={sec.id} style={s.scienceCard}>
              <button
                style={s.scienceHeader}
                onClick={() => setScienceOpen(scienceOpen === sec.id ? null : sec.id)}
              >
                <span style={{ fontSize: 24, marginRight: 12 }}>{sec.emoji}</span>
                <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 17, flex: 1, textAlign: "left" }}>
                  {sec.title}
                </span>
                <span style={{ color: "#E8B567", fontSize: 18, marginLeft: 8 }}>
                  {scienceOpen === sec.id ? "−" : "+"}
                </span>
              </button>
              {scienceOpen === sec.id && (
                <div style={{ padding: "0 16px 16px" }}>
                  <p style={{ color: "#D4CFC6", fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 14 }}>
                    {sec.body}
                  </p>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10 }}>
                    <p style={{ color: "#8C97A6", fontSize: 12, marginBottom: 6 }}>
                      📄 {sec.citation}
                    </p>
                    <a href={sec.source} target="_blank" rel="noopener noreferrer"
                      style={{ color: "#5FA8A0", fontSize: 12, textDecoration: "none" }}>
                      Read source →
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div style={{ ...s.scienceCard, background: "rgba(232,181,103,0.07)", border: "1px solid rgba(232,181,103,0.2)", marginTop: 8 }}>
            <p style={{ color: "#8C97A6", fontSize: 13, lineHeight: 1.6, padding: "14px 16px", margin: 0 }}>
              <strong style={{ color: "#E8B567" }}>Important: </strong>
              Tend is designed to support your effort, consistency, and resilience — not to replace medical treatment, therapy, or professional guidance. If you're in crisis, please reach out to a professional or crisis line.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

    const ttsError = voiceEngine === "edge" ? edgeTTS.error
      : voiceEngine === "eleven" && backendUrl ? elevenBackend.error
      : voiceEngine === "eleven" ? eleven.error : "";
    const ttsLoading = edgeTTS.loadingAudio || elevenBackend.loadingAudio || eleven.loadingAudio;

    return (
      <Shell wide>
        <BottomNav screen={screen} setScreen={setScreen} pwa={pwa} />
        <div style={{ paddingBottom: 80 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button style={s.linkBtn} onClick={() => setScreen("library")}>← My stories</button>
          {room && <span style={{ color: "#E8B567", fontSize: 13, letterSpacing: 1 }}>Room: {room}</span>}
        </div>

        {mode === "together" && !room && (
          <div style={s.roomBanner}>
            <button style={s.secondaryBtn} onClick={async () => {
              try {
                const r = await api.post("/api/rooms", {});
                setRoom(r.code);
              } catch (e) {}
            }}>Generate room code to share</button>
          </div>
        )}
        {mode === "together" && room && (
          <div style={s.roomBanner}>
            <span style={{ color: "#F2EDE4" }}>
              Room code: <strong style={{ color: "#E8B567", letterSpacing: 2 }}>{room}</strong>
              {" "}— share this so your partner can join
            </span>
          </div>
        )}

        <Ember active={speaking} speaking={speaking} />
        <div style={s.storyBox}>{storyText}</div>

        {/* Voice engine toggle */}
        <div style={{ textAlign: "center", margin: "20px 0 10px" }}>
          <div style={{ display: "inline-flex", gap: 4, background: "rgba(255,255,255,0.05)", borderRadius: 999, padding: 4, flexWrap: "wrap" }}>
            {[["browser","Browser (free)"],["edge","Edge TTS (free, better)"],["eleven","ElevenLabs (lifelike)"]].map(([id, label]) => (
              <button key={id} onClick={() => setVoiceEngine(id)}
                style={{ ...s.engineToggle, ...(voiceEngine === id ? s.engineToggleActive : {}) }}>{label}</button>
            ))}
          </div>
        </div>

        {voiceEngine === "edge" && (
          <p style={{ color: "#8C97A6", fontSize: 12, textAlign: "center", marginBottom: 8 }}>
            Routed through your backend — free, no key needed.
          </p>
        )}
        {voiceEngine === "eleven" && !backendUrl && (
          <div style={{ maxWidth: 420, margin: "0 auto 10px" }}>
            <input style={s.input} type="password" placeholder="ElevenLabs API key (this session only)"
              value={eleven.apiKey} onChange={(e) => eleven.setApiKey(e.target.value)} />
          </div>
        )}
        {ttsError && <p style={s.error}>{ttsError}</p>}

        {/* Voice selector + play */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginBottom: 16 }}>
          {voiceEngine === "browser" && (
            <select style={s.select} value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)}>
              <option value="">Default voice</option>
              {narration.voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
            </select>
          )}
          {voiceEngine === "edge" && (
            <select style={s.select} value={edgeVoiceId} onChange={(e) => setEdgeVoiceId(e.target.value)}>
              {EDGE_VOICES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
          {voiceEngine === "eleven" && (
            <select style={s.select} value={elevenVoiceId} onChange={(e) => setElevenVoiceId(e.target.value)}>
              {ELEVEN_VOICES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
          {!speaking
            ? <button style={s.primaryBtn} disabled={ttsLoading} onClick={playStory}>{ttsLoading ? "Generating…" : "▶ Listen"}</button>
            : <button style={s.secondaryBtn} onClick={stopSpeaking}>⏸ Stop</button>
          }
        </div>
        {voiceEngine === "browser" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <span style={{ color: "#8C97A6", fontSize: 13 }}>Speed</span>
            <input type="range" min="0.7" max="1.2" step="0.05" value={narration.rate}
              onChange={(e) => narration.setRate(Number(e.target.value))} />
          </div>
        )}

        <div style={s.divider} />
        <p style={{ color: "#8C97A6", fontSize: 14, textAlign: "center", marginBottom: 14 }}>Keep going</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            ["Continue story",       "Continue the story, same length, next chapter."],
            ["Make it longer",       "Continue, but make this next part noticeably longer and slower."],
            ["Make it shorter",      "Continue, but make this next part shorter and punchier."],
            ["Change the details",   "Continue but shift the setting and specific details while keeping the emotional through-line."],
          ].map(([label, instruction]) => (
            <button key={label} style={s.secondaryBtn} disabled={genLoading}
              onClick={() => generateStory(instruction)}>{label}</button>
          ))}
        </div>
        {genLoading && <p style={{ color: "#8C97A6", textAlign: "center", marginTop: 14 }}>Writing...</p>}
        {genError && <p style={s.error}>{genError}</p>}

        <div style={s.divider} />
        <div style={{ textAlign: "center" }}>
          <button style={s.linkBtn} onClick={() => setShowAmbient((x) => !x)}>
            {showAmbient ? "Hide healing tones" : "End with healing tones →"}
          </button>
        </div>
        {showAmbient && <AmbientPanel ambient={ambient} />}
        <div style={{ textAlign: "center", marginTop: 28 }}>
          <button style={{ ...s.linkBtn, color: "#8C97A6" }} onClick={startFresh}>Start a different story</button>
        </div>
        </div>
      </Shell>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function BottomNav({ screen, setScreen, pwa }) {
  const tabs = [
    { id: "library", icon: "📖", label: "Stories" },
    { id: "science", icon: "🧠", label: "Science" },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "rgba(22,32,38,0.97)", borderTop: "1px solid rgba(255,255,255,0.08)",
      display: "flex", justifyContent: "space-around", alignItems: "center",
      padding: "10px 0 max(10px, env(safe-area-inset-bottom))", zIndex: 100,
      backdropFilter: "blur(12px)",
    }}>
      {tabs.map((tab) => (
        <button key={tab.id} onClick={() => setScreen(tab.id)} style={{
          background: "none", border: "none", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          color: screen === tab.id ? "#E8B567" : "#8C97A6", padding: "4px 20px",
        }}>
          <span style={{ fontSize: 22 }}>{tab.icon}</span>
          <span style={{ fontSize: 11 }}>{tab.label}</span>
        </button>
      ))}
      {pwa.canInstall && (
        <button onClick={pwa.install} style={{
          background: "none", border: "none", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          color: "#5FA8A0", padding: "4px 20px",
        }}>
          <span style={{ fontSize: 22 }}>📲</span>
          <span style={{ fontSize: 11 }}>Install</span>
        </button>
      )}
    </div>
  );
}


  return (
    <div style={{ textAlign: "center", marginTop: 16 }}>
      <Ember active={ambient.playing} speaking={false} />
      {!ambient.playing
        ? <button style={s.primaryBtn} onClick={ambient.start}>▶ Play healing tones</button>
        : <button style={s.secondaryBtn} onClick={ambient.stop}>⏸ Stop</button>
      }
      <div style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
        <span style={{ color: "#8C97A6", fontSize: 13 }}>Volume</span>
        <input type="range" min="0" max="0.6" step="0.02" value={ambient.volume}
          onChange={(e) => ambient.setVolume(Number(e.target.value))} />
      </div>
      <p style={{ color: "#8C97A6", fontSize: 12, marginTop: 10 }}>Plays until you stop it.</p>
    </div>
  );
}

function Shell({ children, wide }) {
  return (
    <div style={{ minHeight: "100%", background: "linear-gradient(160deg, #162026 0%, #1F1530 100%)",
      color: "#F2EDE4", fontFamily: "'Inter', system-ui, sans-serif", padding: "40px 20px",
      display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: wide ? 640 : 460 }}>{children}</div>
    </div>
  );
}

function Eyebrow({ text }) {
  return <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase",
    color: "#E8B567", marginBottom: 10, textAlign: "center" }}>{text}</div>;
}

function CardOption({ title, desc, selected, onClick }) {
  return (
    <button onClick={onClick} style={{ display: "block", width: "100%", textAlign: "left",
      background: selected ? "rgba(232,181,103,0.14)" : "rgba(255,255,255,0.04)",
      border: selected ? "1px solid #E8B567" : "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: "14px 16px", marginBottom: 10, cursor: "pointer", color: "#F2EDE4" }}>
      <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 17 }}>{title}</div>
      <div style={{ color: "#8C97A6", fontSize: 13, marginTop: 2 }}>{desc}</div>
    </button>
  );
}

const s = {
  h1: { fontFamily: "'Fraunces', Georgia, serif", fontSize: 44, textAlign: "center", margin: "0 0 8px", fontWeight: 600 },
  h2: { fontFamily: "'Fraunces', Georgia, serif", fontSize: 24, margin: "0 0 18px", fontWeight: 600, textAlign: "center" },
  lead: { color: "#8C97A6", fontSize: 16, textAlign: "center", lineHeight: 1.5, marginBottom: 28 },
  primaryBtn: { display: "block", width: "100%", background: "#E8B567", color: "#1B1F2A", border: "none",
    borderRadius: 10, padding: "14px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 6 },
  secondaryBtn: { background: "rgba(255,255,255,0.07)", color: "#F2EDE4",
    border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 16px", fontSize: 14, cursor: "pointer" },
  linkBtn: { background: "none", border: "none", color: "#5FA8A0", fontSize: 14, cursor: "pointer", marginTop: 16 },
  input: { width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 10, padding: "12px 14px", color: "#F2EDE4", fontSize: 15, marginBottom: 12, boxSizing: "border-box" },
  select: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 10, padding: "10px 12px", color: "#F2EDE4", fontSize: 14 },
  chip: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 999, padding: "8px 14px", fontSize: 13, color: "#F2EDE4", cursor: "pointer" },
  chipActive: { background: "rgba(95,168,160,0.22)", border: "1px solid #5FA8A0" },
  storyBox: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14, padding: "22px 24px", fontFamily: "'Fraunces', Georgia, serif",
    fontSize: 17, lineHeight: 1.7, whiteSpace: "pre-wrap" },
  divider: { height: 1, background: "rgba(255,255,255,0.08)", margin: "26px 0" },
  error: { color: "#E0793C", textAlign: "center", marginTop: 10, fontSize: 14 },
  roomBanner: { textAlign: "center", background: "rgba(232,181,103,0.08)",
    border: "1px solid rgba(232,181,103,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 16 },
  engineToggle: { background: "transparent", border: "none", borderRadius: 999,
    padding: "7px 14px", fontSize: 13, color: "#8C97A6", cursor: "pointer" },
  engineToggleActive: { background: "#E8B567", color: "#1B1F2A", fontWeight: 600 },
  cardBtn: { display: "block", width: "100%", textAlign: "left", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 16px",
    marginBottom: 10, cursor: "pointer", color: "#F2EDE4" },
  scienceCard: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14, marginBottom: 12, overflow: "hidden",
  },
  scienceHeader: {
    display: "flex", alignItems: "center", width: "100%", background: "none",
    border: "none", cursor: "pointer", padding: "14px 16px", color: "#F2EDE4", textAlign: "left",
  },
};
