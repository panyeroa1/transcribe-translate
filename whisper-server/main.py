
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import os
import tempfile
import shutil

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Model (Global for now, creates singleton)
# Model size can be configured via env var, consistent with 'ai_alias_mode'
MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "small")
DEVICE = "cpu" # or "cuda" if available
COMPUTE_TYPE = "int8"

print(f"Loading Whisper Model: {MODEL_SIZE} on {DEVICE}...")
model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
print("Model loaded.")

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...), language: str = None):
    # Retrieve language parameter if needed, but Whisper auto-detects well.
    # language param format from frontend might be 'en-US', Whisper takes 'en'
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
        
        segments, info = model.transcribe(tmp_path, beam_size=5, language=language.split('-')[0] if language else None)
        
        full_text = ""
        seg_list = []
        for segment in segments:
            full_text += segment.text
            seg_list.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text
            })
            
        os.remove(tmp_path)
        
        return {
            "text": full_text.strip(),
            "segments": seg_list,
            "language": info.language,
            "probability": info.language_probability
        }

    except Exception as e:
        return {"error": str(e)}

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_SIZE}
