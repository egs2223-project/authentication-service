var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const session = require("express-session");
const jwt = require("jsonwebtoken");
const expressJWT = require("express-jwt");
const { OAuth2Client } = require("google-auth-library");

var authRouter = require("./routes/auth");
var usersRouter = require("./routes/users");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", authRouter);
app.use("/users", usersRouter);

/*
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
*/
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
app.use(
  session({
    resave: false,
    saveUninitialized: true,
    secret: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
  })
);

var passport = require("passport");
var userProfile;

app.use(passport.initialize());
app.use(passport.session());

app.get("/success", (req, res) => {
  res.render("success", { user: userProfile });
});
app.get("/error", (req, res) => res.send("error logging in"));

passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
  cb(null, obj);
});

/*  Google AUTH  */

var GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;
const GOOGLE_CLIENT_ID =
  "801888173770-b1ueibqcfadas8mcjkj6tn4ubfpjpk56.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3008/auth/google/callback",
    },
    function (req, accessToken, refreshToken, profile, done) {
      //token = jwt.sign();
      userProfile = profile;
      return done(null, userProfile);
    }
  )
);

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/error" }),
  function (req, res) {
    res.redirect("/success");
  }
);

// Middleware to generate JWT
/*function generateToken(email) {
  const payload = {
    email: email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    issuer: "http://localhost:3000/",
    audience: "http://localhost:3000/",
  };
  const token = jwt.sign(payload, secret);
  return token;
}
app.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await client.getToken(code);
    const idToken = tokens.id_token;
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;
    const token = generateToken(email);
    res.redirect(`/success?token=${token}`);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});


/*app.get("/auth/logout", (req, res) => {
  req.session.destroy();
  return res.redirect("/");
});*/
module.exports = app;
