
// ===== STUDENT MY EVENTS =====

// Get HTML elements
const myEventsList = document.getElementById("myEventsList");
const myEventsCount = document.getElementById("myEventsCount");
const myEventsMessage = document.getElementById("myEventsMessage");

const myTotalRegistrations = document.getElementById("myTotalRegistrations");
const myEventsAttended = document.getElementById("myEventsAttended");
const myVerifiedHours = document.getElementById("myVerifiedHours");

const myEventFilter = document.getElementById("myEventFilter");

// Store events retrieved from MySQL
let allMyEvents = [];


// ===== FETCH MY EVENTS =====

async function loadMyEvents() {

    try {

        const response = await fetch("/api/student/my-events");

        if (!response.ok || response.redirected) {
            throw new Error("Unable to retrieve your events");
        }

        allMyEvents = await response.json();

        // Update statistics
        updateMyEventStats();

        // Display events
        filterMyEvents();

    } catch (error) {

        console.error(error);

        myEventsMessage.textContent = "Unable to load your events.";
        myEventsMessage.style.color = "red";
    }
}


// ===== UPDATE STATISTICS =====

function updateMyEventStats() {

    // Total event registrations
    myTotalRegistrations.textContent = allMyEvents.length;

    // Number of events attended
    const attendedEvents = allMyEvents.filter(function (event) {
        return event.status === "attended";
    });

    myEventsAttended.textContent = attendedEvents.length;

    // Sum only verified volunteer hours
    const totalVerifiedHours = allMyEvents.reduce(function (total, event) {

        if (Number(event.verified) === 1 && event.status === "attended") {
            return total + Number(event.hours_claimed || 0);
        }

        return total;

    }, 0);

    myVerifiedHours.textContent = totalVerifiedHours;
}


// ===== DISPLAY EVENT CARDS =====

function displayMyEvents(events) {

    myEventsList.innerHTML = "";

    myEventsCount.textContent =
        `${events.length} ${events.length === 1 ? "event" : "events"} found`;

    if (events.length === 0) {

        myEventsList.textContent = "No events found.";
        return;
    }

    events.forEach(function (event) {

        const card = document.createElement("div");
        card.className = "my-event-card";

        const title = document.createElement("h3");
        title.textContent = event.title;

        const club = document.createElement("p");
        club.textContent = `Club: ${event.club_name}`;

        const location = document.createElement("p");
        location.textContent = `Location: ${event.location}`;

        const date = document.createElement("p");
        date.textContent =
            `Date: ${new Date(event.event_date).toLocaleString()}`;

        const status = document.createElement("p");
        status.textContent = `Attendance Status: ${event.status}`;

        const hours = document.createElement("p");

        hours.textContent =
            `Hours Recorded: ${Number(event.hours_claimed || 0)}`;

        const verification = document.createElement("p");

        verification.textContent =
            Number(event.verified) === 1
                ? "Volunteer Hours: Verified"
                : "Volunteer Hours: Not Yet Verified";

        // Add elements to card
        card.appendChild(title);
        card.appendChild(club);
        card.appendChild(location);
        card.appendChild(date);
        card.appendChild(status);
        card.appendChild(hours);
        card.appendChild(verification);

        myEventsList.appendChild(card);
    });
}


// ===== FILTER MY EVENTS =====

function filterMyEvents() {

    const selectedFilter = myEventFilter.value;

    const now = new Date();

    const filteredEvents = allMyEvents.filter(function (event) {

        const eventDate = new Date(event.event_date);

        if (selectedFilter === "Upcoming") {
            return eventDate > now;
        }

        if (selectedFilter === "Past") {
            return eventDate <= now;
        }

        if (selectedFilter === "Attended") {
            return event.status === "attended";
        }

        if (selectedFilter === "Absent") {
            return event.status === "absent";
        }

        return true;
    });

    displayMyEvents(filteredEvents);
}


// ===== FILTER CHANGE EVENT =====

myEventFilter.addEventListener("change", filterMyEvents);


// ===== INITIAL PAGE LOAD =====

loadMyEvents();
