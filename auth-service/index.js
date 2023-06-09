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
app.enable('trust proxy');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(passport.initialize());

app.use(
  session({
    resave: false,
    saveUninitialized: true,
    secret: process.env["JWT_SECRET"],
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
opts.secretOrKey = process.env["JWT_SECRET"];

passport.use(
  new JwtStrategy(opts, function (jwt_payload, done) {
    console.log("JWT BASED  VALIDATION GETTING CALLED");
    console.log("JWT", jwt_payload);
    if (CheckUser(jwt_payload)) {
      return done(null, jwt_payload);
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
      callbackURL: `/auth/google/callback`,
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
      callbackURL: `/auth/facebook/callback`, // relative or absolute path
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
  console.log("I should have to do that");
  cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
  console.log("I wont have to do that");
  cb(null, obj);
});

app.get("/", (req, res) => {
  res.sendFile("home.html", { root: __dirname + "/public" });
});

app.get("/login", (req, res) => {
  if (!req.query.redirect_url) {
    res.status(400);
    res.send("redirect_url query parameter missing");
    return;
  }
  res.cookie("redirect_url", req.query.redirect_url);
  res.sendFile("login.html", { root: __dirname + "/public" });
});

app.get("/auth/email", (req, res) => {
  res.sendFile("login_form.html", { root: __dirname + "/public" });
});

app.get("/auth/google", GoogleAuthenticator, function (req, res) {});

function GoogleAuthenticator(req, res, next) {
  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: req.cookies["redirect_url"],
  })(req, res, next);
  //^ call the middleware returned by passport.authenticate
  // https://stackoverflow.com/a/27318966
}

app.get("/auth/facebook", FacebookAuthenticator, function (req, res) {});

function FacebookAuthenticator(req, res, next) {
  passport.authenticate("facebook", {
    scope: "email",
    state: req.cookies["redirect_url"],
  })(req, res, next);
}

app.post("/auth/email", (req, res) => {
  if (CheckUser(req.body)) {
    let token = jwt.sign(
      {
        data: req.body,
      },
      process.env["JWT_SECRET"],
      { expiresIn: "1h" }
    );
    res.cookie("jwt", token, { sameSite: 'none', secure: true});
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
        displayName: user.displayName,
        name: user.name,
        email: user.email,
        provider: user.provider,
        iss: process.env["ISSUER"],
        aud: process.env["AUDIENCE"],
      },
      process.env["JWT_SECRET"],
      { expiresIn: "1h" }
    );
    res.cookie("jwt", token, { sameSite: 'none', secure: true});
    res.redirect(req.query.state);
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
        displayName: user.displayName,
        name: user.name,
        email: user.email,
        provider: user.provider,
        iss: process.env["AUDIENCE"],
        aud: process.env["ISSUER"],
      },
      process.env["JWT_SECRET"],
      { expiresIn: "1h" }
    );
    res.cookie("jwt", token, { sameSite: 'none', secure: true});
    res.redirect(req.query.state);
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

//Configuration of Prometheus Client
const prometheus = require('prom-client');
const registry = new prometheus.Registry();

const authenticationCounter = new prometheus.Counter({
  name: "authentication",
  help: "Total number of authentications",
  labelNames: ["strategy"],
});

const authenticationErrorCounter = new prometheus.Counter({
  name: "authentication_errors_total",
  help: "Total number of authentication errors",
  labelNames: ["strategy"],
});

registry.registerMetric(authenticationCounter);
registry.registerMetric(authenticationErrorCounter);

app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", prometheus.register.contentType);
    res.end(await prometheus.register.metrics());
  } catch (ex) {
    res.status(500).send(ex.toString());
  }
});



const port = process.env.PORT || 5800;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server EGS listening on port ${port}`);
});