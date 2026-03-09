// Global App Logic for AI Gym

// Common utility for API calls
// Use localhost during development and your production Render URL for live deployment
const API_BASE_URL = window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.protocol === "file:"
    ? "http://localhost:8000"
    : ""; // Relative path works when frontend is served by the backend

// Safe parser helper to prevent crashes from malformed localStorage data
function safeParse(key, fallback) {
    try {
        const val = localStorage.getItem(key);
        if (val === 'undefined' || val === 'null' || !val) return fallback;
        return JSON.parse(val);
    } catch (e) {
        console.warn(`Failed to parse ${key} from local storage`, e);
        return fallback;
    }
}

// Return date string in local YYYY-MM-DD format
function getLocalKey(date = new Date()) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function apiPost(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (err) {
        console.error(`API Error on ${endpoint}:`, err);
        throw err;
    }
}

// ---- Notification System ----
const NotificationManager = {
    async init() {
        if (!("Notification" in window)) return;

        // Auto-request if not denied
        if (Notification.permission === "default") {
            setTimeout(() => this.requestPermission(), 5000);
        }

        this.checkStreakStatus();
        this.checkReminders();
        this.checkHydrationReminder();
    },

    async requestPermission() {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            this.sendWelcomeNotification();
        }
    },

    sendWelcomeNotification() {
        new Notification("FIT COACH AI", {
            body: "Notifications enabled! We'll keep you on track with your goals.",
            icon: "https://cdn-icons-png.flaticon.com/512/10542/10542699.png"
        });
    },

    checkHydrationReminder() {
        const today = getLocalKey();
        const waterData = safeParse(`water_${today}`, 0);
        const profile = safeParse('user_profile', { "weight": 70 });
        const goal = (profile.weight || 70) * 35;
        const currentHour = new Date().getHours();

        // Hourly reminder between 8 AM and 9 PM if behind
        if (currentHour >= 8 && currentHour <= 21) {
            const expectedWater = (goal / 14) * (currentHour - 7); // Spread goal over 14 hours
            if (waterData < expectedWater) {
                this.notify("Hydration Nudge 💧", "You're a bit behind your water goal. Take a few sips now!");
            }
        }
    },

    checkReminders() {
        const history = JSON.parse(localStorage.getItem('workout_history') || '[]');
        const today = new Date().toDateString();
        const hasTrainedToday = history.some(h => new Date(h.date).toDateString() === today);
        const currentHour = new Date().getHours();

        // 1. Time to Train Reminder (if not trained by 6 PM)
        if (!hasTrainedToday && currentHour >= 18) {
            this.notify("Time to train! 🏋️", "Still time to crush your daily goal. Don't let the day slip away!");
        }

        // 2. New Workout Plan Available (Simulated check)
        const lastPlanCheck = localStorage.getItem('last_plan_check');
        if (lastPlanCheck !== today && history.length % 5 === 0 && history.length > 0) {
            this.notify("New Strategy Available", "AI Coach has analyzed your recent work. Check out your updated strategy.");
            localStorage.setItem('last_plan_check', today);
        }
    },

    checkStreakStatus() {
        const history = JSON.parse(localStorage.getItem('workout_history') || '[]');
        if (history.length === 0) return;

        const lastWorkout = new Date(history[history.length - 1].date);
        const dayDiff = (new Date() - lastWorkout) / (1000 * 60 * 60 * 24);

        // 3. Streak about to break (approx 1.5 days since last session)
        if (dayDiff > 1.4 && dayDiff < 2) {
            this.notify("Streak Alert! 🔥", "Your streak is about to break! A quick 10-min session can save it.");
        }
    },

    notify(title, body) {
        if (Notification.permission === "granted") {
            new Notification(title, {
                body: body,
                icon: "https://cdn-icons-png.flaticon.com/512/10542/10542699.png"
            });
        }
    }
};

window.addEventListener('load', () => {
    NotificationManager.init();
});
