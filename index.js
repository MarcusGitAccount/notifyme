'use strict';

// dbconnection_pass~eurobtc2017
// marcuspop

const UPDATE_TIME = 10 * 1000;
const POLONIEX_URL_TICKER = 'https://poloniex.com/public?command=returnTicker';
const VERIFY_TOKEN = 'what_code_do_i_need_afterall_oh_my_verify_me_please';
const PAGE_TOKEN = 'EAAaezGvfcCwBAKxugZCpzz2zjd6bnA2DGUXGZAfX6ZBF1zr2Swd4urTMjbAweUtJHRj0Vy3zXz5AdnPAS8dR1U66Gx21bJuYI9kO7mXVhIMyykXRiodxRj4KhZAZBjooTFD25utXYgNsEEwSKjUavNFFtvW09fOVPYqVTG9xmWAZDZD';

const supportedCurrencies = ['sc'];
const currenciesRate = {};

const fetch = require('node-fetch');
const url = require('url');

const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const req = require('request');

const app = express();
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const UserSchema = new Schema({
  id: ObjectId,
  user_id: {type: String, unique: true},
  currency: {type: String},
  last_text: {type: String, default: null},
  last_livestream_value: {type: String, default: null}
});

const Users = mongoose.model('users', UserSchema);


const expressions = {
  'hello': new RegExp(/^(hello|hei|hey|salut|greetings|sup|'sup|hi)$/),
  'help': new RegExp(/^(help|helping|help pls| help please|halp)$/),
  //currency': new RegExp(`^${[supportedCurrencies.join('|'), supportedCurrencies.map(item => item.toUpperCase()).join('|')].join('|')}$`),
  'currency': new RegExp(`^sc$`),
  'stop': new RegExp(/^stop|end|terminate$/),
  'site': new RegExp(/^site$/),
  //'livestream': new RegExp(`^(${supportedCurrencies.join('|')}) to [\d]+\.[\d]{8}$`)
  'livestream': new RegExp(/^sc to [\d]+\.[\d]{8}$/)
};

const messages = {
  hello: (message, id, callback) => callback('Greetings to you. For a list of available commands please type help. Thank you.'),
  help: (message, id, callback) => {
    callback( `Available commands: 
    a) sc to <value> to get notifications when Siacon reaches <value>. 10 seconds continuous stream. Value format: 8 digit number. Example: 'sc to 0.00000277'
    b) ${supportedCurrencies.join('; ')} to get the currency value in BTC.
    c) help
    d) stop/end/terminate to end currency livestream
    e) site - source of values`);
  },
  currency: (message, id, callback) => {
    console.log('CURRENCY');
    
    if (currenciesRate[message] === {} || !currenciesRate[message]) {
      callback(`Couldn't retrieve currency. Try later`);
      return ;
    }
    callback(`1 ${message} is worth ${currenciesRate[message].last} bitcoin`);
  },
  site: (message, id, callback) => callback('https://poloniex.com'),
  stop: (message, id, callback) => {
    Users.findOneAndRemove({user_id: id}, (err) => {
      if (err) {
        callback('Error while stopping the stream. Try another time please.');
        return console.log(err);
      }
      callback('Livestreaming currency has stopped');
      
    });
    
  },
  livestream: (message, id, callback) => {
    const arr = message.split(' ');
    const user = new Users({
      user_id: id,
      last_text: message,
      last_livestream_value: arr[2],
      currency: arr[0]
    });
    
    console.log('LIVESTREAM', arr);

    if (arr[2] === "0.00000000")
      return callback('Invalid value');
    
    Users.findOneAndRemove({user_id: id}, (err) => {
      if (err) {
        return console.log(err);
      }
      
      user.save((error, result) => {
        if (error) {
          console.log(error);
          return callback('Error while starting the stream. Try another time please.' + error + ' ' + arr[2]);
        }
        
        if (arr[2] === currenciesRate[arr[0]].last)
          return callback(`Starting stream... ${arr[0]} reached your desired value. 😍😍😍😍😍`);
        
        callback('Starting stream... Previous stream will be stopped if one exists.');
      });
    });
    
    
  }
};

app.set('port', (process.env.PORT || 5000));
app.set('case sensitive routing', true);

app.use(bodyParser.urlencoded({ 'extended': true}));		
app.use(bodyParser.json());

function processMessage(event) {
  sendMessage(event.sender.id, event.message.text);
}

function sendMessage(id, text) {
  Object.keys(expressions).forEach(regexpKey => {
    if (expressions[regexpKey].test(text.toLowerCase().trim())) {
      messages[regexpKey](text, id, (message) => {
         callSendApi({
          recipient: { id },
          message: { text: message }
        });
      });
    }
    
    return ;
  });
}

function callSendApi(data) {
  req({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token: PAGE_TOKEN},
    method: 'POST',
    json: data
  }, (error, response, body) => {
    if (!error) {
      console.log('Succesfully sent message to user');
    }
    else {
      console.log('Error: ', error);
    }
  });
}


app.use(express.static(__dirname + '/public'));

app.get('/', (request, response) => {
  response.status(200).send(JSON.stringify(currenciesRate, null, 2));
});

// verify page if valid
app.get('/webhook', (request, response) => {
  const query = url.parse(request.url, true).query;
  
  if (query['hub.verify_token'] === VERIFY_TOKEN)
    response.status(200).send(query['hub.challenge']);
  response.status(403).send('Forbidden');          
});

// receive message
app.post('/webhook', (request, response) => {
  console.log('posting');
  if (request.body.object === 'page') {
    request.body.entry.forEach((entry) => {
      entry.messaging.forEach((event) => {
        if (event.message) {
          processMessage(event);
        }
        else {
          console.log('Uhm, you were supposed to send me a message ):');
        }
      });
    });
  }
  
  response.sendStatus(200);
});

app.get('*', (request, response) => {
  response.status(404).send('no page here you dummy');
});

mongoose.connect(process.env.MONGODB_URI, (err, res) => {
  if (err) 
    return console.log(err);
    
  console.log ('Succeeded connecting to mongodb');
    app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
  });
  
  Users.find({}, (err, result) => {
    if (err)
      return console.log(err);
    
    result.forEach(user => {
      callSendApi({
        recipient: { id: user.user_id },
        message: { text: 'initial'}
      });
    });
    
    console.log(result);
  });
});

setInterval(() => {
  console.log('tick');
  
  fetch(POLONIEX_URL_TICKER, {
    method: 'GET',
    headers: {'Content-Type': 'application/json'},
  })
    .then(response => response.json())
    .then(response => {
      for (let index = 0; index < supportedCurrencies.length; index++) {
        currenciesRate[supportedCurrencies[index]] = response[`BTC_${supportedCurrencies[index].toUpperCase()}`];
        
        if (index === supportedCurrencies.length - 1) {
          Users.find({}, (error, users) => {
            if (error)
              return console.log(error);
          
            users.forEach(user => {
              if (currenciesRate && user.last_livestream_value === currenciesRate[user.currency].last) {
                console.log('ending for ', user.user_id);
                
                Users.findOneAndRemove({user_id: user.user_id}, (err) => {
                  if (err) {
                    return console.log(err);
                  }
                  
                  callSendApi({
                    recipient: { id: user.user_id },
                    message: { text: `${user.currency} reached your desired value. 😍😍😍😍😍😍` },
                    notification_type: 'SILENT_PUSH'
                  });
                });
              }
            });
          });
        }
      }
    })
    .catch(error => {
      console.log(`Fetch error: ${error}`);
    });}, UPDATE_TIME);