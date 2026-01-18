
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
  private speakerGenderMap: Map<number, 'male' | 'female'> = new Map();
  private lastSpeakerGender: 'male' | 'female' = 'male';

  static styles = css`
    :host {
      --bg-color: #f8f9fa;
      --text-color: #2c3e50;
      --card-bg: #ffffff;
      --card-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
      --accent-color: #ff5722; /* Eburon Vibrant Accent */
      --secondary-color: #6c757d;
      --nav-bg: #ffffff;
      --fab-bg: #2d2d2d;
      --user-blue: #3498db;
      --agent-purple: #9b59b6;
      --pos-color: #27ae60;
      --neg-color: #e74c3c;
      --neu-color: #3498db;
      
      display: flex;
      flex-direction: column;
      width: 100vw;
      height: 100vh;
      background: var(--bg-color);
      color: var(--text-color);
      font-family: 'Outfit', 'Inter', sans-serif;
      overflow: hidden;
      position: relative;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      background: transparent;
      z-index: 150;
    }

    .header-left, .header-right {
      display: flex;
      align-items: center;
      width: 48px;
    }

    .header-center h1 {
      font-size: 18px;
      font-weight: 700;
      color: #000;
      margin: 0;
    }

    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #eee;
      overflow: hidden;
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .transcription-viewport {
      flex: 1;
      overflow-y: auto;
      padding: 10px 24px 120px 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .transcription-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
    }

    .segment {
      background: var(--card-bg);
      border-radius: 24px;
      padding: 24px;
      box-shadow: var(--card-shadow);
      display: flex;
      flex-direction: column;
      gap: 16px;
      transition: transform 0.2s ease;
      position: relative;
    }

    .segment:active {
      transform: scale(0.98);
    }

    .segment-text {
      font-size: 18px;
      line-height: 1.6;
      color: #333;
      font-weight: 400;
    }

    .segment-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid #f0f0f0;
    }

    .lang-info {
      font-size: 13px;
      color: var(--secondary-color);
      font-weight: 500;
    }

    .segment-actions {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .action-icon {
      width: 20px;
      height: 20px;
      fill: #ccd1d9;
      cursor: pointer;
      transition: fill 0.2s ease;
    }

    .action-icon:hover {
      fill: var(--accent-color);
    }

    .action-icon.active {
      fill: var(--accent-color);
    }

    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 80px;
      background: var(--nav-bg);
      border-top: 1px solid #f0f0f0;
      display: flex;
      justify-content: space-around;
      align-items: center;
      padding: 0 20px;
      z-index: 140;
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      color: #ccd1d9;
      cursor: pointer;
      transition: color 0.2s ease;
    }

    .nav-item.active {
      color: var(--accent-color);
    }

    .nav-item svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
    }

    .fab-container {
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 150;
    }

    .mic-fab {
      width: 72px;
      height: 72px;
      background: var(--fab-bg);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      cursor: pointer;
      border: none;
      transition: transform 0.2s ease, background 0.2s ease;
    }

    .mic-fab:active {
      transform: scale(0.9);
    }

    .mic-fab svg {
      width: 32px;
      height: 32px;
      fill: #ffaa33;
    }

    .mic-fab.active {
      background: var(--accent-color);
    }

    .mic-fab.active svg {
      fill: white;
    }

    /* Subtitle style overrides for active turn if needed */
    .interim {
      opacity: 0.7;
    }

    .transcription-word {
      display: inline-block;
      margin-right: 0.25em;
    }

    .sentiment-positive .transcription-word { color: var(--pos-color); }
    .sentiment-negative .transcription-word { color: var(--neg-color); }
    .sentiment-neutral .transcription-word { color: var(--neu-color); }

    .status-toast {
      position: fixed;
      top: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      z-index: 300;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .status-toast.visible {
      opacity: 1;
    }

    .settings-modal {
      position: fixed;
      inset: 0;
      z-index: 400;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(8px);
    }

    .settings-content {
      background: #fff;
      width: 90%;
      max-width: 500px;
      max-height: 85vh;
      overflow-y: auto;
      padding: 32px;
      border-radius: 32px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .field { display: flex; flex-direction: column; gap: 8px; }
    label { font-size: 13px; font-weight: 600; opacity: 0.7; }
    
    textarea, select {
      padding: 14px;
      border-radius: 16px;
      border: 1px solid #f0f0f0;
      background: #f8f9fa;
      color: #333;
      font-size: 14px;
      outline: none;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .btn-save {
      background: var(--accent-color);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 14px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-cancel {
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
          onerror: (e: ErrorEvent) => this.updateError(e.message || 'Gemini Error'),
          onclose: (e: CloseEvent) => this.updateStatus('Session Closed'),
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
    // Dedicated STT endpoint to keep input processing independent of TTS playback.
    const url = `${DEEPGRAM_ENDPOINT}&channels=1&language=${this.langA}&interim_results=true&smart_format=true&filler_words=true&no_delay=true&vad_events=true`;

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
    this.deepgramSocket.onerror = () => this.updateError('Audio pipeline error');
  }

  private updateRealtimeUserTranscription(text: string, isInterim: boolean, sentiment?: 'positive' | 'negative' | 'neutral', language?: string, speaker?: number, gender?: 'male' | 'female') {
    const lastIdx = this.currentTurnSegments.length - 1;
    const lastSegment = this.currentTurnSegments[lastIdx];
    if (lastSegment && lastSegment.type === 'user') {
      const newSegments = [...this.currentTurnSegments];
      newSegments[lastIdx] = { text, type: 'user', isInterim, sentiment, language: language || lastSegment.language, speaker, gender };
      this.currentTurnSegments = newSegments;
    } else {
      this.currentTurnSegments = [...this.currentTurnSegments, { text, type: 'user', isInterim, sentiment, language, speaker, gender }];
    }
  }

  private appendToTranscription(text: string, type: 'user' | 'agent', sentiment?: 'positive' | 'negative' | 'neutral', language?: string, speaker?: number, gender?: 'male' | 'female') {
    const lastIdx = this.currentTurnSegments.length - 1;
    const lastSegment = this.currentTurnSegments[lastIdx];
    if (lastSegment && lastSegment.type === type) {
      const newSegments = [...this.currentTurnSegments];
      newSegments[lastIdx] = {
        ...lastSegment,
        text: lastSegment.text + text,
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
      <div class="status-toast ${this.status || this.error ? 'visible' : ''}">
        ${this.status || this.error}
      </div>

      <header>
        <div class="header-left">
          <svg class="action-icon" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </div>
        <div class="header-center">
          <h1>Translation history</h1>
        </div>
        <div class="header-right">
          <div class="avatar">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Miles" alt="Avatar">
          </div>
        </div>
      </header>

      <div class="transcription-viewport">
        <div class="transcription-container">
          ${allSegments.map((segment) => html`
            <div class="segment sentiment-${segment.sentiment || 'neutral'} ${segment.isInterim ? 'interim' : ''}">
              <div class="segment-text">
                ${segment.text}
              </div>
              <div class="segment-footer">
                <div class="lang-info">
                  ${this.getLanguageLabel(segment)}
                </div>
                <div class="segment-actions">
                  <svg class="action-icon" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/></svg>
                  <svg class="action-icon" viewBox="0 0 24 24" @click=${() => this.speakText(segment.text, segment.gender)}><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                </div>
              </div>
            </div>
          `)}
        </div>
      </div>

      <div class="bottom-nav">
        <div class="nav-item">
          <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </div>
        <div class="nav-item active">
          <svg viewBox="0 0 24 24"><path d="M12.85 4.51C12.44 2.8 11.56 2.8 11.15 4.51L9.62 10.87H14.38L12.85 4.51ZM18.5 22L17.5 19H12V14H17.5L18.5 11H21.5L20.5 14H24L23 11H20.5L19.5 14H14V19H19.5L20.5 22H18.5ZM13.5 14H10.5L9.5 11H6.5L7.5 14H3.5L2.5 11H0L1 14H3.5L4.5 17H0.5L1.5 20H4L5 17H9.5L10.5 20H13L12 17H9.5L8.5 14H11.5L12.5 17H13.5z"/></svg>
        </div>
        <div class="nav-item">
          <div style="width: 72px;"></div>
        </div>
        <div class="nav-item">
          <svg viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
        </div>
        <div class="nav-item" @click=${this.toggleSettings}>
          <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
        </div>
      </div>

      <div class="fab-container">
        <button class="mic-fab ${this.isRecording ? 'active' : ''}" @click=${this.isRecording ? this.stopRecording : this.startRecording}>
          <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
        </button>
      </div>

      ${this.renderSettings()}
    `;
  }

  private getLanguageLabel(segment: TranscriptionSegment) {
    if (segment.type === 'agent') {
      const source = this.langA;
      const target = segment.language || this.langB;
      return `${this.getLangName(source)} to ${this.getLangName(target)}`;
    }
    return `Detected: ${this.getLangName(segment.language || this.langA)}`;
  }

  private getLangName(code: string) {
    return LANGUAGE_OPTIONS.find(l => l.code === code)?.name.split(' (')[0] || code;
  }

  private speakText(text: string, gender?: 'male' | 'female') {
    if (this.selectedProvider === 'ollama-cartesia') {
      this.speakWithCartesia(text, gender);
    } else {
      // For Gemini, we might need a separate TTS helper if not in active session
      // For now, we reuse speakWithCartesia as a fallback or if configured
      this.speakWithCartesia(text, gender);
    }
  }

  private renderSettings() {
    if (!this.isSettingsOpen) return html``;
    return html`
      <div class="settings-modal" @click=${this.toggleSettings}>
        <div class="settings-content" @click=${(e: Event) => e.stopPropagation()}>
          <header style="padding: 0; height: auto; background: transparent; border: none; justify-content: flex-start; margin-bottom: 20px;">
            <h2 style="margin: 0;">Settings</h2>
          </header>
          
          <div class="field">
            <label>Miles Persona</label>
            <select id="personaSelect" @change=${this.onPersonaChange}>
              ${PERSONA_MAP.map(p => html`<option value="${p.id}" ?selected=${this.selectedPersonaId === p.id}>${p.name}</option>`)}
            </select>
          </div>

          <div class="field">
            <label>System Instructions</label>
            <textarea id="promptTextarea" rows="4">${this.systemPrompt}</textarea>
          </div>

          <div class="field">
            <label>Gemini Voice (Diarization Switch)</label>
            <select id="voiceSelect">
              ${VOICE_MAP.map(v => html`<option value="${v.value}" ?selected=${this.selectedVoice === v.value}>${v.name}</option>`)}
            </select>
          </div>

          <div class="field">
            <label>Translation Provider</label>
            <select id="providerSelect">
              ${PROVIDER_MAP.map(p => html`<option value="${p.id}" ?selected=${this.selectedProvider === p.id}>${p.name}</option>`)}
            </select>
          </div>

          <div class="field">
            <label>STT Provider</label>
            <select id="sttProviderSelect">
              ${STT_PROVIDER_MAP.map(p => html`<option value="${p.id}" ?selected=${this.selectedSttProvider === p.id}>${p.name}</option>`)}
            </select>
          </div>

          <div class="field">
            <label>Language A (Source)</label>
            <select id="langASelect">
              ${LANGUAGE_OPTIONS.map(l => html`<option value="${l.code}" ?selected=${this.langA === l.code}>${l.name}</option>`)}
            </select>
          </div>

          <div class="field">
            <label>Language B (Target)</label>
            <select id="langBSelect">
              ${LANGUAGE_OPTIONS.map(l => html`<option value="${l.code}" ?selected=${this.langB === l.code}>${l.name}</option>`)}
            </select>
          </div>

          <div class="modal-actions">
            <button class="btn-cancel" @click=${this.toggleSettings}>Cancel</button>
            <button class="btn-save" @click=${this.saveSettings}>Save Changes</button>
          </div>
        </div>
      </div>
    `;
  }
}
