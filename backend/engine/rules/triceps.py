from .base import BaseRule

class TricepExtensionRule(BaseRule):
    def process(self, landmarks):
        # Indices: 11 (S), 13 (E), 15 (W)
        if not self.is_visible(landmarks, [11, 13, 15], 0.6):
            return {
                "counter": self.counter,
                "correct_reps": self.correct_reps,
                "stage": "Hidden",
                "feedback": "Step back for full body detection",
                "incorrect_indices": [],
                "visibility_ok": False
            }

        shoulder = landmarks[11]
        elbow = landmarks[13]
        wrist = landmarks[15]
        
        angle = self.calculate_angle(shoulder, elbow, wrist)
        
        if angle < 90:
            self.stage = "down"
            
        # Form Check: Elbow drift
        is_stable = True
        incorrect_indices = []
        if abs(elbow.x - shoulder.x) > 0.12: # Tighter tolerance
            is_stable = False
            self.feedback = "Keep elbows tucked!"
            incorrect_indices = [13]

        if angle > 160 and self.stage == 'down':
            if is_stable:
                self.stage = "up"
                self.counter += 1
                self.correct_reps += 1
                self.feedback = "Full extension!"
            else:
                self.stage = "up"
                self.feedback = "Fix form: tuck elbows"
            
        if self.stage == "up" and angle < 90:
            self.stage = "down"
            if "Fix" not in self.feedback:
                self.feedback = "Good stretch"

        return {
            "counter": self.counter,
            "correct_reps": self.correct_reps,
            "stage": self.stage,
            "feedback": self.feedback,
            "incorrect_indices": incorrect_indices,
            "angle": angle,
            "target": 160
        }

class DipRule(BaseRule):
    def process(self, landmarks):
        return super().process(landmarks)
