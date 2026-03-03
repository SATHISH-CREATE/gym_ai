from .arms import BicepCurlRule, WristCurlRule
from .chest import PushupRule, ChestPressRule, ChestFlyRule
from .legs import SquatRule, LungeRule, CalfRaiseRule
from .back import PullupRule, RowRule, DeadliftRule
from .shoulders import OverheadPressRule, LateralRaiseRule, ShrugRule
from .triceps import TricepExtensionRule, DipRule
from .abs import CrunchRule, LegRaiseRule, PlankRule, RussianTwistRule
from .full_body import CleaningPressRule, BurpeeRule

EXERCISE_RULES = {
    # Chest
    "Push-ups": PushupRule,
    "Push-Ups": PushupRule,
    "Incline Barbell Bench Press": ChestPressRule,
    "Incline Dumbbell Press": ChestPressRule,
    "Incline Machine Press": ChestPressRule,
    "Flat Barbell Bench Press": ChestPressRule,
    "Flat Dumbbell Press": ChestPressRule,
    "Chest Press Machine": ChestPressRule,
    "Decline Bench Press": ChestPressRule,
    "Decline Pushups": PushupRule,
    "Decline Dumbbell Press": ChestPressRule,
    "Incline Cable Fly": ChestFlyRule,
    "Decline Cable Fly": ChestFlyRule,
    "Cable Crossover": ChestFlyRule,
    "Pec Deck Fly": ChestFlyRule,
    "Svend Press": ChestPressRule,

    # Back
    "Pull-ups": PullupRule,
    "Pull-Ups": PullupRule,
    "Lat Pulldown (Wide Grip)": PullupRule,
    "Close-Grip Lat Pulldown": PullupRule,
    "Chin-Ups": PullupRule,
    "Barbell Bent-Over Rows": RowRule,
    "Dumbbell Bent-Over Rows": RowRule,
    "Seated Cable Row": RowRule,
    "T-Bar Row": RowRule,
    "Chest-Supported Row": RowRule,
    "Straight Arm Pulldown": RowRule,
    "Deadlift": DeadliftRule,
    "Romanian Deadlift": DeadliftRule,
    "Hyperextensions": DeadliftRule,

    # Shoulders
    "Overhead Barbell Press": OverheadPressRule,
    "Overhead Dumbbell Press": OverheadPressRule,
    "Arnold Press": OverheadPressRule,
    "Push Press": OverheadPressRule,
    "Front Raises (Dumbbell/Plate/Barbell)": LateralRaiseRule,
    "Dumbbell Lateral Raises": LateralRaiseRule,
    "Cable Lateral Raises": LateralRaiseRule,
    "Machine Lateral Raise": LateralRaiseRule,
    "Cable Y-Raise": LateralRaiseRule,
    "Reverse Pec Deck": ChestFlyRule,
    "Bent Over Dumbbell Rear Delt Fly": ChestFlyRule,
    "Rear Delt Cable Fly": ChestFlyRule,
    "Face Pull": RowRule,
    "Face Pulls": RowRule,
    "Barbell Shrugs": ShrugRule,
    "Dumbbell Shrugs": ShrugRule,
    "Upright Rows": RowRule,

    # Biceps
    "Bicep Curl": BicepCurlRule,
    "Bicep Curls": BicepCurlRule,
    "Incline Dumbbell Curl": BicepCurlRule,
    "Hammer Curl": BicepCurlRule,
    "Close Grip Barbell Curl": BicepCurlRule,
    "Wide Grip Barbell Curl": BicepCurlRule,
    "Preacher Curl": BicepCurlRule,
    "Concentration Curl": BicepCurlRule,
    "Spider Curl": BicepCurlRule,
    "Reverse Curl": BicepCurlRule,
    "Cross Body Hammer Curl": BicepCurlRule,
    "Cable Curl (Behind Body)": BicepCurlRule,
    "Wrist Curl (Palms Up)": WristCurlRule,
    "Reverse Wrist Curl (Palms Down)": WristCurlRule,
    "Cable Wrist Curl": WristCurlRule,
    "Barbell Wrist Curl": WristCurlRule,

    # Triceps
    "Overhead Triceps Extension": TricepExtensionRule,
    "Reverse Grip Overhead Extension": TricepExtensionRule,
    "Skull Crushers": TricepExtensionRule,
    "Tricep Pushdown (Straight Bar)": TricepExtensionRule,
    "Rope Pushdown": TricepExtensionRule,
    "Reverse Grip Pushdown": TricepExtensionRule,
    "Cable Kickbacks": TricepExtensionRule,
    "Diamond Push-ups": PushupRule,
    "Weighted Bench Dips": DipRule,
    "Close Grip Bench Press": ChestPressRule,

    # Legs
    "Barbell Squats": SquatRule,
    "Squats": SquatRule,
    "Squat": SquatRule,
    "Front Squats": SquatRule,
    "Leg Press": SquatRule,
    "Bulgarian Split Squat": SquatRule,
    "Lunges": LungeRule,
    "Lunge": LungeRule,
    "Walking Lunges": LungeRule,
    "Lying Leg Curl": BicepCurlRule, # Similar joint extension/flexion
    "Seated Leg Curl": BicepCurlRule,
    "Nordic Curl": LungeRule,
    "Hip Thrust": DeadliftRule,
    "Glute Bridge": DeadliftRule,
    "Sumo Deadlift": DeadliftRule,
    "Standing Calf Raises": CalfRaiseRule,
    "Seated Calf Raises": CalfRaiseRule,

    # Abs
    "Crunches": CrunchRule,
    "Crunch": CrunchRule,
    "Weighted Crunch": CrunchRule,
    "Cable Crunch": CrunchRule,
    "Sit-ups": CrunchRule,
    "Hanging Leg Raises": LegRaiseRule,
    "Reverse Crunch": LegRaiseRule,
    "Mountain Climbers": BurpeeRule,
    "Russian Twists": RussianTwistRule,
    "Bicycle Crunch": CrunchRule,
    "Plank": PlankRule,
    "Side Plank": PlankRule,
    "Dead Bug": PlankRule,
    "Ab Wheel Rollout": PlankRule,

    # Full Body
    "Clean and Press": CleaningPressRule,
    "Power Clean": CleaningPressRule,
    "Snatch": CleaningPressRule,
    "Thrusters": CleaningPressRule,
    "Barbell Complex (Clean + Front Squat + Jerk)": CleaningPressRule,
    "Deadlift to High Pull to Press": CleaningPressRule,
    "Man Makers": BurpeeRule,
    "Devil Press": BurpeeRule,
    "Burpee Pull-Up": BurpeeRule,
    "Turkish Get-Up": CleaningPressRule,
    "Farmer's Carry + Overhead Press": OverheadPressRule
}
