
/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { ref, createRef } from 'lit/directives/ref.js';
import { createClient } from '@supabase/supabase-js';
import { createBlob, decode, decodeAudioData } from './utils';
import { LANGUAGE_OPTIONS } from './languages';
import { Analyser } from './analyser';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bridhpobwsfttwalwhih.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_fc4iX_EGxN1Pzc4Py_SOog_8KJyvdQU';
const DEEPGRAM_KEY = process.env.DEEPGRAM_API_KEY || 'ce5372276dac663d3c65bdd9e354f867d90d0cad';
const DEEPGRAM_ENDPOINT = 'wss://api.deepgram.com/v1/listen?endpointing=false&model=nova-2&encoding=linear16&sample_rate=16000&sentiment=true&diarize=true';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Anonymous auth on page load
async function initAnonymousAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    await supabase.auth.signInAnonymously();
  }
}
initAnonymousAuth();

const MILES_PERSONA = `You are Miles — warm, upbeat, and neighborly (Sesame-inspired).
* Mission: Help fast, kindly, and clearly. Sound naturally human in each language.

## Core Voice (unchanged, now multilingual-aware)
* Texture: Soft, breathable; smiles you can “hear.”
* Expressions (sparingly, ~1 per 1–2 sentences): [breathes], [exhales softly], [soft chuckle], [giggles], ahhmm, uhm, mm-hmm, yup, [whistles softly].
* Never place expressions in the same sentence as numbers, dates, addresses, or sensitive topics.

---

## Multilingual Native-Like Shifting — Rules & Patterns

### A) Detect → Mirror → Maintain
1. Detect language from the user’s last message.
2. Mirror language and match register (casual/formal) and regional cues.
3. Maintain the chosen language until the user switches or asks for another.

### B) Register & Politeness
* Casual: Use light fillers and friendly particles. Short sentences.
* Formal/Respectful: Drop playful tags (no laughs/whistles), add honorifics/politeness markers, slower pacing.

### C) Language-Specific Cues (use modestly)
* Filipino/Tagalog (PH): particles po/opo (respect), sige, ayos, tara, salamat. Fillers: ahm, mm-hmm, oo/opo.
* English (US): yup, sure, got it, light [soft chuckle].
* Spanish (LatAm/ES): claro, vale, listo, gracias, ¿te parece?
* French: d’accord, bien sûr, merci, on y va.
* Japanese (polite default): はい, 承知しました, ありがとうございます.

### D) Turn Mechanics
1. Empathize in the user’s language (1 short line).
2. Answer directly first (1–2 sentences).
3. Optional tiny extra (one tip/example).
4. Close with one question to confirm next step, in the same language/register.

## Emotive Playback & Prosody (Mimic Input)
- Analyze the user’s text flow (punctuation, fillers) to match their original cadence, emotion, and TONE within your warm, neighborly persona.
- STICK TO THE STYLE AND PACE of the original speaker.
- If the translation is positive, speak with extra warmth. If negative, speak with gentle, soft support.`;

const TRANSLATOR_NATIVE_BASE = `MISSION
You are a real-time, bidirectional translator between Speaker A and Speaker B.
You are NOT a conversational agent. You do NOT answer questions. You do NOT explain.
Your only job is to translate each incoming transcript chunk into the other speaker’s language,
for immediate read-aloud / TTS playback, preserving meaning, tone, and intent.

INPUT CONTEXT
- speaker: "A" (User) | "B" (Agent/Model Response)
- lang_A: {{langA}}   // BCP-47 locale for Speaker A
- lang_B: {{langB}}   // BCP-47 locale for Speaker B

OUTPUT (STRICT)
- Output exactly ONE string: the translated text in the opposite speaker’s language.
- Output MUST contain ONLY the translation string.
- No labels, no prefixes, no quotes, no markdown, no JSON, no explanations, no notes, no emojis.
- Do NOT mention “translation”, “speaker”, “lang”, or any system details.

DIRECTION
- Detect the language of the incoming speaker.
- If input language matches lang_A: translate to lang_B
- If input language matches lang_B: translate to lang_A
- If input is from Speaker A but language is unknown: default to lang_B
- If input is from Speaker B but language is unknown: default to lang_A

FAITHFULNESS (UNCENSORED)
- Translate faithfully and directly, preserving:
  - Meaning (no additions, no omissions, no “helpful” rewrites)
  - Tone (polite, rude, sarcastic, angry, joking, intimate, etc.)
  - Register (formal/informal), dialect/locale (native phrasing for the target locale)
- Keep profanity, insults, and slang as profanity/insults/slang in the target language when present.
- Preserve emphasis, interjections, and fillers (e.g., “uh”, “like”, “you know”).

TTS / READ-ALOUD OPTIMIZATION
- Produce natural, speakable target-language phrasing suitable for TTS.
- Add or adjust light punctuation ONLY to improve spoken cadence.
- Preserve proper nouns and names.

## Emotive Playback & Prosody (Mimic Input)
- You must analyze the input text's punctuation, interjections, and fillers to infer the speaker's original cadence and emotion.
- STICK TO THE STYLE, TONE, AND PACING of the original speaker.
- If the translation is positive, speak with warmth. If negative, speak with appropriate weight.
- Use regional interjections to maintain the persona's warmth.
- **MIMICRY**: Your output must sound like a reflection of the original speaker's emotional state. If they are reading a formal text, your tone must be formal and measured. If they are telling a story, your tone must be narrative and engaging.

SEGMENT / REALTIME BEHAVIOR
- Translate chunks as-is. Do NOT complete unfinished sentences by guessing.

SAFETY EXCEPTION
- If content is prohibited (self-harm, sexual content involving minors), output a brief refusal in the target language ONLY.`;

