const express = require("express");
const crypt = require("crypto");
const session = require("express-session");
const mysql = require("mysql2");
const path = require("path");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false          // no maxAge: login lasts until the browser closes
}));


/* PROTECT DASHBOARD PAGES */

// Check whether user is logged in
function requireLogin(req, res, next) {
    if (!req.session.username) {
        return res.redirect("/login.html");
    }
    next();
}

// Check whether user is an admin
function requireAdmin(req, res, next) {
    if (!req.session.username) {
        return res.redirect("/login.html");
    }

    if (req.session.role !== "admin") {
        return res.status(403).send("Access denied");
    }

    next();
}

// STUDENT DASHBOARD
app.get("/dashboard", requireLogin, (req, res) => {

    if (req.session.role !== "student") {
        return res.redirect("/admin");
    }

    res.sendFile(
        path.join(__dirname, "public", "dashboard.html")
    );
});

// ADMIN DASHBOARD
app.get("/admin", requireAdmin, (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "admin.html")
    );
});

// Prevent direct access to protected HTML pages
app.use((req, res, next) => {

    if (req.path === "/dashboard.html") {
        return requireLogin(req, res, () => {
            if (req.session.role !== "student") {
                return res.status(403).send("Access denied");
            }
            next();
        });
    }

    if (req.path === "/admin.html") {
        return requireAdmin(req, res, next);
    }
    if (req.path === "/profile.html") {
    return requireLogin(req, res, () => {
        if (req.session.role !== "student") {
            return res.status(403).send("Access denied");
        }
        next();
    });
}

    next();
});
// ===== STUDENT PROFILE PAGE =====

app.get(["/profile", "/profile.html"], requireLogin, function (req, res) {

    // Only students can access the profile page
    if (req.session.role !== "student") {
        return res.redirect("/admin");
    }

    res.sendFile(__dirname + "/public/profile.html");

});
// Serve public HTML, CSS and JavaScript files
app.use(express.static(path.join(__dirname, "public")));

//Connection to MySQL
const conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: process.env.ROOTPASS,
    database: "volunteer_hub",
    port: 3306
});
conn.connect(function (err) {
    if (err) console.log("Couldn't connect to MySQL", err);
    else console.log("Database connection established");
});

const hashRounds = 100;
const hashLength = 64;

function hashPassword(plain, salt) {
    return crypt.pbkdf2Sync(plain, salt, hashRounds, hashLength, "sha512").toString("hex");
}

// REGISTER
app.post("/register", function (req, res) {
    const { username, fname, lname, email, password } = req.body;
    const salt = crypt.randomBytes(16).toString("hex");
    const hashedPass = hashPassword(password, salt);

    const sql = "INSERT INTO users (username, fname, lname, email, password, salt) VALUES (?, ?, ?, ?, ?, ?)";
    conn.query(sql, [username, fname, lname, email, hashedPass, salt], function (err) {
        if (err) {
            console.log("There was an error inserting a user", err);
            if (err.code === "ER_DUP_ENTRY") {
                res.send(`<p>Username or email already exists!</p><a href="register.html">Register again</a>`);
            } else {
                res.send("Registration failed");
            }
        } else {
            res.send(`<h2>You have successfully registered!</h2><a href="login.html">Login here</a>`);
        }
    });
});

// LOGIN
app.post("/login", function (req, res) {
    const { username, password } = req.body;

    conn.query("SELECT * FROM users WHERE username = ?", [username], function (err, result) {
        if (err) {
            console.log("Login database error", err);
            return res.send("Login failed");
        }
        if (result.length === 0 || hashPassword(password, result[0].salt) !== result[0].password) {
            return res.send(`<p>The login credentials were incorrect.</p><a href="login.html">Login again</a>`);
        }

        // Remember who is logged in
        req.session.username = result[0].username;
        req.session.userId   = result[0].id;
        req.session.fname    = result[0].fname;
        req.session.role     = result[0].role;

        req.session.save(function (err) {
            if (err) {
                return res.send("Error saving session");
            }
            if (req.session.role === "admin") {
                res.redirect("/admin");
            } else{
            res.redirect("/dashboard");
            }
        });
    });
});

// WHO IS LOGGED IN (used by the nav bar on every page)
app.get("/whoami", function (req, res) {
    if (!req.session.username) return res.json({ user: null });
    res.json({ user: { name: req.session.fname || req.session.username, role: req.session.role } });
});

