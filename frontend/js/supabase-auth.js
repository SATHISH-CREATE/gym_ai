/**
 * Supabase Auth & Sync Engine
 * Handles Authentication, Real-time Sync, and localStorage migration
 */

const SupabaseAuth = {
    isSyncing: false,
    async init() {
        if (this.isSyncing) return;
        this.isSyncing = true;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await this.handleSession(session);
        } catch (e) {
            console.warn("Auth Session Check Failed:", e);
        } finally {
            this.isSyncing = false;
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange((_event, session) => {
            this.handleSession(session);
        });
    },

    async handleSession(session) {
        if (session) {
            console.log("User logged in:", session.user);
            localStorage.setItem('supabase_user_id', session.user.id);

            // Check if profile exists, if not migrate local data
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (!profile) {
                await this.migrateLocalData(session.user);
            } else {
                // Sync cloud data to local for offline-first
                await this.syncCloudToLocal(session.user.id);
            }
        } else {
            localStorage.removeItem('supabase_user_id');
        }
    },

    // --- Authentication Flows ---

    async signInWithGoogle() {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/index.html'
                }
            });
            if (error) throw error;
        } catch (error) {
            console.error(error);
            alert("Google Login Error: " + error.message + "\n\nNote: For Google Login to work, you MUST enable the Google Provider in your Supabase Dashboard (Authentication -> Providers) and add your Google Cloud Client ID/Secret.");
        }
    },

    async signUpEmail(email, password, name) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name }
            }
        });
        if (error) throw error;
        return data;
    },

    async signInEmail(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data;
    },

    async signOut() {
        await supabase.auth.signOut();
        localStorage.clear(); // Clear local cache on logout
        window.location.href = 'index.html';
    },

    // --- Data Sync & Migration ---

    async migrateLocalData(user) {
        console.log("Migrating local data to cloud...");
        const localProfile = JSON.parse(localStorage.getItem('user_profile') || '{}');
        const history = JSON.parse(localStorage.getItem('workout_history') || '[]');
        const prs = JSON.parse(localStorage.getItem('user_prs') || '{}');
        const macroPlan = JSON.parse(localStorage.getItem('user_macro_plan') || '{}');
        const workoutPlan = JSON.parse(localStorage.getItem('my_6day_plan') || '[]');

        // 1. Create Profile
        await supabase.from('profiles').insert([{
            id: user.id,
            name: localProfile.name || user.user_metadata.full_name,
            gender: localProfile.gender,
            age: localProfile.age,
            height: localProfile.height,
            weight: localProfile.weight,
            goal: localProfile.goal,
            level: localProfile.level,
            avatar_url: user.user_metadata.avatar_url
        }]);

        // 2. Upload Workout History
        if (history.length > 0) {
            const historyToUpload = history.map(h => ({
                user_id: user.id,
                exercise: h.exercise,
                reps: h.reps,
                sets: h.sets || 1,
                duration: h.duration,
                accuracy: h.accuracy,
                calories: h.calories || 0,
                grade: h.grade || 'B',
                intensity: h.intensity,
                created_at: h.date
            }));
            await supabase.from('workout_history').insert(historyToUpload);
        }

        // 3. Upload User Data (Plans, PRs)
        await supabase.from('user_data').upsert({
            user_id: user.id,
            workout_plan: workoutPlan,
            macro_plan: macroPlan,
            prs: prs
        });

        console.log("Migration complete!");
    },

    async syncCloudToLocal(userId) {
        // Fetch all user data from cloud and update localStorage
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
        const { data: history } = await supabase.from('workout_history').select('*').eq('user_id', userId).order('created_at', { ascending: true });
        const { data: userData } = await supabase.from('user_data').select('*').eq('user_id', userId).single();

        if (profile) localStorage.setItem('user_profile', JSON.stringify(profile));
        if (history) {
            const mappedHistory = history.map(h => ({
                date: h.created_at,
                exercise: h.exercise,
                reps: h.reps,
                sets: h.sets,
                duration: h.duration,
                accuracy: h.accuracy,
                calories: h.calories,
                grade: h.grade,
                intensity: h.intensity
            }));
            localStorage.setItem('workout_history', JSON.stringify(mappedHistory));
        }
        if (userData) {
            if (userData.prs) localStorage.setItem('user_prs', JSON.stringify(userData.prs));
            if (userData.macro_plan) localStorage.setItem('user_macro_plan', JSON.stringify(userData.macro_plan));
            if (userData.workout_plan && Array.isArray(userData.workout_plan) && userData.workout_plan.length > 0) {
                localStorage.setItem('my_6day_plan', JSON.stringify(userData.workout_plan));
            }
        }

        // Notify app that sync is complete
        window.dispatchEvent(new CustomEvent('supabase-sync-complete'));
    },

    // --- Helper for Real-time Cloud updates ---
    async saveWorkout(sessionData) {
        const userId = localStorage.getItem('supabase_user_id');
        if (userId) {
            await supabase.from('workout_history').insert([{
                user_id: userId,
                ...sessionData,
                created_at: sessionData.date
            }]);
        }
        // Always update local for offline fallback
        const history = JSON.parse(localStorage.getItem('workout_history') || '[]');
        history.push(sessionData);
        localStorage.setItem('workout_history', JSON.stringify(history));
    },

    async updateProfile(profileData) {
        const userId = localStorage.getItem('supabase_user_id');
        if (userId) {
            await supabase.from('profiles').update(profileData).eq('id', userId);
        }
        const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
        const newProfile = { ...profile, ...profileData };
        localStorage.setItem('user_profile', JSON.stringify(newProfile));
    },

    async saveMacroPlan(macroPlan) {
        const userId = localStorage.getItem('supabase_user_id');
        if (userId) {
            // Upsert macro plan to user_data table
            await supabase.from('user_data').upsert({
                user_id: userId,
                macro_plan: macroPlan
            }, { onConflict: 'user_id' });
        }
        localStorage.setItem('user_macro_plan', JSON.stringify(macroPlan));
    },

    async saveWorkoutPlan(plan) {
        const userId = localStorage.getItem('supabase_user_id');
        if (userId) {
            try {
                const { error } = await supabase.from('user_data').upsert({
                    user_id: userId,
                    workout_plan: plan,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
                
                if (error) throw error;
                console.log("Workout plan synced to cloud successfully");
            } catch (err) {
                console.error("Failed to sync workout plan to cloud:", err);
            }
        }
        // Always update local for immediate feedback
        localStorage.setItem('my_6day_plan', JSON.stringify(plan));
    }
};

// Only auto-init if supabase client is available
if (typeof supabase !== 'undefined' && supabase) {
    SupabaseAuth.init();
} else {
    console.warn('Supabase client not initialized — skipping SupabaseAuth.init()');
}
