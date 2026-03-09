import numpy as np

class BaseRule:
    def __init__(self):
        self.counter = 0
        self.correct_reps = 0
        self.stage = "Ready"
        self.feedback = "Get Ready"
        self.incorrect_indices = []
        self._last_angle = 0
        self.last_positions = {} # Store {index: (x, y)}

    def calculate_angle(self, a, b, c):
        """Calculate angle between points a, b, c (b is vertex)."""
        a_vec = np.array([a.x, a.y])
        b_vec = np.array([b.x, b.y])
        c_vec = np.array([c.x, c.y])
        
        radians = np.arctan2(c_vec[1] - b_vec[1], c_vec[0] - b_vec[0]) - np.arctan2(a_vec[1] - b_vec[1], a_vec[0] - b_vec[0])
        angle = np.abs(radians * 180.0 / np.pi)
        if angle > 180.0:
            angle = 360 - angle
        return angle
    def is_visible(self, landmarks, indices, threshold=0.5):
        """Check if required landmarks meet the visibility threshold."""
        for idx in indices:
            if idx >= len(landmarks) or landmarks[idx].visibility < threshold:
                return False
        return True

    def get_distance(self, p1, p2):
        """Calculate 2D distance between two points."""
        return np.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2)

    def is_vertical(self, p1, p2, tolerance=0.15):
        """Check if the line between p1 and p2 is roughly vertical."""
        return abs(p1.x - p2.x) < tolerance

    def is_horizontal(self, p1, p2, tolerance=0.15):
        """Check if the line between p1 and p2 is roughly horizontal."""
        return abs(p1.y - p2.y) < tolerance

    def process(self, landmarks):
        """Main processing method - override in subclasses."""
        # Generic visibility check (at least some body parts should be visible)
        if not self.is_visible(landmarks, [11, 12], 0.3) and not self.is_visible(landmarks, [23, 24], 0.3):
             return {
                "counter": self.counter,
                "correct_reps": self.correct_reps,
                "stage": "Hidden",
                "feedback": "Body not detected",
                "incorrect_indices": [],
                "visibility_ok": False
            }
            
        return {
            "counter": self.counter,
            "correct_reps": self.correct_reps,
            "stage": self.stage,
            "feedback": self.feedback,
            "incorrect_indices": [],
            "visibility_ok": True
        }

    def validate_motion(self, landmarks, active_indices, stable_indices, sensitivity=0.01):
        """
        Returns True if active_indices are moving MORE than stable_indices.
        Helps prevent counting 'Squats' when you are actually doing 'Bicep Curls' etc.
        """
        is_valid = True
        active_motion = 0
        stable_motion = 0
        
        for idx in active_indices:
            if idx in self.last_positions:
                curr = landmarks[idx]
                prev = self.last_positions[idx]
                active_motion += abs(curr.x - prev[0]) + abs(curr.y - prev[1])
            self.last_positions[idx] = (landmarks[idx].x, landmarks[idx].y)
            
        for idx in stable_indices:
            if idx in self.last_positions:
                curr = landmarks[idx]
                prev = self.last_positions[idx]
                stable_motion += abs(curr.x - prev[0]) + abs(curr.y - prev[1])
            self.last_positions[idx] = (landmarks[idx].x, landmarks[idx].y)
            
        # If the 'stable' parts of the body are moving way more than the 'active' parts,
        # it's likely a different exercise or just moving around.
        if stable_motion > active_motion + sensitivity:
            is_valid = False
            
        return is_valid

