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

        // Enable after membership functionality is implemented
        joinBtn.disabled = true;

        // Add elements to card
        card.appendChild(name);
        card.appendChild(category);
        card.appendChild(description);
        card.appendChild(members);
        card.appendChild(joinBtn);

        studentClubsList.appendChild(card);
    });
}