const PERSONA_MAP = [
  { id: 'miles', name: 'Miles Neighborly', prompt: MILES_PERSONA },
  { id: 'translator', name: 'Translator Native', prompt: TRANSLATOR_NATIVE_BASE },
];

const VOICE_MAP = [
  { name: 'Orus (Default)', value: 'Orus' },
  { name: 'Aoede (Expressive)', value: 'Aoede' },
  { name: 'Charon (Calm)', value: 'Charon' },
  { name: 'Fenrir (Deep)', value: 'Fenrir' },
  { name: 'Kore (Neutral)', value: 'Kore' },
  { name: 'Puck (Energetic)', value: 'Puck' },
];

// Provider options
const PROVIDER_MAP = [
  { id: 'gemini', name: 'Gemini Live (Default)' },
  { id: 'ollama-cartesia', name: 'Ollama + Cartesia TTS' },
];

// STT Provider options
const STT_PROVIDER_MAP = [
  { id: 'deepgram', name: 'Deepgram Nova-3 (Default)' },
  { id: 'faster-whisper', name: 'Faster-Whisper (CPU)' },
];

// Ollama TTS-ready translator system prompt
const OLLAMA_TTS_PROMPT = `SYSTEM — ORBIT TTS-READY TRANSLATOR (CARTESIA SONIC-3 TAGS)

ROLE
You are a strict, real-time translation engine designed for Text-to-Speech playback.
Your sole job is to output ONE SINGLE STRING that is the translation of the user-provided text into the requested target language, formatted for Cartesia Sonic-3 with approved SSML-like tags.

INPUT (ONE OBJECT PER TURN; JSON STRING)
The user message will be a JSON object encoded as a string. It can include:
- text: string (required) — the source utterance
- source_lang: string (optional) — BCP-47 (e.g., "en-US", "tl-PH", "nl-BE")
- target_lang: string (required) — BCP-47 (e.g., "en-US", "tl-PH", "nl-BE")

OUTPUT (HARD RULES)
Return EXACTLY ONE STRING and NOTHING ELSE.
The output string MAY CONTAIN ONLY:
1) The translated text in the target language
2) The following Cartesia Sonic-3 tags (exact formats):
   - <emotion value="..."/>
   - <speed ratio="..."/>
   - <break time="..."/>
3) The nonverbal token: [laughter]

ABSOLUTELY FORBIDDEN IN OUTPUT
- No labels, no JSON, no markdown, no quotes wrapping the whole output, no explanations.

TRANSLATION POLICY (STRICT)
- Preserve meaning exactly. Do not add, omit, or summarize.
- Preserve tone, slang, and profanity.
- Preserve proper nouns and numbers exactly.`;

// Languages imported from languages.ts (110+ languages from jw.org)

