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


            // Create Delete button
            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.textContent = "Delete Club";
            deleteBtn.className = "delete-club-btn";

            deleteBtn.addEventListener("click", function () {
                deleteClub(club.id, club.name);
            });


            // Add elements to card
            card.appendChild(name);
            card.appendChild(category);
            card.appendChild(description);
            card.appendChild(editBtn);
            card.appendChild(deleteBtn);

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


// ===== DELETE CLUB FEATURE =====

async function deleteClub(clubId, clubName) {

    // Ask admin to confirm deletion
    const confirmed = confirm(
        `Are you sure you want to delete "${clubName}"?`
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/clubs/${clubId}`, {
            method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Could not delete club");
        }

        clubMessage.textContent = result.message;
        clubMessage.style.color = "green";

        // Close the edit form if the deleted club was being edited
        if (editingClubId === clubId) {
            editingClubId = null;
            addClubForm.reset();
            addClubFormContainer.hidden = true;
        }

        // Refresh club cards and total count
        await loadClubs();

    } catch (error) {
        console.error(error);
        clubMessage.textContent = error.message;
        clubMessage.style.color = "red";
    }
}

// ===== ADD OPPORTUNITY FEATURE =====

// Get HTML elements
const addOpportunityBtn = document.getElementById("addOpportunityBtn");
const addOpportunityFormContainer = document.getElementById("addOpportunityFormContainer");
const addOpportunityForm = document.getElementById("addOpportunityForm");
const cancelOpportunityBtn = document.getElementById("cancelOpportunityBtn");
const opportunityClub = document.getElementById("opportunityClub");
const opportunityMessage = document.getElementById("opportunityMessage");
const opportunityFormTitle = document.getElementById("opportunityFormTitle");
const saveOpportunityBtn = document.getElementById("saveOpportunityBtn");
let editingOpportunityId = null;

// Display the Add Opportunity form
addOpportunityBtn.addEventListener("click", async function () {
        editingOpportunityId = null;
    addOpportunityForm.reset();
    opportunityFormTitle.textContent =
        "Create a Volunteer Opportunity";

    saveOpportunityBtn.textContent = "Save Opportunity";
    opportunityMessage.textContent = "";

    addOpportunityFormContainer.hidden = false;

    // Load available clubs
    await loadClubOptions();
});

// Cancel creating an opportunity
cancelOpportunityBtn.addEventListener("click", function () {
    editingOpportunityId = null;
    addOpportunityForm.reset();

    addOpportunityFormContainer.hidden = true;

    opportunityMessage.textContent = "";
});


// ===== LOAD CLUB DROPDOWN =====

async function loadClubOptions() {

    try {

        const response = await fetch("/api/clubs");

        if (!response.ok || response.redirected) {
            throw new Error("Unable to retrieve clubs");
        }

        const clubs = await response.json();

        // Clear previous dropdown options
        opportunityClub.innerHTML =
            '<option value="">Select a club</option>';

        // Check whether the admin has created clubs
        if (clubs.length === 0) {

            opportunityMessage.textContent =
                "Please create a club before adding an opportunity.";

            opportunityMessage.style.color = "red";

            return;
        }

        // Add each club to the dropdown
        clubs.forEach(function (club) {

            const option = document.createElement("option");

            option.value = club.id;
            option.textContent = club.name;

            opportunityClub.appendChild(option);
        });

    } catch (error) {

        console.error(error);

        opportunityMessage.textContent =
            "Unable to load clubs.";

        opportunityMessage.style.color = "red";
    }
}


// ===== SAVE VOLUNTEER OPPORTUNITY =====

addOpportunityForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    // Get values entered by the admin
    const opportunityData = {

        club_id: Number(
            document.getElementById("opportunityClub").value
        ),

        title: document.getElementById("opportunityTitle").value,

        description: document.getElementById("opportunityDescription").value,

        location: document.getElementById("opportunityLocation").value,

        event_date: document.getElementById("opportunityDate").value.replace("T", " ") + ":00",

        hours: Number(
            document.getElementById("opportunityHours").value
        ),

        spots: Number(
            document.getElementById("opportunitySpots").value
        ),

        tags: document.getElementById("opportunityTags").value
    };

    try {

        
// Determine whether to create or update
const url = editingOpportunityId === null
    ? "/api/opportunities"
    : `/api/opportunities/${editingOpportunityId}`;

const method = editingOpportunityId === null
    ? "POST"
    : "PUT";

const response = await fetch(url, {
    method: method,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify(opportunityData)
});


        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Failed to create opportunity"
            );
        }

        // Display success message
        opportunityMessage.textContent = result.message;
        opportunityMessage.style.color = "green";

        addOpportunityForm.reset();

        editingOpportunityId = null;

        opportunityFormTitle.textContent ="Create a Volunteer Opportunity";

        saveOpportunityBtn.textContent = "Save Opportunity";

        await loadOpportunities();

    } catch (error) {

        console.error(error);

        opportunityMessage.textContent = error.message;
        opportunityMessage.style.color = "red";
    }
});


// ===== DISPLAY VOLUNTEER OPPORTUNITIES =====

const opportunitiesList = document.getElementById("opportunitiesList");

async function loadOpportunities() {

    try {

        const response = await fetch("/api/opportunities");

        if (!response.ok || response.redirected) {
            throw new Error("Unable to retrieve opportunities");
        }

        const opportunities = await response.json();

        // Clear previous content
        opportunitiesList.innerHTML = "";

        // Update dashboard total
        document.getElementById("totalOpportunities").textContent =
            opportunities.length;

        // Check if there are no opportunities
        if (opportunities.length === 0) {
            opportunitiesList.textContent =
                "No opportunities created yet.";
            return;
        }

        // Create a card for each opportunity
        opportunities.forEach(function (opportunity) {

            const card = document.createElement("div");
            card.className = "opportunity-card";

            // Opportunity title
            const title = document.createElement("h3");
            title.textContent = opportunity.title;

            // Club name
            const club = document.createElement("span");
            club.className = "club-category";
            club.textContent = opportunity.club_name;

            // Description
            const description = document.createElement("p");
            description.textContent = opportunity.description;

            // Location
            const location = document.createElement("p");
            location.textContent = "📍 " + opportunity.location;

            // Event date
            const date = document.createElement("p");
            date.textContent = "📅 " +
                new Date(opportunity.event_date).toLocaleString();

            // Volunteer hours
            const hours = document.createElement("p");
            hours.textContent = "⏱️ Volunteer Hours: " +
                opportunity.hours;

            // Available spots
            const spots = document.createElement("p");
            spots.textContent = "👥 Capacity: " +
                opportunity.spots;

            // Tags
            const tags = document.createElement("p");
            tags.className = "opportunity-tags";
            tags.textContent = "Tags: " +
                (opportunity.tags || "None");
            // Create Edit Opportunity button
            const editBtn = document.createElement("button");

            editBtn.type = "button";
            editBtn.textContent = "Edit Opportunity";
            editBtn.className = "edit-club-btn";

            editBtn.addEventListener("click", function () {
                editOpportunity(opportunity);
            });

// Create Delete Opportunity button
const deleteBtn = document.createElement("button");

deleteBtn.type = "button";
deleteBtn.textContent = "Delete Opportunity";
deleteBtn.className = "delete-club-btn";

deleteBtn.addEventListener("click", function () {
    deleteOpportunity(opportunity.id, opportunity.title);
});

            // Add elements to card
            card.appendChild(title);
            card.appendChild(club);
            card.appendChild(description);
            card.appendChild(location);
            card.appendChild(date);
            card.appendChild(hours);
            card.appendChild(spots);
            card.appendChild(tags);
            card.appendChild(editBtn);
            card.appendChild(deleteBtn);
            // Display card
            opportunitiesList.appendChild(card);
        });

    } catch (error) {

        console.error(error);

        opportunitiesList.textContent =
            "Unable to load opportunities.";
    }
}

// Load opportunities when dashboard opens
loadOpportunities();


// ===== EDIT OPPORTUNITY FEATURE =====

async function editOpportunity(opportunity) {

    // Store the ID of the opportunity being edited
    editingOpportunityId = opportunity.id;

    // Load club dropdown before selecting the club
    await loadClubOptions();

    // Fill the form with existing opportunity details
    document.getElementById("opportunityTitle").value =
        opportunity.title;

    document.getElementById("opportunityClub").value =
        opportunity.club_id;

    document.getElementById("opportunityDescription").value =
        opportunity.description;

    document.getElementById("opportunityLocation").value =
        opportunity.location;

    // Convert date to datetime-local format
    const eventDate = new Date(opportunity.event_date);

    const localDate = new Date(
        eventDate.getTime() -
        eventDate.getTimezoneOffset() * 60000
    ).toISOString().slice(0, 16);

    document.getElementById("opportunityDate").value =
        localDate;

    document.getElementById("opportunityHours").value =
        opportunity.hours;

    document.getElementById("opportunitySpots").value =
        opportunity.spots;

    document.getElementById("opportunityTags").value =
        opportunity.tags || "";

    // Change the form to Edit mode
    opportunityFormTitle.textContent =
        "Edit Volunteer Opportunity";

    saveOpportunityBtn.textContent = "Update Opportunity";

    opportunityMessage.textContent = "";

    // Display the form
    addOpportunityFormContainer.hidden = false;

    // Scroll to the form
    addOpportunityFormContainer.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


// ===== DELETE OPPORTUNITY FEATURE =====

async function deleteOpportunity(opportunityId, opportunityTitle) {

    // Ask for confirmation
    const confirmed = confirm(
        `Are you sure you want to delete "${opportunityTitle}"?`
    );

    if (!confirmed) {
        return;
    }

    try {

        const response = await fetch(
            `/api/opportunities/${opportunityId}`,
            {
                method: "DELETE"
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Could not delete opportunity"
            );
        }

        // Close the form if editing the deleted opportunity
        if (editingOpportunityId === opportunityId) {

            editingOpportunityId = null;

            addOpportunityForm.reset();

            addOpportunityFormContainer.hidden = true;
        }

        alert(result.message);

        // Refresh opportunity cards and dashboard count
        await loadOpportunities();

    } catch (error) {

        console.error(error);

        alert(error.message);
    }
}
