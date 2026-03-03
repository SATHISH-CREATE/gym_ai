from .base import BaseRule

class BicepCurlRule(BaseRule):
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
        
        # State machine
        if angle > 160:
            self.stage = "down"
        
        # Stability check: Upper arm should be relatively vertical for a curl
        # If the elbow is flared out or raised, it's likely a different movement (like a raise)
        is_stable = self.is_vertical(shoulder, elbow, tolerance=0.2)
        
        if angle < 35 and self.stage == 'down':
            if is_stable:
                self.stage = "up"
                self.counter += 1
                self.correct_reps += 1
                self.feedback = "Good rep!"
            else:
                self.feedback = "Keep elbow down/fixed"
            
        if self.stage == "up" and angle > 160:
            self.stage = "down"
            self.feedback = "Go down"

        # Form check: Elbow drift (X-axis)
        incorrect_indices = []
        if not is_stable:
            incorrect_indices = [13] # Highlight elbow

        return {
            "counter": self.counter,
            "correct_reps": self.correct_reps,
            "stage": self.stage,
            "feedback": self.feedback,
            "incorrect_indices": incorrect_indices,
            "angle": angle,
            "target": 35
        }

class WristCurlRule(BaseRule):
    def process(self, landmarks):
        # 15 (W), 17 (P/Hand), 13 (E) - Simplified wrist flexion
        if not self.is_visible(landmarks, [13, 15], 0.6):
            return super().process(landmarks)
            
        elbow = landmarks[13]
        wrist = landmarks[15]
        
        # Wrist curls are small movements; tracking angle change in forearm
        # stage detection based on wrist Y relative to elbow
        if wrist.y > elbow.y:
            self.stage = "down"
        if wrist.y < elbow.y - 0.05 and self.stage == "down":
            self.stage = "up"
            self.counter += 1
            self.correct_reps += 1
            self.feedback = "Squeeze forearms!"
            
        return {
            "counter": self.counter,
            "correct_reps": self.correct_reps,
            "stage": self.stage,
            "feedback": self.feedback,
            "incorrect_indices": []
        }
