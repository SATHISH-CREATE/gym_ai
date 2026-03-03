// Global App Logic for AI Gym

// Common utility for API calls
// Use localhost during development and your production Render URL for live deployment
const API_BASE_URL = window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.protocol === "file:"
    ? "http://localhost:8000"
    : ""; // Relative path works when frontend is served by the backend

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
