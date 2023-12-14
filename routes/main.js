const bcrypt = require("bcrypt");
const { check, validationResult } = require("express-validator");
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
    if (req.session.userId) {
      res.locals.username = req.session.userIdentifier; // Use userIdentifier here
      res.locals.userType = req.session.userType;
    }
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
  app.get("/search", function (req, res) {
    res.render("search.ejs", shopData);
  });
  app.get("/search-result", function (req, res) {
    //searching in the database
    //res.send("You searched for: " + req.query.keyword);
    let sqlquery =
      "SELECT * FROM event WHERE eventType LIKE '%" + req.query.keyword + "%'"; // query database to get all the books
    // execute sql query
    db.query(sqlquery, (err, result) => {
      if (err) {
        res.redirect("./");
      }
      let newData = Object.assign({}, shopData, { availableEvents: result });
      console.log(newData);
      res.render("list.ejs", newData);
    });
  });

  app.get("/register", function (req, res) {
    res.render("register.ejs", shopData);
  });

  app.post(
    "/registered",
    [
      check("name", "Name is required").notEmpty(),
      check("username", "Username must be 3+ characters long").isLength({
        min: 3,
      }),
      check("email", "Invalid email").isEmail(),
      check(
        "password",
        "Password must be 8+ characters long and contain a special character"
      )
        .isLength({ min: 8 })
        .matches(/[!@$%^&*]/),
      check("phone", "Invalid phone number").isMobilePhone(),
    ],
    (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Sanitize inputs
      const sanitizedUsername = req.sanitize(req.body.username);
      const sanitizedEmail = req.sanitize(req.body.email);
      const sanitizedName = req.sanitize(req.body.name);
      const sanitizedPhone = req.sanitize(req.body.phone);
      const preferredPaymentMethod = req.sanitize(
        req.body.preferredPaymentMethod
      );
      const plainPassword = req.body.password;

      bcrypt.hash(plainPassword, saltRounds, function (err, hashedPassword) {
        if (err) {
          console.error(err);
          return res.status(500).send("Error registering user.");
        }

        const sql =
          "INSERT INTO customer (name, username, hashedPassword, email, phone, preferredPaymentMethod) VALUES (?, ?, ?, ?, ?, ?)";
        const values = [
          sanitizedName,
          sanitizedUsername,
          hashedPassword,
          sanitizedEmail,
          sanitizedPhone,
          preferredPaymentMethod,
        ];

        db.query(sql, values, function (error, results, fields) {
          if (error) {
            console.error(error);
            return res.status(500).send("Error registering user.");
          }

          res.redirect("/");
        });
      });
    }
  );

  app.get("/instructorRegistration", function (req, res) {
    res.render("instructorRegistration.ejs", shopData);
  });

  app.post(
    "/instructorRegistered",
    [
      check("name", "Name is required").notEmpty(),
      check("email", "Invalid email").isEmail(),
      check("phone", "Invalid phone number").isMobilePhone(),
      check("speciality", "Speciality is required").notEmpty(),
      check("hourlyRate", "Hourly rate must be a number").isNumeric(),
      check(
        "password",
        "Password must be 8+ characters long and contain a special character"
      )
        .isLength({ min: 8 })
        .matches(/[!@$%^&*]/),
    ],
    function (req, res) {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const sanitizedName = req.sanitize(req.body.name);
      const sanitizedEmail = req.sanitize(req.body.email);
      const sanitizedPhone = req.sanitize(req.body.phone);
      const sanitizedSpeciality = req.sanitize(req.body.speciality);
      const sanitizedHourlyRate = req.sanitize(req.body.hourlyRate);
      const plainPassword = req.body.password;

      bcrypt.hash(plainPassword, saltRounds, function (err, hashedPassword) {
        if (err) {
          console.error(err);
          return res.status(500).send("Error registering instructor.");
        }

        const sql =
          "INSERT INTO instructor (name, email, phone, speciality, availibility, hourlyRate, hashedPassword) VALUES (?, ?, ?, ?, ?, ?, ?)";
        const values = [
          sanitizedName,
          sanitizedEmail,
          sanitizedPhone,
          sanitizedSpeciality,
          1,
          sanitizedHourlyRate,
          hashedPassword,
        ];

        db.query(sql, values, function (error, results, fields) {
          if (error) {
            console.error(error);
            return res.status(500).send("Error registering instructor.");
          }

          res.send("Instructor " + sanitizedName + " is now registered.");
        });
      });
    }
  );

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
      let sqlquery = `
        SELECT e.*, 
               (SELECT COUNT(*) FROM bookings b WHERE b.event_id = e.event_id) AS currentParticipants 
        FROM event e`;

      db.query(sqlquery, (err, result) => {
        if (err) {
          res.redirect("./");
        } else {
          let newData = Object.assign({}, shopData, { events: result });
          res.render("list.ejs", newData);
        }
      });
    });

    app.get("/addevent", redirectLogin, function (req, res) {
      console.log("Session: ", req.session); // Debug line

      if (req.session.userType !== "instructor") {
        return res.status(403).send("Only instructors can add events.");
      }
      res.render("addevent.ejs", shopData);
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
      const customerId = req.session.userId;

      const checkEnlistmentSql =
        "SELECT * FROM bookings WHERE customer_id = ? AND event_id = ?";
      db.query(
        checkEnlistmentSql,
        [customerId, eventId],
        function (err, bookingResults) {
          if (err) {
            console.error(err);
            return res.status(500).send("Error checking existing booking.");
          }

          if (bookingResults.length > 0) {
            return res.send("You have already enlisted in this event.");
          } else {
            const checkCapacitySql =
              "SELECT maxAttendees, (SELECT COUNT(*) FROM bookings WHERE event_id = ?) as currentBookings FROM event WHERE event_id = ?";
            db.query(
              checkCapacitySql,
              [eventId, eventId],
              function (err, results) {
                if (err) {
                  console.error(err);
                  return res.status(500).send("Error checking event capacity.");
                }

                if (
                  results.length > 0 &&
                  results[0].currentBookings < results[0].maxAttendees
                ) {
                  const enlistSql =
                    "INSERT INTO bookings (customer_id, event_id, bookingDate) VALUES (?, ?, NOW())";
                  db.query(enlistSql, [customerId, eventId], function (error) {
                    if (error) {
                      console.error(error);
                      return res.status(500).send("Error enlisting in event.");
                    }
                    res.redirect("/myEvents");
                  });
                } else {
                  // Event is full
                  res.send(
                    "Sorry, this event has reached its maximum capacity."
                  );
                }
              }
            );
          }
        }
      );
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
        res.render("myevents.ejs", locals);
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

    app.get("/logout", redirectLogin, (req, res) => {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session: ", err);
          return res.redirect("/");
        }
        res.redirect("/");
      });
    });
  });
};
