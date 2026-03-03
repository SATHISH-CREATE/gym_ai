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
        
        angle = self.calculate_angle(hip, knee, ankle)
        
        if angle > 160:
            self.stage = "up"
        if angle < 100 and self.stage == 'up':
            self.stage = "down"
            self.counter += 1
            self.correct_reps += 1
            self.feedback = "Good depth!"
            
        if self.stage == "down" and angle > 160:
            self.stage = "up"
            self.feedback = "Squat down"

        # Form Check: Knee Stability (Don't let knees go too far past toes)
        incorrect_indices = []
        if knee.x > ankle.x + 0.1: # Knee moving too far forward relative to ankle
            self.feedback = "Watch your knees! Keep them back."
            incorrect_indices = [25]

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
        if angle < 110 and self.stage == "up":
            self.stage = "down"
            self.counter += 1
            self.correct_reps += 1
            self.feedback = "Deep lunge!"
            
        if self.stage == "down" and angle > 160:
            self.stage = "up"
            self.feedback = "Switch legs or repeat"
            
        # Form Check: Knee alignment
        incorrect_indices = []
        if knee.x > ankle.x + 0.15:
            self.feedback = "Keep knee behind toes"
            incorrect_indices = [25]

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
