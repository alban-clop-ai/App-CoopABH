const PROFILE_STORAGE_KEY = "coopairbus-user-profile";

function getStoredProfile() {
    const rawProfile = localStorage.getItem(PROFILE_STORAGE_KEY);

    if (!rawProfile) {
        return null;
    }

    try {
        return JSON.parse(rawProfile);
    } catch (error) {
        return null;
    }
}

function storeProfileLocally(profile) {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

async function getProfile() {
    const localProfile = getStoredProfile();

    if (!(window.CoopAuth && window.CoopAuth.hasValidConfig())) {
        return localProfile;
    }

    try {
        const session = await window.CoopAuth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
            return localProfile;
        }

        const client = window.CoopAuth.getClient();
        const { data, error } = await client
            .from("profiles")
            .select("first_name, last_name, photo")
            .eq("id", userId)
            .maybeSingle();

        if (error) {
            return localProfile;
        }

        if (!data) {
            return localProfile;
        }

        const profile = {
            firstName: String(data.first_name || "").trim(),
            lastName: String(data.last_name || "").trim(),
            photo: String(data.photo || "")
        };

        storeProfileLocally(profile);
        return profile;
    } catch (error) {
        return localProfile;
    }
}

async function getAllProfiles() {
    if (!(window.CoopAuth && window.CoopAuth.hasValidConfig())) {
        const localProfile = getStoredProfile();
        return localProfile ? [localProfile] : [];
    }

    try {
        const client = window.CoopAuth.getClient();
        const { data, error } = await client
            .from("profiles")
            .select("id, email, first_name, last_name, photo");

        if (error) {
            return [];
        }

        return (data || []).map((profile) => ({
            id: String(profile.id || ""),
            email: String(profile.email || "").trim(),
            firstName: String(profile.first_name || "").trim(),
            lastName: String(profile.last_name || "").trim(),
            photo: String(profile.photo || "")
        }));
    } catch (error) {
        return [];
    }
}

function getProfileDisplayName(profile) {
    const firstName = String(profile?.firstName || "").trim();
    const lastName = String(profile?.lastName || "").trim();
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || "Utilisateur";
}

async function renderHeaderProfileName() {
    const headerProfileName = document.getElementById("header-profile-name");

    if (!headerProfileName) {
        return;
    }

    const profile = await getProfile();
    headerProfileName.textContent = getProfileDisplayName(profile);
}

window.CoopAppUi = {
    renderHeaderProfileName,
    getProfile,
    getAllProfiles,
    getProfileDisplayName,
    storeProfileLocally
};
