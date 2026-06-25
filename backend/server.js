import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Supabase — server-side admin client (uses service_role key, never exposed)
// ---------------------------------------------------------------------------
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------------------------------------------------------------------------
// Auth middleware — reads the user's JWT from Authorization header and
// verifies it with Supabase, attaching req.user if valid.
// ---------------------------------------------------------------------------
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace(/^Bearer\s+/, "");
  if (!token) return res.status(401).json({ error: "No token provided." });
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: "Invalid or expired session." });
  req.user = data.user;
  next();
}

// ---------------------------------------------------------------------------
// AUTH ROUTES — thin wrappers so the frontend never holds the service key
// ---------------------------------------------------------------------------

// Sign up with email + password
app.post("/auth/signup", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required." });
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,   // skip email confirmation for now — remove for prod
  });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ user: { id: data.user.id, email: data.user.email } });
});

// Sign in — returns a session token the frontend stores
app.post("/auth/signin", async (req, res) => {
  const { email, password } = req.body || {};
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });
  res.json({
    token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: { id: data.user.id, email: data.user.email },
  });
});

// Refresh an expired session
app.post("/auth/refresh", async (req, res) => {
  const { refresh_token } = req.body || {};
  if (!refresh_token) return res.status(400).json({ error: "refresh_token required." });
  const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token });
  if (error) return res.status(401).json({ error: error.message });
  res.json({
    token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});

// ---------------------------------------------------------------------------
// PROFILE ROUTES
// ---------------------------------------------------------------------------

// Get current user's profile
app.get("/api/profile", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("user_id", req.user.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || null);
});

// Save / update profile (upsert)
app.post("/api/profile", requireAuth, async (req, res) => {
  const profile = {
    user_id: req.user.id,
    display_name: req.body.participantNames?.[0] || "",
    mode: req.body.mode,
    focus_id: req.body.focusId,
    focus_label: req.body.focusLabel,
    focus_detail: req.body.focusDetail || "",
    motivators: req.body.motivators,
    belief_id: req.body.beliefId,
    belief_label: req.body.beliefLabel,
    belief_hint: req.body.beliefHint,
    imagination: req.body.imagination,
    voice_preset: req.body.voicePreset,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .upsert(profile, { onConflict: "user_id" })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ---------------------------------------------------------------------------
// SESSION (STORY) ROUTES
// ---------------------------------------------------------------------------

// List user's story sessions (summary only)
app.get("/api/sessions", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("id, title, created_at, updated_at, room_code")
    .eq("user_id", req.user.id)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get a single session (full story + history)
app.get("/api/sessions/:id", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Session not found." });
  // allow if owner OR member of the room
  if (data.user_id !== req.user.id) {
    const { data: member } = await supabaseAdmin
      .from("room_members")
      .select("id")
      .eq("room_code", data.room_code)
      .eq("user_id", req.user.id)
      .maybeSingle();
    if (!member) return res.status(403).json({ error: "Not authorised." });
  }
  res.json(data);
});

// Create or update a session
app.post("/api/sessions", requireAuth, async (req, res) => {
  const { id, title, storyText, history, roomCode } = req.body || {};
  if (id) {
    // update existing
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .update({
        title: title || "Untitled story",
        story_text: storyText,
        history,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
  // create new
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .insert({
      user_id: req.user.id,
      title: title || "Untitled story",
      story_text: storyText,
      history,
      room_code: roomCode || null,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ---------------------------------------------------------------------------
// ROOM (COUPLE / GROUP) ROUTES
// ---------------------------------------------------------------------------

// Create a room and become its owner
app.post("/api/rooms", requireAuth, async (req, res) => {
  const code = Math.random().toString(36).slice(2, 7).toUpperCase();
  const { data: room, error } = await supabaseAdmin
    .from("rooms")
    .insert({ code, owner_id: req.user.id })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  // add owner as member
  await supabaseAdmin.from("room_members").insert({ room_code: code, user_id: req.user.id });
  res.json(room);
});

// Join a room by code
app.post("/api/rooms/:code/join", requireAuth, async (req, res) => {
  const { code } = req.params;
  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (!room) return res.status(404).json({ error: "No room found with that code." });
  // upsert membership (idempotent)
  await supabaseAdmin
    .from("room_members")
    .upsert({ room_code: code, user_id: req.user.id }, { onConflict: "room_code,user_id" });
  // return the room's latest session so the joiner can sync
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("room_code", code)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  res.json({ room, session: session || null });
});

// ---------------------------------------------------------------------------
// TTS ROUTES (unchanged from before)
// ---------------------------------------------------------------------------

export const EDGE_VOICES = [
  { id: "en-US-AriaNeural", name: "Aria — warm & clear (US)" },
  { id: "en-US-GuyNeural", name: "Guy — steady & calm (US)" },
  { id: "en-GB-SoniaNeural", name: "Sonia — gentle (UK)" },
  { id: "en-US-JennyNeural", name: "Jenny — bright & encouraging (US)" },
];

app.get("/api/voices/edge", (_req, res) => res.json(EDGE_VOICES));

app.post("/api/tts/edge", async (req, res) => {
  try {
    const { text, voice } = req.body || {};
    if (!text) return res.status(400).json({ error: "Missing 'text'." });
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice || EDGE_VOICES[0].id, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS);
    const { audioStream } = tts.toStream(text);
    res.setHeader("Content-Type", "audio/webm");
    audioStream.on("data", (chunk) => res.write(chunk));
    audioStream.on("end", () => res.end());
    audioStream.on("error", () => res.end());
  } catch (err) {
    console.error("Edge TTS error:", err);
    if (!res.headersSent) res.status(500).json({ error: "TTS generation failed." });
  }
});

app.post("/api/tts/elevenlabs", async (req, res) => {
  try {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) return res.status(501).json({ error: "No ElevenLabs key configured on server." });
    const { text, voiceId } = req.body || {};
    if (!text || !voiceId) return res.status(400).json({ error: "Missing text or voiceId." });
    const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": key },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.55, similarity_boost: 0.75 },
      }),
    });
    if (!elRes.ok) return res.status(elRes.status).json({ error: "ElevenLabs request failed." });
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(await elRes.arrayBuffer()));
  } catch (err) {
    console.error("ElevenLabs proxy error:", err);
    res.status(500).json({ error: "Couldn't reach ElevenLabs." });
  }
});

// ---------------------------------------------------------------------------
app.get("/health", (_req, res) => res.json({ ok: true }));
app.listen(PORT, () => console.log(`Tend backend listening on port ${PORT}`));
