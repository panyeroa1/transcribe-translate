
/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { LitElement, css, html, PropertyValues } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { createClient } from '@supabase/supabase-js';
import { createBlob, decode, decodeAudioData } from './utils';
import { LANGUAGE_OPTIONS } from './languages';
import { Analyser } from './analyser';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bridhpobwsfttwalwhih.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_fc4iX_EGxN1Pzc4Py_SOog_8KJyvdQU';
const DEEPGRAM_KEY = process.env.DEEPGRAM_API_KEY || 'ce5372276dac663d3c65bdd9e354f867d90d0cad';
const DEEPGRAM_ENDPOINT = 'wss://api.deepgram.com/v1/listen?endpointing=false&detect_language=true&model=nova-3&encoding=linear16&sample_rate=16000&sentiment=true';

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
- Analyze the user’s text flow (punctuation, fillers) to match their original cadence and emotion within your warm, neighborly persona.
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
- You must analysis the input text's punctuation, interjections, and fillers to infer the speaker's original cadence and emotion.
- Adjust your TTS output (speed, tone, emphasis) to match that sentiment.
- If the translation is positive, speak with warmth. If negative, speak with appropriate weight.
- Use regional interjections to maintain the persona's warmth.

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
}

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() isMicMuted = false;
  @state() isSpeakerMuted = false; // Speaker unmuted to allow Gemini to read translations aloud
  @state() status = '';
  @state() error = '';
  @state() isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  @state() isSettingsOpen = false;
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

  @query('#promptTextarea') private textarea!: HTMLTextAreaElement;
  @query('#voiceSelect') private voiceSelect!: HTMLSelectElement;
  @query('#personaSelect') private personaSelect!: HTMLSelectElement;
  @query('#langASelect') private langASelect!: HTMLSelectElement;
  @query('#langBSelect') private langBSelect!: HTMLSelectElement;
  @query('#providerSelect') private providerSelect!: HTMLSelectElement;
  @query('#sttProviderSelect') private sttProviderSelect!: HTMLSelectElement;
  @query('.transcription-container') private transcriptionContainer!: HTMLElement;

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

  static styles = css`
    :host {
      --bg-gradient: radial-gradient(circle at 50% 50%, #f8f9fa 0%, #e9ecef 100%);
      --text-color: #202124;
      --control-bg: rgba(255, 255, 255, 0.9);
      --control-border: rgba(0, 0, 0, 0.1);
      --control-shadow: 0 10px 40px rgba(0,0,0,0.1);
      --icon-color: #495057;
      --status-color: #6c757d;
      --accent-color: #1a73e8;
      --modal-bg: rgba(255, 255, 255, 0.98);
      --danger-color: #d93025;
      
      --user-blue: #1a73e8;
      --user-blue-soft: rgba(26, 115, 232, 0.1);
      --agent-purple: #9333ea;
      --agent-purple-soft: rgba(147, 51, 234, 0.1);
      --transcription-text-color: #ffffff;
      --translation-text-color: #f3e8ff;
      --pos-color: #4ade80;
      --neg-color: #f87171;
      --neu-color: #60a5fa;
      
      display: flex;
      flex-direction: column;
      width: 100vw;
      height: 100vh;
      background: var(--bg-gradient);
      color: var(--text-color);
      font-family: 'Google Sans', 'Roboto', Arial, sans-serif;
      overflow: hidden;
      position: relative;
      transition: all 0.5s ease;
    }

    :host([dark]) {
      --bg-gradient: radial-gradient(circle at 50% 50%, #1a1c1e 0%, #0a0b0c 100%);
      --text-color: #f1f3f4;
      --control-bg: rgba(32, 33, 36, 0.9);
      --control-border: rgba(255, 255, 255, 0.15);
      --control-shadow: 0 10px 40px rgba(0,0,0,0.5);
      --icon-color: #dee2e6;
      --status-color: #adb5bd;
      --accent-color: #8ab4f8;
      --modal-bg: rgba(32, 33, 36, 1);
      
      --user-blue: #8ab4f8;
      --user-blue-soft: rgba(138, 180, 248, 0.15);
      --agent-purple: #c084fc;
      --agent-purple-soft: rgba(192, 132, 252, 0.15);
    }

    header {
      display: flex;
      justify-content: space-between;
      padding: 0 40px;
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.7);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--control-border);
      z-index: 150;
    }

    h1 {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-color);
      letter-spacing: -0.02em;
      margin: 0;
    }

    .transcription-viewport {
      position: fixed;
      bottom: 120px;
      left: 0;
      right: 0;
      height: 250px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      overflow: hidden;
      padding: 20px;
      pointer-events: none;
      z-index: 100;
      mask-image: linear-gradient(to top, black 80%, transparent 100%);
    }

    .transcription-container {
      max-width: 900px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 16px;
      scroll-behavior: smooth;
      pointer-events: auto;
    }

    .segment {
      display: flex;
      flex-direction: column;
      align-self: center;
      max-width: 90%;
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 1.25rem;
      line-height: 1.4;
      font-weight: 500;
      text-align: center;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(10px);
      color: white;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      animation: subtitle-in 0.4s ease-out forwards;
      border: 1px solid rgba(255,255,255,0.1);
    }

    @keyframes subtitle-in {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .segment-user {
      border-left: 4px solid var(--user-blue);
    }

    .segment-agent {
      border-left: 4px solid var(--agent-purple);
      color: #f3e8ff;
    }

    .interim {
      opacity: 0.8;
      background: rgba(0, 0, 0, 0.6);
    }

    .segment-label {
      font-size: 0.65rem;
      font-weight: 700;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.6;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .lang-badge {
      font-size: 0.6rem;
      background: rgba(255, 255, 255, 0.15);
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 8px;
    }

    .transcription-word {
      display: inline-block;
      margin-right: 0.25em;
      opacity: 0;
      animation: reveal-word 0.3s ease-out forwards;
      animation-delay: calc(var(--word-index) * 0.05s);
    }

    .sentiment-positive .transcription-word {
      color: var(--pos-color);
      text-shadow: 0 0 8px rgba(74, 222, 128, 0.2);
    }

    .sentiment-negative .transcription-word {
      color: var(--neg-color);
      text-shadow: 0 0 8px rgba(248, 113, 113, 0.2);
    }

    .sentiment-neutral .transcription-word {
      color: var(--neu-color);
      text-shadow: 0 0 8px rgba(96, 165, 250, 0.2);
    }

    @keyframes reveal-word {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }

    #status {
      position: absolute;
      bottom: 20px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 12px;
      color: var(--status-color);
      pointer-events: none;
      z-index: 50;
      background: linear-gradient(transparent, var(--bg-gradient));
      padding-top: 40px;
    }

    .controls {
      z-index: 100;
      position: absolute;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      padding: 8px 16px;
      background: var(--control-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 40px;
      box-shadow: var(--control-shadow);
      border: 1px solid var(--control-border);
      gap: 12px;

      button {
        outline: none;
        border: none;
        background: transparent;
        cursor: pointer;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        width: 42px;
        height: 42px;
        transition: all 0.2s ease;

        .visualizer {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid transparent;
          pointer-events: none;
          transition: transform 0.1s ease;
        }

        &.active-audio .visualizer {
          border-color: currentColor;
          opacity: 0.3;
        }

        &:hover { background: rgba(0, 0, 0, 0.05); }
        &:active { transform: scale(0.95); }

        svg { fill: var(--icon-color); width: 22px; height: 22px; }
        &.muted svg { fill: var(--danger-color); }
      }

      button#startButton {
        background: var(--user-blue);
        svg { fill: white; }
        &:hover { filter: brightness(1.1); }
      }

      button#stopButton {
        background: #202124;
        svg { fill: white; }
      }

      .divider { width: 1px; height: 24px; background: var(--control-border); }
    }

    .settings-modal {
      position: fixed;
      inset: 0;
      z-index: 200;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(8px);
    }

    .settings-content {
      background: var(--modal-bg);
      width: 90%;
      max-width: 500px;
      max-height: 85vh;
      overflow-y: auto;
      padding: 32px;
      border-radius: 32px;
      box-shadow: 0 30px 60px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    h2 { margin: 0; font-size: 22px; font-weight: 600; }
    .field { display: flex; flex-direction: column; gap: 8px; }
    label { font-size: 13px; font-weight: 600; opacity: 0.7; }
    
    textarea, select {
      padding: 14px;
      border-radius: 16px;
      border: 1px solid var(--control-border);
      background: rgba(0, 0, 0, 0.02);
      color: var(--text-color);
      font-size: 14px;
      outline: none;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 10px;
    }

    .btn-save {
      background: var(--user-blue);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 14px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-cancel {
      background: transparent;
      color: var(--status-color);
      border: 1px solid var(--control-border);
      padding: 12px 24px;
      border-radius: 14px;
      font-weight: 600;
      cursor: pointer;
    }
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
        this.reset();
      }
      // 404 = table doesn't exist, just use defaults silently
    } catch (err) {
      // Settings table may not exist - use defaults
    }
  }

  updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);
    if (changedProperties.has('isDarkMode')) {
      if (this.isDarkMode) this.setAttribute('dark', '');
      else this.removeAttribute('dark');
    }
    if ((changedProperties.has('currentTurnSegments') || changedProperties.has('transcriptionHistory')) && this.transcriptionContainer) {
      this.transcriptionContainer.scrollTop = this.transcriptionContainer.scrollHeight;
    }
  }

  private toggleDarkMode() { this.isDarkMode = !this.isDarkMode; }
  private toggleMic() {
    this.isMicMuted = !this.isMicMuted;
    this.inputNode.gain.setValueAtTime(this.isMicMuted ? 0 : 1, this.inputAudioContext.currentTime);
  }
  private toggleSpeaker() {
    this.isSpeakerMuted = !this.isSpeakerMuted;
    this.outputNode.gain.setValueAtTime(this.isSpeakerMuted ? 0 : 1, this.outputAudioContext.currentTime);
  }
  private toggleSettings() { this.isSettingsOpen = !this.isSettingsOpen; }

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
        lang_b: this.langB
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
  private async speakWithCartesia(text: string): Promise<void> {
    const cartesiaKey = 'sk_car_JmdGRhBt1ocwhqmrxy2gaa';
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
          voice: { id: '79f8b5fb-2cc8-479a-80df-29f7a7cf1a3e' },
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

  private async initSession() {
    const model = 'gemini-2.5-flash-native-audio-preview-09-2025';
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      this.sessionPromise = ai.live.connect({
        model: model,
        callbacks: {
          onopen: () => this.updateStatus('Gemini Live Active'),
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
              this.appendToTranscription(message.serverContent.outputTranscription.text, 'agent', this.lastSentiment);
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
          onerror: (e: ErrorEvent) => this.updateError(e.message || 'Gemini Error'),
          onclose: (e: CloseEvent) => this.updateStatus('Session Closed'),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: this.selectedVoice as any } },
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
    // Dedicated STT endpoint to keep input processing independent of TTS playback.
    const url = `${DEEPGRAM_ENDPOINT}&channels=1&interim_results=true&smart_format=true&filler_words=true&no_delay=true&vad_events=true`;

    this.deepgramSocket = new WebSocket(url, ['token', DEEPGRAM_KEY]);

    this.deepgramSocket.onopen = () => this.updateStatus('Enhanced Audio Ready');
    this.deepgramSocket.onmessage = (msg) => {
      const data = JSON.parse(msg.data);

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

        if (transcript) {
          this.updateRealtimeUserTranscription(transcript, !isFinal, sentiment, detectedLang);
          if (isFinal) {
            this.lastSentiment = sentiment || 'neutral';
            // Finalize the current interim segment for the user
            this.transcriptionHistory = [...this.transcriptionHistory, {
              text: transcript,
              type: 'user',
              isInterim: false,
              sentiment: sentiment || 'neutral',
              language: detectedLang
            }];
            this.currentTurnSegments = this.currentTurnSegments.filter(s => s.type !== 'user');

            // Save to Supabase
            supabase.from('transcriptions').insert({
              room_id: 'default',
              text: transcript,
              source_lang: detectedLang,
              type: 'user'
            }).then(() => { });

            // Dynamic Target Routing
            // If we detected Lang A, translate to B. If we detected Lang B, translate to A.
            // If it's something totally new, default to Lang A if it's not the detected one.
            const targetLang = detectedLang.startsWith(this.langA.split('-')[0]) ? this.langB : this.langA;

            // Route based on selected provider
            if (this.selectedProvider === 'ollama-cartesia') {
              this.translateWithOllama(transcript, detectedLang, targetLang).then((translated) => {
                this.appendToTranscription(translated, 'agent', sentiment, targetLang);
                this.speakWithCartesia(translated);
              });
            } else {
              this.sessionPromise?.then((session) => {
                // Gemini is instructed to translate based on the detected source lang in context
                session.sendRealtimeInput([{ text: transcript }]);
              });
            }
          }
        }
      }
    };
    this.deepgramSocket.onerror = () => this.updateError('Audio pipeline error');
  }

  private updateRealtimeUserTranscription(text: string, isInterim: boolean, sentiment?: 'positive' | 'negative' | 'neutral', language?: string) {
    const lastIdx = this.currentTurnSegments.length - 1;
    const lastSegment = this.currentTurnSegments[lastIdx];
    if (lastSegment && lastSegment.type === 'user') {
      const newSegments = [...this.currentTurnSegments];
      newSegments[lastIdx] = { text, type: 'user', isInterim, sentiment, language: language || lastSegment.language };
      this.currentTurnSegments = newSegments;
    } else {
      this.currentTurnSegments = [...this.currentTurnSegments, { text, type: 'user', isInterim, sentiment, language }];
    }
  }

  private appendToTranscription(text: string, type: 'user' | 'agent', sentiment?: 'positive' | 'negative' | 'neutral', language?: string) {
    const lastIdx = this.currentTurnSegments.length - 1;
    const lastSegment = this.currentTurnSegments[lastIdx];
    if (lastSegment && lastSegment.type === type) {
      const newSegments = [...this.currentTurnSegments];
      newSegments[lastIdx] = { ...lastSegment, text: lastSegment.text + text, isInterim: false, sentiment: sentiment || lastSegment.sentiment, language: language || lastSegment.language };
      this.currentTurnSegments = newSegments;
    } else {
      this.currentTurnSegments = [...this.currentTurnSegments, { text, type, isInterim: false, sentiment, language }];
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
        console.error('AudioWorklet failed, falling back to basic connection:', workletErr);
        // Fallback or handle appropriately
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
    this.deepgramSocket?.close();
    this.deepgramSocket = null;
    this.isUserSpeaking = false;
    this.updateStatus('Ready');
  }

  private reset() {
    this.stopRecording();
    this.session?.close();
    this.initSession();
    this.updateStatus('Session reset');
  }

  render() {
    const allSegments = [...this.transcriptionHistory, ...this.currentTurnSegments];
    return html`
      <header>
        <h1>Neighborly Translator</h1>
      </header>

      <div class="transcription-viewport">
        <div class="transcription-container">
          ${allSegments.map((segment) => html`
            <div class="segment segment-${segment.type} ${segment.isInterim ? 'interim' : ''} sentiment-${segment.sentiment || 'neutral'}">
              <div class="segment-label">
                ${segment.type}
                ${segment.language ? html`<span class="lang-badge">${segment.language}</span>` : ''}
              </div>
              <div class="segment-text">
                ${segment.text.split(' ').map((word, i) => html`<span class="transcription-word" style="--word-index: ${i}">${word}</span>`)}
              </div>
            </div>
          `)}
        </div>
      </div>

      <div class="controls">
        <button title="Toggle Mic" @click=${this.toggleMic} 
          class="${this.isMicMuted ? 'muted' : ''} ${this.micLevel > 0.05 ? 'active-audio' : ''}" 
          style="opacity: ${this.isRecording ? '1' : '0.4'}; color: var(--user-blue)">
          <div class="visualizer" style="transform: scale(${1 + this.micLevel * 1.5})"></div>
          ${this.isMicMuted ? html`<svg viewBox="0 0 24 24"><path d="M19.73 17.3L18.4 15.97c.36-.61.6-1.28.6-2h-2c0 .4-.1.79-.28 1.14l-1.42-1.42c.42-.4.7-.96.7-1.59v-6c0-1.66-1.34-3-3-3s-3 1.34-3 3v.14L3.7 3.7c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l16.03 16.03c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41l-1.41-1.41zM9 5c0-1.66 1.34-3 3-3s3 1.34 3 3v6c0 .17-.03.34-.07.5l-5.93-5.93V5zM5 11h2c0 1.34.46 2.57 1.22 3.54L6.78 16c-1.12-1.39-1.78-3.12-1.78-5zM11 17.92v3.08h2v-3.08c3.39-.49 6-3.39 6-6.92h-2c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92z"/></svg>` : html`<svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>`}
        </button>
        <button title="Toggle Speaker" @click=${this.toggleSpeaker} 
          class="${this.isSpeakerMuted ? 'muted' : ''} ${this.speakerLevel > 0.05 ? 'active-audio' : ''}"
          style="color: var(--agent-purple)">
          <div class="visualizer" style="transform: scale(${1 + this.speakerLevel * 1.5})"></div>
          ${this.isSpeakerMuted ? html`<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>` : html`<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`}
        </button>
        <div class="divider"></div>
        <button @click=${this.toggleDarkMode}>${this.isDarkMode ? html`<svg viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L17.3 15.9l1.06 1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>` : html`<svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-3.03 0-5.5-2.47-5.5-5.5 0-1.82.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>`}</button>
        <button id="startButton" @click=${this.startRecording} style="display: ${this.isRecording ? 'none' : 'flex'}"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>
        <button id="stopButton" @click=${this.stopRecording} style="display: ${this.isRecording ? 'flex' : 'none'}"><svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg></button>
        <button @click=${this.toggleSettings}><svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg></button>
      </div>

      ${this.isSettingsOpen ? html`
        <div class="settings-modal" @click=${this.toggleSettings}>
          <div class="settings-content" @click=${(e: Event) => e.stopPropagation()}>
            <h2>App Settings</h2>
            <div class="field">
              <label>Persona</label>
              <select id="personaSelect" @change=${this.onPersonaChange}>
                ${PERSONA_MAP.map(p => html`<option value="${p.id}" ?selected=${this.selectedPersonaId === p.id}>${p.name}</option>`)}
              </select>
            </div>
            ${this.selectedPersonaId === 'translator' ? html`
              <div class="lang-grid">
                <div class="field"><label>Your Language</label><select id="langASelect">${LANGUAGE_OPTIONS.map(l => html`<option value="${l.code}" ?selected=${this.langA === l.code}>${l.name}</option>`)}</select></div>
                <div class="field"><label>Their Language</label><select id="langBSelect">${LANGUAGE_OPTIONS.map(l => html`<option value="${l.code}" ?selected=${this.langB === l.code}>${l.name}</option>`)}</select></div>
              </div>
            ` : ''}
            <div class="field"><label>Instructions</label><textarea id="promptTextarea" .value=${this.systemPrompt}></textarea></div>
            <div class="field">
              <label>Gemini Voice</label>
              <select id="voiceSelect">${VOICE_MAP.map(v => html`<option value="${v.value}" ?selected=${this.selectedVoice === v.value}>${v.name}</option>`)}</select>
            </div>
            <div class="field">
              <label>Translation Provider</label>
              <select id="providerSelect">${PROVIDER_MAP.map(p => html`<option value="${p.id}" ?selected=${this.selectedProvider === p.id}>${p.name}</option>`)}</select>
            </div>
            <div class="field">
              <label>STT Provider</label>
              <select id="sttProviderSelect">${STT_PROVIDER_MAP.map(p => html`<option value="${p.id}" ?selected=${this.selectedSttProvider === p.id}>${p.name}</option>`)}</select>
            </div>
            <div class="modal-actions">
              <button class="btn-cancel" @click=${this.toggleSettings}>Cancel</button>
              <button class="btn-save" @click=${this.saveSettings}>Apply Settings</button>
            </div>
          </div>
        </div>
      ` : ''}

      <div id="status">${this.error ? html`<span style="color: var(--danger-color); font-weight: 600;">${this.error}</span>` : this.status}</div>
    `;
  }
}
