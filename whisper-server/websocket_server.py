import os
import json
import tempfile
import struct
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import PlainTextResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from faster_whisper import WhisperModel

# Configuration
MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "small")
DEVICE = "cpu"
COMPUTE_TYPE = "int8"
PORT = int(os.getenv("WHISPER_WS_PORT", "8765"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

latest_transcription = "No transcription yet."
latest_segments = []

print(f"Loading Whisper Model: {MODEL_SIZE} on {DEVICE}...")
model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
print("Model loaded successfully.")

# Priority Languages: Dutch, French, Tagalog, Spanish, Cameroonian (Medumba mapped to fr)
WHISPER_LANGS = {'af', 'am', 'ar', 'as', 'az', 'ba', 'be', 'bg', 'bn', 'bo', 'br', 'bs', 'ca', 'cs', 'cy', 'da', 'de', 'el', 'en', 'es', 'et', 'eu', 'fa', 'fi', 'fo', 'fr', 'gl', 'gu', 'ha', 'haw', 'he', 'hi', 'hr', 'ht', 'hu', 'hy', 'id', 'is', 'it', 'ja', 'jw', 'ka', 'kk', 'km', 'kn', 'ko', 'la', 'lb', 'ln', 'lo', 'lt', 'lv', 'mg', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my', 'ne', 'nl', 'nn', 'no', 'oc', 'pa', 'pl', 'ps', 'pt', 'ro', 'ru', 'sa', 'sd', 'si', 'sk', 'sl', 'sn', 'so', 'sq', 'sr', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'tk', 'tl', 'tr', 'tt', 'uk', 'ur', 'uz', 'vi', 'yi', 'yo', 'zh', 'zu'}

# Priority language mappings (Cameroon/Medumba -> French, Philippines -> Tagalog)
PRIORITY_MAP = {
    'byv': 'fr',  # Medumba (Cameroon) -> French
    'nso': 'fr',  # Cameroonian languages -> French fallback
    'ewo': 'fr',  # Ewondo (Cameroon) -> French
    'fil': 'tl',  # Filipino -> Tagalog
    'ceb': 'tl',  # Cebuano -> Tagalog
    'ilo': 'tl',  # Ilocano -> Tagalog
    'war': 'tl',  # Waray -> Tagalog
    'pam': 'tl',  # Pampanga -> Tagalog
    'bcl': 'tl',  # Bikol -> Tagalog
    'vls': 'nl',  # Flemish -> Dutch
    'zea': 'nl',  # Zeelandic -> Dutch
    'li': 'nl',   # Limburgish -> Dutch
}

def map_jw_to_whisper(jw_code):
    if not jw_code: return None
    if jw_code in WHISPER_LANGS: return jw_code
    if jw_code in PRIORITY_MAP: return PRIORITY_MAP[jw_code]
    base = jw_code.split('-')[0].split('_')[0]
    if base in WHISPER_LANGS: return base
    if base in PRIORITY_MAP: return PRIORITY_MAP[base]
    mappings = {'fil': 'tl', 'cmn': 'zh', 'yue': 'zh', 'iw': 'he', 'nb': 'no', 'nn': 'no'}
    return mappings.get(jw_code, mappings.get(base, None))

def create_wav_header(sample_rate, num_channels, bits_per_sample, data_size):
    byte_rate = sample_rate * num_channels * bits_per_sample // 8
    block_align = num_channels * bits_per_sample // 8
    header = struct.pack('<4sI4s', b'RIFF', 36 + data_size, b'WAVE')
    header += struct.pack('<4sIHHIIHH', b'fmt ', 16, 1, num_channels, sample_rate, byte_rate, block_align, bits_per_sample)
    header += struct.pack('<4sI', b'data', data_size)
    return header

@app.get("/")
async def get_portal():
    return FileResponse("/opt/whisper-server/transcribe-portal.html")

@app.get("/transcription", response_class=PlainTextResponse)
async def get_latest_transcription():
    return latest_transcription

@app.get("/segments")
async def get_segments():
    """Returns transcription segments with speaker info for diarization."""
    return {"segments": latest_segments}

async def transcribe_audio(pcm_data, language_hint=None):
    """Processes raw PCM Int16 data with VAD and basic speaker segmentation."""
    global latest_transcription, latest_segments
    try:
        wav_header = create_wav_header(16000, 1, 16, len(pcm_data))
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(wav_header)
            tmp.write(pcm_data)
            tmp_path = tmp.name
        
        # Enable VAD for robust streaming
        segments_gen, info = model.transcribe(
            tmp_path, 
            beam_size=5, 
            language=map_jw_to_whisper(language_hint),
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
            word_timestamps=True  # Enable for better segmentation
        )
        
        segments_list = []
        full_text = ""
        
        for seg in segments_gen:
            segment_data = {
                "start": seg.start,
                "end": seg.end,
                "text": seg.text.strip(),
                "speaker": "unknown"  # Placeholder - can be enhanced with proper diarization
            }
            # Simple heuristic: alternate speakers based on silence gaps
            if segments_list and (seg.start - segments_list[-1]["end"]) > 1.5:
                # Long pause suggests speaker change
                prev_speaker = segments_list[-1].get("speaker", "A")
                segment_data["speaker"] = "B" if prev_speaker == "A" else "A"
            elif segments_list:
                segment_data["speaker"] = segments_list[-1].get("speaker", "A")
            else:
                segment_data["speaker"] = "A"
            
            segments_list.append(segment_data)
            full_text += seg.text
        
        os.remove(tmp_path)
        
        if full_text.strip():
            latest_transcription = full_text.strip()
            latest_segments = segments_list
            return full_text.strip(), info.language, segments_list
    except Exception as e:
        print(f"Transcription error: {e}")
    return None, None, []

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    audio_buffer = bytearray()
    language_hint = None
    
    print(f"WS Connect: {websocket.client}")
    
    try:
        while True:
            message = await websocket.receive()
            
            if "bytes" in message:
                audio_buffer.extend(message["bytes"])
                
                # ~2 seconds of audio at 16kHz 16-bit mono = 64kb
                if len(audio_buffer) >= 64000:
                    chunk_to_process = bytes(audio_buffer)
                    audio_buffer.clear()
                    
                    text, lang, segments = await transcribe_audio(chunk_to_process, language_hint)
                    if text:
                        await websocket.send_json({
                            "type": "transcription",
                            "text": text,
                            "language": lang,
                            "segments": segments,
                            "is_final": True
                        })
                        
            elif "text" in message:
                try:
                    data = json.loads(message["text"])
                    if data.get("type") == "set_language":
                        language_hint = data.get("language")
                        await websocket.send_json({"type": "ack", "language": language_hint})
                    elif data.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                except: pass
                
    except WebSocketDisconnect:
        print("WS Disconnect")
    except Exception as e:
        print(f"WS Error: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
