let express = require("express");
let router = express.Router();
let mongoose = require("mongoose");
let passport = require("passport");

//create user model instance
let userModel = require("../models/user");
let User = userModel.User; // alias

/////////////////////////////////////////////////////////////////////////////////////

require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const AccessToken = require("twilio").jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

// create the twilioClient
const twilioClient = require("twilio")(
  process.env.TWILIO_API_KEY_SID,
  process.env.TWILIO_API_KEY_SECRET,
  { accountSid: process.env.TWILIO_ACCOUNT_SID }
);

const findOrCreateRoom = async (roomName) => {
  try {
    // see if the room exists already. If it doesn't, this will throw
    // error 20404.
    const room = await twilioClient.video.rooms(roomName).fetch();
    console.log("already existing room:");
    console.log(room);
  } catch (error) {
    // the room was not found, so create it
    if (error.code == 20404) {
      const room = await twilioClient.video.rooms.create({
        uniqueName: roomName,
        type: "go",
      });
      console.log("newly created room:");
      console.log(room);
    } else {
      // let other errors bubble up
      throw error;
    }
  }
};

const getAccessToken = (roomName) => {
  // create an access token
  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY_SID,
    process.env.TWILIO_API_KEY_SECRET,
    // generate a random unique identity for this participant
    { identity: uuidv4() }
  );
  // create a video grant for this specific room
  const videoGrant = new VideoGrant({
    room: roomName,
  });

  // add the video grant
  token.addGrant(videoGrant);
  // serialize the token and return it
  return token.toJwt();
};

module.exports.displayHomePage = (req, res, next) => {
  res.render("index", {
    title: "Home",
    displayName: req.user ? req.user.displayName : "",
  });
};

module.exports.processHomePage = async (req, res, next) => {
  // return 400 if the request has an empty body or no roomName
  if (!req.body || !req.body.roomName) {
    return res.status(400).send("Must include roomName argument.");
  }
  const roomName = req.body.roomName;
  // find or create a room with the given roomName
  findOrCreateRoom(roomName);
  // generate an Access Token for a participant in this room
  const token = getAccessToken(roomName);
  res.send({
    token: token,
  });

  //res.render('index', {title: 'Home', displayName: req.user ? req.user.displayName : ''});
};

/////////////////////////////////////////////////////////////////////////////////////

module.exports.displayLoginPage = (req, res, next) => {
  // check if user is not already loged in
  if (!req.user) {
    res.render("auth/login", {
      title: "Login",
      messages: req.flash("loginMessage"),
      displayName: req.user ? req.user.displayName : "",
    });
  } else {
    res.redirect("/");
  }
};

module.exports.processLoginPage = (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    //if server err?
    if (err) {
      return next(err);
    }

    //is there a user login error?
    if (!user) {
      req.flash("loginMessage", "Authentication Error");
      return res.redirect("/login");
    }

    req.login(user, (err) => {
      // server error?
      if (err) {
        return next(err);
      }
      return res.redirect("/");
    });
  })(req, res, next);
};

module.exports.displayRegisterPage = (req, res, next) => {
  // check if user is not already loged in
  if (!req.user) {
    res.render("auth/register", {
      title: "Register",
      messages: req.flash("registerMessage"),
      displayName: req.user ? req.user.displayName : "",
    });
  } else {
    res.redirect("/");
  }
};

module.exports.processRegisterPage = (req, res, next) => {
  // instantiate a user object
  let newUser = new User({
    username: req.body.username,
    //password: req.body.password
    email: req.body.email,
    displayName: req.body.displayName,
  });

  User.register(newUser, req.body.password, (err) => {
    if (err) {
      console.log("Error: Inserting new user");
      if (err.name == "UserExistsError") {
        req.flash(
          "registerMessage",
          "Registration Error: User Already Exists!"
        );
        console.log("Error: User Already Exists!");
      }
      return res.render("auth/register", {
        title: "Register",
        messages: req.flash("registerMessage"),
        displayName: req.user ? req.user.displayName : "",
      });
    } else {
      // if no error exists, then  registration is successful

      // redirect the user and authenticate

      return passport.authenticate("local")(req, res, () => {
        res.redirect("/");
      });
    }
  });
};

module.exports.performLogout = (req, res, next) => {
  req.logout();
  res.redirect("/");
};

module.exports.displayUpdateProfilePage = (req, res, next) => {
  // check if user is not already logged in
  if (!req.user) {
    res.render("auth/register", {
      title: "Register",
      messages: req.flash("registerMessage"),
      displayName: req.user ? req.user.displayName : "",
    });
  } else {
    res.render("auth/updateProfile", {
      title: "Update Your Profile",
      messages: req.flash("updateMessage"),
      displayName: req.user ? req.user.displayName : "",
      user: req.user,
    });
  }
};

module.exports.processUpdateProfilePage = (req, res, next) => {
  let userId = req.user._id;

  User.remove({ _id: userId }, (err) => {
    if (err) {
      console.log(err);
      res.end(err);
    } else {
      let updatedUser = User({
        _id: userId,
        username: req.body.username,
        email: req.body.email,
        displayName: req.body.displayName,
      });

      User.register(updatedUser, req.body.password, (err) => {
        if (err) {
          console.log("Error: Inserting new user");
          if (err.name == "UserExistsError") {
            req.flash(
              "registerMessage",
              "Registration Error: User Already Exists!"
            );
            console.log("Error: User Already Exists!");
          }
          return res.render("auth/register", {
            title: "Register",
            messages: req.flash("registerMessage"),
            displayName: req.user ? req.user.displayName : "",
          });
        } else {
          // if no error exists, then  registration is successful

          // redirect the user and authenticate

          return passport.authenticate("local")(req, res, () => {
            res.redirect("/");
          });
        }
      });
    }
  });
};
