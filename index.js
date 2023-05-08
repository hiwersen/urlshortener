require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dns = require('dns');
const mongoose = require('mongoose');
const UrlModel = require('./models/url');

const app = express();

const port = process.env.PORT || 3000;
const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/urlShortner';

/**
 * Enable CORS (Cross-origin resource sharing) middleware
 * so that the API is remotely testable by FreeCodeCamp
 * @see {@link https://www.npmjs.com/package/cors}
 */
app.use(cors({ optionsSuccessStatus: 200 }));

mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log(`Connected to database: ${mongoose.connection.name}`)) // also: mongoose.connection.db.databaseName
.catch(err => console.log(`Error connnecting to database: ${err}`));

/**
 * Serve static files (CSS, JavaScript, images) from the 'public' directory
 */
app.use('/public', express.static(`${process.cwd()}/public`));

/**
 * Handle the root route and serve the index.html file
 */
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

/**
 * Middleware: Body Parser
 * 
 * Use the body-parser middleware to parse URL-encoded request bodies
 * into JavaScript objects. The 'extended: false' option ensures that
 * the parsing is done using the querystring library, which can handle
 * only scalar values (i.e., strings and arrays).
 */
app.use(bodyParser.urlencoded({ extended: false }));

/**
 * The generateShortUrl asynchronous function produces a short representaion of a URL
 *
 * The function can either return an existing short version of the input URL, if a record already exists in the database
 * or generate a new short URL, which is a serial Number data type, counting from the last record URL plus 1
 * The function also stores the original and short URL pair in the database
 *
 * @param {String} original_url - URL to be shortened
 * @returns {Number} Short URL, which is a serial number representing the original URL
 * 
 * @example
 * generateShortUrl('https://www.google.com');
 * Output: 1
 */
async function generateShortUrl(original_url) {
  let short_url;
  try {

    // Check if the input URL already has a record in the database
    const urlDoc = await UrlModel.findOne({ original_url });

    // Return its existing short_url if found
    if (urlDoc) {
      ({ short_url } = urlDoc);
      return short_url;
    } else {
      try {

        // Retrieve the last document from the DB if no existing record is found
        const lastDocument = await UrlModel.findOne().sort({ _id: -1 }).exec();

        // Generate a new short_url
        short_url = lastDocument ? lastDocument.short_url + 1 : 1;

        // Create a new instance of the UrlModel and save it to the DB
        const urlDoc = new UrlModel({ original_url, short_url });
        try {
          await urlDoc.save();
          return short_url;
        } catch (error) {
          console.error(error);
        }
      } catch (error) {
        console.error(error);
      }
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 * The normalizeUrl function takes a URL string and returns the hostname
 *
 * If present, the function excludes:
 * Protocol,
 * Path,
 * Port number,
 * Query string,
 * Fragment identifier.
 *
 * @param {String} url - URL to be normalized
 * @returns {String} Normalized URL, containing only the hostname
 * 
 * @example
 * normalizeUrl('https://www.google.com/');
 * Output: 'www.google.com'
 */
function normalizeUrl(url) {
  const protocol = /^(https?\:\/\/)/;
  const afterDomain = /(?<=(https?\:\/\/)?(www\.)?.+)[\/:\?\#].*/;
  const combinedPattern = new RegExp(protocol.source + '|' + afterDomain.source, 'g');
  return url.replace(combinedPattern, '');
}

/**
 * @api {post} /api/shorturl Post Original URL to be shortened and stored in a database
 * @apiName ShortenUrl
 * @apiGroup Url
 * 
 * @apiParam {String} url Required URL string encoded in the request body as a URL-encoded type
 *
 * @apiSuccess {String} original_url Input URL
 * @apiSuccess {Number} short_url Short representation of the original URL
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "original_url": "https://www.google.com",
 *       "short_url": 1
 *     }
 * 
 * @apiError {String} error Error message when the input URL is invalid
 *
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "error": "invalid url"
 *     }
 */
app.post('/api/shorturl', (req, res) => {
  let { url: original_url } = req.body;

  // Normalize the original URL before performing DNS verification
  const normalized_url = normalizeUrl(original_url);
  dns.lookup(normalized_url, (error, address, family) => {

    // If the input URL doesn't exist in the DNS
    if (error) {
      console.error(error);

      // Send a JSON object with an error message
      res.json({ error: 'invalid url' });
    } else {

      // If the normalized_url passes DNS verification, retrieve or generate the short URL and save it to the database
      generateShortUrl(original_url).then(short_url => {

        // Send a JSON object with the original and short URLs
        res.json({ original_url, short_url });
      });
    }
  });
});

/**
 * @api {get} /api/shorturl:short_url Get the short URL and redirect to its correspondent original URL
 * @apiName RedirectUrl
 * @apiGroup Url
 * 
 * @apiParam {String} short_url Required URL string representation of a serial number. A route paramater.
 * 
 * @apiSuccess (302) {String} Redirect Successful redirection to the original URL
 * 
 * @apiError (404) {String} NotFound The short URL provided doesn't exist in the database
 */
app.get('/api/shorturl/:short_url', async (req, res) => {
  const { short_url } = req.params;
  
  try {
    const urlDoc = await UrlModel.findOne({ short_url });

    // If a matching short URL is found in the database
    if (urlDoc) {
      let { original_url } = urlDoc;

      // Redirect the user to the original URL
      res.redirect(original_url);
    } else {

      // If the short URL is not found in the database, send a 404 error
      res.status(404).send("The short URL provided doesn't exist in the database");
    }
  } catch (error) {
    console.error(error);
  }
});

/**
 * Start the server and log the listening port
 */
const listener = app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
