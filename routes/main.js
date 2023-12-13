const bcrypt = require("bcrypt");
const saltRounds = 10;
module.exports = function (app, shopData) {
  //redirects to login page if not logged in
  const redirectLogin = (req, res, next) => {
    if (!req.session.userId) {
      res.redirect("./login");
    } else {
      next();
    }
  };

  const addLoginStatus = (req, res, next) => {
    res.locals.isLoggedIn = !!req.session.userId;
    res.locals.username = req.session.userIdentifier || "Guest";
    res.locals.userType = req.session.userType || "guest";
    next();
  };

  app.use(addLoginStatus);

  // Handle our routes
  app.get("/", function (req, res) {
    //pass local variables so username or email can show on landing page
    let locals = {
      shopName: shopData.shopName,
      isLoggedIn: req.session.userId ? true : false,
      userIdentifier: req.session.userIdentifier,
      userType: req.session.userType,
    };
    res.render("index.ejs", locals);
  });

  app.get("/about", function (req, res) {
    res.render("about.ejs", shopData);
  });
  app.get("/search", redirectLogin, function (req, res) {
    res.render("search.ejs", {
      shopName: shopData.shopName,
      isLoggedIn: req.session.userId ? true : false,
      userType: req.session.userType,
      userIdentifier: req.session.userIdentifier,
    });
  });
  app.get("/search-result", function (req, res) {
    const keyword = req.query.keyword;

    const sqlquery = "SELECT * FROM event WHERE eventType LIKE ?";

    db.query(sqlquery, ["%" + keyword + "%"], function (err, result) {
      if (err) {
        console.error("Error executing search query: ", err);
        return res.status(500).send("Error executing search query.");
      }

      res.render("list.ejs", {
        shopName: shopData.shopName,
        isLoggedIn: req.session.userId ? true : false,
        userType: req.session.userType,
        userIdentifier: req.session.userIdentifier,
        events: result,
      });
    });
  });

  app.get("/register", function (req, res) {
    res.render("register.ejs", shopData);
  });
  app.post("/registered", function (req, res) {
    const plainPassword = req.body.password;

    //password complexity requirement
    if (plainPassword.length < 8 || !/[!@$%^&*]/.test(plainPassword)) {
      return res
        .status(400)
        .send(
          "password must be 8 characters long and contain a special character"
        );
    }

    // Hash the password using bcrypt
    bcrypt.hash(plainPassword, saltRounds, function (err, hashedPassword) {
      if (err) {
        console.error(err);
        return res.status(500).send("Error registering user.");
      }

      // Define a SQL query to insert user data into the "users" table
      const sql =
        "INSERT INTO customer (name, username, hashedPassword, email, phone, preferredPaymentMethod) VALUES (?, ?, ?, ?, ?, ?)";
      const values = [
        req.body.name,
        req.body.username,
        hashedPassword,
        req.body.email,
        req.body.phone,
        req.body.preferredPaymentMethod,
      ];

      // Execute the SQL query to insert the data
      db.query(sql, values, function (error, results, fields) {
        if (error) {
          console.error(error);
          return res.status(500).send("Error registering user.");
        }

        // Respond with a success message or redirect to a different page
        const result =
          "Hello " +
          req.body.username +
          " you are now registered!" +
          " youre password is:" +
          plainPassword +
          " and the hash is: " +
          hashedPassword;
        res.send(result);
      });
    });
  });

  app.get("/instructorRegistration", function (req, res) {
    res.render("instructorRegistration.ejs", shopData);
  });

  app.post("/instructorRegistered", function (req, res) {
    const plainPassword = req.body.password;

    if (plainPassword.length < 8 || !/[!@$%^&*]/.test(plainPassword)) {
      return res
        .status(400)
        .send(
          "Password must be 8 characters long and contain a special character"
        );
    }

    bcrypt.hash(plainPassword, saltRounds, function (err, hashedPassword) {
      if (err) {
        console.error(err);
        return res.status(500).send("Error registering instructor.");
      }

      const sql =
        "INSERT INTO instructor (name, email, phone, speciality, availibility, hourlyRate, hashedPassword) VALUES (?, ?, ?, ?, ?, ?, ?)";
      const values = [
        req.body.name,
        req.body.email,
        req.body.phone,
        req.body.speciality,
        1,
        req.body.hourlyRate,
        hashedPassword,
      ];

      db.query(sql, values, function (error, results, fields) {
        if (error) {
          console.error(error);
          return res.status(500).send("Error registering instructor.");
        }

        res.send("Instructor " + req.body.name + " is now registered.");
      });
    });
  });

  app.get("/login", function (req, res) {
    res.render("login.ejs", shopData);
  });

  app.post("/loggedin", function (req, res) {
    const { username, password } = req.body;

    let sql = "SELECT * FROM customer WHERE username = ?";
    db.query(sql, [username], function (error, customerResults) {
      if (error) {
        console.error(error);
        return res.status(500).send("Error during login.");
      }

      if (customerResults.length > 0) {
        //verify password
        verifyUser(customerResults[0], false);
      } else {
        // check instructor table
        sql = "SELECT * FROM instructor WHERE email = ?";
        db.query(sql, [username], function (error, instructorResults) {
          if (error) {
            console.error(error);
            return res.status(500).send("Error during login.");
          }

          if (instructorResults.length > 0) {
            verifyUser(instructorResults[0], true);
          } else {
            // User not found
            res.status(401).send("Invalid username or password.");
          }
        });
      }
    });

    function verifyUser(user, fromInstructorTable) {
      bcrypt.compare(password, user.hashedPassword, function (err, result) {
        if (err) {
          console.error(err);
          return res.status(500).send("Error during login.");
        } else if (result) {
          // Set session variables
          req.session.userId = fromInstructorTable
            ? user.instructor_id
            : user.customer_id;
          req.session.userIdentifier = fromInstructorTable
            ? user.email
            : user.username;
          req.session.userType = fromInstructorTable
            ? "instructor"
            : "customer";

          console.log("User Type Set: ", req.session.userType); // Debug line

          res.redirect("/");
        } else {
          res.status(401).send("Invalid username or password.");
        }
      });
    }

    app.get("/list", redirectLogin, function (req, res) {
      let sqlquery =
        "SELECT e.*, (SELECT COUNT(*) FROM bookings WHERE event_id = e.event_id) AS currentParticipants FROM event e";

      db.query(sqlquery, function (err, events) {
        if (err) {
          console.error(err);
          res.redirect("/");
        } else {
          res.render("list.ejs", {
            shopName: shopData.shopName,
            isLoggedIn: req.session.userId ? true : false,
            userType: req.session.userType,
            userIdentifier: req.session.userIdentifier,
            events: events,
          });
        }
      });
    });

    app.get("/addevent", redirectLogin, function (req, res) {
      console.log("Session: ", req.session); // Debug line

      if (req.session.userType !== "instructor") {
        return res.status(403).send("Only instructors can add events.");
      }
      res.render("addevent.ejs", {
        shopName: shopData.shopName,
        isLoggedIn: req.session.userId ? true : false,
        userType: req.session.userType,
        userIdentifier: req.session.userIdentifier,
        events: result,
      });
    });

    app.get("/listinstructors", redirectLogin, function (req, res) {
      let sqlquery = "SELECT name, speciality, hourlyRate FROM instructor";

      db.query(sqlquery, (err, result) => {
        if (err) {
          res.redirect("./");
        }
        let newData = Object.assign({}, shopData, { instructor: result });
        console.log(newData);
        res.render("listinstructors.ejs", newData);
      });
    });

    app.post("/enlistEvent", redirectLogin, function (req, res) {
      if (req.session.userType !== "customer") {
        return res.status(403).send("Only customers can enlist in events.");
      }

      const eventId = req.body.eventId;

      const checkCapacitySql =
        "SELECT maxAttendees, (SELECT COUNT(*) FROM bookings WHERE event_id = ?) as currentBookings FROM event WHERE event_id = ?";

      db.query(checkCapacitySql, [eventId, eventId], function (err, results) {
        if (err) {
          console.error(err);
          return res.status(500).send("Error checking event capacity.");
        }

        if (
          results.length > 0 &&
          results[0].currentBookings < results[0].maxAttendees
        ) {
          const sql =
            "INSERT INTO bookings (customer_id, event_id, bookingDate) VALUES (?, ?, NOW())";
          db.query(
            sql,
            [req.session.userId, eventId],
            function (error, bookingResults) {
              if (error) {
                console.error(error);
                return res.status(500).send("Error enlisting in event.");
              }
              res.redirect("/myEvents");
            }
          );
        } else {
          res.send("Sorry, this event has reached its maximum capacity.");
        }
      });
    });

    app.get("/myevents", redirectLogin, function (req, res) {
      let sqlquery = "";

      if (req.session.userType === "instructor") {
        sqlquery = `
      SELECT e.*, 
             (SELECT COUNT(*) FROM bookings b WHERE b.event_id = e.event_id) AS currentParticipants 
      FROM event e WHERE e.instructor_id = ?`;
      } else if (req.session.userType === "customer") {
        sqlquery = `
    SELECT e.*, 
           (SELECT COUNT(*) FROM bookings b WHERE b.event_id = e.event_id) AS currentParticipants 
    FROM event e
    INNER JOIN bookings b ON e.event_id = b.event_id
    WHERE b.customer_id = ?`;
      }

      db.query(sqlquery, [req.session.userId], (err, result) => {
        if (err) {
          console.error(err);
          return res.redirect("./");
        }

        let locals = {
          shopName: shopData.shopName,
          myEvents: result,
          userType: req.session.userType,
          userId: req.session.userId,
          userIdentifier: req.session.userIdentifier,
        };
        res.render("myevents.ejs", {
          shopName: shopData.shopName,
          isLoggedIn: req.session.userId ? true : false,
          userType: req.session.userType,
          userIdentifier: req.session.userIdentifier,
          events: result,
        });
      });
    });

    app.post("/dropEvent", redirectLogin, (req, res) => {
      if (req.session.userType !== "customer") {
        return res.status(403).send("Unauthorized access.");
      }
      const eventId = req.body.eventId;
      const sqlQuery =
        "DELETE FROM bookings WHERE event_id = ? AND customer_id = ?";
      db.query(sqlQuery, [eventId, req.session.userId], (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Error dropping out of event.");
        }
        res.redirect("/myevents");
      });
    });

    app.post("/deleteEvent", redirectLogin, (req, res) => {
      if (req.session.userType !== "instructor") {
        return res.status(403).send("Unauthorized access.");
      }
      const eventId = req.body.eventId;

      const deleteBookingsSql = "DELETE FROM bookings WHERE event_id = ?";
      db.query(deleteBookingsSql, [eventId], (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Error deleting bookings for the event.");
        }

        const deleteEventSql =
          "DELETE FROM event WHERE event_id = ? AND instructor_id = ?";
        db.query(
          deleteEventSql,
          [eventId, req.session.userId],
          (err, result) => {
            if (err) {
              console.error(err);
              return res.status(500).send("Error deleting event.");
            }
            res.redirect("/myevents");
          }
        );
      });
    });

    app.get("/editevent", redirectLogin, function (req, res) {
      if (req.session.userType !== "instructor") {
        return res.status(403).send("Unauthorized access.");
      }

      const eventId = req.query.eventId;
      const sqlQuery =
        "SELECT * FROM event WHERE event_id = ? AND instructor_id = ?";

      db.query(sqlQuery, [eventId, req.session.userId], (err, result) => {
        if (err || result.length === 0) {
          return res.status(404).send("Event not found or access denied.");
        }
        res.render("editevent.ejs", {
          event: result[0],
          shopName: shopData.shopName,
        });
      });
    });

    app.post("/eventupdated", redirectLogin, function (req, res) {
      if (req.session.userType !== "instructor") {
        return res.status(403).send("Unauthorized access.");
      }

      const {
        eventId,
        eventType,
        dateOfEvent,
        timeOfEvent,
        location,
        maxAttendees,
        price,
      } = req.body;

      const sqlQuery =
        "UPDATE event SET eventType = ?, dateOfEvent = ?, timeOfEvent = ?, location = ?, maxAttendees = ?, price = ? WHERE event_id = ? AND instructor_id = ?";

      db.query(
        sqlQuery,
        [
          eventType,
          dateOfEvent,
          timeOfEvent,
          location,
          maxAttendees,
          price,
          eventId,
          req.session.userId,
        ],
        (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).send("Error updating event: " + err.message);
          }

          res.redirect("/myevents");
        }
      );
    });

    app.post("/eventadded", redirectLogin, function (req, res) {
      if (req.session.userType !== "instructor") {
        return res.status(403).send("Only instructors can add events.");
      }

      let sqlQuery =
        "INSERT INTO event (instructor_id, eventType, dateOfEvent, timeOfEvent, location, maxAttendees, price) VALUES (?, ?, ?, ?, ?, ?, ?)";
      let newRecord = [
        req.session.userId,
        req.body.eventType,
        req.body.dateOfEvent,
        req.body.timeOfEvent,
        req.body.location,
        req.body.maxAttendees,
        req.body.price,
      ];

      db.query(sqlQuery, newRecord, (err, result) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send("Error adding event.");
        }
        res.send("Event successfully added.");
      });
    });

    app.get("/logout", function (req, res) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session: ", err);
        }
        res.clearCookie("connect.sid");
        res.redirect("/login");
      });
    });
  });
};
