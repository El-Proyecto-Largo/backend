const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const e = require('express');
const MongoClient = require('mongodb').MongoClient;
require('dotenv').config()

const url = process.env.DB_URL;
const client = new MongoClient(url);
client.connect();

const app = express();
app.use(cors());
app.use(bodyParser.json());



app.post('/api/makepost', async (req, res, next) => {
  // incoming: title, body, image, latitude, longitude, authorId, tags
  // outgoing: error

  const { title, body, image, latitude, authorId, longitude, tags } = req.body;

  const newPost = { title: title, body: body, image: image, latitude: latitude, authorId: authorId, longitude: longitude, tags: tags };
  var error = '';

  try
  {
    const db = client.db('Overcastly');
    const result = db.collection('Posts').insertOne(newPost);
  }
  catch (e)
  {
    error = e.toString();
  }

  // add catch for format mismatch

  var ret = { error: error };
  res.status(200).json(ret);
});


app.post('/api/searchposts', async (req, res, next) => {
  // incoming: title, body, authorId, tags
  // outgoing: title, body, image, latitude, longitude, authorId, tags
  // Partial matching w/ regex

  var error = '';

  const { title, body, authorId, tags } = req.body;

  const db = client.db('Overcastly');
  var results = [];
  const resultsBody = await db.collection('Posts').find({ $or: [{title: { $regex: title.trim() + '.*', $options: 'i' }},
              {body: { $regex: body.trim() + '.*', $options: 'i' }}, { authorId : authorId }] }).toArray();

  const resultsTags = await db.collection('Posts').find({ tags : tags }).toArray();

  if (tags.length > 0)
  {
    results = resultsBody.concat(resultsTags);
  }
  else
  {
    results = resultsBody;
  }

  var outId = -1;
  var outTitle = '';
  var outBody = '';
  var outImage = -1;
  var outLat = -1;
  var outLong = -1;
  var outTags = -1;

  var ret = [];

  for (let i = 0; i < results.length; i++)
    {
      outId = results[i].authorId;
      outTitle = results[i].title;
      outBody = results[i].body;
      outImage = results[i].image;
      outLat = results[i].latitude;
      outLong = results[i].longitude;
      outTags = results[i].tags;
  
      ret.push({ title: outTitle, body: outBody, image: outImage, latitude: outLat, authorId: outId, longitude: outLong, tags: outTags, error: '' });
    }

  if (results.length == 0)
  {
    var ret = { error: 'No matching posts found' };
  }
  
  res.status(200).json(ret);
});

app.post('/api/findlocalposts', async (req, res, next) => {
  // incoming: latitude, longitude, distance
  // outgoing: title, body, image, latitude, longitude, authorId, tags
  // returns array of posts within distance of latitude and longitude

  var error = '';

  const { latitude, longitude, distance } = req.body;

  const db = client.db('Overcastly');
  const results = await db.collection('Posts').find({ }).toArray();

  var outId = -1;
  var outTitle = '';
  var outBody = '';
  var outImage = -1;
  var outLat = -1;
  var outLong = -1;
  var outTags = -1;

  var ret = [];

  for (let i = 0; i < results.length; i++)
  {
    var calcDistance = Math.sqrt( (results[i].latitude - latitude)**2 + (results[i].longitude - longitude)**2 )

    if (calcDistance > distance || !(results[i].hasOwnProperty('latitude') &&  results[i].hasOwnProperty('longitude')))
      continue;

    outId = results[i].authorId;
    outTitle = results[i].title;
    outBody = results[i].body;
    outImage = results[i].image;
    outLat = results[i].latitude;
    outLong = results[i].longitude;
    outTags = results[i].tags;

    ret.push({ title: outTitle, body: outBody, image: outImage, latitude: outLat, authorId: outId, longitude: outLong, tags: outTags, error: '' });
  }

  if (ret.length == 0)
  {
    var ret = { error: 'No matching posts found' }
  }
  
  res.status(200).json(ret);
});




app.post('/api/login', async (req, res, next) => {
  // incoming: login, password
  // outgoing: id, firstName, lastName, error

  var error = '';

  const { login, password } = req.body;

  const db = client.db('COP4331Cards');
  const results = await db.collection('Users').find({ Login: login, Password: password }).toArray();

  var id = -1;
  var fn = '';
  var ln = '';

  if (results.length > 0) {
    id = results[0].UserId;
    fn = results[0].FirstName;
    ln = results[0].LastName;
  }

  var ret = { id: id, firstName: fn, lastName: ln, error: '' };
  res.status(200).json(ret);
});


app.post('/api/searchcards', async (req, res, next) => {
  // incoming: userId, search
  // outgoing: results[], error

  var error = '';

  const { userId, search } = req.body;

  var _search = search.trim();

  const db = client.db('COP4331Cards');
  const results = await db.collection('Cards').find({ "Card": { $regex: _search + '.*', $options: 'i' } }).toArray();

  var _ret = [];
  for (var i = 0; i < results.length; i++) {
    _ret.push(results[i].Card);
  }

  var ret = { results: _ret, error: error };
  res.status(200).json(ret);
});


app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PATCH, DELETE, OPTIONS'
  );
  next();
});

app.listen(5000); // start Node + Express server on port 5000
