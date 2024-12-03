// ANCHOR Imports

// Environment config
require("dotenv").config();

// External dependencies
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const postmark = require("postmark");

// Database
const { MongoClient, ObjectId } = require("mongodb");
const url = process.env.DB_URL;
const client = new MongoClient(url);
client.connect();
const db = client.db("Overcastly");

// Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json( { limit: '8mb' } ));

// Consts
const JWT_SECRET = process.env.JWT_SECRET || "jwt-secret-fallback-pls-make-sure-env-has-it";

// verify jwt token (middleware)
const authToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "authentication failed wtf" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ error: "ur token don't worky (is it expired??)" });
    }

    req.user = user;
    next();
  });
};

// ANCHOR Authenticate
// Codes:
//  200 (authenticated)
//  401 (authentication fails)
//  403 (invalid token)
app.get("/api/authenticate", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication failed" });
  }

  jwt.verify(token, JWT_SECRET, (err) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }
    else {
      return res.status(200).json({ message: "Successfully authenticated"} )
    }
  });
})

// ANCHOR Login
// Codes:
//  200 (user logged in)
//  400 (missing input fields)
//  401 (invalid inputs)
//  500 (generic error)
app.post("/api/login", async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res
      .status(400)
      .json({ error: "not all login fields were filled in vro" });
  }

  // user can provide username or email
  try {
    const user = await db.collection("Users").findOne({
      $or: [{ username: login }, { email: login }],
    });

    if (!user) {
      return res.status(401).json({ error: "invalid credz" });
    }

    const checkPassword = await bcrypt.compare(password, user.password);

    if (!checkPassword) {
      return res.status(401).json({ error: "invalid credz" });
    }

    if (user.hasOwnProperty('active') && user.active == false) {
      return res.status(401).json({
        userId: user._id,
        active: false,
        error: "user has not yet been activated"
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      token,
      userId: user._id,
      active: true,
      // username: user.username,
      // email: user.email,
      message: "User logged in",
    });
  } catch (error) {
    return res.status(500).json({ error: "server error while tryna login" });
  }
});

// ANCHOR (P) Create Post
// Codes:
//  201 (post created)
//  400 (missing input fields)
//  500 (generic error)
//
app.post("/api/createpost", authToken, async (req, res) => {
  // incoming: title, body, image, latitude, longitude, authorId, tags
  // outgoing: error

  const { title, body, image, latitude, longitude, tags } = req.body;

  // Check that necessary fields are present
  if (!title || !body || !latitude || !longitude)  {
    return res.status(400).json({ error: "Not all necessary fields are present" });
  }

  // Fetch info for a new post
  const newPost = {
    title: title,
    body: body,
    image: image,
    latitude: latitude,
    authorId: req.user.userId, // grabbing it from user auth
    longitude: longitude,
    tags: tags,
    createdAt: new Date(), // might be useful : )
  };

  try {
    const result = await db.collection("Posts").insertOne(newPost);
    return res.status(201).json({ postId: result["insertedId"] });
  } catch (error) {
    return res.status(500).json( {error: "Could not make this post" });
  }
});

// ANCHOR (R) Create Reply
// Codes:
//  201 (reply created)
//  400 (missing input fields)
//  500 (generic error)
//
app.post("/api/createreply", authToken, async (req, res) => {
  // incoming: body, image, authorId, originalPostId
  // outgoing: error

  const { body, image, originalPostId } = req.body;

  // Check that necessary fields are present
  if (!body || !originalPostId)  {
    return res.status(400).json({ error: "Not all necessary fields are present" });
  }
  
  // Fetch info for a new post
  const newPost = {
    body: body,
    image: image,
    authorId: new ObjectId(req.user.userId),
    replyTo: new ObjectId(originalPostId),
    createdAt: new Date(),
  };

  try {
    const result = db.collection("Posts").insertOne(newPost);
    return res.status(201).json({ message: "Reply successfully created" });
  } catch (e) {
    return res.status(500).json({ error: "Reply could not be made" });
  }
});

