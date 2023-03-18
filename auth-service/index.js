const express = require("express");
const passport = require("passport");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const session = require("express-session");
const dotenv = require("dotenv");
dotenv.config();

const DATA = [{ email: "test@gmail.com", password: "1234" }];

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(passport.initialize());

app.use(
  session({
    resave: false,
    saveUninitialized: true,
    secret: "secret",
  })
);

// Add this line below
const jwt = require("jsonwebtoken");
var JwtStrategy = require("passport-jwt").Strategy,
  ExtractJwt = require("passport-jwt").ExtractJwt;
var opts = {};
opts.jwtFromRequest = function (req) {
  var token = null;
  if (req && req.cookies) {
    token = req.cookies["jwt"];
  }
  return token;
};
opts.secretOrKey = "secret";

passport.use(
  new JwtStrategy(opts, function (jwt_payload, done) {
    console.log("JWT BASED  VALIDATION GETTING CALLED");
    console.log("JWT", jwt_payload);
    if (CheckUser(jwt_payload.data)) {
      return done(null, jwt_payload.data);
    } else {
      // user account doesnt exists in the DATA
      return done(null, false);
    }
  })
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env["GOOGLE_CLIENT_ID"],
      clientSecret: process.env["GOOGLE_CLIENT_SECRET"],
      callbackURL: "http://localhost:5000/auth/google/callback",
    },
    function (accessToken, refreshToken, profile, cb) {
      //console.log(accessToken, refreshToken, profile)
      console.log("GOOGLE BASED OAUTH VALIDATION GETTING CALLED");
      return cb(null, profile);
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env["FACEBOOK_CLIENT_ID"],
      clientSecret: process.env["FACEBOOK_CLIENT_SECRET"],
      callbackURL: "http://localhost:5000/auth/facebook/callback", // relative or absolute path
      profileFields: ["id", "displayName", "email", "picture"],
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      console.log("FACEBOOK BASED OAUTH VALIDATION GETTING CALLED");
      return cb(null, profile);
    }
  )
);

passport.serializeUser(function (user, cb) {
  console.log("I should have jack ");
  cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
  console.log("I wont have jack shit");
  cb(null, obj);
});

app.get("/", (req, res) => {
  res.sendFile("home.html", { root: __dirname + "/public" });
});

app.get("/login", (req, res) => {
  res.sendFile("login.html", { root: __dirname + "/public" });
});

app.get("/auth/email", (req, res) => {
  res.sendFile("login_form.html", { root: __dirname + "/public" });
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
app.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: "email" })
);

app.post("/auth/email", (req, res) => {
  if (CheckUser(req.body)) {
    let token = jwt.sign(
      {
        data: req.body,
      },
      "secret",
      { expiresIn: "1h" }
    );
    res.cookie("jwt", token);
    res.send(`Log in success ${req.body.email}`);
  } else {
    res.send("Invalid login credentials");
  }
});

app.get(
  "/profile",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.send(`Hello ${req.user.email}, this is your profile`);
  }
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google"),
  (req, res) => {
    console.log("redirected", req.user);
    let user = {
      displayName: req.user.displayName,
      name: req.user.name.givenName,
      email: req.user._json.email,
      provider: req.user.provider,
    };
    console.log(user);

    FindOrCreate(user);
    let token = jwt.sign(
      {
        data: user,
      },
      "secret",
      { expiresIn: "1h" }
    );
    res.cookie("jwt", token);
    res.redirect("/");
  }
);
app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { scope: "email" }),
  (req, res) => {
    console.log("redirected", req.user);
    let user = {
      displayName: req.user.displayName,
      name: req.user._json.name,
      email: req.user._json.email,
      provider: req.user.provider,
    };
    console.log(user);

    FindOrCreate(user);
    let token = jwt.sign(
      {
        data: user,
      },
      "secret",
      { expiresIn: 60 }
    );
    res.cookie("jwt", token);
    res.redirect("/");
  }
);

function FindOrCreate(user) {
  if (CheckUser(user)) {
    // if user exists then return user
    return user;
  } else {
    DATA.push(user); // else create a new user
  }
}
function CheckUser(input) {
  console.log(DATA);
  console.log(input);

  for (var i in DATA) {
    if (
      input.email == DATA[i].email &&
      (input.password == DATA[i].password || DATA[i].provider == input.provider)
    ) {
      console.log("User found in DATA");
      return true;
    } else null;
    //console.log('no match')
  }
  return false;
}
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Sever EGS listening on port ${port}`);
});
