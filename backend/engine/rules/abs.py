import time
from .base import BaseRule


class CrunchRule(BaseRule):
    def process(self, landmarks):
        # 11 (S), 23 (H)
        if not self.is_visible(landmarks, [11, 23], 0.6):
            return super().process(landmarks)
            
        shoulder = landmarks[11]
        hip = landmarks[23]
        
        # Crunch: Shoulder moves toward hip
        dist = self.get_distance(shoulder, hip)
        
        if dist > 0.45:
            self.stage = "down"
            
        # Form Check: Neck strain
        is_stable = True
        incorrect_indices = []
        if self.is_visible(landmarks, [0, 11], 0.5):
            nose = landmarks[0]
            if nose.y < shoulder.y - 0.2:
                is_stable = False
                self.feedback = "Relax your neck!"
                incorrect_indices = [0]

        if dist < 0.35 and self.stage == "down":
            if is_stable:
                self.stage = "up"
                self.counter += 1
                self.correct_reps += 1
                self.feedback = "Crunch those abs!"
            else:
                self.stage = "up"
                self.feedback = "Fix form: relax neck"
            
        return {
            "counter": self.counter,
            "correct_reps": self.correct_reps,
            "stage": self.stage,
            "feedback": self.feedback,
            "incorrect_indices": incorrect_indices
        }

class LegRaiseRule(BaseRule):
    def process(self, landmarks):
        # 11 (S), 23 (H), 27 (A)
        if not self.is_visible(landmarks, [11, 23, 27], 0.6):
            return super().process(landmarks)
            
        shoulder = landmarks[11]
        hip = landmarks[23]
        ankle = landmarks[27]
        
        angle = self.calculate_angle(shoulder, hip, ankle)
        
        if angle > 160:
            self.stage = "down"
            
        # Form Check: Bent knees
        is_stable = True
        incorrect_indices = []
        if self.is_visible(landmarks, [23, 25, 27], 0.5):
            knee_angle = self.calculate_angle(landmarks[23], landmarks[25], landmarks[27])
            if knee_angle < 155: # Tighter rule
                is_stable = False
                self.feedback = "Keep legs straight!"
                incorrect_indices = [25]

        if angle < 100 and self.stage == "down":
            if is_stable:
                self.stage = "up"
                self.counter += 1
                self.correct_reps += 1
                self.feedback = "Legs high!"
            else:
                self.stage = "up"
                self.feedback = "Fix form: straight legs"
            
        if self.stage == "up" and angle > 160:
            self.stage = "down"
            
        return {
            "counter": self.counter,
            "correct_reps": self.correct_reps,
            "stage": self.stage,
            "feedback": self.feedback,
            "incorrect_indices": incorrect_indices,
            "angle": angle,
            "target": 100
        }


class PlankRule(BaseRule):
    def __init__(self):
        super().__init__()
        self.start_time = 0
        
    def process(self, landmarks):
        # 11 (S), 23 (H), 27 (A)
        if not self.is_visible(landmarks, [11, 23, 27], 0.6):
            return super().process(landmarks)
            
        shoulder = landmarks[11]
        hip = landmarks[23]
        ankle = landmarks[27]
        
        is_straight = self.calculate_angle(shoulder, hip, ankle) > 160
        
        if is_straight:
            if not self.start_time: self.start_time = time.time()
            elapsed = int(time.time() - self.start_time)
            self.counter = elapsed # Rep count is seconds held
            self.stage = "holding"
            self.feedback = f"Holding: {elapsed}s"
        else:
            self.start_time = 0
            self.stage = "rest"
            self.feedback = "Keep back straight"
            
        angle = self.calculate_angle(shoulder, hip, ankle)
        return {
            "counter": self.counter,
            "correct_reps": self.counter,
            "stage": self.stage,
            "feedback": self.feedback,
            "incorrect_indices": [] if is_straight else [23],
            "angle": angle,
            "target": 160
        }

class RussianTwistRule(BaseRule):
    def process(self, landmarks):
        # 15 (LW), 16 (RW), 23 (H)
        if not self.is_visible(landmarks, [15, 16, 23], 0.6):
            return super().process(landmarks)
            
        l_wrist = landmarks[15]
        hip = landmarks[23]
        
        # Twist: Hands move from one side of hip to other
        if l_wrist.x < hip.x - 0.1:
            self.stage = "left"
            
        # Form Check: Slumping
        is_stable = True
        incorrect_indices = []
        if self.is_visible(landmarks, [11, 23], 0.5):
            if abs(landmarks[11].x - hip.x) > 0.15:
                is_stable = False
                self.feedback = "Sit up straight!"
                incorrect_indices = [11]

        if l_wrist.x > hip.x + 0.1 and self.stage == "left":
            if is_stable:
                self.stage = "right"
                self.counter += 1
                self.correct_reps += 1
                self.feedback = "Feel the twist!"
            else:
                self.stage = "right"
                self.feedback = "Fix form: sit tall"
            
        return {
            "counter": self.counter,
            "correct_reps": self.correct_reps,
            "stage": self.stage,
            "feedback": self.feedback,
            "incorrect_indices": incorrect_indices
        }
