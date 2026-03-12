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
import google.generativeai as genai
from dotenv import load_dotenv
import uvicorn
import shutil
import os
import tempfile

load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-pro')
else:
    model = None

class DietInput(BaseModel):
    user_profile: dict
    calorie_goal: int
    macros: dict

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

class ChatInput(BaseModel):
    message: str
    context: Optional[dict] = None

class LandmarksInput(BaseModel):
    user_id: str
    landmarks: List[dict]
    exercise: str

analyzer = PoseAnalyzer()

# Serve frontend static files
# We mount this at the end to avoid blocking other API routes
frontend_path = os.path.join(os.path.dirname(current_dir), "frontend")

@app.get("/health")
async def health():
    return {"status": "ok"}

# API Routes
@app.post("/chat")
async def chat_with_ai(input_data: ChatInput):
    """
    Handle AI coaching queries.
    Uses Google Gemini LLM with a heuristic fallback if API key is missing.
    """
    message = input_data.message.strip()
    context = input_data.context or {}
    user_profile = context.get("user_profile", {})
    user_name = user_profile.get("name", "there")
    history = context.get("history", [])
    
    # Keyword-based fallback response (useful if Gemini is offline or no key)
    kb = {
        "progressive overload": "Progressive overload is the foundation of muscle growth! It means gradually increasing the stress placed on your body during exercise.",
        "squat": "For perfect squats: Keep your feet shoulder-width apart, chest up, and sit back into your hips until thighs are parallel to the ground.",
        "bench press": "Bench press tips: Retract your shoulder blades, keep feet flat, and lower the bar to mid-chest under control.",
        "diet": "A solid diet focuses on high protein (1.8g-2.2g per kg), complex carbs for energy, and healthy fats.",
        "protein": "Protein is vital for muscle repair. Aim for 20-40g per meal from sources like chicken, eggs, or lentils.",
        "recovery": "Muscle grows while you rest! Aim for 7-9 hours of sleep and stay hydrated.",
        "form": "Perfect form is better than heavy weight. Focus on the mind-muscle connection."
    }

    # If Gemini is configured, use it
    if model:
        try:
            # Construct a more comprehensive system-like prompt
            chat_context = (
                f"You are the 'FIT COACH AI' Master Coach, a world-class expert in bodybuilding, powerlifting, "
                f"functional fitness, sports nutrition, and exercise science. Your user is {user_name}, "
                f"whose primary goal is {user_profile.get('goal', 'achieving peak fitness')}.\n\n"
                "INSTRUCTIONS:\n"
                "1. Answer any question related to fitness, gym, exercises, physiology, nutrition, or recovery.\n"
                "2. Maintain a professional, encouraging, and highly knowledgeable 'pro-coach' persona.\n"
                "3. Use exercise science-backed advice but keep it easy to understand.\n"
                "4. If a question is NOT related to fitness or health, politely redirect the conversation back to their training.\n"
                "5. Keep responses concise (under 4-5 sentences) unless the topic is complex.\n"
                "6. Avoid repeating exactly what you said in the recent history."
            )
            
            # Format history for Gemini
            prompt = f"{chat_context}\n\nRecent Conversation History:\n"
            for msg in history[-5:]:
                role = "User" if msg.get("role") == "user" else "Coach"
                prompt += f"{role}: {msg.get('text')}\n"
            
            prompt += f"User: {message}\nMaster Coach:"
            
            response = model.generate_content(prompt)
            return {
                "response": response.text.strip(),
                "model_type": "gemini"
            }
            
        except Exception as e:
            print(f"Gemini Error: {e}")
    
    # --- BROAD HEURISTIC FALLBACK (Keyword Logic) ---
    msg_low = message.lower()
    
    # Enhanced Knowledge Base for broad coverage
    kb = {
        "progressive overload": "Progressive overload is the holy grail of gains! It means gradually increasing weight, reps, or intensity to keep challenging your muscles.",
        "squat": "Master your squat: Bar across traps, feet shoulder-width, break at hips first, and descend until thighs are parallel. Drive hard through your heels.",
        "bench press": "For a bigger bench: Retract your scapula, keep a slight arch, and touch the bar to your lower chest before pressing up with total control.",
        "deadlift": "Deadlift form: Shins close to the bar, back flat, chest up. Pull the weight by pushing your feet into the floor, keeping the bar close to your legs.",
        "diet": "Nutrition is 70% of the game. Focus on a diet with adequate protein and a slight calorie surplus/deficit. Prioritize whole foods.",
        "protein": "Aim for 1.8g to 2.2g of protein per kg of bodyweight. Space it across 4-5 meals to keep muscle protein synthesis high.",
        "fat loss": "To lose fat, maintain a consistent caloric deficit while keeping protein high to preserve muscle. Add steady-state cardio and stay consistent.",
        "bulking": "When bulking, a 200-300 calorie surplus is usually enough to gain muscle without excessive fat. Focus on heavy compound movements.",
        "recovery": "You don't grow in the gym; you grow in your sleep. Aim for 8 hours of quality rest and manage stress to keep cortisol low.",
        "pre-workout": "A good pre-workout meal has complex carbs (oats/rice) and some protein, eaten 1-2 hours before training.",
        "creatine": "Creatine monohydrate is the most researched supplement. 5g a day will help with ATP production and power output.",
        "form": "Correct form is non-negotiable. It prevents injury and ensures the target muscle is actually doing the work.",
        "abs": "Abs are revealed in the kitchen but built in the gym with weighted crunches and leg raises. Don't skip your core work!"
    }

    # Check for direct matches
    for key, response in kb.items():
        if key in msg_low:
            return {"response": f"Hey {user_name}, {response}", "model_type": "standard"}

    # Greeting logic
    if any(greet in msg_low for greet in ["hello", "hi", "hey"]):
        return {"response": f"Hey {user_name}! I'm your FIT COACH AI. I can help with form tips, diet advice, or training concepts. What's on your mind?", "model_type": "standard"}

    if "thank" in msg_low:
        return {"response": f"You're very welcome, {user_name}! Keep pushing those limits.", "model_type": "standard"}

    # Generic fallback
    return {"response": f"That's a good training question about {message}, {user_name}. To give you the best advice, are you asking about form, frequency, or nutrition?", "model_type": "standard"}

