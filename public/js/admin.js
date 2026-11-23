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


// ===== ADMIN ATTENDANCE MANAGEMENT =====

// Get HTML elements
const attendanceTableBody = document.getElementById("attendanceTableBody");
const attendanceSearch = document.getElementById("attendanceSearch");
const attendanceStatusFilter = document.getElementById("attendanceStatusFilter");
const attendanceResultsCount = document.getElementById("attendanceResultsCount");
const attendanceMessage = document.getElementById("attendanceMessage");

// ===== ATTENDANCE FORM ELEMENTS =====

const attendanceFormContainer = document.getElementById("attendanceFormContainer");
const attendanceForm = document.getElementById("attendanceForm");

const attendanceRegistrationId = document.getElementById("attendanceRegistrationId");
const attendanceStudentInfo = document.getElementById("attendanceStudentInfo");

const attendanceStatus = document.getElementById("attendanceStatus");
const attendanceHours = document.getElementById("attendanceHours");
const attendanceVerified = document.getElementById("attendanceVerified");
const attendanceNotes = document.getElementById("attendanceNotes");

const cancelAttendanceEdit = document.getElementById("cancelAttendanceEdit");


// Store registrations retrieved from MySQL
let allRegistrations = [];

// ===== FETCH STUDENT REGISTRATIONS =====

async function loadAdminRegistrations() {

    try {

        const response = await fetch("/api/admin/registrations");

        if (!response.ok || response.redirected) {
            throw new Error("Unable to retrieve registrations");
        }

        allRegistrations = await response.json();

        // Display the registrations
        filterAdminRegistrations();

    } catch (error) {

        console.error(error);

        attendanceMessage.textContent =
            "Unable to load student registrations.";

        attendanceMessage.style.color = "red";
    }
}

// ===== UPDATE ATTENDANCE FORM FIELDS =====

function updateAttendanceFields() {

    const isAttended = attendanceStatus.value === "attended";

    if (isAttended) {

        // Enable volunteer hours and verification
        attendanceHours.disabled = false;
        attendanceVerified.disabled = false;

    } else {

        // No volunteer hours for registered or absent students
        attendanceHours.value = 0;
        attendanceHours.disabled = true;

        attendanceVerified.checked = false;
        attendanceVerified.disabled = true;
    }
}


// ===== OPEN ATTENDANCE MANAGEMENT FORM =====

