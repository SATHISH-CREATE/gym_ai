from .base import BaseRule

class PushupRule(BaseRule):
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

        # Movement Consistency: In a pushup, the body moves but the hands are fixed on floor
        if not self.validate_motion(landmarks, [11, 23], [15, 16], sensitivity=0.01):
            self.feedback = "Keep your hands firm on the ground"
        
        angle = self.calculate_angle(shoulder, elbow, wrist)
        
        # State machine
        if angle > 160:
            self.stage = "up"
        
        # Form Check: Back Alignment (Shoulder - Hip - Knee)
        is_straight = True
        incorrect_indices = []
        if self.is_visible(landmarks, [11, 23, 25], 0.5):
            back_angle = self.calculate_angle(landmarks[11], landmarks[23], landmarks[25])
            # A straight pushup should have a hip angle close to 180 degrees
            if back_angle < 155: # Hips too high or sagging
                is_straight = False
                self.feedback = "Keep back straight!"
                incorrect_indices = [23] # Highlight hips

        if angle < 90 and self.stage == 'up':
            if is_straight:
                self.stage = "down"
                self.counter += 1
                self.correct_reps += 1
                self.feedback = "Good depth!"
            else:
                self.stage = "down"
                self.feedback = "Fix form: straight back"
            
        if self.stage == "down" and angle > 160:
            self.stage = "up"
            if "Fix" not in self.feedback:
                self.feedback = "Down again"

        return {
            "counter": self.counter,
            "correct_reps": self.correct_reps,
            "stage": self.stage,
            "feedback": self.feedback,
            "incorrect_indices": incorrect_indices,
            "angle": angle,
            "target": 90
        }

class ChestPressRule(BaseRule):
    def process(self, landmarks):
        # 11 (S), 13 (E), 15 (W)
        if not self.is_visible(landmarks, [11, 13, 15], 0.6):
            return super().process(landmarks)
            
        shoulder = landmarks[11]
        elbow = landmarks[13]
        
        # Chest Press (Side/Front variation): Elbow moves behind then forward
        if elbow.x < shoulder.x - 0.05:
            self.stage = "down"
        if elbow.x > shoulder.x + 0.1 and self.stage == "down":
            self.stage = "up"
            self.counter += 1
            self.correct_reps += 1
            self.feedback = "Solid press!"
            
        # Form Check: Elbow height
        incorrect_indices = []
        if elbow.y < shoulder.y - 0.05:
            self.feedback = "Lower your elbows slightly"
            incorrect_indices = [13]

        return {
            "counter": self.counter,
            "correct_reps": self.correct_reps,
            "stage": self.stage,
            "feedback": self.feedback,
            "incorrect_indices": incorrect_indices
        }

class ChestFlyRule(BaseRule):
    def process(self, landmarks):
        # 15 (LW), 16 (RW)
        if not self.is_visible(landmarks, [15, 16], 0.6):
            return super().process(landmarks)
            
        l_wrist = landmarks[15]
        r_wrist = landmarks[16]
        
        # Fly: Wrists move toward each other
        dist = self.get_distance(l_wrist, r_wrist)
        
        if dist > 0.4:
            self.stage = "open"
        if dist < 0.15 and self.stage == "open":
            self.stage = "closed"
            self.counter += 1
            self.correct_reps += 1
            self.feedback = "Big squeeze!"
            
        if self.stage == "closed" and dist > 0.4:
            self.stage = "open"
            
        # Form Check: Symmetry
        incorrect_indices = []
        if abs(l_wrist.y - r_wrist.y) > 0.1:
            self.feedback = "Keep arms level!"
            incorrect_indices = [15, 16]

        return {
            "counter": self.counter,
            "correct_reps": self.correct_reps,
            "stage": self.stage,
            "feedback": self.feedback,
            "incorrect_indices": incorrect_indices
        }