// ANCHOR (P/R) Search Posts
// Codes:
//  200 (no error)
//  500 (generic error)
//
app.post("/api/searchposts", async (req, res) => {
  // incoming: title, body, authorId, tags
  // outgoing: title, body, image, latitude, longitude, authorId, tags
  // Partial matching w/ regex

  const { title, body, authorId, tags } = req.body;

  try {
    let results = [];
    const resultsBody = await db
      .collection("Posts")
      .find({
        $or: [
          { title: { $regex: title.trim() + ".*", $options: "i" } },
          { body: { $regex: body.trim() + ".*", $options: "i" } },
          { authorId: authorId },
        ],
      })
      .toArray();

    const resultsTags = await db
      .collection("Posts")
      .find({ tags: tags })
      .toArray();

    // Match the tags up
    if (tags.length > 0) {
      results = resultsBody.concat(resultsTags);
    } else {
      results = resultsBody;
    }

    let ret = [];

    // Push all matches to the output
    for (let i = 0; i < results.length; i++) {
      ret.push(results[i]);
    }

    return res.status(200).json(ret);
  } catch (error) {
    return res.status(500).json({ error: "Failed to search for posts and/or replies" });
  }
});

// ANCHOR (P/R) Generalized Post Search
// Codes:
//  200 (no error)
//  500 (generic error)
//
app.post("/api/generalsearchposts", async (req, res) => {
  // incoming: search
  // outgoing: title, body, image, latitude, longitude, authorId, tags
  // Partial matching w/ regex

  const { search } = req.body;

  try {
    const resultsBody = await db
      .collection("Posts")
      .find({
        $or: [
          { title: { $regex: search.trim() + ".*", $options: "i" } },
          // { body: { $regex: search.trim() + ".*", $options: "i" } }
        ],
      })
      .toArray();

    return res.status(200).json(resultsBody);
  } catch (error) {
    return res.status(500).json({ error: "Failed to search for posts and/or replies" });
  }
});

// ANCHOR (P) Get Local Posts
// Codes:
//  200 (local posts found)
//  400 (input fields missing)
//  500 (generic error)
//
app.post("/api/getlocalposts", async (req, res) => {
  // incoming: latitude, longitude, distance
  // outgoing: id, title, body, image, latitude, longitude, authorId, tags
  // returns array of posts within distance of latitude and longitude

  const { latitude, longitude, distance } = req.body;

  // Make sure lat/long and distance are all present
  if (!latitude || !longitude || !distance) {
    return res.status(400).json({error: "Not all necessary fields are present"});
  }

  try {
    // Get all posts
    const results = await db
      .collection("Posts")
      .find({})
      .sort([["_id", -1]])
      .toArray();

    let ret = [];

    // Iterate through all posts
    for (let i = 0; i < results.length; i++) {

      // Calculate distance for endpoint
      let calcDistance = Math.sqrt(
        (results[i].latitude - latitude) ** 2 +
          (results[i].longitude - longitude) ** 2
      );

      // If it's too far or doesn't have the necessary fields, skip
      if (
        calcDistance > distance ||
        !(
          results[i].hasOwnProperty("latitude") &&
          results[i].hasOwnProperty("longitude")
        )
      )
        continue;
      
      ret.push({ ...results[i] });
    }

    return res.status(200).json(ret);
  } catch (error) {
    return res.status(500).json({error: "Could not get local posts"});
  }
});

// ANCHOR (P) Get Pin GeoJSON
// Codes:
//  200 (pins found)
//  400 (missing inputs)
//  500 (generic error)
//
app.get("/api/getpins", async (req, res) => {
  // incoming: latitude, longitude, distance
  // outgoing: id, title, body, image, latitude, longitude, authorId, tags
  // returns array of posts within distance of latitude and longitude

  try {
    // Fetch posts
    const results = await db
      .collection("Posts")
      .find({})
      .sort([["_id", -1]])
      .toArray();

    // Stack for elements
    let features = [];

    // Iterate through all posts
    for (let i = 0; i < results.length; i++) {

      // Make sure we have lat/long data for this post
      if (
        !(
          results[i].hasOwnProperty("latitude") &&
          results[i].hasOwnProperty("longitude")
        )
      )
        continue;

      // Populate generic structure of GeoJSON
      let newFeature = new Object();
      newFeature.type = "Feature"
      newFeature.geometry = new Object();
      newFeature.properties = new Object();

      // Populate geometry
      newFeature.geometry.type = "Point";
      newFeature.geometry.coordinates = [results[i].longitude, results[i].latitude];

      // Populate properties 
      newFeature.properties.id = results[i]._id;
      newFeature.properties.title = results[i].title;
      newFeature.properties.body = results[i].body;
      newFeature.properties.author = results[i].authorId;
      
      // Push all the content associated 
      features.push({ ...newFeature });
    }

    const geoJSON = {
      "type": "FeatureCollection",
      "features": features
    }

    return res.status(200).json(geoJSON);
  } catch (error) {
    return res.status(500).json({error: "Could not get pins"});
  }
});

