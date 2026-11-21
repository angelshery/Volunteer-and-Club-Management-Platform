
const profileForm = document.getElementById("profileForm");
const profileMessage = document.getElementById("profileMessage");
const saveProfileBtn = document.getElementById("saveProfileBtn");

// Get selected checkbox values
function getCheckedValues(name) {
    return Array.from(
        document.querySelectorAll(
            `input[name="${name}"]:checked`
        )
    ).map(input => input.value);
}

// Check boxes based on saved values
function setCheckedValues(name, values) {
    document.querySelectorAll(
        `input[name="${name}"]`
    ).forEach(input => {
        input.checked = values.includes(input.value);
    });
}

// Convert saved comma-separated text into an array
function splitValues(text) {
    if (!text) return [];
    return text.split(",").filter(Boolean);
}

// Display a success or error message
function showMessage(message, type) {
    profileMessage.textContent = message;
    profileMessage.className = type;
}

// Load saved profile from MySQL
async function loadProfile() {
    try {
        const response = await fetch("/api/profile");

        if (response.status === 401) {
            window.location.href = "/login.html";
            return;
        }

        if (response.status === 403) {
            window.location.href = "/admin";
            return;
        }

        if (!response.ok) {
            throw new Error("Could not load profile");
        }

        const profile = await response.json();

        // Personal information
        document.getElementById("fname").value =
            profile.fname || "";

        document.getElementById("lname").value =
            profile.lname || "";

        document.getElementById("email").value =
            profile.email || "";

        document.getElementById("username").value =
            profile.username || "";

        // Interests and skills
        setCheckedValues(
            "interests",
            splitValues(profile.interests)
        );

        setCheckedValues(
            "skills",
            splitValues(profile.skills)
        );

        // Availability
        const availability = (profile.availability || "").split("|");

        const savedDays = splitValues(availability[0]);
        const savedTime = availability[1] || "Anytime";

        setCheckedValues("days", savedDays);

        document.getElementById("preferredTime").value =
            ["Anytime", "Morning", "Afternoon", "Evening"]
                .includes(savedTime) ? savedTime : "Anytime";

    } catch (error) {
        console.error(error);
        showMessage("Unable to load your profile.", "error");
    }
}

// Save profile when the student submits the form
profileForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const profileData = {
        interests: getCheckedValues("interests"),
        skills: getCheckedValues("skills"),
        days: getCheckedValues("days"),
        preferredTime:
            document.getElementById("preferredTime").value
    };

    saveProfileBtn.disabled = true;
    showMessage("Saving profile...", "");

    try {
        const response = await fetch("/api/profile", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(profileData)
        });

        if (response.status === 401) {
            window.location.href = "/login.html";
            return;
        }

        if (response.status === 403) {
            window.location.href = "/admin";
            return;
        }

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Could not save profile"
            );
        }

        showMessage(result.message, "success");

    } catch (error) {
        console.error(error);
        showMessage(error.message, "error");
    } finally {
        saveProfileBtn.disabled = false;
    }
});

loadProfile();
