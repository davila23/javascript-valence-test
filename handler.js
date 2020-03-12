const csv = require('csv-parser');
const request = require('request')
const http = require('http');
const fs = require('fs');


const arrLocation = []

/* ----  Download S3 Document  ---- */

async function getS3Document() {

  await new Promise((resolve, reject) => {

    const file = fs.createWriteStream("file.csv");

    try {
      // Access to my AWS S3 bucket
      const requesta = http.get('http://rottay.s3.amazonaws.com/locations.csv', function (response) {
        response.pipe(file);
      })

      file.on('finish', () => {
        file.close();
        resolve();
      })

    } catch (error) {

      console.log(error);
      reject(error);
      return 1;
    }
  })
  return 0;
};

/* ----  Get Locations NAME ---- */

async function readCSVDocument() {
  console.log('\n');
  console.log('Start parsing CSV ');
  console.log('.......');
  console.log('...................');
  console.log('...........................\n');

  const locations = [];

  return new Promise((resolve, reject) => {


    fs.createReadStream('file.csv').pipe(csv())

      .on('data', (data) => {
        let location = new Object();

        location.url = `http://www.metaweather.com/api/location/search/?query=${data["Location"]}`;
        location.name = `${data["Location"]}`;
        locations.push(location);
      })

      .on('error', (err) => {
        console.log('error ------------', err);
        reject(err);
      })

      .on('finish', () => {
        console.log('All the csv strings parsed ');
        console.log('\n');
        resolve(locations);
      })
  });
};

/* ----  Requests forecast and Generate Json  ---- */

async function parserInfo(locations) {

  const p = await Promise.all(locations).then(results => {

    results.forEach(res => {

      var location_ = new Object();
      var forecastExtended = []

      location_.location = res.name;

      request(res.url, async function (error, response, body) {

        var json = await JSON.parse(body)

        // GET forecast by ID
        var res_ = 'https://www.metaweather.com/api/location/' + json[0].woeid

        request(res_, async function (error, response, body) {

          var json = await JSON.parse(body)

          json.consolidated_weather.forEach(date => {

            var date_ = new Object();

            // Add Data To forecastExtended
            date_.applicable_date = date.applicable_date
            date_.weather_state_name = date.weather_state_name
            date_.the_temp = date.the_temp
            date_.max_temp = date.max_temp
            date_.max_temp = date.max_temp
            date_.humidity = date.humidity

            forecastExtended.push(date_)

          })
          location_.forecastExtended = forecastExtended;
          console.log(location_)
          // arrLocation.push(location_);
        })
      })
    })
  })
}

module.exports.endpoint = async (event, context, callback) => {

  // Import Document OK ?
  const res = await getS3Document();

  if (res == 0) {

    var readCSVPromise = await readCSVDocument();

    var parserInfoPromise = await parserInfo(readCSVPromise);

  } else {

    const response = {
      statusCode: 400,
      body: JSON.stringify({
        message: 'ERROR',
      }),
    }

    callback(null, response);
  }

};