const User = require("../models/userSchema");

const userAuth = (req, res, next) => {
    const publicRoutes = ['/', '/login', '/register'];

    if (publicRoutes.includes(req.path)) {
        if (req.session.user) {
            User.findById(req.session.user)
                .then(user => {
                    if (user && !user.isBlocked) {
                        next();
                    } else {
                        delete req.session.user;
                        console.log("User session cleared due to block or invalid status.");
                        res.redirect('/login');
                    }
                })
                .catch(error => {
                    console.error("Authentication middleware encountered an error:", error);
                    res.status(500).json({ error: "Internal server error" });
                });
        } else {
            next();
        }
    } else {
        if (req.session.user) {
            User.findById(req.session.user)
                .then(user => {
                    if (user && !user.isBlocked) {
                        next();
                    } else {
                        delete req.session.user;
                        console.log("Access denied: User session removed.");
                        res.redirect('/login');
                    }
                })
                .catch(error => {
                    console.error("Middleware error while verifying user:", error);
                    res.status(500).json({ error: "Internal server error" });
                });
        } else {
            res.redirect('/login');
        }
    }
};

const adminAuth = (req, res, next) => {
    if (req.session.admin) {
        User.findOne({ isAdmin: true })
            .then(data => {
                if (data) {
                    next();
                } else {
                    res.redirect("/admin/login");
                }
            })
            .catch(error => {
                console.log("Error in adminAuth middleware", error);
                res.status(500).send("Internal Server Error");
            });
    } else {
        res.redirect("/admin/login");
    }
};

module.exports = {
    userAuth,
    adminAuth,
};