// ANCHOR (P/R) Get Post
// Codes:
//  200 (post or reply found)
//  404 (post or reply matching ID not found)
//  500 (generic error)
//
app.get("/api/posts/:_id", async (req, res) => {
  // incoming: post ObjectId (used in url)
  // outgoing: id, title, body, image, latitude, longitude, authorId, tags
  try {
    // Fetch posts matching the id
    const postId = req.params._id;
    const results = await db.collection("Posts").find({ _id: new ObjectId(postId) }).toArray();

    // If not found, return 404
    if (results.length == 0)
    {
      return res.status(404).json({ error: "Post or reply not found" });
    }

    // Post found! Return it.
    return res.status(200).json(results[0]);
  } catch (error) {
    return res.status(500).json({ error: "Couldn't get post or reply"});
  }
});

// ANCHOR (R) Get Replies
// Codes:
//  200 (replies found)
//  204 (no replies found)
//  404 (original post not found)
//  500 (generic error)
//
app.get("/api/posts/:_id/getreplies", async (req, res) => {
  // incoming: replyTo (string)
  // outgoing: _id, authorId, body, image
  // returns array of replies to the given post

  try {
    const postId = req.params._id;

    // Ensure the post exists
    const foundPost = await db.collection("Posts").findOne({ _id: new ObjectId(postId) });

    if (!foundPost) {
      return res.status(404).json({ error: "No original post found: cannot get replies" });
    }

    // Get all replies to the post, if it exists
    const results = await db.collection('Posts').find({ "replyTo": new ObjectId(postId) }).sort([["_id"]]).toArray();

    let ret = [];
    
    for (let i = 0; i < results.length; i++) {
      // Fetch all reply components
      let outId = results[i]._id;
      let outAuthorId = results[i].authorId;
      let outBody = results[i].body;
      let outImage = results[i].image;

      // Push to the output
      ret.push({ _id: outId, authorId: outAuthorId, body: outBody, image: outImage });
    }
    
    return res.status(200).json(ret);
  } catch(error) {
    return res.status(500).json({ error: "Failed to get replies for post" });
  }
});

