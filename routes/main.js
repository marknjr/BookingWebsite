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
    if (req.session.userId) {
      res.locals.username = req.session.userId;
    }
    next();
  };

  app.use(addLoginStatus);

  // Handle our routes
  app.get("/", function (req, res) {
    res.render("index.ejs", shopData);
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
  app.post("/registered", function (req, res) {
    const plainPassword = req.body.password;

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

  app.get("/login", function (req, res) {
    res.render("login.ejs", shopData);
  });

  app.post("/loggedin", function (req, res) {
    const { username, password } = req.body;

    const sql = "SELECT * FROM customer WHERE username = ?";
    db.query(sql, [username], function (error, results) {
      if (error) {
        console.error(error);
        return res.status(500).send("Error during login.");
      }

      if (results.length === 0) {
        // User not found
        return res.status(401).send("Invalid username or password.");
      }

      const user = results[0];
      bcrypt.compare(password, user.hashedPassword, function (err, result) {
        if (err) {
          console.error(err);
          return res.status(500).send("Error during login.");
        } else if (result == true) {
          console.log("user logged in");
          req.session.userId = req.body.username;

          // Redirect to the homepage after successful login
          res.redirect("/");
        } else {
          // incorrect pass
          res.status(401).send("Invalid username or password.");
        }
      });
    });
  });

  app.get("/list", redirectLogin, function (req, res) {
    let sqlquery = "SELECT * FROM event"; // query database to get all the books
    // execute sql query
    db.query(sqlquery, (err, result) => {
      if (err) {
        res.redirect("./");
      }
      let newData = Object.assign({}, shopData, { events: result });
      console.log(newData);
      res.render("list.ejs", newData);
    });
  });

  app.get("/addevent", redirectLogin, function (req, res) {
    res.render("addevent.ejs", shopData);
  });

  app.get("/listinstructors", redirectLogin, function (req, res) {
    let sqlquery = "SELECT name, speciality, hourlyRate FROM instructor"; // query database to get all the books
    // execute sql query
    db.query(sqlquery, (err, result) => {
      if (err) {
        res.redirect("./");
      }
      let newData = Object.assign({}, shopData, { instructor: result });
      console.log(newData);
      res.render("listinstructors.ejs", newData);
    });
  });

  app.post("/eventadded", function (req, res) {
    // saving data in database
    let sqlquery =
      "INSERT INTO event (eventType, dateOfEvent, timeOfEvent, location, maxAttendees, price) VALUES (?,?,?,?,?,?)";
    // execute sql query
    let newrecord = [
      req.body.eventType,
      req.body.dateOfEvent,
      req.body.timeOfEvent,
      req.body.location,
      req.body.maxAttendees,
      req.body.price,
    ];
    db.query(sqlquery, newrecord, (err, result) => {
      if (err) {
        return console.error(err.message);
      } else
        res.send(
          " This event is added to database, eventType: " +
            req.body.eventType +
            " Date: " +
            req.body.dateOfEvent +
            " Price: " +
            req.body.price
        );
    });
  });

  app.get("/logout", redirectLogin, (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.redirect("./");
      }
      res.redirect("/");
    });
  });
};
