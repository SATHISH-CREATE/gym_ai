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
        
        # Movement Consistency: In a curl, the wrist should move more than the hips
        # If the user is squatting, the hips will have high motion.
        if not self.validate_motion(landmarks, [15], [23, 24], sensitivity=0.015):
            self.feedback = "Stay stable! Too much body movement."
            # We don't return early to allow feedback, but we set a flag if needed
            # In this case we just change the feedback.
        
        angle = self.calculate_angle(shoulder, elbow, wrist)
        
        # State machine
        if angle > 160:
            self.stage = "down"
        
        # Form check: Elbow drift (X-axis) - should be relatively fixed
        is_stable = self.is_vertical(shoulder, elbow, tolerance=0.15)
        incorrect_indices = []
        if not is_stable:
            incorrect_indices = [13] # Highlight elbow
            self.feedback = "Keep elbow fixed at side!"

        if angle < 35 and self.stage == 'down':
            if is_stable:
                self.stage = "up"
                self.counter += 1
                self.correct_reps += 1
                self.feedback = "Good rep!"
            else:
                self.stage = "up" # Transition stage even if bad rep
                self.feedback = "Form issue: elbow moved"
            
        if self.stage == "up" and angle > 160:
            self.stage = "down"
            if "Form" not in self.feedback:
                self.feedback = "Straighten arm fully"

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
