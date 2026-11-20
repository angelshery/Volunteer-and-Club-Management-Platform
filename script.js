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

// Pages for logged-in users live, so they must come BEFORE express.static
function pageGuard(file) {
    return (req, res) => {
        if (req.session.username) res.sendFile(path.join(__dirname, file));
        else res.redirect("/login.html");
    };
}
app.get("/dashboard", pageGuard("dashboard.html"));

app.use(express.static("public"));

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
            if (err) return res.send("Error saving session");
            res.redirect("/dashboard");
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

app.listen(3000, function () {
    console.log("Server running at http://localhost:3000");
});