const PROFILE_STORAGE_KEY = "coopairbus-user-profile";

function getStoredProfileName() {
    const rawProfile = localStorage.getItem(PROFILE_STORAGE_KEY);

    if (!rawProfile) {
        return "Utilisateur";
    }

    try {
        const profile = JSON.parse(rawProfile);
        const firstName = String(profile.firstName || "").trim();
        const lastName = String(profile.lastName || "").trim();
        const fullName = `${firstName} ${lastName}`.trim();

        return fullName || "Utilisateur";
    } catch (error) {
        return "Utilisateur";
    }
}

function renderHeaderProfileName() {
    const headerProfileName = document.getElementById("header-profile-name");

    if (!headerProfileName) {
        return;
    }

    headerProfileName.textContent = getStoredProfileName();
}

window.CoopAppUi = {
    renderHeaderProfileName,
    getStoredProfileName
};
