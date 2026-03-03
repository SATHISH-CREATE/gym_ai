from .base import BaseRule

class OverheadPressRule(BaseRule):
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
        if angle > 160 and self.stage == 'down':
            self.stage = "up"
            self.counter += 1
            self.correct_reps += 1
            self.feedback = "Good press!"
            
        if self.stage == "up" and angle < 90:
            self.stage = "down"
            self.feedback = "Lower elbows"

        # Form Check: Arched back
        incorrect_indices = []
        if self.is_visible(landmarks, [11, 23, 25], 0.5):
            back_angle = self.calculate_angle(landmarks[11], landmarks[23], landmarks[25])
            if back_angle < 160:
                self.feedback = "Don't arch your back!"
                incorrect_indices = [23]

        return {
            "counter": self.counter,
            "correct_reps": self.correct_reps,
            "stage": self.stage,
            "feedback": self.feedback,
            "incorrect_indices": incorrect_indices
        }

class LateralRaiseRule(BaseRule):
    def process(self, landmarks):
        # 11 (S), 13 (E), 15 (W)
        if not self.is_visible(landmarks, [11, 13], 0.6):
            return super().process(landmarks)
            
        shoulder = landmarks[11]
        elbow = landmarks[13]
        
        # Lateral raise: Elbow comes up to shoulder height
        # stage detection based on elbow Y relative to shoulder Y
        if elbow.y > shoulder.y + 0.1: # Elbow well below shoulder
            self.stage = "down"
            
        if elbow.y < shoulder.y + 0.05 and self.stage == "down": # Elbow at/near shoulder height
            self.stage = "up"
            self.counter += 1
            self.correct_reps += 1
            self.feedback = "Great raise!"
            
        if self.stage == "up" and elbow.y > shoulder.y + 0.1:
            self.stage = "down"
            self.feedback = "Control the descent"
            
        # Form Check: Hands too high
        incorrect_indices = []
        if self.is_visible(landmarks, [13, 15], 0.5):
            wrist = landmarks[15]
            if wrist.y < elbow.y - 0.05:
                self.feedback = "Keep elbows above wrists"
                incorrect_indices = [15]

        return {
            "counter": self.counter,
            "correct_reps": self.correct_reps,
            "stage": self.stage,
            "feedback": self.feedback,
            "incorrect_indices": incorrect_indices
        }

class ShrugRule(BaseRule):
    def process(self, landmarks):
        # 11 (S), 7 (Ear) - Elevation detection
        if not self.is_visible(landmarks, [7, 11], 0.6):
            return super().process(landmarks)
            
        ear = landmarks[7]
        shoulder = landmarks[11]
        
        # Shrug: Distance between ear and shoulder decreases
        dist = self.get_distance(ear, shoulder)
        
        if dist > 0.12:
            self.stage = "down"
        if dist < 0.08 and self.stage == "down":
            self.stage = "up"
            self.counter += 1
            self.correct_reps += 1
            self.feedback = "Squeeze traps!"
            
        return {
            "counter": self.counter,
            "correct_reps": self.correct_reps,
            "stage": self.stage,
            "feedback": self.feedback,
            "incorrect_indices": []
        }