function openAttendanceForm(registration) {

    // Store the selected registration ID
    attendanceRegistrationId.value = registration.registration_id;

    // Display student and event information
    const studentName =
        `${registration.fname || ""} ${registration.lname || ""}`.trim()
        || registration.username;

    attendanceStudentInfo.textContent =
        `Student: ${studentName} | Event: ${registration.event_title}`;

    // Fill in existing attendance details
    attendanceStatus.value = registration.status;

    attendanceHours.value = Number(registration.hours_claimed || 0);

    attendanceVerified.checked =
        Number(registration.verified) === 1;

    attendanceNotes.value = registration.notes || "";

    // Restrict hours and verification based on attendance status
    updateAttendanceFields();

    // Show the form
    attendanceFormContainer.hidden = false;

    // Scroll to the form
    attendanceFormContainer.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// ===== DISPLAY REGISTRATIONS =====

function displayAdminRegistrations(registrations) {

    attendanceTableBody.innerHTML = "";

    attendanceResultsCount.textContent =
        `${registrations.length} ${
            registrations.length === 1 ? "registration" : "registrations"
        } found`;

    if (registrations.length === 0) {

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 7;
        cell.textContent = "No registrations found.";
        cell.style.textAlign = "center";

        row.appendChild(cell);
        attendanceTableBody.appendChild(row);

        return;
    }

    registrations.forEach(function (registration) {

        const row = document.createElement("tr");

        // Student name
        const studentCell = document.createElement("td");

        studentCell.textContent =
            `${registration.fname || ""} ${registration.lname || ""}`.trim()
            || registration.username;

        // Event and club name
        const eventCell = document.createElement("td");

        eventCell.textContent =
            `${registration.event_title} (${registration.club_name})`;

        // Event date
        const dateCell = document.createElement("td");

        dateCell.textContent =
            new Date(registration.event_date).toLocaleString();

        // Attendance status
        const statusCell = document.createElement("td");

        statusCell.textContent = registration.status;

        // Recorded volunteer hours
        const hoursCell = document.createElement("td");

        hoursCell.textContent =
            Number(registration.hours_claimed || 0);

        // Verification status
        const verificationCell = document.createElement("td");

        verificationCell.textContent =
            Number(registration.verified) === 1
                ? "Verified"
                : "Pending";

        // Action button
        const actionCell = document.createElement("td");

        const editBtn = document.createElement("button");

        editBtn.type = "button";
        editBtn.className = "attendance-action-btn";
        editBtn.textContent = "Manage";

        editBtn.addEventListener("click", function () {
    openAttendanceForm(registration);
});

        actionCell.appendChild(editBtn);

        // Add all cells to the row
        row.appendChild(studentCell);
        row.appendChild(eventCell);
        row.appendChild(dateCell);
        row.appendChild(statusCell);
        row.appendChild(hoursCell);
        row.appendChild(verificationCell);
        row.appendChild(actionCell);

        attendanceTableBody.appendChild(row);
    });
}

// ===== FILTER ADMIN REGISTRATIONS =====

function filterAdminRegistrations() {

    const searchText = attendanceSearch.value.toLowerCase().trim();

    const selectedStatus = attendanceStatusFilter.value;

    const filteredRegistrations = allRegistrations.filter(
        function (registration) {

            const searchableText = [
                registration.fname,
                registration.lname,
                registration.username,
                registration.email,
                registration.event_title,
                registration.club_name
            ]
            .filter(value => value != null)
            .join(" ")
            .toLowerCase();

            const matchesSearch = searchableText.includes(searchText);

            const matchesStatus =
                selectedStatus === "All" ||
                registration.status === selectedStatus;

            return matchesSearch && matchesStatus;
        }
    );

    displayAdminRegistrations(filteredRegistrations);
}


// ===== FILTER EVENT LISTENERS =====

attendanceSearch.addEventListener(
    "input",
    filterAdminRegistrations
);

attendanceStatusFilter.addEventListener(
    "change",
    filterAdminRegistrations
);


// ===== INITIAL LOAD =====

loadAdminRegistrations();
// Run whenever the administrator changes attendance status
attendanceStatus.addEventListener("change", updateAttendanceFields);

// ===== CLOSE ATTENDANCE FORM =====

cancelAttendanceEdit.addEventListener("click", function () {

    attendanceFormContainer.hidden = true;

    attendanceForm.reset();
});

// ===== SAVE STUDENT ATTENDANCE =====

attendanceForm.addEventListener("submit", async function (event) {

    // Prevent the page from refreshing
    event.preventDefault();

    // Get the selected registration ID
    const registrationId = attendanceRegistrationId.value;

    // Get values entered by the administrator
    const selectedStatus = attendanceStatus.value;

    const attendanceData = {
        status: selectedStatus,

        hours_claimed: selectedStatus === "attended"
            ? Number(attendanceHours.value)
            : 0,

        verified: selectedStatus === "attended"
            ? attendanceVerified.checked
            : false,

        notes: attendanceNotes.value.trim()
    };

    // Validate hours before sending
    if (
        selectedStatus === "attended" &&
        (
            attendanceHours.value.trim() === "" ||
            !Number.isFinite(attendanceData.hours_claimed) ||
            attendanceData.hours_claimed < 0
        )
    ) {
        attendanceMessage.textContent =
            "Please enter valid volunteer hours.";

        attendanceMessage.style.color = "red";
        return;
    }

    // Get the Save Attendance button
    const saveBtn = attendanceForm.querySelector(
        'button[type="submit"]'
    );

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {

        // Send attendance details to Express backend
        const response = await fetch(
            `/api/admin/registrations/${registrationId}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(attendanceData)
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Unable to update attendance"
            );
        }

        // Display success message
        attendanceMessage.textContent = result.message;
        attendanceMessage.style.color = "green";

        // Close and reset the form
        attendanceFormContainer.hidden = true;
        attendanceForm.reset();

        // Refresh the attendance table
        await loadAdminRegistrations();

    } catch (error) {

        console.error("Attendance update error:", error);

        attendanceMessage.textContent = error.message;
        attendanceMessage.style.color = "red";

    } finally {

        // Restore the Save button
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Attendance";
    }
});

// ===== ADMIN DASHBOARD STATISTICS =====

const statTotalClubs = document.getElementById("statTotalClubs");
const statTotalOpportunities = document.getElementById("statTotalOpportunities");
const statTotalMembers = document.getElementById("statTotalMembers");
const statTotalRegistrations = document.getElementById("statTotalRegistrations");
const statTotalAttended = document.getElementById("statTotalAttended");
const statVerifiedHours = document.getElementById("statVerifiedHours");

const adminStatsMessage = document.getElementById("adminStatsMessage");


// ===== FETCH ADMIN STATISTICS =====

async function loadAdminStatistics() {

    try {

        const response = await fetch("/api/admin/statistics");

        if (!response.ok || response.redirected) {
            throw new Error("Unable to retrieve admin statistics");
        }

        const stats = await response.json();

        // Update statistics cards
        statTotalClubs.textContent = stats.total_clubs;

        statTotalOpportunities.textContent =
            stats.total_opportunities;

        statTotalMembers.textContent = stats.total_members;

        statTotalRegistrations.textContent =
            stats.total_registrations;

        statTotalAttended.textContent =
            stats.total_attended;

        statVerifiedHours.textContent =
            Number(stats.verified_hours || 0);

        adminStatsMessage.textContent = "";

    } catch (error) {

        console.error("Admin statistics error:", error);

        adminStatsMessage.textContent =
            "Unable to load dashboard statistics.";

        adminStatsMessage.style.color = "red";
    }
}


// ===== INITIAL STATISTICS LOAD =====

loadAdminStatistics();
