// ===== EXPLORE CLUBS =====

// Get HTML elements
const studentClubsList = document.getElementById("studentClubsList");
const clubSearch = document.getElementById("clubSearch");
const categoryFilter = document.getElementById("categoryFilter");
const membershipFilter = document.getElementById("membershipFilter");
const clubResultsCount = document.getElementById("clubResultsCount");
const studentClubMessage = document.getElementById("studentClubMessage");

// Store all clubs retrieved from MySQL
let allClubs = [];

// ===== FETCH CLUBS =====

async function loadStudentClubs() {

    try {

        const response = await fetch("/api/student/clubs");

        if (!response.ok || response.redirected) {
            throw new Error("Unable to retrieve clubs");
        }

        allClubs = await response.json();

        // Display clubs based on current filters
        filterClubs();

    } catch (error) {

        console.error(error);

        studentClubsList.textContent = 
            "Unable to load clubs.";
    }
}

// ===== DISPLAY CLUB CARDS =====

function displayClubs(clubs) {

    // Clear previous content
    studentClubsList.innerHTML = "";

    // Display number of matching clubs
    clubResultsCount.textContent =
        `${clubs.length} ${clubs.length === 1 ? "club" : "clubs"} found`;

    if (clubs.length === 0) {

        studentClubsList.textContent =
            "No matching clubs found.";

        return;
    }

    clubs.forEach(function (club) {

        const card = document.createElement("div");
        card.className = "club-card";

        // Club name
        const name = document.createElement("h3");
        name.textContent = club.name;

        // Club category
        const category = document.createElement("span");
        category.className = "club-category";
        category.textContent = club.category;

        // Club description
        const description = document.createElement("p");
        description.textContent = club.description;

        // Number of club members
        const members = document.createElement("p");
        members.className = "club-member-count";
        members.textContent = `👥 ${club.member_count} members`;

        // Join or Leave button
        const joinBtn = document.createElement("button");
        joinBtn.type = "button";

        if (Number(club.is_member) === 1) {

            joinBtn.textContent = "Leave Club";
            joinBtn.className = "leave-club-btn";

        } else {

            joinBtn.textContent = "Join Club";
            joinBtn.className = "join-club-btn";
        }

        
// ===== JOIN CLUB BUTTON =====

// Only enable joining for students who are not members
if (Number(club.is_member) === 0) {

    joinBtn.addEventListener("click", async function () {

        // Prevent multiple clicks
        joinBtn.disabled = true;
        joinBtn.textContent = "Joining...";

        try {

            const response = await fetch(
                `/api/student/clubs/${club.id}/join`,
                {
                    method: "POST"
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Could not join club"
                );
            }

            // Display success message
            studentClubMessage.textContent = result.message;
            studentClubMessage.style.color = "green";

            // Refresh clubs and membership counts
            await loadStudentClubs();

        } catch (error) {

            console.error(error);

            studentClubMessage.textContent = error.message;
            studentClubMessage.style.color = "red";

            joinBtn.disabled = false;
            joinBtn.textContent = "Join Club";
        }
    });


// ===== LEAVE CLUB BUTTON =====

} else {

    joinBtn.addEventListener("click", async function () {

        // Ask student to confirm
        const confirmed = confirm(
            `Are you sure you want to leave "${club.name}"?`
        );

        if (!confirmed) {
            return;
        }

        // Prevent multiple clicks
        joinBtn.disabled = true;
        joinBtn.textContent = "Leaving...";

        try {

            const response = await fetch(
                `/api/student/clubs/${club.id}/leave`,
                {
                    method: "DELETE"
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Could not leave club"
                );
            }

            // Display success message
            studentClubMessage.textContent = result.message;
            studentClubMessage.style.color = "green";

            // Refresh club cards and membership counts
            await loadStudentClubs();

        } catch (error) {

            console.error(error);

            studentClubMessage.textContent = error.message;
            studentClubMessage.style.color = "red";

            joinBtn.disabled = false;
            joinBtn.textContent = "Leave Club";
        }
    });
}



        // Add elements to card
        card.appendChild(name);
        card.appendChild(category);
        card.appendChild(description);
        card.appendChild(members);
        card.appendChild(joinBtn);

        studentClubsList.appendChild(card);
    });
}

// ===== SEARCH AND FILTER CLUBS =====

function filterClubs() {

    const searchText = clubSearch.value.toLowerCase().trim();

    const selectedCategory = categoryFilter.value;

    const selectedMembership = membershipFilter.value;

    const filteredClubs = allClubs.filter(function (club) {

        // Search by name, description or category
        const matchesSearch =
            club.name.toLowerCase().includes(searchText) ||
            club.description.toLowerCase().includes(searchText) ||
            club.category.toLowerCase().includes(searchText);

        // Filter by category
        const matchesCategory =
            selectedCategory === "All" ||
            club.category === selectedCategory;

        // Filter by membership
        const matchesMembership =
            selectedMembership === "All" ||
            (selectedMembership === "Joined" &&
                Number(club.is_member) === 1) ||
            (selectedMembership === "Not Joined" &&
                Number(club.is_member) === 0);

        return matchesSearch &&
               matchesCategory &&
               matchesMembership;
    });

    displayClubs(filteredClubs);
}

// Search while the student types
clubSearch.addEventListener("input", filterClubs);

// Filter when category changes
categoryFilter.addEventListener("change", filterClubs);

// Filter when membership changes
membershipFilter.addEventListener("change", filterClubs);

// Load clubs when the page opens
loadStudentClubs();