@app.post("/generate_diet")
async def generate_diet_plan(input_data: DietInput):
    """
    Generate a full personalized meal plan using AI.
    """
    if not model:
        raise HTTPException(status_code=503, detail="Gemini AI is not configured on the server.")
    
    profile = input_data.user_profile
    goal_cals = input_data.calorie_goal
    macros = input_data.macros
    
    prompt = (
        f"Generate a professional, detailed 1-day meal plan for a {profile.get('gender', 'person')} "
        f"with the goal: {profile.get('goal', 'Fitness')}.\n"
        f"TARGETS: {goal_cals} kcal | Protein: {macros.get('p')}g | Carbs: {macros.get('c')}g | Fats: {macros.get('f')}g.\n\n"
        "STRUCTURE:\n"
        "1. Breakfast, Snack 1, Lunch, Pre-Workout, Post-Workout, Dinner.\n"
        "2. For each meal, specify the food and the exact portion size (e.g., 100g Chicken, 1 cup Rice).\n"
        "3. Focus on nutritious, whole foods suitable for an athlete/bodybuilder.\n"
        "4. Keep the tone professional and encouraging.\n"
        "5. Output ONLY the meal plan in a clean, readable list format."
    )
    
    try:
        response = model.generate_content(prompt)
        return {"plan": response.text.strip()}
    except Exception as e:
        print(f"Diet Generation Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/reset")
async def reset_session():
    try:
        analyzer.reset_analyzer()
        return {"message": "Session reset successful"}
    except Exception as e:
        print(f"Error resetting session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process_landmarks")
async def process_landmarks(input_data: LandmarksInput):
    try:
        feedback = analyzer.process_landmarks(input_data.landmarks, input_data.exercise, input_data.user_id)
        return feedback
    except Exception as e:
        print(f"Error processing landmarks for user {input_data.user_id}: {e}")
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
