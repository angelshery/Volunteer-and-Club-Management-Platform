
// ===== STUDENT VOLUNTEER OPPORTUNITIES =====

// Get HTML elements
const studentOpportunitiesList =
    document.getElementById("studentOpportunitiesList");

const opportunitySearch =
    document.getElementById("opportunitySearch");

const opportunityCategoryFilter =
    document.getElementById("opportunityCategoryFilter");

const opportunityRegistrationFilter =
    document.getElementById("opportunityRegistrationFilter");

const opportunityResultsCount =
    document.getElementById("opportunityResultsCount");

const studentOpportunityMessage =
    document.getElementById("studentOpportunityMessage");

// Store opportunities retrieved from MySQL
let allOpportunities = [];

// ===== FETCH OPPORTUNITIES =====

async function loadStudentOpportunities() {

    try {

        const response = await fetch("/api/student/opportunities");

        if (!response.ok || response.redirected) {
            throw new Error("Unable to retrieve volunteer opportunities");
        }

        allOpportunities = await response.json();

        // Apply current search and filters
        filterOpportunities();

    } catch (error) {

        console.error(error);

        studentOpportunitiesList.textContent =
            "Unable to load volunteer opportunities.";
    }
}

// ===== DISPLAY VOLUNTEER OPPORTUNITIES =====

function displayOpportunities(opportunities) {

    // Clear previous cards
    studentOpportunitiesList.innerHTML = "";

    // Display number of opportunities
    opportunityResultsCount.textContent =
        `${opportunities.length} ${
            opportunities.length === 1
                ? "opportunity"
                : "opportunities"
        } found`;

    if (opportunities.length === 0) {

        studentOpportunitiesList.textContent =
            "No volunteer opportunities found.";

        return;
    }

    opportunities.forEach(function (opportunity) {

        const card = document.createElement("div");
        card.className = "opportunity-card";

        // Opportunity title
        const title = document.createElement("h3");
        title.textContent = opportunity.title;

        // Organizing club
        const club = document.createElement("p");
        club.textContent = `Hosted by: ${opportunity.club_name}`;

        // Category
        const category = document.createElement("span");
        category.className = "club-category";
        category.textContent = opportunity.club_category;

        // Description
        const description = document.createElement("p");
        description.textContent = opportunity.description;

        // Location
        const location = document.createElement("p");
        location.textContent = `📍 ${opportunity.location}`;

        // Date and time
        const date = document.createElement("p");
        date.textContent =
            `📅 ${new Date(opportunity.event_date).toLocaleString()}`;

        // Volunteer hours
        const hours = document.createElement("p");
        hours.textContent =
            `⏱️ ${opportunity.hours} volunteer hours`;

        // Available spots
        const remainingSpots = Math.max(
            0,
            Number(opportunity.spots) -
            Number(opportunity.registered_count)
        );

        const spots = document.createElement("p");
        spots.textContent = `👥 ${remainingSpots} spots remaining`;

        // Tags
        const tags = document.createElement("p");
        tags.textContent = `Tags: ${opportunity.tags || "None"}`;

        // Registration button
        const registerBtn = document.createElement("button");
        registerBtn.type = "button";
        registerBtn.className = "dashboard-btn";

        if (Number(opportunity.is_registered) === 1) {

    registerBtn.textContent = "Cancel Registration";
    registerBtn.className = "cancel-registration-btn";

} else if (remainingSpots === 0) {

    registerBtn.textContent = "Event Full";

} else {

    registerBtn.textContent = "Register for Event";
}

        
// ===== REGISTER FOR EVENT BUTTON =====

// Only allow registration if the student has not
// registered and the event has available spots

if (
    Number(opportunity.is_registered) === 0 &&
    remainingSpots > 0
) {

    registerBtn.addEventListener("click", async function () {

        // Prevent multiple clicks
        registerBtn.disabled = true;
        registerBtn.textContent = "Registering...";

        try {

            // Send registration request to Express backend
            const response = await fetch(
                `/api/student/opportunities/${opportunity.id}/register`,
                {
                    method: "POST"
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Could not register for event"
                );
            }

            // Display success message
            studentOpportunityMessage.textContent = result.message;
            studentOpportunityMessage.style.color = "green";

            // Refresh opportunity cards and available spots
            await loadStudentOpportunities();

        } catch (error) {

            console.error(error);

            studentOpportunityMessage.textContent = error.message;
            studentOpportunityMessage.style.color = "red";

            registerBtn.disabled = false;
            registerBtn.textContent = "Register for Event";
        }
    });


} else if (Number(opportunity.is_registered) === 1) {

    // ===== CANCEL REGISTRATION BUTTON =====

    registerBtn.addEventListener("click", async function () {

        const confirmed = confirm(
            `Are you sure you want to cancel your registration for "${opportunity.title}"?`
        );

        if (!confirmed) {
            return;
        }

        // Prevent multiple clicks
        registerBtn.disabled = true;
        registerBtn.textContent = "Cancelling...";

        try {

            // Send DELETE request to Express backend
            const response = await fetch(
                `/api/student/opportunities/${opportunity.id}/cancel`,
                {
                    method: "DELETE"
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Could not cancel registration"
                );
            }

            // Display success message
            studentOpportunityMessage.textContent = result.message;
            studentOpportunityMessage.style.color = "green";

            // Refresh opportunities and available spots
            await loadStudentOpportunities();

        } catch (error) {

            console.error(error);

            studentOpportunityMessage.textContent = error.message;
            studentOpportunityMessage.style.color = "red";

            registerBtn.disabled = false;
            registerBtn.textContent = "Cancel Registration";
        }
    });

} else {

    // Event is full
    registerBtn.disabled = true;
}



        // Add elements to card
        card.appendChild(title);
        card.appendChild(club);
        card.appendChild(category);
        card.appendChild(description);
        card.appendChild(location);
        card.appendChild(date);
        card.appendChild(hours);
        card.appendChild(spots);
        card.appendChild(tags);
        card.appendChild(registerBtn);

        studentOpportunitiesList.appendChild(card);
    });
}