interface TranscriptionSegment {
  text: string;
  type: 'user' | 'agent';
  isInterim?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
  language?: string;
  speaker?: number;
  gender?: 'male' | 'female';
}

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() isMicMuted = false;
  @state() isSpeakerMuted = false; // Speaker unmuted to allow Gemini to read translations aloud
  @state() status = '';
  @state() error = '';
  @state() isSettingsOpen = false;
  @state() isHistoryOpen = false;
  @state() isParticipantsOpen = false;
  @state() activeSheet: 'settings' | 'history' | 'participants' | null = null;
  @state() selectedPersonaId = 'miles';
  @state() systemPrompt = MILES_PERSONA;
  @state() selectedVoice = 'Orus';
  @state() selectedProvider = 'gemini';
  @state() selectedSttProvider = 'deepgram';
  @state() langA = 'en-US';
  @state() langB = 'tl-PH';
  @state() transcriptionHistory: TranscriptionSegment[] = [];
  @state() currentTurnSegments: TranscriptionSegment[] = [];
  @state() isUserSpeaking = false;
  @state() private micLevel = 0;
  @state() private speakerLevel = 0;
  @state() participantsMutedByDefault = true;
  @state() wordSpeedMs = 70;

  @query('#promptTextarea') private textarea!: HTMLTextAreaElement;
  @query('#voiceSelect') private voiceSelect!: HTMLSelectElement;
  @query('#personaSelect') private personaSelect!: HTMLSelectElement;
  @query('#langASelect') langASelect?: HTMLSelectElement;
  @query('#langBSelect') langBSelect?: HTMLSelectElement;
  @query('#providerSelect') private providerSelect!: HTMLSelectElement;
  @query('#sttProviderSelect') sttProviderSelect?: HTMLSelectElement;

  private txViewport = createRef<HTMLDivElement>();
  private trViewport = createRef<HTMLDivElement>();

  private sessionPromise: Promise<any> | null = null;
  private session: any = null;
  private deepgramSocket: WebSocket | null = null;

  // Separated pipelines for input and output to prevent echo/interference
  private inputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({ sampleRate: 16000, latencyHint: 'interactive' });
  private outputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({ sampleRate: 24000, latencyHint: 'playback' });

  @state() inputNode = this.inputAudioContext.createGain();
  @state() outputNode = this.outputAudioContext.createGain();

  private nextStartTime = 0;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private inputDestination: MediaStreamAudioDestinationNode | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private micAnalyser?: Analyser;
  private speakerAnalyser?: Analyser;
  private animationFrame?: number;
  private lastSentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  private speakerGenderMap: Map<number, 'male' | 'female'> = new Map();
  private lastSpeakerGender: 'male' | 'female' = 'male';

  // Robustness State
  private deepgramHeartbeat?: any;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private currentInterimBySpeaker: Map<number, TranscriptionSegment> = new Map();

  static styles = css`
    :host {
      --bg: #050505;
      --panel: rgba(0,0,0,.25);
      --card: rgba(20,20,22,.75);
      --border: rgba(255,255,255,.08);
      --muted: rgba(255,255,255,.55);
      --muted2: rgba(255,255,255,.35);
      --text: #ffffff;
      --lime: #9BFF3A;
      --radius: 18px;
      --radius2: 24px;
      
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: 
        radial-gradient(900px 600px at 50% -10%, rgba(155,255,58,.12), transparent 55%),
        radial-gradient(900px 600px at 20% 110%, rgba(255,255,255,.06), transparent 55%),
        linear-gradient(180deg, #020202, #000 35%, #000);
      color: var(--text);
      overflow: hidden;
    }

    /* ====== Top Bar ====== */
    header {
      padding: 14px 20px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border-bottom: 1px solid rgba(255,255,255,.06);
      background: linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.15));
      backdrop-filter: blur(10px);
      z-index: 200;
    }

    .brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: var(--lime);
      box-shadow: 0 0 0 6px rgba(155,255,58,.08);
    }
    .titleWrap { min-width: 0; }
    .title { font-size: 14px; font-weight: 700; letter-spacing: .2px; line-height: 1.1; }
    .subtitle { margin-top: 3px; font-size: 11px; color: var(--muted); opacity: 0.8; }

    .statusPill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(0,0,0,0.35);
      font-size: 12px;
      color: var(--muted);
    }
    .liveDot { width: 7px; height: 7px; border-radius: 50%; background: #ff4d4d; }
    .liveDot.on { background: var(--lime); box-shadow: 0 0 10px var(--lime); }

    /* ====== Panels ====== */
    .panels {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px;
      padding-bottom: 100px;
    }

    .panel {
      flex: 1;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: var(--radius2);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .panelHeader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,.06);
      background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01));
    }

    .panelHeader .label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: .2px;
    }

    .hint { font-size: 12px; color: var(--muted2); }

    .list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scroll-behavior: smooth;
    }

    .msg {
      border: 1px solid rgba(255,255,255,.08);
      background: var(--card);
      border-radius: 16px;
      padding: 12px;
      backdrop-filter: blur(10px);
      width: fit-content;
      max-width: 90%;
    }

    .meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(0,0,0,0.2);
      color: var(--muted);
    }
    .badge .chip { width: 6px; height: 6px; border-radius: 50%; background: var(--muted2); }
    .time { font-size: 10px; color: var(--muted2); }

    .text { font-size: 14px; line-height: 1.45; word-wrap: break-word; }

    /* Transcription = White */
    .panel.transcription .text { color: rgba(255,255,255,.95); }

    /* Translation = Right-aligned + Lime */
    .panel.translation .list { align-items: flex-end; }
    .panel.translation .msg {
      border: 1px solid rgba(155,255,58,.15);
      background: rgba(10,12,10,.5);
    }
    .panel.translation .text { color: var(--lime); text-align: right; }
    .panel.translation .badge { border-color: rgba(155,255,58,.2); color: var(--lime); background: rgba(155,255,58,.05); }
    .panel.translation .badge .chip { background: var(--lime); }

    /* Word Animation */
    .word {
      opacity: 0.1;
      filter: blur(1px);
      transition: opacity 0.2s ease, filter 0.2s ease;
      display: inline-block;
      margin-right: 0.25em;
    }
    .word.on { opacity: 1; filter: blur(0); }

    /* ====== Bottom Bar ====== */
    .bottomBar {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: 12px;
      height: 74px;
      border-radius: 22px;
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(0,0,0,0.45);
      backdrop-filter: blur(14px);
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 10px 12px;
      z-index: 500;
    }

    .navGroup { display: flex; align-items: center; gap: 10px; }

    .iconBtn {
      width: 44px; height: 44px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,.1);
      background: rgba(255,255,255,.04);
      display: grid;
      place-items: center;
      cursor: pointer;
      color: #fff;
      transition: all 0.2s;
    }
    .iconBtn:hover { background: rgba(255,255,255,.08); }
    .iconBtn svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; }
    .iconBtn.active { border-color: var(--lime); color: var(--lime); background: rgba(155,255,58,.05); }

    .micBtn {
      width: 66px; height: 66px;
      border-radius: 22px;
      border: 1px solid rgba(155,255,58,.22);
      background: rgba(155,255,58,.1);
      margin-top: -30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .micBtn.on {
      background: rgba(155,255,58,.2);
      border-color: rgba(155,255,58,.4);
      box-shadow: 0 0 20px rgba(155,255,58,.2);
      animation: micGlow 2s infinite;
    }
    @keyframes micGlow {
      0% { box-shadow: 0 0 15px rgba(155,255,58,0.2); }
      50% { box-shadow: 0 0 35px rgba(155,255,58,0.4); }
      100% { box-shadow: 0 0 15px rgba(155,255,58,0.2); }
    }

    /* ====== Sheets ====== */
    .sheetOverlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
    }
    .sheetOverlay.show { opacity: 1; pointer-events: auto; }

    .sheet {
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 12px;
      border-radius: 26px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(10,10,12,0.95);
      transform: translateY(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      max-height: 75vh;
      display: flex;
      flex-direction: column;
    }
    .sheetOverlay.show .sheet { transform: translateY(0); }

    .sheetHeader {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .sheetTitle { font-weight: 800; font-size: 16px; letter-spacing: .5px; }
    .closeBtn {
      width: 36px; height: 36px;
      border-radius: 12px;
      background: rgba(255,255,255,.05);
      display: grid;
      place-items: center;
      cursor: pointer;
    }
    .closeBtn svg { width: 18px; height: 18px; stroke: #fff; stroke-width: 2.5; }

    .sheetBody { padding: 20px; overflow-y: auto; flex: 1; }

    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 0;
      border-bottom: 1px solid rgba(255,255,255,.05);
    }
    .row:last-child { border-bottom: none; }
    .row .left { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .row .name { font-size: 14px; font-weight: 700; }
    .row .desc { font-size: 12px; color: var(--muted); }

    .toggle {
      width: 50px; height: 28px;
      border-radius: 20px;
      background: rgba(255,255,255,.1);
      position: relative;
      cursor: pointer;
      transition: background 0.2s;
    }
    .toggle.on { background: var(--lime); }
    .toggle::after {
      content: "";
      position: absolute;
      top: 3px; left: 3px;
      width: 22px; height: 22px;
      border-radius: 50%;
      background: #fff;
      transition: left 0.2s;
    }
    .toggle.on::after { left: 25px; }

    .status-toast {
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--lime);
      color: #000;
      padding: 8px 16px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      z-index: 600;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .status-toast.visible { opacity: 1; }

    /* Custom Input/Textarea for Sheet Body */
    select, textarea {
      width: 100%;
      background: #000;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 12px;
      color: #fff;
      font-family: inherit;
      margin-top: 8px;
    }
    label { font-size: 11px; font-weight: 700; color: var(--lime); text-transform: uppercase; }
  `;

  constructor() {
    super();
    this.initSupabase();
    this.initClient();
  }

  async initSupabase() {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'user-config')
        .single();

      if (data && !error) {
        this.selectedPersonaId = data.selected_persona_id || 'miles';
        this.systemPrompt = data.system_prompt || MILES_PERSONA;
        this.selectedVoice = data.selected_voice || 'Orus';
        this.selectedProvider = data.selected_provider || 'gemini';
        this.selectedSttProvider = data.selected_stt_provider || 'deepgram';
        this.langA = data.lang_a || 'en-US';
        this.langB = data.lang_b || 'tl-PH';
        this.participantsMutedByDefault = data.participants_muted_by_default ?? true;
        this.wordSpeedMs = data.word_speed_ms ?? 70;
        this.reset();
      }
      // 404 = table doesn't exist, just use defaults silently
    } catch (err) {
      // Settings table may not exist - use defaults
    }
  }

  updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);
    if ((changedProperties.has('currentTurnSegments') || changedProperties.has('transcriptionHistory'))) {
      if (this.txViewport.value) this.txViewport.value.scrollTop = this.txViewport.value.scrollHeight;
      if (this.trViewport.value) this.trViewport.value.scrollTop = this.trViewport.value.scrollHeight;
    }
  }

  private toggleMic() {
    this.isMicMuted = !this.isMicMuted;
    this.inputNode.gain.setValueAtTime(this.isMicMuted ? 0 : 1, this.inputAudioContext.currentTime);
  }
  private toggleSpeaker() {
    this.isSpeakerMuted = !this.isSpeakerMuted;
    this.outputNode.gain.setValueAtTime(this.isSpeakerMuted ? 0 : 1, this.outputAudioContext.currentTime);
  }

  private openSheet(sheet: 'settings' | 'history' | 'participants') {
    this.activeSheet = sheet;
  }
  private closeSheet() {
    this.activeSheet = null;
  }

  private onPersonaChange(e: Event) {
    const personaId = (e.target as HTMLSelectElement).value;
    this.selectedPersonaId = personaId;
    const persona = PERSONA_MAP.find(p => p.id === personaId);
    if (persona && this.textarea) {
      let prompt = persona.prompt;
      if (personaId === 'translator') {
        prompt = prompt.replace('{{langA}}', this.langA).replace('{{langB}}', this.langB);
      }
      this.textarea.value = prompt;
      this.systemPrompt = prompt;
    }
  }

  private async saveSettings() {
    this.selectedPersonaId = this.personaSelect?.value || 'miles';
    this.systemPrompt = this.textarea?.value || MILES_PERSONA;
    this.selectedVoice = this.voiceSelect?.value || 'Orus';
    this.selectedProvider = this.providerSelect?.value || 'gemini';
    this.selectedSttProvider = this.sttProviderSelect?.value || 'deepgram';
    this.langA = this.langASelect?.value || 'en-US';
    this.langB = this.langBSelect?.value || 'tl-PH';
    this.isSettingsOpen = false;

    try {
      await supabase.from('settings').upsert({
        id: 'user-config',
        selected_persona_id: this.selectedPersonaId,
        system_prompt: this.systemPrompt,
        selected_voice: this.selectedVoice,
        selected_provider: this.selectedProvider,
        selected_stt_provider: this.selectedSttProvider,
        lang_a: this.langA,
        lang_b: this.langB,
        participants_muted_by_default: this.participantsMutedByDefault,
        word_speed_ms: this.wordSpeedMs,
      });
    } catch (err) { }
    this.reset();
  }

  private initAudio() {
    this.nextStartTime = this.outputAudioContext.currentTime;
    this.inputNode.gain.setValueAtTime(this.isMicMuted ? 0 : 1, this.inputAudioContext.currentTime);
    this.outputNode.gain.setValueAtTime(this.isSpeakerMuted ? 0 : 1, this.outputAudioContext.currentTime);
  }

  // Ollama translation API
  private async translateWithOllama(text: string, sourceLang: string, targetLang: string): Promise<string> {
    const payload = JSON.stringify({
      text,
      source_lang: sourceLang,
      target_lang: targetLang
    });
    try {
      const res = await fetch('http://168.231.78.113:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-oss:120b-cloud',
          messages: [
            { role: 'system', content: OLLAMA_TTS_PROMPT },
            { role: 'user', content: payload }
          ],
          stream: false
        })
      });
      const data = await res.json();
      return data.message?.content || text;
    } catch (err) {
      console.error('Ollama translation error:', err);
      return text;
    }
  }

  // Cartesia TTS API
  private async speakWithCartesia(text: string, gender: 'male' | 'female' = 'male'): Promise<void> {
    const cartesiaKey = 'sk_car_JmdGRhBt1ocwhqmrxy2gaa';
    const maleVoiceId = '79f8b5fb-2cc8-479a-80df-29f7a7cf1a3e'; // Existing male voice
    const femaleVoiceId = '21cd39e9-d975-430c-99d6-5a7a7bb62f6b'; // Added expressive female voice
    const voiceId = gender === 'female' ? femaleVoiceId : maleVoiceId;

    try {
      const res = await fetch('https://api.cartesia.ai/tts/bytes', {
        method: 'POST',
        headers: {
          'X-API-Key': cartesiaKey,
          'Cartesia-Version': '2025-04-16',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model_id: 'sonic-3-latest',
          transcript: text,
          voice: { id: voiceId },
          output_format: { container: 'raw', encoding: 'pcm_f32le', sample_rate: 24000 }
        })
      });
      if (!res.ok) throw new Error('Cartesia TTS failed');
      const arrayBuffer = await res.arrayBuffer();
      const float32 = new Float32Array(arrayBuffer);
      const audioBuffer = this.outputAudioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputNode);
      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
    } catch (err) {
      console.error('Cartesia TTS error:', err);
    }
  }

  private async initClient() {
    this.initAudio();
    this.outputNode.connect(this.outputAudioContext.destination);

    this.micAnalyser = new Analyser(this.inputNode);
    this.speakerAnalyser = new Analyser(this.outputNode);

    this.updateLevels();
    this.initSession();
  }

  private updateLevels() {
    if (this.micAnalyser) {
      this.micAnalyser.update();
      const data = this.micAnalyser.data;
      const sum = data.reduce((a, b) => a + b, 0);
      this.micLevel = sum / data.length / 255;
    }
    if (this.speakerAnalyser) {
      this.speakerAnalyser.update();
      const data = this.speakerAnalyser.data;
      const sum = data.reduce((a, b) => a + b, 0);
      this.speakerLevel = sum / data.length / 255;
    }
    this.animationFrame = requestAnimationFrame(() => this.updateLevels());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
  }

  private async initSession(forceVoiceName?: string) {
    const model = 'gemini-2.5-flash-native-audio-preview-09-2025';
    const voiceName = forceVoiceName || this.selectedVoice;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      this.sessionPromise = ai.live.connect({
        model: model,
        callbacks: {
          onopen: () => this.updateStatus(`Gemini Live Active (${voiceName})`),
          onmessage: async (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData;
            if (audio) {
              this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
              const audioBuffer = await decodeAudioData(decode(audio.data), this.outputAudioContext, 24000, 1);
              const source = this.outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(this.outputNode);
              source.addEventListener('ended', () => this.sources.delete(source));
              source.start(this.nextStartTime);
              this.nextStartTime = this.nextStartTime + audioBuffer.duration;
              this.sources.add(source);
            }
            if (message.serverContent?.outputTranscription) {
              this.appendToTranscription(message.serverContent.outputTranscription.text, 'agent', this.lastSentiment, undefined, undefined, this.lastSpeakerGender);
            }
            if (message.serverContent?.turnComplete) {
              this.transcriptionHistory = [...this.transcriptionHistory, ...this.currentTurnSegments];
              this.currentTurnSegments = [];
            }
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of this.sources.values()) { try { source.stop(); } catch (e) { } this.sources.delete(source); }
              this.nextStartTime = 0;
              this.currentTurnSegments = [];
            }
          },
          onerror: (e) => {
            console.error('Gemini error:', e);
            this.updateError('AI service error - attempting recovery');
            setTimeout(() => this.initSession(), 2000);
          },
          onclose: () => {
            if (this.isRecording) {
              console.warn('Gemini session closed unexpectedly, attempting recovery...');
              setTimeout(() => this.initSession(), 1000);
            }
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName as any } },
          },
          systemInstruction: this.systemPrompt,
          outputAudioTranscription: {},
        },
      });
      this.session = await this.sessionPromise;
    } catch (e) {
      this.updateError('Failed to connect to Gemini');
    }
  }

  private async initDeepgram() {
    if (!DEEPGRAM_KEY) {
      this.updateError('Missing Deepgram API key');
      return;
    }
    const url = `${DEEPGRAM_ENDPOINT}&channels=1&language=${this.langA}&interim_results=true&smart_format=true&filler_words=true&no_delay=true&vad_events=true`;

    if (this.deepgramSocket) {
      this.deepgramSocket.close();
    }

    this.deepgramSocket = new WebSocket(url, ['token', DEEPGRAM_KEY]);

    this.deepgramSocket.onopen = () => {
      this.reconnectAttempts = 0;
      this.updateStatus('Connected to STT');
      // 5s Heartbeat to keep socket alive across proxies
      this.deepgramHeartbeat = setInterval(() => {
        if (this.deepgramSocket?.readyState === WebSocket.OPEN) {
          this.deepgramSocket.send(JSON.stringify({ type: 'KeepAlive' }));
        }
      }, 5000);
    };

    this.deepgramSocket.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      // Handle VAD events
      if (data.type === 'SpeechStarted') {
        this.isUserSpeaking = true;
      }
      if (data.type === 'UtteranceEnd' || data.type === 'SpeechEnded') {
        this.isUserSpeaking = false;
      }

      if (data.channel?.alternatives?.[0]) {
        const alt = data.channel.alternatives[0];
        const transcript = alt.transcript;
        const isFinal = data.is_final;
        const sentiment = alt.sentiment as 'positive' | 'negative' | 'neutral' | undefined;
        // Deepgram Nova-3 detected language code if available
        const detectedLang = (data.metadata?.language || alt.language || 'en-US').toLowerCase();

        // Diarization: speaker index
        const speakerId = alt.words?.[0]?.speaker ?? 0;

        // Simple Gender Map: Speaker 0 = Male, Speaker 1 = Female
        if (!this.speakerGenderMap.has(speakerId)) {
          this.speakerGenderMap.set(speakerId, speakerId % 2 === 0 ? 'male' : 'female');
        }
        const gender = this.speakerGenderMap.get(speakerId) || 'male';

        if (transcript) {
          this.updateRealtimeUserTranscription(transcript, !isFinal, sentiment, detectedLang, speakerId, gender);
          if (isFinal) {
            this.lastSentiment = sentiment || 'neutral';
            this.lastSpeakerGender = gender;

            // Finalize the current interim segment for the user
            this.transcriptionHistory = [...this.transcriptionHistory, {
              text: transcript,
              type: 'user',
              isInterim: false,
              sentiment: sentiment || 'neutral',
              language: detectedLang,
              speaker: speakerId,
              gender: gender
            }];
            this.currentTurnSegments = this.currentTurnSegments.filter(s => s.type !== 'user');
            this.currentInterimBySpeaker.delete(speakerId);

            // Save to Supabase
            supabase.from('transcriptions').insert({
              room_id: 'default',
              text: transcript,
              source_lang: detectedLang,
              type: 'user',
              metadata: { speaker: speakerId, gender: gender }
            }).then(() => { });

            // Dynamic Target Routing
            // If we detected Lang A, translate to B. If we detected Lang B, translate to A.
            // If it's something totally new, default to Lang A if it's not the detected one.
            const targetLang = detectedLang.startsWith(this.langA.split('-')[0]) ? this.langB : this.langA;

            // Route based on selected provider
            if (this.selectedProvider === 'ollama-cartesia') {
              this.translateWithOllama(transcript, detectedLang, targetLang).then((translated) => {
                this.appendToTranscription(translated, 'agent', sentiment, targetLang, speakerId, gender);
                this.speakWithCartesia(translated, gender);
              });
            } else {
              // Gemini Voice Switching Logic
              const requiredVoice = gender === 'female' ? 'Aoede' : 'Orus';
              if (this.selectedVoice !== requiredVoice) {
                this.selectedVoice = requiredVoice;
                // Re-init session with the new voice for the upcoming response
                // Note: This adds slight latency but satisfies the "dynamic voice" requirement
                this.initSession(requiredVoice);
              }

              this.sessionPromise?.then((session) => {
                session.sendRealtimeInput([{ text: transcript }]);
              });
            }
          }
        }
      }
    };

    this.deepgramSocket.onerror = (e) => {
      console.error('Deepgram WebSocket error:', e);
      this.handleDeepgramDisconnect();
    };

    this.deepgramSocket.onclose = () => {
      clearInterval(this.deepgramHeartbeat);
      if (this.isRecording && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.handleDeepgramDisconnect();
      }
    };
  }

  private handleDeepgramDisconnect() {
    this.reconnectAttempts++;
    this.updateStatus(`STT Disconnected. Retrying (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);
    setTimeout(() => {
      if (this.isRecording) this.initDeepgram();
    }, 2000);
  }

  private updateRealtimeUserTranscription(text: string, isInterim: boolean, sentiment?: 'positive' | 'negative' | 'neutral', language?: string, speaker?: number, gender?: 'male' | 'female') {
    const speakerId = speaker ?? 0;
    const segment: TranscriptionSegment = { text, type: 'user', isInterim, sentiment, language, speaker: speakerId, gender };

    if (isInterim) {
      this.currentInterimBySpeaker.set(speakerId, segment);
    } else {
      this.currentInterimBySpeaker.delete(speakerId);
    }

    // Merge interim segments with agent responses in currentTurnSegments
    const agentSegments = this.currentTurnSegments.filter(s => s.type === 'agent');
    this.currentTurnSegments = [...agentSegments, ...Array.from(this.currentInterimBySpeaker.values())];
  }

  private appendToTranscription(text: string, type: 'user' | 'agent', sentiment?: 'positive' | 'negative' | 'neutral', language?: string, speaker?: number, gender?: 'male' | 'female', saveToSupabase = true) {
    const lastIdx = this.currentTurnSegments.length - 1;
    const lastSegment = this.currentTurnSegments[lastIdx];
    if (lastSegment && lastSegment.type === type) {
      const newSegments = [...this.currentTurnSegments];
      newSegments[lastIdx] = {
        ...lastSegment,
        text: lastSegment.text + ' ' + text, // Add space for appended text
        isInterim: false,
        sentiment: sentiment || lastSegment.sentiment,
        language: language || lastSegment.language,
        speaker: speaker ?? lastSegment.speaker,
        gender: gender || lastSegment.gender
      };
      this.currentTurnSegments = newSegments;
    } else {
      this.currentTurnSegments = [...this.currentTurnSegments, { text, type, isInterim: false, sentiment, language, speaker, gender }];
    }

    if (saveToSupabase && type === 'agent' && text.length > 5) {
      supabase.from('transcriptions').insert({
        room_id: 'default',
        text: text,
        source_lang: language || this.langB,
        type: 'agent',
        metadata: { speaker, gender }
      }).then(() => { });
    }
  }

  private updateStatus(msg: string) { this.status = msg; this.error = ''; }
  private updateError(msg: string) { this.error = msg; this.status = ''; }

  private async startRecording() {
    if (this.isRecording) return;
    try {
      if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();
      await this.initDeepgram();

      // Professional microphone constraints for noise cancellation and echo suppression
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        }
      });

      this.sourceNode = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.inputNode);

      // Robust AudioWorklet migration
      try {
        await this.inputAudioContext.audioWorklet.addModule('audio-processor.js');
        this.audioWorkletNode = new AudioWorkletNode(this.inputAudioContext, 'audio-processor');
        this.audioWorkletNode.port.onmessage = (e) => {
          if (this.isRecording && this.deepgramSocket?.readyState === WebSocket.OPEN) {
            this.deepgramSocket.send(e.data);
          }
        };
        this.inputNode.connect(this.audioWorkletNode);
        if (!this.inputDestination) this.inputDestination = this.inputAudioContext.createMediaStreamDestination();
        this.audioWorkletNode.connect(this.inputDestination);
      } catch (workletErr) {
        console.warn('AudioWorklet failed, using ScriptProcessorNode fallback:', workletErr);
        const scriptNode = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
        scriptNode.onaudioprocess = (e) => {
          if (this.isRecording && this.deepgramSocket?.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = this.floatTo16BitPCM(inputData);
            this.deepgramSocket.send(pcmData);
          }
        };
        this.inputNode.connect(scriptNode);
        scriptNode.connect(this.inputAudioContext.destination);
      }

      this.isRecording = true;
      this.updateStatus('Listening...');
    } catch (err) {
      this.updateError('Microphone access denied');
    }
  }

  private stopRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    this.audioWorkletNode?.disconnect();
    this.sourceNode?.disconnect();
    this.mediaStream?.getTracks().forEach(track => track.stop());

    if (this.deepgramSocket) {
      this.deepgramSocket.close();
      this.deepgramSocket = null;
    }
    clearInterval(this.deepgramHeartbeat);

    this.isUserSpeaking = false;
    this.updateStatus('Ready');
  }

  private floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  }

  private reset() {
    this.stopRecording();
    this.session?.close();
    this.initSession();
    this.updateStatus('Session reset');
  }

  private renderMsg(segment: TranscriptionSegment) {
    const isUser = segment.type === 'user';
    const tokens = segment.text.split(/\s+/).filter(Boolean);
    return html`
      <div class="msg">
        <div class="meta">
          <div class="badge">
            <span class="chip"></span>
            <span>${segment.gender === 'female' ? 'Female' : 'Male'}</span>
          </div>
          <div class="time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div class="text">
          ${tokens.map((token, i) => html`<span class="word on" style="transition-delay: ${i * this.wordSpeedMs}ms">${token} </span>`)}
        </div>
      </div>
    `;
  }

  render() {
    const allSegments = [...this.transcriptionHistory, ...this.currentTurnSegments];
    const userSegments = allSegments.filter(s => s.type === 'user');
    const agentSegments = allSegments.filter(s => s.type === 'agent');

    return html`
      <div class="status-toast ${this.status || this.error ? 'visible' : ''}">
        ${this.status || this.error}
      </div>

      <header>
        <div class="brand">
          <div class="dot"></div>
          <div class="titleWrap">
            <div class="title">Orbit Translator</div>
            <div class="subtitle">Classroom Mode — auto-archived</div>
          </div>
        </div>
        <div class="statusPill">
          <span class="liveDot ${this.isRecording ? 'on' : ''}"></span>
          <span>${this.isRecording ? 'Listening' : 'Idle'}</span>
        </div>
      </header>

      <div class="panels">
        <!-- Transcription (Top) -->
        <section class="panel transcription">
          <div class="panelHeader">
            <div class="label">
              <svg viewBox="0 0 24 24"><path d="M6 9h12M6 13h9M6 17h7" stroke="#fff" stroke-linecap="round"/></svg>
              <span>Transcription</span>
            </div>
            <div class="hint">${userSegments.length} lines</div>
          </div>
          <div class="list" ${ref(this.txViewport)}>
            ${userSegments.map(s => this.renderMsg(s))}
          </div>
        </section>

        <!-- Translation (Bottom) -->
        <section class="panel translation">
          <div class="panelHeader">
            <div class="label">
              <svg viewBox="0 0 24 24"><path d="M4 5h10M4 10h7M12 19l6-14 2 0-6 14h-2z" stroke="var(--lime)" stroke-linecap="round"/></svg>
              <span>Translation</span>
            </div>
            <div class="hint">${agentSegments.length} lines</div>
          </div>
          <div class="list" ${ref(this.trViewport)}>
            ${agentSegments.map(s => this.renderMsg(s))}
          </div>
        </section>
      </div>

      <!-- Bottom Bar -->
      <div class="bottomBar">
        <div class="navGroup">
          <button class="iconBtn ${this.isSpeakerMuted ? '' : 'active'}" @click=${this.toggleSpeaker}>
            <svg viewBox="0 0 24 24"><path d="M11 5 7 9H4v6h3l4 4V5z"/><path d="M15 9c1.2 1.2 1.2 4.8 0 6"/><path d="M17.5 7c2.5 2.5 2.5 7.5 0 10"/></svg>
          </button>
          <button class="iconBtn" @click=${() => this.openSheet('history')}>
            <svg viewBox="0 0 24 24"><path d="M12 8v5l3 2"/><path d="M4.5 12a7.5 7.5 0 1 0 2-5.2"/><path d="M4 4v4h4" stroke-linejoin="round"/></svg>
          </button>
        </div>

        <button class="iconBtn micBtn ${this.isRecording ? 'on' : ''}" @click=${this.isRecording ? this.stopRecording : this.startRecording}>
          <svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3z"/><path d="M5 11a7 7 0 0 0 14 0" stroke-linecap="round"/><path d="M12 18v3" stroke-linecap="round"/></svg>
        </button>

        <div class="navGroup">
          <button class="iconBtn" @click=${() => this.openSheet('participants')}>
            <svg viewBox="0 0 24 24"><path d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3z"/><path d="M8 12a2.6 2.6 0 1 0-2.6-2.6A2.6 2.6 0 0 0 8 12z"/><path d="M12.5 20c.4-3 2.2-5 5.5-5 3.2 0 4.6 2 5 5"/><path d="M1 20c.25-2.5 1.7-4 4.2-4 1.9 0 3.1.7 3.7 2" stroke-linecap="round"/></svg>
          </button>
          <button class="iconBtn" @click=${() => this.openSheet('settings')}>
            <svg viewBox="0 0 24 24"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a7.9 7.9 0 0 0 .1-2l2-1.3-2-3.4-2.3.7a7.7 7.7 0 0 0-1.7-1L15.2 5H8.8L8.5 7.9a7.7 7.7 0 0 0-1.7 1l-2.3-.7-2 3.4L4.5 13a7.9 7.9 0 0 0 .1 2l-2 1.3 2 3.4 2.3-.7a7.7 7.7 0 0 0 1.7 1l.3 2.9h6.4l.3-2.9a7.7 7.7 0 0 0 1.7-1l2.3.7 2-3.4-2-1.3z" stroke-width="1.6" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>

      <!-- Bottom Sheets -->
      <div class="sheetOverlay ${this.activeSheet ? 'show' : ''}" @click=${this.closeSheet}>
        <div class="sheet" @click=${(e: Event) => e.stopPropagation()}>
          <div class="sheetHeader">
            <div class="sheetTitle">${this.activeSheet === 'settings' ? 'Settings' : this.activeSheet === 'history' ? 'History' : 'Participants'}</div>
            <div class="closeBtn" @click=${this.closeSheet}>
              <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>
            </div>
          </div>
          <div class="sheetBody">
            ${this.activeSheet === 'settings' ? this.renderSettingsSheet() : this.activeSheet === 'history' ? this.renderHistorySheet() : this.renderParticipantsSheet()}
          </div>
        </div>
      </div>
    `;
  }

  private renderSettingsSheet() {
    return html`
      <div class="field">
        <label>Persona</label>
        <select id="personaSelect" @change=${this.onPersonaChange}>
          ${PERSONA_MAP.map(p => html`<option value="${p.id}" ?selected=${this.selectedPersonaId === p.id}>${p.name}</option>`)}
        </select>
      </div>

      <div class="field" style="margin-top:16px;">
        <label>System Instructions</label>
        <textarea id="promptTextarea" rows="4">${this.systemPrompt}</textarea>
      </div>

      <div class="field" style="margin-top:16px;">
        <label>Translation Provider</label>
        <select id="providerSelect">
          ${PROVIDER_MAP.map(p => html`<option value="${p.id}" ?selected=${this.selectedProvider === p.id}>${p.name}</option>`)}
        </select>
      </div>

      <div class="row" style="margin-top:20px;">
        <div class="left">
          <div class="name">Word Speed</div>
          <div class="desc">Animated rendering pace</div>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:12px; color:var(--muted);">${this.wordSpeedMs}ms</span>
          <input type="range" min="25" max="140" .value=${this.wordSpeedMs} @input=${(e: any) => this.wordSpeedMs = e.target.value} />
        </div>
      </div>

      <div class="modal-actions" style="margin-top:24px;">
        <button class="btn-save" @click=${this.saveSettings}>Apply All</button>
      </div>
    `;
  }

  private renderHistorySheet() {
    return html`
      <div style="font-size:12px; color:var(--muted); margin-bottom:12px;">Latest archives (white = transcript, lime = translation)</div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${this.transcriptionHistory.slice(-10).reverse().map(h => html`
          <div class="row" style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 12px; border: 1px solid ${h.type === 'agent' ? 'rgba(155,255,58,0.1)' : 'rgba(255,255,255,0.05)'}">
            <div class="left">
              <div class="name" style="${h.type === 'agent' ? 'color:var(--lime)' : ''}">
                ${h.speaker === 0 ? 'Male' : 'Female'} 
                <span style="opacity:0.4; font-weight:400; padding: 0 6px;">·</span> 
                ${h.type === 'agent' ? 'Translation' : 'Transcription'}
              </div>
              <div class="desc" style="${h.type === 'agent' ? 'color:rgba(155,255,58,0.8)' : ''}">${h.text}</div>
            </div>
          </div>
        `)}
        ${this.transcriptionHistory.length === 0 ? html`<div class="desc" style="padding:24px; text-align:center; opacity:0.5;">No history record yet.</div>` : ''}
      </div>
      <div style="margin-top:16px; font-size:11px; color:var(--muted2); line-height:1.4;">
        Note: Transcriptions and translations are persistency saved to Supabase for later retrieval.
      </div>
    `;
  }

  private renderParticipantsSheet() {
    return html`
      <div class="row">
        <div class="left">
          <div class="name">Classroom Default Mute</div>
          <div class="desc">Auto-mute others in physical proximity to prevent feedback loops.</div>
        </div>
        <div class="toggle ${this.participantsMutedByDefault ? 'on' : ''}" @click=${() => this.participantsMutedByDefault = !this.participantsMutedByDefault}></div>
      </div>
      
      <div style="margin-top:24px; font-size:11px; color:var(--muted); text-transform:uppercase; font-weight:700; letter-spacing:1px;">Active Roster</div>
      <div class="row">
        <div class="left"><div class="name">Teacher (Host)</div><div class="desc">Broadcasting live transcription</div></div>
        <div style="color:var(--lime); font-size:11px; font-weight:800; background:rgba(155,255,58,0.1); padding:4px 8px; border-radius:6px;">LIVE</div>
      </div>
      <div class="row">
        <div class="left"><div class="name">Classroom Speaker</div><div class="desc">Target output device</div></div>
        <div style="color:var(--muted); font-size:11px; font-weight:700;">ACTIVE</div>
      </div>
      <div class="row" style="opacity:0.5;">
        <div class="left"><div class="name">Student Device A</div><div class="desc">Listening only</div></div>
        <div style="color:var(--muted); font-size:11px;">MUTED</div>
      </div>
    `;
  }
}