// ANCHOR (P) Update Post
// Codes:
//  200 (post updated)
//  400 (missing input fields)
//  403 (ownership error)
//  404 (post not found)
//  500 (generic error)
//
app.put("/api/updatepost/:_id", authToken, async (req, res) => {
  // /:_id
  // incoming: new post data
  // outgoing: success or error

  try {
    const db = client.db("Overcastly");
    let _id = req.params._id;

    const { title, body, image, latitude, longitude, tags } = req.body;

    if (!title && !body && !image && !latitude && !longitude && !tags) {
      return res.status(400).json({ error: "No fields provided :(" });
    }

    let readPost = await db
      .collection("Posts")
      .findOne({ _id: new ObjectId(_id) });
    if (!readPost) {
      return res.status(404).json({ error: "Post not found :(" });
    }

    // check if logged in user is author of post
    if (readPost.authorId.toString() !== req.user.userId.toString()) {
      return res
        .status(403)
        .json({ error: "that aint yo post bruh u cant edit that" });
    }

    const result = await db.collection("Posts").updateOne(
      { _id: new ObjectId(_id) },
      {
        $set: {
          ...req.body,
          updatedAt: new Date(),
        },
      }
    );

    return res.status(200).json({ message: "Post updated" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update post" });
  }
});

// ANCHOR (R) Update Reply
// Codes:
//  200 (reply updated)
//  400 (missing input fields)
//  403 (ownership error)
//  404 (reply not found)
//  500 (generic error)
//
app.put("/api/updatereply/:_id", authToken, async (req, res) => {
  // /:_id
  // incoming: new reply data
  // outgoing: success or error

  try {
    const db = client.db("Overcastly");
    let _id = req.params._id;

    const { title, body, image } = req.body;

    if (!title && !body && !image) {
      return res.status(400).json({ error: "No fields provided :(" });
    }

    let readPost = await db.collection("Posts").findOne({
      _id: new ObjectId(_id),
      replyTo: { $exists: true }, // verify it's a reply and not its own post
    });

    if (!readPost) {
      return res.status(404).json({ error: "Reply not found :(" });
    }

    if (readPost.authorId.toString() !== req.user.userId.toString()) {
      return res
        .status(403)
        .json({ error: "you cant update a reply that isnt yours silly" });
    }

    const updateFields = {
      ...(title && { title }),
      ...(body && { body }),
      ...(image && { image }),
      updatedAt: new Date(),
    };

    const result = await db
      .collection("Posts")
      .updateOne({ _id: new ObjectId(_id) }, { $set: updateFields });

    return res.status(200).json({ message: "Reply updated" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update reply" });
  }
});

// ANCHOR (P/R) Delete Post
// Codes:
//  204 (post or reply deleted)
//  403 (ownership error)
//  404 (post or reply not found) x2
//  500 (generic error)
//
app.delete("/api/deletepost/:_id", authToken, async (req, res) => {
  // incoming: post Id
  // outgoing: success or error

  // Pablo - why are there two spots that can trigger a 404?

  try {
    const db = client.db("Overcastly");
    let _id = req.params._id;

    const foundPost = await db
      .collection("Posts")
      .findOne({ _id: new ObjectId(_id) });

    if (!foundPost) {
      return res
        .status(404)
        .json({ error: "cant delete a post or reply that doesnt exist" });
    }

    // check if logged in user is author of post
    if (foundPost.authorId.toString() !== req.user.userId.toString()) {
      return res
        .status(403)
        .json({ error: "that aint yo post or reply bruh u cant delete that" });
    }

    // delete replies
    await db.collection("Posts").deleteMany({ replyTo: new ObjectId(_id) });
    // delete original post
    let delResult = await db
      .collection("Posts")
      .deleteOne({ _id: new ObjectId(_id) });

    if (delResult.deletedCount === 0) {
      return res
        .status(404)
        .json({ error: "Could not delete - post or reply does not exist" });
    }

    return res.status(204).json({ message: "Post or reply deleted" });
  } catch (e) {
    return res.status(500).json({ error: "Failed to delete post or reply" });
  }
});

// ANCHOR Register User (Deprecated)
// Codes:
//  201 (user registered)
//  400 (missing input fields)
//  409 (username or email already used)
//  500 (generic error)
app.post("/api/registeruser", async (req, res) => {
  // incoming: username, password, firstName, lastName, email
  // outgoing: error

  const { username, password, firstName, lastName, email } = req.body;

  if (!username || !password || !firstName || !lastName || !email) {
    return res.status(400).json({ error: "Missing some register fields :((" });
  }

  try {
    const existingUser = await db.collection("Users").findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      const error =
        existingUser.username === username
          ? "username already exists!"
          : "email has already been registered to an account";

      return res.status(409).json({ error });
    }

    const hashedPasswd = await bcrypt.hash(password, 10);

    const newUser = {
      username,
      password: hashedPasswd,
      firstName,
      lastName,
      email,
    };

    await db.collection("Users").insertOne(newUser);

    return res
      .status(201)
      .json({ message: "User registered successfully >W<" });
  } catch (e) {
    return res.status(500).json({ error: "A servar ewwow happend ;(" });
  }
});

// ANCHOR Begin User Registration
// Codes:
//  201 (user registered)
//  400 (missing input fields)
//  409 (username or email already used)
//  500 (generic error)
app.post("/api/initialregisteruser", async (req, res) => {
  // incoming: username, password, firstName, lastName, email
  // outgoing: error

  const { username, password, firstName, lastName, email } = req.body;

  if (!username || !password || !firstName || !lastName || !email) {
    return res.status(400).json({ error: "Missing some register fields" });
  }

  try {
    const existingUser = await db.collection("Users").findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      const error =
        existingUser.username === username
          ? "username already exists!"
          : "email has already been registered to an account";

      return res.status(409).json({ error });
    }

    const hashedPasswd = await bcrypt.hash(password, 10);

    const userPin = Math.floor(Math.random() * 9999);
    
    const newUser = {
      username,
      password: hashedPasswd,
      firstName,
      lastName,
      email,
      active: false,
      userPin
    };

    let userVerification = await db.collection("Users").insertOne(newUser);

    delete userVerification.acknowledged;

    userVerification.pin = userPin;

    // Email generation - pending approval for updated keys

    // var client = new postmark.ServerClient(POSTMARK_KEY);

    // client.sendEmail({
    //   "From": "Overcastly@ucf.edu",
    //   "To": "ian.justiz@ucf.edu",
    //   "Subject": "Postmark Test",
    //   "TextBody": "Hello IAN!!"
    // });
  
    return res
      .status(201)
      .json(userVerification);

  } catch (e) {
    return res.status(500).json({ error: "A servar ewwow happend ;(" });
  }
});

// ANCHOR Complete User Registration
// Codes:
//  200 (user registration complete)
//  400 (missing input fields)
//  403 (incorrect PIN given)
//  404 (user not found)
//  409 (user already registered)
//  500 (generic error)
app.post("/api/completeregisteruser/:_id", async (req, res) => {
  // incoming: userPin, id
  // outgoing: error

  const { userPin } = req.body;

  let _id = req.params._id;

  // Verify necessary fields are provided
  if (!userPin || !_id) {
    return res.status(400).json({ error: "No user verification pin or ID provided" });
  }

  try {
    // Fetch the user, verify they exist
    let readUser = await db
    .collection("Users")
    .findOne({ _id: new ObjectId(_id) });

    if (!readUser) {
      return res.status(404).json({ error: "No user found with the given ID" });
    }

    // Active users cannot be activated again
    if (readUser.active == true)
    {
      return res
      .status(409)
      .json({ error: "This user is already registered" });
    }

    // Check for users without a PIN field
    if (!readUser.userPin) {
      const result = await db.collection("Users").updateOne(
        { _id: new ObjectId(_id) }, // searching for a specific id syntax
        {
          $set: {active:true}
        });

      return res
      .status(200)
      .json({ message: "User registration succesfully completed - no PIN field present" });
    }

    // If provided PIN is correct, try to register the user
    if (userPin == readUser.userPin)
    {
      // Try to delete the PIN field
      const result = await db.collection("Users").updateOne(
        { _id: new ObjectId(_id) }, // searching for a specific id syntax
        {
          $unset: {userPin:''},
          $set: {active:true}
        });

      return res
      .status(200)
      .json({ message: "User registration succesfully completed" });
    }

    // If we made it here, the PIN is incorrect
    return res
    .status(403)
    .json({ error: "Incorrect PIN provided" });
  

  } catch (e) {
    return res.status(500).json({ error: "A servar ewwow happend ;(" });
  }
});

// ANCHOR Get User
// Codes:
//  200 (user found)
//  404 (user not found)
//  500 (generic error)
app.get("/api/users/:_id", async (req, res) => {
  // incoming: user Id
  // outgoing: user info

  try {
    let _id = req.params._id;

    let readUser = await db
      .collection("Users")
      .findOne({ _id: new ObjectId(_id) });

    if (!readUser) {
      return res.status(404).json({ error: "User not found :(" });
    }

    delete readUser.password;

    return res.status(200).json(readUser);
  } catch (e) {
    return res.status(500).json({ error: "couldnt fetch user details wtf!!" });
  }
});

// ANCHOR Update User
// Codes:
//  200 (user updated)
//  400 (missing or incorrect fields)
//  403 (ownership error)
//  404 (user not found)
//  500 (generic error)
app.put("/api/updateuser/:_id", authToken, async (req, res) => {
  // incoming: new user data
  // outgoing: success or error

  try {
    let _id = req.params._id;

    if (_id !== req.user.userId.toString()) {
      return res
        .status(403)
        .json({ error: "you cant update a profile that isnt yours >:(" });
    }

    const { username, firstName, lastName, email, image } = req.body;

    if (!firstName && !lastName && !email && !username) {
      return res
        .status(400)
        .json({ error: "you need to provide a field to update bruh" });
    }

    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: "bro yo email format fricked up" });
    }

    let readUser = await db
      .collection("Users")
      .findOne({ _id: new ObjectId(_id) });

    if (!readUser) {
      return res.status(404).json({ error: "User not found :(" });
    }

    const updatedFields = {};

    if (username) {
      updatedFields.username = username;
    }

    if (firstName) {
      updatedFields.firstName = firstName;
    }

    if (lastName) {
      updatedFields.lastName = lastName;
    }

    if (email) {
      updatedFields.email = email;
    }

    if (image) {
      updatedFields.image = image;
    }

    const result = await db.collection("Users").updateOne(
      { _id: new ObjectId(_id) }, // searching for a specific id syntax
      {
        $set: updatedFields,
      }
    );

    return res.status(200).json({ message: "updated dat user x3" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "couldnt update user wtf hapepnd" });
  }
});