// ===== SEARCH AND FILTER OPPORTUNITIES =====

function filterOpportunities() {

    // Get search input
    const searchText = opportunitySearch.value
        .toLowerCase()
        .trim();

    // Get selected filters
    const selectedCategory = opportunityCategoryFilter.value;
    const selectedRegistration = opportunityRegistrationFilter.value;

    // Filter opportunities
    const filteredOpportunities = allOpportunities.filter(
        function (opportunity) {

            // Search by title, description, location,
            // club name, category, or tags
            const searchableText = [
                opportunity.title,
                opportunity.description,
                opportunity.location,
                opportunity.club_name,
                opportunity.club_category,
                opportunity.tags
            ]
            .filter(value => value != null)
            .join(" ")
            .toLowerCase();

            const matchesSearch =
                searchableText.includes(searchText);

            // Filter by club category
            const matchesCategory =
                selectedCategory === "All" ||
                opportunity.club_category === selectedCategory;

            // Filter by registration status
            const isRegistered =
                Number(opportunity.is_registered) === 1;

            const matchesRegistration =
                selectedRegistration === "All" ||
                (selectedRegistration === "Registered" &&
                    isRegistered) ||
                (selectedRegistration === "Not Registered" &&
                    !isRegistered);

            return matchesSearch &&
                   matchesCategory &&
                   matchesRegistration;
        }
    );

    // Display only matching opportunities
    displayOpportunities(filteredOpportunities);
}

// ===== FILTER EVENT LISTENERS =====

// Search automatically as student types
opportunitySearch.addEventListener(
    "input",
    filterOpportunities
);

// Filter when category changes
opportunityCategoryFilter.addEventListener(
    "change",
    filterOpportunities
);

// Filter when registration status changes
opportunityRegistrationFilter.addEventListener(
    "change",
    filterOpportunities
);

// Load opportunities when page opens
loadStudentOpportunities();
