import sys
import os

# Ensure the current directory is at the front of the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Debug logging for Render environment
print(f"DEPLOY DEBUG: sys.path is {sys.path}")
print(f"DEPLOY DEBUG: files in {current_dir}: {os.listdir(current_dir)}")

from fastapi import FastAPI, HTTPException, Body, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
from engine.analyzer import PoseAnalyzer
import uvicorn
import shutil
import os
import tempfile

app = FastAPI(title="AI Gym Backend")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FrameInput(BaseModel):
    image: str
    exercise: str

analyzer = PoseAnalyzer()

# Serve frontend static files
# We mount this at the end to avoid blocking other API routes
frontend_path = os.path.join(os.path.dirname(current_dir), "frontend")

@app.get("/health")
async def health():
    return {"status": "ok"}

# API Routes remain above this line...
# ...

# API Routes
@app.post("/reset")
async def reset_session():
    try:
        analyzer.reset_analyzer()
        return {"message": "Session reset successful"}
    except Exception as e:
        print(f"Error resetting session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process_frame")
async def process_frame(input_data: FrameInput):
    try:
        feedback = analyzer.process_frame(input_data.image, input_data.exercise)
        if feedback is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
        return feedback
    except Exception as e:
        print(f"Error processing frame: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload_video")
async def upload_video(exercise: str = Form(...), file: UploadFile = File(...)):
    try:
        # Create temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
        
        result = analyzer.analyze_video(tmp_path, exercise)
        
        # Cleanup
        os.remove(tmp_path)
        
        return result
    except Exception as e:
        print(f"Error uploading video: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Mount the entire frontend directory for other assets (js, css, images)
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
