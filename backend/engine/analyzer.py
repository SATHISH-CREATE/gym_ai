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
        
        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.VIDEO
        )
        self.detector = vision.PoseLandmarker.create_from_options(options)
        self.detector_lock = threading.Lock()
        self.current_exercise = None
        self.rule_engine = None
        self.timestamp_ms = 0

    def set_exercise(self, exercise_name):
        if self.current_exercise != exercise_name:
            self.current_exercise = exercise_name
            # 1. Try exact match
            if exercise_name in EXERCISE_RULES:
                self.rule_engine = EXERCISE_RULES[exercise_name]()
            else:
                # 2. Try keyword fallback
                name_lower = exercise_name.lower()
                self.rule_engine = None
                
                # Check keywords in order of specificity
                if "push-up" in name_lower or "pushup" in name_lower:
                    self.rule_engine = EXERCISE_RULES["Push-ups"]()
                elif "leg press" in name_lower:
                    self.rule_engine = EXERCISE_RULES["Squats"]()
                elif "calf raise" in name_lower:
                    self.rule_engine = EXERCISE_RULES["Standing Calf Raises"]()
                elif "press" in name_lower:
                    if "overhead" in name_lower or "arnold" in name_lower or "shoulder" in name_lower:
                        self.rule_engine = EXERCISE_RULES["Overhead Barbell Press"]()
                    else:
                        self.rule_engine = EXERCISE_RULES["Flat Barbell Bench Press"]()
                elif "curl" in name_lower:
                    if "wrist" in name_lower:
                        self.rule_engine = EXERCISE_RULES["Wrist Curl (Palms Up)"]()
                    else:
                        self.rule_engine = EXERCISE_RULES["Bicep Curl"]()
                elif "squat" in name_lower:
                    self.rule_engine = EXERCISE_RULES["Squats"]()
                elif "lunge" in name_lower:
                    self.rule_engine = EXERCISE_RULES["Lunges"]()
                elif "pull-up" in name_lower or "pullup" in name_lower or "chin-up" in name_lower or "chinup" in name_lower:
                    self.rule_engine = EXERCISE_RULES["Pull-ups"]()
                elif "pulldown" in name_lower:
                    self.rule_engine = EXERCISE_RULES["Pull-ups"]() # Pulldowns are vertical pulls
                elif "row" in name_lower or "face pull" in name_lower:
                    self.rule_engine = EXERCISE_RULES["Barbell Bent-Over Rows"]()
                elif "deadlift" in name_lower or "thrust" in name_lower or "bridge" in name_lower or "extension" in name_lower and "back" in name_lower:
                    self.rule_engine = EXERCISE_RULES["Deadlift"]()
                elif "raise" in name_lower:
                    if "leg" in name_lower or "knee" in name_lower:
                        self.rule_engine = EXERCISE_RULES["Hanging Leg Raises"]()
                    else:
                        self.rule_engine = EXERCISE_RULES["Dumbbell Lateral Raises"]()
                elif "shrug" in name_lower:
                    self.rule_engine = EXERCISE_RULES["Dumbbell Lateral Raises"]() # Shrugs use lateral raise logic (shoulder height)
                elif "fly" in name_lower or "crossover" in name_lower or "pec deck" in name_lower:
                    self.rule_engine = EXERCISE_RULES["Incline Cable Fly"]()
                elif "crunch" in name_lower or "sit-up" in name_lower or "twist" in name_lower:
                    self.rule_engine = EXERCISE_RULES["Crunches"]()
                elif "dip" in name_lower:
                    self.rule_engine = EXERCISE_RULES["Weighted Bench Dips"]()
                elif "extension" in name_lower or "pushdown" in name_lower or "kickback" in name_lower:
                    self.rule_engine = EXERCISE_RULES["Overhead Triceps Extension"]()
                elif "plank" in name_lower or "bug" in name_lower or "rollout" in name_lower or "hold" in name_lower:
                    self.rule_engine = EXERCISE_RULES["Plank"]()
                elif "clean" in name_lower or "snatch" in name_lower or "thruster" in name_lower or "maker" in name_lower or "get-up" in name_lower:
                    self.rule_engine = EXERCISE_RULES["Clean and Press"]()
                elif "burpee" in name_lower or "devil" in name_lower:
                    self.rule_engine = EXERCISE_RULES["Burpee Pull-Up"]()
                elif "carry" in name_lower:
                    self.rule_engine = EXERCISE_RULES["Overhead Barbell Press"]() # Track standing stability

            return True
        return False

    def reset_analyzer(self):
        self.current_exercise = None
        self.rule_engine = None
        self.timestamp_ms = 0

    def process_frame(self, image_data, exercise_name):
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
            
            # Apply rules
            if self.rule_engine:
                analysis = self.rule_engine.process(landmarks)
                # Correctness is now based on whether any joints were flagged this frame
                incorrect = analysis.get("incorrect_indices", [])
                is_correct = len(incorrect) == 0
                
                feedback_data.update({
                    "rep_count": analysis["counter"],
                    "correct_reps": analysis["correct_reps"],
                    "form": analysis["stage"],
                    "feedback": analysis["feedback"],
                    "incorrect_indices": incorrect,
                    "is_correct": is_correct
                })



            # Prepare landmarks for frontend
            for lm in landmarks:
                feedback_data["landmarks"].append({
                    "x": lm.x, 
                    "y": lm.y, 
                    "z": lm.z, 
                    "visibility": lm.visibility
                })

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
            results = self.detector.detect_for_video(mp_image, frame_timestamp_ms)

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
