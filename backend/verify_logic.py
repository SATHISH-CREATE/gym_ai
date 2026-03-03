import sys
import os
import time

# Add backend to path to import engine
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from engine.rules.arms import BicepCurlRule
from engine.rules.legs import SquatRule, LungeRule

from engine.rules.chest import PushupRule
from engine.rules.shoulders import LateralRaiseRule, ShrugRule

class MockLandmark:
    def __init__(self, x, y, visibility=1.0):
        self.x = x
        self.y = y
        self.z = 0.0
        self.visibility = visibility

def create_mock_landmarks(positions):
    landmarks = [MockLandmark(0, 0, 0.1) for _ in range(33)]
    for idx, (x, y) in positions.items():
        landmarks[idx] = MockLandmark(x, y, 1.0)
    return landmarks

def test_exercise(name, rule_class, down_pos, up_pos, incomplete_pos=None):
    print(f"\n--- Testing {name} ---")
    rule = rule_class()
    
    # 1. Initial State
    res = rule.process(create_mock_landmarks(down_pos))
    print(f"Initial (Down/Start): stage={res.get('stage')}, counter={res.get('counter')}")

    # 2. Incomplete Rep
    if incomplete_pos:
        res = rule.process(create_mock_landmarks(incomplete_pos))
        print(f"Incomplete Rep: stage={res.get('stage')}, counter={res.get('counter')}, feedback='{res.get('feedback')}'")

    # 3. Complete Rep
    res = rule.process(create_mock_landmarks(up_pos))
    print(f"Complete Rep (Up): stage={res.get('stage')}, counter={res.get('counter')}, feedback='{res.get('feedback')}'")

    # 4. Return to Start
    res = rule.process(create_mock_landmarks(down_pos))
    print(f"Return to Start: stage={res.get('stage')}, counter={res.get('counter')}")
    return res.get('counter')

if __name__ == "__main__":
    # Bicep Curl: 11 (S), 13 (E), 15 (W)
    # Correct Curl
    test_exercise("Bicep Curl (Correct)", BicepCurlRule,
                  down_pos={11: (0.5, 0.2), 13: (0.5, 0.4), 15: (0.5, 0.6)},
                  up_pos={11: (0.5, 0.2), 13: (0.5, 0.4), 15: (0.55, 0.25)})

    # CROSS-TEST: Lateral Raise movement on Bicep Curl Rule
    # Lateral Raise: Elbow moves UP to shoulder height, Wrist stays away from shoulder
    # Bicep Curl should NOT count this because the elbow isn't stable (it's raised)
    print("\n--- Testing CROSS-EXERCISE (Raise movement on Curl Rule) ---")
    curl_rule = BicepCurlRule()
    # "Down" pos
    curl_rule.process(create_mock_landmarks({11: (0.5, 0.2), 13: (0.5, 0.4), 15: (0.5, 0.6)}))
    # "Up" movement (Lateral Raise style: elbow rises)
    res = curl_rule.process(create_mock_landmarks({11: (0.5, 0.2), 13: (0.7, 0.2), 15: (0.9, 0.2)}))
    print(f"Result of Raise on Curl Rule: counter={res['counter']}, feedback='{res['feedback']}'")
    if res['counter'] == 0:
        print("SUCCESS: Raise movement dismissed by Curl rule.")
    else:
        print("FAILURE: Raise movement incorrectly counted as Curl.")

    # Lateral Raise: 11 (S), 13 (E)
    test_exercise("Lateral Raise", LateralRaiseRule,
                  down_pos={11: (0.5, 0.2), 13: (0.5, 0.4)},
                  up_pos={11: (0.5, 0.2), 13: (0.7, 0.2)})

    # Shrug: 11 (S), 7 (Ear)
    test_exercise("Shrug", ShrugRule,
                  down_pos={11: (0.5, 0.3), 7: (0.5, 0.15)},
                  up_pos={11: (0.5, 0.25), 7: (0.5, 0.15)})

    # Lunge: 23 (H), 25 (K), 27 (A)
    test_exercise("Lunge", LungeRule,
                  down_pos={23: (0.5, 0.4), 25: (0.5, 0.6), 27: (0.5, 0.8)},
                  up_pos={23: (0.5, 0.6), 25: (0.5, 0.8), 27: (0.6, 0.8)})
