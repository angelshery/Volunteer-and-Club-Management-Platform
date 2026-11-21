// ===== ADD CLUB FEATURE =====

// Get HTML elements
const addClubBtn = document.getElementById("addClubBtn");
const addClubFormContainer = document.getElementById("addClubFormContainer");
const addClubForm = document.getElementById("addClubForm");
const clubFormTitle = document.getElementById("clubFormTitle");
const saveClubBtn = document.getElementById("saveClubBtn");
const cancelClubBtn = document.getElementById("cancelClubBtn");
let editingClubId = null;
const clubMessage = document.getElementById("clubMessage");

// Open form in Create mode
addClubBtn.addEventListener("click", function () {
    editingClubId = null;

    addClubForm.reset();

    clubFormTitle.textContent = "Create a New Club";
    saveClubBtn.textContent = "Save Club";
    clubMessage.textContent = "";

    addClubFormContainer.hidden = false;
});

// Cancel creating or editing a club
cancelClubBtn.addEventListener("click", function () {
    editingClubId = null;

    addClubForm.reset();
    addClubFormContainer.hidden = true;
    clubMessage.textContent = "";
});

// Save club to MySQL database
addClubForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    // Get values entered by admin
    const clubData = {
        name: document.getElementById("clubName").value,
        category: document.getElementById("clubCategory").value,
        description: document.getElementById("clubDescription").value
    };

    try {
        // Send club information to Express backend
        // Determine whether to create or update
        const url = editingClubId === null
            ? "/api/clubs"
            : `/api/clubs/${editingClubId}`;

        const method = editingClubId === null
            ? "POST"
            : "PUT";

        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(clubData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to create club");
        }

        // Show success message
        clubMessage.textContent = result.message;
        clubMessage.style.color = "green";

        // Clear and hide the form
        addClubForm.reset();
        addClubFormContainer.hidden = true;
        editingClubId = null;
        // Refresh the clubs list
        loadClubs();

    } catch (error) {
        clubMessage.textContent = error.message;
        clubMessage.style.color = "red";
    }
});


// ===== DISPLAY CLUBS =====

const clubsList = document.getElementById("clubsList");

async function loadClubs() {

    try {
        const response = await fetch("/api/clubs");

        if (!response.ok || response.redirected) {
            throw new Error("Unable to retrieve clubs");
        }

        const clubs = await response.json();

        // Clear previous content
        clubsList.innerHTML = "";

        // Update total clubs in dashboard
        document.getElementById("totalClubs").textContent =
            clubs.length;

        // Check if there are no clubs
        if (clubs.length === 0) {
            clubsList.textContent = "No clubs created yet.";
            return;
        }

        // Create a card for each club
        clubs.forEach(function (club) {

            const card = document.createElement("div");
            card.className = "club-card";

            const name = document.createElement("h3");
            name.textContent = club.name;

            const category = document.createElement("span");
            category.className = "club-category";
            category.textContent = club.category;

            const description = document.createElement("p");
            description.textContent = club.description;

            // Add elements to card
            // Create Edit button
            const editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.textContent = "Edit Club";
            editBtn.className = "edit-club-btn";

            editBtn.addEventListener("click", function () {
                editClub(club);
            });

            // Add elements to card
            card.appendChild(name);
            card.appendChild(category);
            card.appendChild(description);
            card.appendChild(editBtn);

            // Add card to clubs list
            clubsList.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        clubsList.textContent = "Unable to load clubs.";
    }
}

// Load clubs when the dashboard opens
loadClubs();

// ===== EDIT CLUB FEATURE =====

function editClub(club) {

    // Store the ID of the club being edited
    editingClubId = club.id;

    // Fill the form with existing club details
    document.getElementById("clubName").value =
        club.name;

    document.getElementById("clubCategory").value =
        club.category;

    document.getElementById("clubDescription").value =
        club.description;

    // Change form to Edit mode
    clubFormTitle.textContent = "Edit Club";
    saveClubBtn.textContent = "Update Club";
    clubMessage.textContent = "";

    // Display the form
    addClubFormContainer.hidden = false;

    // Scroll to the form
    addClubFormContainer.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}
