// set up express server
const express = require('express')
const app = express();
require('dotenv').config();
const port = process.env.PORT;
app.use(express.json());

// set of db connection
const Pool = require('pg').Pool;
const db_url = process.env.DATABASE_URL;

// https://www.npmjs.com/package/openai-api
const OpenAI = require('openai-api');
const OPEN_AI_API_KEY =  process.env.GPT_KEY;
const openai = new OpenAI(OPEN_AI_API_KEY);

// for reading file with training text for GPT-3
const fs = require('fs');
// const path = require('path');

// pass a prompt and get a response from the GPT-3 API
const getGptResponse = async (req) => {
  const userInput = req.headers['prompt'].trim();

  // don't send data to API if user didn't provide any data
  if (!userInput) {
    reject("no user input");
  }

  // build the prompt for the API
  const trainingText = fs.readFileSync('training-text.txt', 'utf8');
  const promptSuffix = "Cocktail:";
  const prompt = trainingText + " " + userInput + "\n" + promptSuffix;

  const gptResponse = await openai.complete({
      engine: 'davinci',
      prompt: prompt,
      maxTokens: 100,
      temperature: 0.9,
      topP: 1,
      presence_penalty: 0,
      frequency_penalty: 0,
      best_of: 1,
      n: 1,
      stream: false,
      stop: ['\n']
    });

  const output = gptResponse.data['choices'][0]['text'];

  // check if the output is safe using GPT-3 content filter
  const outputPrompt = "<|endoftext|>[" + output + "]\n--\nLabel:";
  const gptFilter = await openai.complete({
      engine: 'content-filter-alpha-c4',
      prompt: outputPrompt,
      maxTokens: 1,
      temperature: 0,
      topP: 1,
      presence_penalty: 0,
      frequency_penalty: 0,
      best_of: 1,
      n: 1,
      stream: false,
      stop: ['\n']
    });

  const filterResult = gptFilter.data['choices'][0]['text'];

  if (filterResult == '2') {
    return new Promise(function(resolve, reject) {
      resolve("Try another suggestion.");
    });
  } else {
    return new Promise(function(resolve, reject) {
      resolve(output);
    });
  }
}

// log recommendation in database
const logGptResponse = (req, response) => {
  // set connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // grab values from header
  const sessionUUID = req.headers['sessionuuid'];
  const recommendationUUID = req.headers['recommendationuuid'];
  const prompt = req.headers['prompt'];
  const output = response;

  // build INSERT statement
  const queryText = 'INSERT INTO public.recommendations VALUES ($1, $2, $3, $4)';
  const values = [sessionUUID,recommendationUUID,prompt,output];

  // execute query
  pool.query(queryText, values, (err, res) => {
    if (err) {
      console.log(query);
      console.log(err);
    } /* else {
      // don't need success logs right now
      console.log("inserted 1 row");
      console.log(res);
    } */
    pool.end();
  });
}

// log rating in database
const logUserRating = (req, response) => {
  return new Promise(function(resolve, reject) {
    // set connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    // grab values from header
    const recommendationUUID = req.headers['recommendationuuid'];
    const rating = req.headers['rating'];

    // build INSERT statement
    const queryText = 'INSERT INTO public.ratings VALUES ($1, $2)';
    const values = [recommendationUUID, rating];

    // execute query
    pool.query(queryText, values, (err, res) => {
      if (err) {
        console.log(query);
        console.log(err);
        reject(err.stack);
      } else {
        // console.log("inserted 1 row");
        // console.log(res);
        resolve("rating saved");
      }
      pool.end();
    });
  });
}

app.use(function (req, res, next) {
  const allowedOrigins = ['http://localhost:3000','https://backendbartender.com','https://backend-bartender.netlify.app'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
       res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Prompt, sessionUUID, recommendationUUID, rating");
  next();
});

app.get('/recommendation', (req, res) => {
  getGptResponse(req)
  .then(response => {
    logGptResponse(req, response);
    res.status(200).send(response);
  })
  .catch(error => {
    console.log(error);
    res.status(500).send(error);
  })
});

app.get('/rating', (req, res) => {
  logUserRating(req)
  .then(response => {
    res.status(200).send(response);
  })
  .catch(error => {
    res.status(500).send(error);
  })
});

app.listen(port, () => {
  console.log(`App running on port ${port}.`)
})