// ANCHOR Delete User
// Codes:
//  204 (user deleted)
//  400 (missing required input)
//  401 (incorrect required input)
//  403 (ownership error)
//  404 (user not found)
//  500 (generic error)
// ANCHOR Delete User
// app.delete("/api/deleteuser/:_id", authToken, async (req, res) => {
//   // incoming: user Id
//   // outgoing: success or error

//   try {
//     let _id = req.params._id;

//     if (_id !== req.user.userId.toString()) {
//       return res
//         .status(403)
//         .json({ error: "can only delete your own account" });
//     }

//     const { password } = req.body;
//     if (!password) {
//       return res
//         .status(400)
//         .json({ error: "confirm password for account deletion" });
//     }

//     const user = await db
//       .collection("Users")
//       .findOne({ _id: new ObjectId(_id) });

//     if (!user) {
//       return res.status(404).json({ error: "user not found :(" });
//     }

//     const checkPassword = await bcrypt.compare(password, user.password);
//     if (!checkPassword) {
//       return res.status(401).json({ error: "password is wrong" });
//     }

//     // duro mongodb "atomic session" tek.....hoooly f*ck (protected environment)
//     const session = client.startSession();

//     try {
//       await session.withTransaction(async () => {
//         // fetch all DU's posts
//         const userPosts = await db
//           .collection("Posts")
//           .find({
//             authorId: _id,
//           })
//           .toArray();

//         // Get IDs of DU's posts
//         const userPostIds = userPosts.map((post) => new ObjectId(post._id));

//         for (const postId of userPostIds) {
//           await deleteReplyChain(postId, session);
//         }

//         await db.collection("Posts").deleteMany(
//           {
//             _id: { $in: userPostIds },
//           },
//           { session }
//         );

//         const userReplies = await db
//           .collection("Posts")
//           .find({
//             authorId: _id,
//             replyTo: { $exists: true },
//           })
//           .toArray();

//         for (const reply of userReplies) {
//           await deleteReplyChain(reply._id, session);
//         }
//         const delResult = await db.collection("Users").deleteOne(
//           {
//             _id: new ObjectId(_id),
//           },
//           { session }
//         );

//         if (delResult.deletedCount === 0) {
//           throw new Error();
//         }
//       });

//       return res.status(204).json({
//         message: "BOOM! Account and all related content deleted!",
//       });
//     } finally {
//       await session.endSession();
//     }
//   } catch (e) {
//     console.error("Delete error:", e);
//     return res
//       .status(500)
//       .json({ error: "Couldnt delete user idk why..." });
//   }
// });

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
  );
  next();
});

app.listen(5000); // start Node + Express server on port 5000