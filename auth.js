const AUTH_LOGIN_PAGE = "index.html";
const AUTH_HOME_PAGE = "index1.html";

function getAuthConfig() {
    return window.CoopAuthConfig || {};
}

function hasValidConfig() {
    const { supabaseUrl, supabaseAnonKey } = getAuthConfig();

    return Boolean(
        supabaseUrl &&
        supabaseAnonKey &&
        !supabaseUrl.includes("YOUR_PROJECT_REF") &&
        !supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY")
    );
}

function createAuthClient() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
        throw new Error("Supabase n'est pas charge.");
    }

    if (!hasValidConfig()) {
        throw new Error("Supabase n'est pas configure.");
    }

    const { supabaseUrl, supabaseAnonKey } = getAuthConfig();

    return window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
}

async function getSession() {
    const client = createAuthClient();
    const { data, error } = await client.auth.getSession();

    if (error) {
        throw error;
    }

    return data.session || null;
}

async function signInWithEmail(email, password) {
    const client = createAuthClient();
    const { error } = await client.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        throw error;
    }
}

async function logout() {
    try {
        const client = createAuthClient();
        await client.auth.signOut();
    } catch (error) {
        console.error(error);
    } finally {
        window.location.href = AUTH_LOGIN_PAGE;
    }
}

async function redirectIfAuthenticated() {
    if (!hasValidConfig()) {
        return;
    }

    try {
        const session = await getSession();

        if (session) {
            window.location.href = AUTH_HOME_PAGE;
        }
    } catch (error) {
        console.error(error);
    }
}

function attachLogoutButton() {
    const logoutButton = document.getElementById("logout-button");

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener("click", logout);
}

function showConfigError(target) {
    if (!target) {
        return;
    }

    target.textContent = "Configure Supabase dans auth-config.js avant d'utiliser la connexion.";
}

async function initLoginPage() {
    const loginForm = document.getElementById("login-form");
    const emailInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const errorMessage = document.querySelector(".login-error");

    if (!loginForm || !emailInput || !passwordInput || !errorMessage) {
        return;
    }

    if (!hasValidConfig()) {
        showConfigError(errorMessage);
        return;
    }

    await redirectIfAuthenticated();

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        errorMessage.textContent = "";

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            errorMessage.textContent = "Renseigne ton email et ton mot de passe.";
            return;
        }

        try {
            await signInWithEmail(email, password);
            window.location.href = AUTH_HOME_PAGE;
        } catch (error) {
            errorMessage.textContent = error.message || "Connexion impossible.";
            passwordInput.value = "";
            passwordInput.focus();
        }
    });
}

async function requireAuth() {
    if (!hasValidConfig()) {
        window.location.href = AUTH_LOGIN_PAGE;
        return;
    }

    try {
        const session = await getSession();

        if (!session) {
            window.location.href = AUTH_LOGIN_PAGE;
        }
    } catch (error) {
        console.error(error);
        window.location.href = AUTH_LOGIN_PAGE;
    }
}

window.CoopAuth = {
    initLoginPage,
    requireAuth,
    attachLogoutButton,
    logout,
    getSession,
    hasValidConfig
};
