import cv2
import mediapipe as mp
import numpy as np
import base64
import tempfile
import os
import time
import threading
from .rules import EXERCISE_RULES
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

class PoseAnalyzer:
    def __init__(self):
        # Path to model file
        model_path = os.path.join(os.path.dirname(__file__), '..', 'pose_landmarker.task')
        print(f"Loading Pose Landmarker model from: {model_path}")
        if not os.path.exists(model_path):
            print(f"CRITICAL ERROR: Model file not found at {model_path}")
            # Try fallback to absolute from root root
            root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
            print(f"Files in {root_path}: {os.listdir(root_path)}")
        
        try:
            base_options = python.BaseOptions(model_asset_path=model_path)
            options = vision.PoseLandmarkerOptions(
                base_options=base_options,
                running_mode=vision.RunningMode.IMAGE # Switching to IMAGE for more robust sync calls
            )
            self.detector = vision.PoseLandmarker.create_from_options(options)
        except Exception as e:
            print(f"WARNING: MediaPipe Pose Landmarker failed to initialize: {e}")
            self.detector = None
            
        self.detector_lock = threading.Lock()
        
        # Session state to handle multiple users on a single process (Render)
        self.sessions = {} # {user_id: {"exercise": str, "rule_engine": obj, "last_active": float}}
        self.timestamp_ms = 0

    def get_user_session(self, user_id, exercise_name):
        now = time.time()
        
        # Create session if none exists or exercise changed
        if user_id not in self.sessions or self.sessions[user_id]["exercise"] != exercise_name:
            rule_engine = self.create_rule_engine(exercise_name)
            self.sessions[user_id] = {
                "exercise": exercise_name,
                "rule_engine": rule_engine,
                "last_active": now
            }
        else:
            self.sessions[user_id]["last_active"] = now
            
        # Optional: Cleanup old sessions every 100 calls (approx 15 seconds of frames)
        if len(self.sessions) > 50: # Limit memory footprint
            expired = [uid for uid, s in self.sessions.items() if now - s["last_active"] > 600] # 10 min
            for uid in expired:
                del self.sessions[uid]
                
        return self.sessions[user_id]["rule_engine"]

    def create_rule_engine(self, exercise_name):
        if exercise_name in EXERCISE_RULES:
            return EXERCISE_RULES[exercise_name]()
        
        # 2. Try keyword fallback
        name_lower = exercise_name.lower()
        engine = None
        
        # Check keywords in order of specificity
        if "push-up" in name_lower or "pushup" in name_lower:
            engine = EXERCISE_RULES["Push-ups"]()
        elif "leg press" in name_lower:
            engine = EXERCISE_RULES["Squats"]()
        elif "calf raise" in name_lower:
            engine = EXERCISE_RULES["Standing Calf Raises"]()
        elif "press" in name_lower:
            if "overhead" in name_lower or "arnold" in name_lower or "shoulder" in name_lower:
                engine = EXERCISE_RULES["Overhead Barbell Press"]()
            else:
                engine = EXERCISE_RULES["Flat Barbell Bench Press"]()
        elif "curl" in name_lower:
            if "wrist" in name_lower:
                engine = EXERCISE_RULES["Wrist Curl (Palms Up)"]()
            else:
                engine = EXERCISE_RULES["Bicep Curl"]()
        elif "squat" in name_lower:
            engine = EXERCISE_RULES["Squats"]()
        elif "lunge" in name_lower:
            engine = EXERCISE_RULES["Lunges"]()
        elif "pull-up" in name_lower or "pullup" in name_lower or "chin-up" in name_lower or "chinup" in name_lower:
            engine = EXERCISE_RULES["Pull-ups"]()
        elif "pulldown" in name_lower:
            engine = EXERCISE_RULES["Pull-ups"]() # Pulldowns are vertical pulls
        elif "row" in name_lower or "face pull" in name_lower:
            engine = EXERCISE_RULES["Barbell Bent-Over Rows"]()
        elif "deadlift" in name_lower or "thrust" in name_lower or "bridge" in name_lower or "extension" in name_lower and "back" in name_lower:
            engine = EXERCISE_RULES["Deadlift"]()
        elif "raise" in name_lower:
            if "leg" in name_lower or "knee" in name_lower:
                engine = EXERCISE_RULES["Hanging Leg Raises"]()
            else:
                engine = EXERCISE_RULES["Dumbbell Lateral Raises"]()
        elif "shrug" in name_lower:
            engine = EXERCISE_RULES["Dumbbell Lateral Raises"]() # Shrugs use lateral raise logic (shoulder height)
        elif "fly" in name_lower or "crossover" in name_lower or "pec deck" in name_lower:
            engine = EXERCISE_RULES["Incline Cable Fly"]()
        elif "crunch" in name_lower or "sit-up" in name_lower or "twist" in name_lower:
            engine = EXERCISE_RULES["Crunches"]()
        elif "dip" in name_lower:
            engine = EXERCISE_RULES["Weighted Bench Dips"]()
        elif "extension" in name_lower or "pushdown" in name_lower or "kickback" in name_lower:
            engine = EXERCISE_RULES["Overhead Triceps Extension"]()
        elif "plank" in name_lower or "bug" in name_lower or "rollout" in name_lower or "hold" in name_lower:
            engine = EXERCISE_RULES["Plank"]()
        elif "clean" in name_lower or "snatch" in name_lower or "thruster" in name_lower or "maker" in name_lower or "get-up" in name_lower:
            engine = EXERCISE_RULES["Clean and Press"]()
        elif "burpee" in name_lower or "devil" in name_lower:
            engine = EXERCISE_RULES["Burpee Pull-Up"]()
        elif "carry" in name_lower:
            engine = EXERCISE_RULES["Overhead Barbell Press"]() # Track standing stability
        else:
            # Absolute fallback to Bicep Curl if nothing else matches (best effort)
            engine = EXERCISE_RULES["Bicep Curl"]()
            
        return engine

    def set_exercise(self, exercise_name):
        # Deprecated: use get_user_session instead
        pass

    def reset_analyzer(self):
        # Resetting the analyzer now means clearing all sessions
        self.sessions = {}
        self.timestamp_ms = 0

    def process_landmarks(self, landmarks_list, exercise_name, user_id="default"):
        rule_engine = self.get_user_session(user_id, exercise_name)
        
        # Convert list of dicts to objects with attributes for the rule engine
        class Landmark:
            def __init__(self, d):
                self.x = d.get('x', 0)
                self.y = d.get('y', 0)
                self.z = d.get('z', 0)
                self.visibility = d.get('visibility', 0.5) # Lowered default for mobile

        landmarks = [Landmark(l) for l in landmarks_list]

        feedback_data = {
            "exercise": exercise_name,
            "rep_count": 0,
            "correct_reps": 0,
            "form": "N/A",
            "feedback": "Ready",
            "landmarks": landmarks_list,
            "incorrect_indices": [],
            "is_correct": True,
            "visibility_ok": True
        }

        if rule_engine:
            analysis = rule_engine.process(landmarks)
            incorrect = analysis.get("incorrect_indices", [])
            is_correct = len(incorrect) == 0
            
            # Strictness Check: If the movement doesn't match the exercise type at all,
            # we should avoid high-confidence feedback.
            # (Subclasses can implement specific logic, but here we use the feedback from rules)
            
            feedback_data.update({
                "rep_count": analysis["counter"],
                "correct_reps": analysis["correct_reps"],
                "form": analysis["stage"],
                "feedback": analysis["feedback"],
                "incorrect_indices": incorrect,
                "is_correct": is_correct,
                "angle": analysis.get("angle"),
                "target": analysis.get("target"),
                "visibility_ok": analysis.get("visibility_ok", True)
            })

        return feedback_data

    def process_frame(self, image_data, exercise_name):
        if not self.detector:
            return {"feedback": "Server vision model not loaded", "visibility_ok": False}
            
        # Decode base64 image
        if isinstance(image_data, str) and "," in image_data:
            image_data = image_data.split(",")[1]
            nparr = np.frombuffer(base64.b64decode(image_data), np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        else:
            frame = image_data

        if frame is None:
            return None

        self.set_exercise(exercise_name)

        # Convert to MediaPipe Image
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        
        # Detect landmarks
        with self.detector_lock:
            # Use real-time based monotonic timestamp
            now_ms = int(time.time() * 1000)
            if now_ms <= self.timestamp_ms:
                self.timestamp_ms += 1
            else:
                self.timestamp_ms = now_ms
            
            results = self.detector.detect_for_video(mp_image, self.timestamp_ms)

        feedback_data = {
            "exercise": exercise_name,
            "rep_count": 0,
            "correct_reps": 0,
            "form": "N/A",
            "feedback": "No body detected",
            "landmarks": []
        }

        if results.pose_landmarks:
            landmarks = results.pose_landmarks[0] # Take first person
            
            # Convert to frontend-compatible format
            landmarks_list = []
            for lm in landmarks:
                landmarks_list.append({
                    "x": lm.x, 
                    "y": lm.y, 
                    "z": lm.z, 
                    "visibility": lm.visibility
                })
            
            return self.process_landmarks(landmarks_list, exercise_name)

        return feedback_data

    def analyze_video(self, video_path, exercise_name):
        self.set_exercise(exercise_name)
        cap = cv2.VideoCapture(video_path)
        
        total_reps = 0
        correct_reps = 0
        mistakes = []
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        frame_timestamp_ms = 0
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_timestamp_ms += int(1000 / fps)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            if self.detector:
                results = self.detector.detect(mp_image) # detect() for IMAGE mode
            else:
                results = None

            if results.pose_landmarks and self.rule_engine:
                landmarks = results.pose_landmarks[0]
                analysis = self.rule_engine.process(landmarks)
                total_reps = analysis["counter"]
                correct_reps = analysis["correct_reps"]
                if analysis["feedback"] and "good" not in analysis["feedback"].lower() and "ready" not in analysis["feedback"].lower():
                    if analysis["feedback"] not in mistakes:
                        mistakes.append(analysis["feedback"])

        cap.release()
        
        accuracy = f"{round((correct_reps / total_reps * 100), 2)}%" if total_reps > 0 else "0%"
        
        return {
            "total_reps": total_reps,
            "correct_reps": correct_reps,
            "accuracy": accuracy,
            "mistakes_summary": mistakes
        }
