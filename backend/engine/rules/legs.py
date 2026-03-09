from .base import BaseRule

class SquatRule(BaseRule):
    def process(self, landmarks):
        # Indices: 23 (H), 25 (K), 27 (A)
        if not self.is_visible(landmarks, [23, 25, 27], 0.6):
            return {
                "counter": self.counter,
                "correct_reps": self.correct_reps,
                "stage": "Hidden",
                "feedback": "Step back for full body detection",
                "incorrect_indices": [],
                "visibility_ok": False
            }

        hip = landmarks[23]
        knee = landmarks[25]
        ankle = landmarks[27]
        
        # Movement Consistency: In a squat, the hips should move more than the wrists/elbows
        if not self.validate_motion(landmarks, [23], [13, 14, 15, 16], sensitivity=0.015):
            self.feedback = "Focus on the squat movement"
        
        angle = self.calculate_angle(hip, knee, ankle)
        
        # State machine
        if angle > 160:
            self.stage = "up"
        
        # Form Check: Knee Stability (Don't let knees go too far past toes)
        # Using a tighter tolerance for better accuracy
        is_stable = knee.x <= ankle.x + 0.08 
        incorrect_indices = []
        if not is_stable:
            incorrect_indices = [25] # Highlight knee
            self.feedback = "Knees too far forward!"

        if angle < 100 and self.stage == 'up':
            if is_stable:
                self.stage = "down"
                self.counter += 1
                self.correct_reps += 1
                self.feedback = "Good depth!"
            else:
                self.stage = "down" # Still move to down stage to prevent double counting
                self.feedback = "Fix form: keep knees back"
            
        if self.stage == "down" and angle > 160:
            self.stage = "up"
            if "Fix" not in self.feedback:
                self.feedback = "Squat down"

        return {
            "counter": self.counter,
            "correct_reps": self.correct_reps,
            "stage": self.stage,
            "feedback": self.feedback,
            "incorrect_indices": incorrect_indices,
            "angle": angle,
            "target": 100
        }


class LungeRule(BaseRule):
    def process(self, landmarks):
        # 23 (H), 25 (K), 27 (A)
        if not self.is_visible(landmarks, [23, 25, 27], 0.6):
            return super().process(landmarks)
            
        hip = landmarks[23]
        knee = landmarks[25]
        ankle = landmarks[27]
        
        angle = self.calculate_angle(hip, knee, ankle)
        
        if angle > 160:
            self.stage = "up"

        # Form Check: Knee alignment
        is_stable = knee.x <= ankle.x + 0.12
        incorrect_indices = []
        if not is_stable:
            incorrect_indices = [25]
            self.feedback = "Keep knee behind toes"

        if angle < 110 and self.stage == "up":
            if is_stable:
                self.stage = "down"
                self.counter += 1
                self.correct_reps += 1
                self.feedback = "Deep lunge!"
            else:
                self.stage = "down"
                self.feedback = "Fix form: knee forward"
            
        if self.stage == "down" and angle > 160:
            self.stage = "up"
            if "Fix" not in self.feedback:
                self.feedback = "Switch legs or repeat"
            
        return {
            "counter": self.counter,
            "correct_reps": self.correct_reps,
            "stage": self.stage,
            "feedback": self.feedback,
            "incorrect_indices": incorrect_indices,
            "angle": angle,
            "target": 110
        }


class CalfRaiseRule(BaseRule):
    def process(self, landmarks):
        # 27 (A), 31 (Heel), 32 (Toe)
        if not self.is_visible(landmarks, [31, 32], 0.6):
            return super().process(landmarks)
            
        heel = landmarks[31]
        toe = landmarks[32]
        
        # Calf raise: Heel rises relative to toe
        # stage detection based on Y difference
        diff = toe.y - heel.y
        
        if diff < 0.02:
            self.stage = "down"
        if diff > 0.05 and self.stage == "down":
            self.stage = "up"
            self.counter += 1
            self.correct_reps += 1
            self.feedback = "High on toes!"
            
        return {
            "counter": self.counter,
            "correct_reps": self.correct_reps,
            "stage": self.stage,
            "feedback": self.feedback,
            "incorrect_indices": []
        }
