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

app.listen(3000, function () {
    console.log("Server running at http://localhost:3000");
});