// LOGOUT
app.get("/logout", function (req, res) {
    req.session.destroy(function (err) {
        if (err) return res.send("Error logging out");
        res.clearCookie("connect.sid");
        res.redirect("/login.html");
    });
});

// ===== STUDENT PROFILE API =====

// Require a logged-in student for profile API requests
function requireStudentApi(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({
            error: "Please log in first"
        });
    }

    if (req.session.role !== "student") {
        return res.status(403).json({
            error: "Student access only"
        });
    }

    next();
}

// GET: Load the logged-in student's profile
app.get("/api/profile", requireStudentApi, function (req, res) {
    const sql = `
        SELECT username, fname, lname, email,
               interests, skills, availability
        FROM users
        WHERE id = ?
    `;

    conn.query(sql, [req.session.userId], function (err, results) {
        if (err) {
            console.error("Profile load error:", err);
            return res.status(500).json({
                error: "Could not load profile"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        res.json(results[0]);
    });
});

// PUT: Save the logged-in student's preferences
app.put("/api/profile", requireStudentApi, function (req, res) {
    const { interests, skills, days, preferredTime } = req.body;

    const allowedInterests = [
        "Technology", "Education", "Environment",
        "Healthcare", "Community Service", "Animals",
        "Arts & Culture", "Sports"
    ];

    const allowedSkills = [
        "Programming", "Tutoring", "Communication",
        "Leadership", "Event Planning", "Graphic Design",
        "First Aid", "Photography"
    ];

    const allowedDays = [
        "Monday", "Tuesday", "Wednesday", "Thursday",
        "Friday", "Saturday", "Sunday"
    ];

    const allowedTimes = [
        "Anytime", "Morning", "Afternoon", "Evening"
    ];

    function validSelection(values, allowed) {
        return Array.isArray(values) &&
            values.every(value =>
                typeof value === "string" &&
                allowed.includes(value)
            );
    }

    if (
        !validSelection(interests, allowedInterests) ||
        !validSelection(skills, allowedSkills) ||
        !validSelection(days, allowedDays) ||
        !allowedTimes.includes(preferredTime)
    ) {
        return res.status(400).json({
            error: "Invalid profile preferences"
        });
    }

    const interestsText = [...new Set(interests)].join(",");
    const skillsText = [...new Set(skills)].join(",");
    const availabilityText =
        [...new Set(days)].join(",") + "|" + preferredTime;

    if (
        interestsText.length > 255 ||
        skillsText.length > 255 ||
        availabilityText.length > 255
    ) {
        return res.status(400).json({
            error: "Profile preferences are too long"
        });
    }

    const sql = `
        UPDATE users
        SET interests = ?, skills = ?, availability = ?
        WHERE id = ?
    `;

    conn.query(
        sql,
        [
            interestsText,
            skillsText,
            availabilityText,
            req.session.userId
        ],
        function (err, result) {
            if (err) {
                console.error("Profile save error:", err);
                return res.status(500).json({
                    error: "Could not save profile"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: "User not found"
                });
            }

            res.json({
                message: "Profile saved successfully!"
            });
        }
    );
});

// CREATE CLUB - Admin only
app.post("/api/clubs", requireAdmin, function (req, res) {

    const { name, category, description } = req.body;

    // Validate the form inputs
    if (
        typeof name !== "string" ||
        typeof category !== "string" ||
        typeof description !== "string" ||
        !name.trim() ||
        !category.trim() ||
        !description.trim() ||
        name.trim().length > 150
    ) {
        return res.status(400).json({
            error: "Please enter valid club details"
        });
    }

    // SQL query to insert a new club
    const sql = `
        INSERT INTO clubs
        (name, category, description, created_by)
        VALUES (?, ?, ?, ?)
    `;

    conn.query(
        sql,
        [
            name.trim(),
            category.trim(),
            description.trim(),
            req.session.userId
        ],
        function (err, result) {

            if (err) {
                console.error("Error creating club:", err);

                return res.status(500).json({
                    error: "Could not create club"
                });
            }

            res.status(201).json({
                message: "Club created successfully!",
                clubId: result.insertId
            });
        }
    );
});

// READ CLUBS - Admin only
app.get("/api/clubs", requireAdmin, function (req, res) {

    const sql = `
        SELECT id, name, category, description, created_at
        FROM clubs
        WHERE created_by = ?
        ORDER BY created_at DESC
    `;

    conn.query(sql, [req.session.userId], function (err, results) {

        if (err) {
            console.error("Error retrieving clubs:", err);

            return res.status(500).json({
                error: "Could not retrieve clubs"
            });
        }

        res.json(results);
    });
});


// UPDATE CLUB - Admin only
app.put("/api/clubs/:id", requireAdmin, function (req, res) {

    const clubId = req.params.id;
    const { name, category, description } = req.body;

    // Validate club details
    if (
        typeof name !== "string" ||
        typeof category !== "string" ||
        typeof description !== "string" ||
        !name.trim() ||
        !category.trim() ||
        !description.trim() ||
        name.trim().length > 150
    ) {
        return res.status(400).json({
            error: "Please enter valid club details"
        });
    }

    const sql = `
        UPDATE clubs
        SET name = ?, category = ?, description = ?
        WHERE id = ? AND created_by = ?
    `;

    conn.query(
        sql,
        [
            name.trim(),
            category.trim(),
            description.trim(),
            clubId,
            req.session.userId
        ],
        function (err, result) {

            if (err) {
                console.error("Error updating club:", err);

                return res.status(500).json({
                    error: "Could not update club"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: "Club not found or access denied"
                });
            }

            res.json({
                message: "Club updated successfully!"
            });
        }
    );
});


// DELETE CLUB - Admin only
app.delete("/api/clubs/:id", requireAdmin, function (req, res) {

    const clubId = req.params.id;

    // First, check whether this club belongs to the admin
    const checkSql = `
        SELECT id FROM clubs
        WHERE id = ? AND created_by = ?
    `;

    conn.query(
        checkSql,
        [clubId, req.session.userId],
        function (err, results) {

            if (err) {
                console.error("Error checking club:", err);
                return res.status(500).json({
                    error: "Could not verify club ownership"
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    error: "Club not found or access denied"
                });
            }

            // Delete the club
            const deleteSql = "DELETE FROM clubs WHERE id = ? AND created_by = ?";

            conn.query(
                deleteSql,
                [clubId, req.session.userId],
                function (err, result) {

                    if (err) {
                        console.error("Error deleting club:", err);

                        if (err.code === "ER_ROW_IS_REFERENCED_2") {
                            return res.status(409).json({
                                error: "This club has related members or opportunities and cannot be deleted yet."
                            });
                        }

                        return res.status(500).json({
                            error: "Could not delete club"
                        });
                    }

                    if (result.affectedRows === 0) {
                        return res.status(404).json({
                            error: "Club not found"
                        });
                    }

                    res.json({
                        message: "Club deleted successfully!"
                    });
                }
            );
        }
    );
});


// ===== CREATE VOLUNTEER OPPORTUNITY =====

app.post("/api/opportunities", requireAdmin, function (req, res) {

    const {club_id,title,description,location,event_date,hours,spots,tags} = req.body;

    // Validate opportunity details
    if (
        !Number.isInteger(Number(club_id)) ||
        Number(club_id) <= 0 ||
        typeof title !== "string" || !title.trim() ||
        typeof description !== "string" || !description.trim() ||
        typeof location !== "string" || !location.trim() ||
        !event_date ||
        !Number.isFinite(Number(hours)) ||
        Number(hours) <= 0 ||
        !Number.isInteger(Number(spots)) ||
        Number(spots) <= 0
    ) {
        return res.status(400).json({
            error: "Please enter valid opportunity details"
        });
    }

    // Verify that the selected club belongs to the admin
    const checkSql = `
        SELECT id FROM clubs
        WHERE id = ? AND created_by = ?
    `;

    conn.query(
        checkSql,
        [club_id, req.session.userId],
        function (err, results) {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    error: "Could not verify club"
                });
            }

            if (results.length === 0) {
                return res.status(403).json({
                    error: "You do not have access to this club"
                });
            }

            // Insert opportunity into MySQL
            const sql = `
                INSERT INTO opportunities
                (club_id, title, description, location,
                event_date, hours, spots, tags)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            conn.query(
                sql,
                [
                    club_id,
                    title.trim(),
                    description.trim(),
                    location.trim(),
                    event_date,
                    Number(hours),
                    Number(spots),
                    tags || ""
                ],
                function (err, result) {

                    if (err) {
                        console.error("Error creating opportunity:", err);

                        return res.status(500).json({
                            error: "Could not create opportunity"
                        });
                    }

                    res.status(201).json({
                        message: "Opportunity created successfully!",
                        opportunityId: result.insertId
                    });
                }
            );
        }
    );
});


// ===== READ VOLUNTEER OPPORTUNITIES =====

app.get("/api/opportunities", requireAdmin, function (req, res) {

    const sql = `
        SELECT 
            o.id,
            o.club_id,
            o.title,
            o.description,
            o.location,
            o.event_date,
            o.hours,
            o.spots,
            o.tags,
            c.name AS club_name
        FROM opportunities o
        INNER JOIN clubs c ON o.club_id = c.id
        WHERE c.created_by = ?
        ORDER BY o.event_date ASC
    `;

    conn.query(sql, [req.session.userId], function (err, results) {

        if (err) {
            console.error("Error retrieving opportunities:", err);

            return res.status(500).json({
                error: "Could not retrieve opportunities"
            });
        }

        res.json(results);
    });
});


// ===== UPDATE VOLUNTEER OPPORTUNITY =====

app.put("/api/opportunities/:id", requireAdmin, function (req, res) {

    const opportunityId = req.params.id;

    const {
        club_id,
        title,
        description,
        location,
        event_date,
        hours,
        spots,
        tags
    } = req.body;

    // Validate opportunity details
    if (
        !Number.isInteger(Number(club_id)) ||
        Number(club_id) <= 0 ||
        typeof title !== "string" || !title.trim() ||
        typeof description !== "string" || !description.trim() ||
        typeof location !== "string" || !location.trim() ||
        !event_date ||
        !Number.isFinite(Number(hours)) ||
        Number(hours) <= 0 ||
        !Number.isInteger(Number(spots)) ||
        Number(spots) <= 0
    ) {
        return res.status(400).json({
            error: "Please enter valid opportunity details"
        });
    }

    // Update opportunity only if both clubs belong to the admin
    const sql = `
        UPDATE opportunities o
        INNER JOIN clubs c ON o.club_id = c.id
        INNER JOIN clubs newClub ON newClub.id = ?
        SET
            o.club_id = newClub.id,
            o.title = ?,
            o.description = ?,
            o.location = ?,
            o.event_date = ?,
            o.hours = ?,
            o.spots = ?,
            o.tags = ?
        WHERE o.id = ?
        AND c.created_by = ?
        AND newClub.created_by = ?
    `;

    conn.query(
        sql,
        [
            club_id,
            title.trim(),
            description.trim(),
            location.trim(),
            event_date,
            Number(hours),
            Number(spots),
            tags || "",
            opportunityId,
            req.session.userId,
            req.session.userId
        ],
        function (err, result) {

            if (err) {
                console.error("Error updating opportunity:", err);

                return res.status(500).json({
                    error: "Could not update opportunity"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: "Opportunity not found or access denied"
                });
            }

            res.json({
                message: "Opportunity updated successfully!"
            });
        }
    );
});


// ===== DELETE VOLUNTEER OPPORTUNITY =====

app.delete("/api/opportunities/:id", requireAdmin, function (req, res) {

    const opportunityId = req.params.id;

    // Delete only opportunities belonging to the admin
    const sql = `
        DELETE o FROM opportunities o
        INNER JOIN clubs c ON o.club_id = c.id
        WHERE o.id = ?
        AND c.created_by = ?
    `;

    conn.query(
        sql,
        [opportunityId, req.session.userId],
        function (err, result) {

            if (err) {

                console.error("Error deleting opportunity:", err);

                if (err.code === "ER_ROW_IS_REFERENCED_2") {
                    return res.status(409).json({
                        error: "This opportunity has student registrations and cannot be deleted."
                    });
                }

                return res.status(500).json({
                    error: "Could not delete opportunity"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: "Opportunity not found or access denied"
                });
            }

            res.json({
                message: "Opportunity deleted successfully!"
            });
        }
    );
});


// ===== ADMIN: VIEW EVENT REGISTRATIONS =====

app.get("/api/admin/registrations",requireAdmin,function (req, res) {

        const adminId = req.session.userId;

        const sql = `
            SELECT
                r.id AS registration_id,
                r.opportunity_id,
                r.user_id,
                r.status,
                r.hours_claimed,
                r.verified,
                r.notes,
                r.registered_at,

                u.username,
                u.fname,
                u.lname,
                u.email,

                o.title AS event_title,
                o.event_date,
                o.hours AS event_hours,

                c.name AS club_name

            FROM registrations r

            INNER JOIN users u
                ON r.user_id = u.id

            INNER JOIN opportunities o
                ON r.opportunity_id = o.id

            INNER JOIN clubs c
                ON o.club_id = c.id

            WHERE c.created_by = ?

            ORDER BY o.event_date DESC, u.fname ASC
        `;

        conn.query(sql, [adminId], function (err, results) {

            if (err) {

                console.error(
                    "Error retrieving admin registrations:",
                    err
                );

                return res.status(500).json({
                    error: "Could not retrieve event registrations"
                });
            }

            res.json(results);
        });
    }
);

// ===== ADMIN: UPDATE STUDENT ATTENDANCE =====

app.put(
    "/api/admin/registrations/:id",
    requireAdmin,
    function (req, res) {

        const registrationId = Number(req.params.id);
        const adminId = req.session.userId;

        const { status, hours_claimed, verified, notes } = req.body;

        // Validate registration ID
        if (!Number.isSafeInteger(registrationId) || registrationId <= 0) {
            return res.status(400).json({
                error: "Invalid registration ID"
            });
        }

        // Validate attendance status
        if (!["registered", "attended", "absent"].includes(status)) {
            return res.status(400).json({
                error: "Invalid attendance status"
            });
        }

        // Validate hours
        const hours = Number(hours_claimed);

        if (
            hours_claimed === null ||
            hours_claimed === "" ||
            typeof hours_claimed === "boolean" ||
            !Number.isFinite(hours) ||
            hours < 0
        ) {
            return res.status(400).json({
                error: "Volunteer hours must be a valid non-negative number"
            });
        }

        // Validate verification value
        if (verified !== true && verified !== false) {
            return res.status(400).json({
                error: "Verification must be true or false"
            });
        }

        // Validate notes
        if (typeof notes !== "string" || notes.length > 1000) {
            return res.status(400).json({
                error: "Notes must be text under 1000 characters"
            });
        }

        // Hours can only be recorded for attended events
        if (status !== "attended" && (hours !== 0 || verified)) {
            return res.status(400).json({
                error: "Only attended events can have hours or verification"
            });
        }

        // Check registration and admin ownership
        const checkSql = `
            SELECT
                r.id,
                o.event_date,
                o.hours AS event_hours

            FROM registrations r

            INNER JOIN opportunities o
                ON r.opportunity_id = o.id

            INNER JOIN clubs c
                ON o.club_id = c.id

            WHERE r.id = ?
              AND c.created_by = ?
        `;

        conn.query(
            checkSql,
            [registrationId, adminId],
            function (err, results) {

                if (err) {
                    console.error("Attendance lookup error:", err);

                    return res.status(500).json({
                        error: "Could not check registration"
                    });
                }

                if (results.length === 0) {
                    return res.status(404).json({
                        error: "Registration not found or access denied"
                    });
                }

                const registration = results[0];

                // Prevent attendance updates before an event starts
                if (new Date(registration.event_date) > new Date()) {
                    return res.status(400).json({
                        error: "Attendance cannot be recorded before the event starts"
                    });
                }

                // Prevent recording more than the scheduled hours
                if (hours > Number(registration.event_hours)) {
                    return res.status(400).json({
                        error: "Recorded hours cannot exceed the event hours"
                    });
                }

                // Update attendance, hours and verification
                const updateSql = `
                    UPDATE registrations r

                    INNER JOIN opportunities o
                        ON r.opportunity_id = o.id

                    INNER JOIN clubs c
                        ON o.club_id = c.id

                    SET
                        r.status = ?,
                        r.hours_claimed = ?,
                        r.verified = ?,
                        r.notes = ?

                    WHERE r.id = ?
                      AND c.created_by = ?
                      AND o.event_date <= NOW()
                `;

                conn.query(
                    updateSql,
                    [
                        status,
                        status === "attended" ? hours : 0,
                        verified ? 1 : 0,
                        notes.trim(),
                        registrationId,
                        adminId
                    ],
                    function (updateErr, result) {

                        if (updateErr) {
                            console.error("Attendance update error:", updateErr);

                            return res.status(500).json({
                                error: "Could not update attendance"
                            });
                        }

                        if (result.affectedRows === 0) {
                            return res.status(409).json({
                                error: "Registration could not be updated"
                            });
                        }

                        res.json({
                            message: "Attendance updated successfully!"
                        });
                    }
                );
            }
        );
    }
);

// ===== ADMIN DASHBOARD STATISTICS =====

app.get("/api/admin/statistics", requireAdmin, function (req, res) {

    const adminId = req.session.userId;

    const sql = `
        SELECT

            -- Total clubs created by this admin
            (
                SELECT COUNT(*)
                FROM clubs
                WHERE created_by = ?
            ) AS total_clubs,

            -- Total volunteer opportunities
            (
                SELECT COUNT(*)
                FROM opportunities o
                INNER JOIN clubs c ON o.club_id = c.id
                WHERE c.created_by = ?
            ) AS total_opportunities,

            -- Unique students who joined this admin's clubs
            (
                SELECT COUNT(DISTINCT cm.user_id)
                FROM club_members cm
                INNER JOIN clubs c ON cm.club_id = c.id
                WHERE c.created_by = ?
            ) AS total_members,

            -- Total event registrations
            (
                SELECT COUNT(*)
                FROM registrations r
                INNER JOIN opportunities o
                    ON r.opportunity_id = o.id
                INNER JOIN clubs c
                    ON o.club_id = c.id
                WHERE c.created_by = ?
            ) AS total_registrations,

            -- Total attended registrations
            (
                SELECT COUNT(*)
                FROM registrations r
                INNER JOIN opportunities o
                    ON r.opportunity_id = o.id
                INNER JOIN clubs c
                    ON o.club_id = c.id
                WHERE c.created_by = ?
                  AND r.status = 'attended'
            ) AS total_attended,

            -- Total verified volunteer hours
            (
                SELECT COALESCE(SUM(r.hours_claimed), 0)
                FROM registrations r
                INNER JOIN opportunities o
                    ON r.opportunity_id = o.id
                INNER JOIN clubs c
                    ON o.club_id = c.id
                WHERE c.created_by = ?
                  AND r.status = 'attended'
                  AND r.verified = 1
            ) AS verified_hours
    `;

    conn.query(
        sql,
        [
            adminId,
            adminId,
            adminId,
            adminId,
            adminId,
            adminId
        ],
        function (err, results) {

            if (err) {
                console.error("Admin statistics error:", err);

                return res.status(500).json({
                    error: "Could not retrieve dashboard statistics"
                });
            }

            res.json(results[0]);
        }
    );
});

// ===== BROWSE CLUBS - STUDENT =====

app.get("/api/student/clubs", requireStudentApi, function (req, res) {

    const sql = `
        SELECT
            c.id,
            c.name,
            c.category,
            c.description,

            (
                SELECT COUNT(*)
                FROM club_members cm
                WHERE cm.club_id = c.id
            ) AS member_count,

            EXISTS (
                SELECT 1
                FROM club_members cm
                WHERE cm.club_id = c.id
                AND cm.user_id = ?
            ) AS is_member

        FROM clubs c
        ORDER BY c.name ASC
    `;

    conn.query(sql, [req.session.userId], function (err, results) {

        if (err) {

            console.error("Error retrieving student clubs:", err);

            return res.status(500).json({
                error: "Could not retrieve clubs"
            });
        }

        res.json(results);
    });
});

// ===== JOIN CLUB - STUDENT =====

app.post("/api/student/clubs/:id/join", requireStudentApi, function (req, res) {

    const clubId = Number(req.params.id);
    const userId = req.session.userId;

    // Validate club ID
    if (!Number.isSafeInteger(clubId) || clubId <= 0) {
        return res.status(400).json({
            error: "Invalid club ID"
        });
    }

    // Check whether the club exists
    const checkSql = "SELECT id FROM clubs WHERE id = ?";

    conn.query(checkSql, [clubId], function (err, results) {

        if (err) {
            console.error("Error checking club:", err);

            return res.status(500).json({
                error: "Could not verify club"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                error: "Club not found"
            });
        }

        // Add student to club_members table
        const insertSql = `
            INSERT INTO club_members (club_id, user_id)
            VALUES (?, ?)
        `;

        conn.query(insertSql, [clubId, userId], function (err, result) {

            if (err) {

                // Student is already a member
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({
                        error: "You have already joined this club"
                    });
                }

                console.error("Error joining club:", err);

                return res.status(500).json({
                    error: "Could not join club"
                });
            }

            res.status(201).json({
                message: "You have successfully joined the club!"
            });
        });
    });
});

// ===== LEAVE CLUB - STUDENT =====

app.delete("/api/student/clubs/:id/leave", requireStudentApi, function (req, res) {

    const clubId = Number(req.params.id);
    const userId = req.session.userId;

    // Validate club ID
    if (!Number.isSafeInteger(clubId) || clubId <= 0) {
        return res.status(400).json({
            error: "Invalid club ID"
        });
    }

    // Remove student membership from club_members table
    const sql = `
        DELETE FROM club_members
        WHERE club_id = ?
        AND user_id = ?
    `;

    conn.query(sql, [clubId, userId], function (err, result) {

        if (err) {

            console.error("Error leaving club:", err);

            return res.status(500).json({
                error: "Could not leave club"
            });
        }

        // Check if student was actually a member
        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "You are not a member of this club"
            });
        }

        res.json({
            message: "You have successfully left the club!"
        });
    });
});


// ===== STUDENT EXPLORE CLUBS PAGE =====

app.get(["/clubs", "/clubs.html"], requireLogin, function (req, res) {

    if (req.session.role !== "student") {
        return res.redirect("/admin");
    }

    res.sendFile(
        __dirname + "/public/clubs.html"
    );
});

// ===== STUDENT VOLUNTEER OPPORTUNITIES PAGE =====

app.get(
    ["/opportunities", "/opportunities.html"],
    requireLogin,
    function (req, res) {

        // Only students can access this page
        if (req.session.role !== "student") {
            return res.redirect("/admin");
        }

        res.sendFile(
            __dirname + "/public/opportunities.html"
        );
    }
);

// ===== STUDENT MY EVENTS PAGE =====

app.get(
    ["/my-events", "/my-events.html"],
    requireLogin,
    function (req, res) {

        // Only students can access this page
        if (req.session.role !== "student") {
            return res.redirect("/admin");
        }

        res.sendFile(
            __dirname + "/public/my-events.html"
        );
    }
);


// ===== BROWSE VOLUNTEER OPPORTUNITIES - STUDENT =====

app.get("/api/student/opportunities", requireStudentApi, function (req, res) {

    const sql = `
        SELECT
            o.id,
            o.club_id,
            o.title,
            o.description,
            o.location,
            o.event_date,
            o.hours,
            o.spots,
            o.tags,
            c.name AS club_name,
            c.category AS club_category,

            (
                SELECT COUNT(*)
                FROM registrations r
                WHERE r.opportunity_id = o.id
            ) AS registered_count,

            EXISTS (
                SELECT 1
                FROM registrations r
                WHERE r.opportunity_id = o.id
                AND r.user_id = ?
            ) AS is_registered

        FROM opportunities o

        INNER JOIN clubs c
        ON o.club_id = c.id

        WHERE o.event_date >= NOW()

        ORDER BY o.event_date ASC
    `;

    conn.query(sql, [req.session.userId], function (err, results) {

        if (err) {

            console.error("Error retrieving opportunities:", err);

            return res.status(500).json({
                error: "Could not retrieve volunteer opportunities"
            });
        }

        res.json(results);
    });
});

// ===== REGISTER FOR VOLUNTEER OPPORTUNITY =====

app.post("/api/student/opportunities/:id/register",requireStudentApi, function (req, res) {

        const opportunityId = Number(req.params.id);
        const userId = req.session.userId;

        // Validate opportunity ID
        if (!Number.isSafeInteger(opportunityId) || opportunityId <= 0) {
            return res.status(400).json({
                error: "Invalid opportunity ID"
            });
        }

        // Start database transaction
        conn.beginTransaction(function (transactionError) {

            if (transactionError) {
                console.error(transactionError);

                return res.status(500).json({
                    error: "Could not start registration"
                });
            }

            // Roll back changes if something goes wrong
            function fail(status, message) {
                conn.rollback(function () {
                    res.status(status).json({ error: message });
                });
            }

            // Lock opportunity row to protect available spots
            const opportunitySql = `
                SELECT id, spots, event_date,
                       event_date > NOW() AS is_upcoming
                FROM opportunities
                WHERE id = ?
                FOR UPDATE
            `;

            conn.query(
                opportunitySql,
                [opportunityId],
                function (err, opportunities) {

                    if (err) {
                        console.error(err);
                        return fail(500, "Could not check opportunity");
                    }

                    if (opportunities.length === 0) {
                        return fail(404, "Opportunity not found");
                    }

                    if (!Number(opportunities[0].is_upcoming)) {
                        return fail(400, "Registration is closed for this event");
                    }

                    // Check for duplicate registration
                    const duplicateSql = `
                        SELECT id
                        FROM registrations
                        WHERE opportunity_id = ?
                        AND user_id = ?
                    `;

                    conn.query(
                        duplicateSql,
                        [opportunityId, userId],
                        function (duplicateError, existing) {

                            if (duplicateError) {
                                console.error(duplicateError);
                                return fail(500, "Could not check registration");
                            }

                            if (existing.length > 0) {
                                return fail(409, "You are already registered for this event");
                            }

                            // Count registered students
                            const countSql = `
                                SELECT COUNT(*) AS registered_count
                                FROM registrations
                                WHERE opportunity_id = ?
                            `;

                            conn.query(
                                countSql,
                                [opportunityId],
                                function (countError, counts) {

                                    if (countError) {
                                        console.error(countError);
                                        return fail(500, "Could not check available spots");
                                    }

                                    const registeredCount =
                                        Number(counts[0].registered_count);

                                    const totalSpots =
                                        Number(opportunities[0].spots);

                                    // Prevent registration if event is full
                                    if (registeredCount >= totalSpots) {
                                        return fail(409, "This event is full");
                                    }

                                    // Insert registration
                                    const insertSql = `
                                        INSERT INTO registrations
                                        (opportunity_id, user_id, status, verified)
                                        VALUES (?, ?, 'registered', 0)
                                    `;

                                    conn.query(
                                        insertSql,
                                        [opportunityId, userId],
                                        function (insertError) {

                                            if (insertError) {

                                                if (insertError.code === "ER_DUP_ENTRY") {
                                                    return fail(409, "You are already registered");
                                                }

                                                console.error(insertError);
                                                return fail(500, "Could not register for event");
                                            }

                                            // Save transaction
                                            conn.commit(function (commitError) {

                                                if (commitError) {
                                                    console.error(commitError);

                                                    return fail(500, "Could not complete registration");
                                                }

                                                res.status(201).json({
                                                    message: "Successfully registered for the event!"
                                                });
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        });
    }
);

// ===== CANCEL EVENT REGISTRATION - STUDENT =====

app.delete(
    "/api/student/opportunities/:id/cancel",
    requireStudentApi,
    function (req, res) {

        const opportunityId = Number(req.params.id);
        const userId = req.session.userId;

        // Validate opportunity ID
        if (!Number.isSafeInteger(opportunityId) || opportunityId <= 0) {
            return res.status(400).json({
                error: "Invalid opportunity ID"
            });
        }

        // Cancel only the logged-in student's registration
        // and only if the event has not started.
        const sql = `
            DELETE r
            FROM registrations r
            INNER JOIN opportunities o
                ON r.opportunity_id = o.id
            WHERE r.opportunity_id = ?
              AND r.user_id = ?
              AND r.status = 'registered'
              AND r.verified = 0
              AND o.event_date > NOW()
        `;

        conn.query(
            sql,
            [opportunityId, userId],
            function (err, result) {

                if (err) {
                    console.error("Error cancelling registration:", err);

                    return res.status(500).json({
                        error: "Could not cancel registration"
                    });
                }

                // No eligible registration was found
                if (result.affectedRows === 0) {
                    return res.status(409).json({
                        error: "No cancellable registration found. The event may have started or attendance may already be recorded."
                    });
                }

                res.json({
                    message: "Your event registration has been cancelled successfully!"
                });
            }
        );
    }
);

// ===== MY EVENTS - STUDENT =====

app.get("/api/student/my-events", requireStudentApi, function (req, res) {

    const userId = req.session.userId;

    const sql = `
        SELECT
            r.id AS registration_id,
            r.opportunity_id,
            r.status,
            r.hours_claimed,
            r.verified,
            r.notes,
            r.registered_at,

            o.title,
            o.description,
            o.location,
            o.event_date,
            o.hours AS event_hours,
            o.tags,

            c.name AS club_name,
            c.category AS club_category

        FROM registrations r

        INNER JOIN opportunities o
            ON r.opportunity_id = o.id

        INNER JOIN clubs c
            ON o.club_id = c.id

        WHERE r.user_id = ?

        ORDER BY o.event_date DESC
    `;

    conn.query(sql, [userId], function (err, results) {

        if (err) {

            console.error("Error retrieving student events:", err);

            return res.status(500).json({
                error: "Could not retrieve your events"
            });
        }

        res.json(results);
    });
});


app.listen(3000, function () {
    console.log("Server running at http://localhost:3000");
});


