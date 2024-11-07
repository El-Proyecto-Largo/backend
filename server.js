// ANCHOR Imports

// Environment config
require("dotenv").config();

// External dependencies
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
app.use(bodyParser.json());

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

// ANCHOR Login
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

    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(200).json({
      token,
      userId: user._id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    return res.status(500).json({ error: "server error while tryna login" });
  }
});

// ANCHOR Create Post
app.post("/api/createpost", authToken, async (req, res) => {
  // incoming: title, body, image, latitude, longitude, authorId, tags
  // outgoing: error

  const { title, body, image, latitude, longitude, tags } = req.body;

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
    const result = db.collection("Posts").insertOne(newPost);
  } catch (e) {
    error = e.toString();
  }

  // add catch for format mismatch

  let ret = {};
  res.status(200).json(ret);
});

// ANCHOR Create Reply
app.post("/api/createreply", authToken, async (req, res) => {
  // incoming: title, body, image, authorId, originalPostId
  // outgoing: error

  const { title, body, image, originalPostId } = req.body;

  const newPost = {
    title: title,
    body: body,
    image: image,
    authorId: req.user.userId,
    replyTo: new ObjectId(originalPostId),
    createdAt: new Date(),
  };

  try {
    const result = db.collection("Posts").insertOne(newPost);
  } catch (e) {
    error = e.toString();
  }

  // add catch for format mismatch

  let ret = {};
  res.status(200).json(ret);
});

// ANCHOR Search Posts
app.post("/api/searchposts", async (req, res) => {
  // incoming: title, body, authorId, tags
  // outgoing: title, body, image, latitude, longitude, authorId, tags
  // Partial matching w/ regex

  let error = "";

  const { title, body, authorId, tags } = req.body;

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

  if (tags.length > 0) {
    results = resultsBody.concat(resultsTags);
  } else {
    results = resultsBody;
  }

  let outPostId = -1;
  let outId = -1;
  let outTitle = "";
  let outBody = "";
  let outImage = -1;
  let outLat = -1;
  let outLong = -1;
  let outTags = -1;

  let ret = [];

  for (let i = 0; i < results.length; i++) {
    outPostId = results[i]._id;
    outId = results[i].authorId;
    outTitle = results[i].title;
    outBody = results[i].body;
    outImage = results[i].image;
    outLat = results[i].latitude;
    outLong = results[i].longitude;
    outTags = results[i].tags;

    ret.push({
      _id: outPostId,
      title: outTitle,
      body: outBody,
      image: outImage,
      latitude: outLat,
      authorId: outId,
      longitude: outLong,
      tags: outTags,
    });
  }

  res.status(200).json(ret);
});

// ANCHOR Get Local Posts
app.post("/api/getlocalposts", async (req, res) => {
  // incoming: latitude, longitude, distance
  // outgoing: id, title, body, image, latitude, longitude, authorId, tags
  // returns array of posts within distance of latitude and longitude

  let error = "";

  const { latitude, longitude, distance } = req.body;

  const results = await db
    .collection("Posts")
    .find({})
    .sort([["_id", -1]])
    .toArray();

  let outPostId = -1;
  let outId = -1;
  let outTitle = "";
  let outBody = "";
  let outImage = -1;
  let outLat = -1;
  let outLong = -1;
  let outTags = -1;

  let ret = [];

  for (let i = 0; i < results.length; i++) {
    let calcDistance = Math.sqrt(
      (results[i].latitude - latitude) ** 2 +
        (results[i].longitude - longitude) ** 2
    );

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

  res.status(200).json(ret);
});

// ANCHOR Get Replies
app.get("/api/posts/:_id/getreplies", async (req, res) => {
  // incoming: replyTo (string)
  // outgoing: _id, authorId, body, image
  // returns array of replies to the given post

  console.log("replies hit at " + new Date);

  const postId = req.params._id;
  const results = await db.collection('Posts').find({ "replyTo": new ObjectId(postId) }).sort([["_id"]]).toArray();

  let outAuthorId = -1;
  let outId = -1;
  let outBody = '';
  let outImage = -1;

  let ret = [];

  for (let i = 0; i < results.length; i++) {
    // if (results[i].replyTo != originId)
    //   continue;

    outId = results[i]._id;
    outAuthorId = results[i].authorId;
    outBody = results[i].body;
    outImage = results[i].image;

    ret.push({ _id: outId, authorId: outAuthorId, body: outBody, image: outImage });
  }
  
  res.status(200).json(ret);
});

// ANCHOR Update Post
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

    return res.status(200).json({});
  } catch (error) {
    return res.status(500).json({ error: "Failure to update a post" });
  }
});

// ANCHOR Update Reply
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
      return res.status(404).json({ error: "Post not found :(" });
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

    return res.status(200).json({});
  } catch (error) {
    return res.status(500).json({ error: "Failure to update a post" });
  }
});

// ANCHOR Delete Post
app.delete("/api/deletepost/:_id", authToken, async (req, res) => {
  // incoming: post Id
  // outgoing: success or error

  try {
    const db = client.db("Overcastly");
    let _id = req.params._id;

    const foundPost = await db
      .collection("Posts")
      .findOne({ _id: new ObjectId(_id) });

    if (!foundPost) {
      return res
        .status(404)
        .json({ error: "cant delete a post that doesnt exist" });
    }

    // check if logged in user is author of post
    if (foundPost.authorId.toString() !== req.user.userId.toString()) {
      return res
        .status(403)
        .json({ error: "that aint yo post bruh u cant delete that" });
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
        .json({ error: "Could not delete - post does not exist" });
    }

    return res.status(200).json({ message: "Post successfully deleted" });
  } catch (e) {
    return res.status(500).json({ error: "Failed to delete post" });
  }
});

// ANCHOR Register User
app.post("/api/registeruser", async (req, res) => {
  // incoming: username, password, firstName, lastName, email
  // outgoing: error

  const { username, password, firstName, lastName, email } = req.body;

  if (!username || !password || !firstName || !lastName || !email) {
    return res.status(400).json({ error: "Missing some registerfields :((" });
  }

  try {
    const existingUser = await db.collection("Users").findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      const error =
        existingUser.username === username
          ? "username already exists!"
          : "email has already been registered to an account......";

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

// ANCHOR Get Post
app.get("/api/posts/:_id", async (req, res) => {
  // incoming: post ObjectId (used in url)
  // outgoing: id, title, body, image, latitude, longitude, authorId, tags
  try {
    const postId = req.params._id;
    const results = await db
      .collection("Posts")
      .find({ _id: new ObjectId(postId) })
      .toArray();

    res.status(200).json(results);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "ummmmmmmmmmm couldnt get post" });
  }
});

// ANCHOR Get User
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

    const { firstName, lastName, email } = req.body;

    if (!firstName && !lastName && !email) {
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

    if (firstName) {
      updatedFields.firstName = firstName;
    }

    if (lastName) {
      updatedFields.lastName = lastName;
    }

    if (email) {
      updatedFields.email = email;
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
      .json({ error: "couldnt update that user wtf hapepnd" });
  }
});

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
//           throw new Error("Failed to delete user");
//         }
//       });

//       return res.status(200).json({
//         message: "BOOM! Account and all related content deleted!",
//       });
//     } finally {
//       await session.endSession();
//     }
//   } catch (e) {
//     console.error("Delete error:", e);
//     return res
//       .status(500)
//       .json({ error: "Couldnt delete that user idk why..." });
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