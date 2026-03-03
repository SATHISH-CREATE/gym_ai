from .base import BaseRule

class CleaningPressRule(BaseRule):
    def process(self, landmarks):
        # 11 (S), 15 (W), 23 (H)
        if not self.is_visible(landmarks, [11, 15, 23], 0.6):
            return super().process(landmarks)
            
        shoulder = landmarks[11]
        wrist = landmarks[15]
        hip = landmarks[23]
        
        # Clean phase: wrist below hip to near shoulder
        if wrist.y > hip.y:
            self.stage = "start"
        if wrist.y < shoulder.y + 0.1 and self.stage == "start":
            self.stage = "clean"
            self.feedback = "Cleaned! Now press!"
            
        # Press phase: wrist near shoulder to above head
        if self.stage == "clean" and wrist.y < shoulder.y - 0.2:
            self.stage = "press"
            self.counter += 1
            self.correct_reps += 1
            self.feedback = "Great Clean & Press!"
            
        return {
            "counter": self.counter,
            "correct_reps": self.correct_reps,
            "stage": self.stage,
            "feedback": self.feedback,
            "incorrect_indices": []
        }

class BurpeeRule(BaseRule):
    def process(self, landmarks):
        # 23 (H), 27 (A)
        if not self.is_visible(landmarks, [23, 27], 0.6):
            return super().process(landmarks)
            
        hip = landmarks[23]
        ankle = landmarks[27]
        
        # Burpee: Hips go low (plank/squat) then high (jump)
        if hip.y > ankle.y - 0.2: # Hips low
            self.stage = "down"
        if self.stage == "down" and hip.y < ankle.y - 0.5: # Hips high (standing/jump)
            self.stage = "up"
            self.counter += 1
            self.correct_reps += 1
            self.feedback = "Burpee complete!"
            
        return {
            "counter": self.counter,
            "correct_reps": self.correct_reps,
            "stage": self.stage,
            "feedback": self.feedback,
            "incorrect_indices": []
        }
