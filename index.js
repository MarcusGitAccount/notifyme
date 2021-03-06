'use strict';

const ALERT_VALUES = [1, 2, 5, 10, 15, 20, 30];
const ALERT_TIME = 1 * 60 * 1000;
const UPDATE_TIME = 5 * 1000;
const POLONIEX_URL_TICKER = 'https://poloniex.com/public?command=returnTicker';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_TOKEN = process.env.PAGE_TOKEN;

const supportedCurrencies = ['sjcx', 'clam', 'sc', 'eth', 'xrp'];
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

const AlertSchema = new Schema({
  id: ObjectId,
  user_id: {type: String, unique: false},
  currency: {type: String, default: 'sc'},
  value: {type: Number, default: 5}
});

const UserSchema = new Schema({
  id: ObjectId,
  user_id: {type: String, unique: false},
  currency: {type: String},
  last_text: {type: String, default: null},
  last_livestream_value: {type: String, default: null},
});

const Alerts = mongoose.model('alerts', AlertSchema);
const Users = mongoose.model('users', UserSchema);

let updateInterval, alertInterval;

const expressions = {
  'hello': new RegExp(/^(hello|hei|hey|salut|greetings|sup|'sup|hi)$/),
  'help': new RegExp(/^(help|helping|help pls|help please|halp)$/),
  'currency': new RegExp(`^price (${supportedCurrencies.join('|')})$`),
  //'currency': new RegExp(`^sjcx`),
  'stop': new RegExp(`^(stop|end|terminate) (${supportedCurrencies.join('|')})$`),
  'site': new RegExp(/^site$/),
  'livestream': new RegExp(`^(${supportedCurrencies.join('|')}) to [\\d]+\\.[\\d]{8}$`),
  //'livestream': new RegExp(/^sjcx to [\d]+\.[\d]{8}$/),
  'current': new RegExp(/^current$/),
  'alertstart': new RegExp(/^alertstart [\w]{2,5} [\d]{1,2}$/),
  'alertstop': new RegExp(`^alertstop (${supportedCurrencies.join('|')})$`),
  'alertscurrent': new RegExp(/^alertcurrent$/),
  'supported': new RegExp(/^supported/)
};

const messages = {
  hello: (message, id, callback) => callback('Greetings to you. For a list of available commands please type help. Thank you.'),
  help: (message, id, callback) => {
    callback( `Available commands: 
    a) <currency> to <value>. 10 seconds continuous stream. Value format: 8 decimals number. Example: 'sc to 0.00000277'
    b) price <currency> to get the currency value in BTC.
    c) help
    d) stop/end/terminate <currency> to end currency livestream
    e) site - source of values
    f) current - get the value of current stream
    g) alertstart <currency> <time>. Available currencies: ${supportedCurrencies.join(',')}. Available periods of time: ${ALERT_VALUES.join(', ')}. 
    h) alertcurrent
    i) alertstop <currency> - for one of your currencies.
    j) supported`);
  },
  currency: (message, id, callback) => {
    console.log('CURRENCY');
    
    const currency = message.split(' ')[1].toLocaleLowerCase();
    
    
    if (currenciesRate[currenciesRate] === {} || !currenciesRate[currency]) {
      callback(`Couldn't retrieve currency. Try later`);
      return ;
    }
    
    callback(`1 ${currency} is worth ${currenciesRate[currency].last} BTC.`);
  },
  site: (message, id, callback) => callback('https://poloniex.com'),
  stop: (message, id, callback) => {
    const currency = message.split(' ')[1].toLocaleLowerCase();
    
    Users.findOneAndRemove({user_id: id, currency: currency}, (err) => {
      if (err) {
        callback('Error while stopping the stream. Try another time please.');
        return console.log(err);
      }
      callback(`Livestreaming currency has stopped for ${currency.toUpperCase()}`);
      
    });
    
  },
  livestream: (message, id, callback) => {
    const arr = message.split(' ');
    const user = new Users({
      user_id: id,
      last_text: message,
      last_livestream_value: arr[2],
      currency: arr[0].toLowerCase()
    });
    
    console.log('LIVESTREAM', arr);

    if (arr[2] === "0.00000000")
      return callback('Invalid value');
    
    Users.findOneAndRemove({user_id: id, currency: user.currency}, (err) => {
      if (err) {
        return console.log(err);
      }
      
      user.save((error, result) => {
        if (error) {
          console.log(error);
          return callback('Error while starting the stream. Try another time please.' + error + ' ' + arr[2]);
        }
        
        
        if (arr[2] === currenciesRate[arr[0].toLocaleLowerCase()].last)
          return callback(`Starting stream... ${arr[0]} reached your desired value. 😍😍😍😍😍`);
        
        callback('Starting stream... Previous stream will be stopped if one exists.');
      });
    });
  },
  current: (message, id, callback) => { 
    Users.find({user_id: id}, (error, users) => {
      if (error) {
        console.log(error);
        return callback('Something wrong happened');
      }
      
      if (!users || users.length === 0)
        return callback('You have no currency livestreams.');
      
      callback(users.reduce((prev, current) =>{
      	return prev + `currency: ${current.currency}; value: ${current.last_livestream_value}\n`;
      }, ''));
      
    });
  },
  alertstart: (message, id, callback) => {
    const arr = message.split(' ').map(item => item.toLowerCase());
    
    const _alert = new Alerts({
      currency: arr[1],
      value: parseInt(arr[2]),
      user_id: id
    });
    
    if (supportedCurrencies.indexOf(arr[1]) < 0)
      return callback(`${arr[1]} is not curently supported.`);
      
    if (ALERT_VALUES.indexOf(parseInt(arr[2])) < 0)
      return callback(`Period of time not supported. Consult the help command.`);
    
    Alerts.findOneAndRemove({user_id: id, currency: _alert.currency}, (error ) => {
      if (error)
        return console.log(error);
        
      _alert.save((error, result) => {
        if (error)
          return callback(`Error while starting the alert system. ${error}`);
          
        callback(`Alert started for ${arr[1]}. You will receive an alert every ${arr[2]} minutes starting at a fixed time. (min is multiple of ${arr[2]}). Previous alert will be removed.`);
      });
    });
  },
  alertscurrent: (message, id, callback) => {
    Alerts.find({user_id: id}, (error, alerts) => {
      if (error) {
        console.log(error);
        return callback('Something wrong happened');
      }
      
      if (!alerts || alerts.length === 0)
        return callback('You have no alerts');
      
      callback(alerts.reduce((prev, current) =>{
      	return prev + `currency: ${current.currency}; delay: ${current.value}\n`;
      }, ''));
    });
  },
  alertstop: (message, id, callback) => {
    const currency = message.split(' ')[1].toLocaleLowerCase();
    
    Alerts.findOneAndRemove({user_id: id, currency: currency}, (error) => {
      if (error) {
        callback('An error occurred while stopping the alert system. Try later.');
        return console.log(error);
      }
      
      callback(`Alert stopped and deleted for ${currency.toUpperCase()}.`);
    });
  },
  supported: (message, id, callback) => callback(`Supported currencies: ${supportedCurrencies.join(', ')}`)
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
    console.log(`key: ${regexpKey}, ${text}, ${expressions[regexpKey].test(text.toLowerCase().trim())}`);
    
    if (expressions[regexpKey].test(text.toLowerCase().trim())) {
      return messages[regexpKey](text, id, (message) => {
        console.log(message);
         callSendApi({
          recipient: { id },
          message: { text: message }
        });
      });
    }
  });
}

function callSendApi(data) {
  console.log(data);
  
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
    
    console.log(result);
  });
});

updateInterval = setInterval(() => {
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
                console.log('end[user.currency]ing for ', user.user_id);
                
                Users.findOneAndRemove({user_id: user.user_id}, (err) => {
                  if (err) {
                    return console.log(err);
                  }
                  
                  callSendApi({
                    recipient: { id: user.user_id },
                    message: { text: `${user.currency} reached your desired value of ${user.last_livestream_value}. 😍😍😍😍😍😍` },
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
    });
}, UPDATE_TIME);

setTimeout(() => {
  console.log(`Started interval at ${new Date()}`);
  
  alertInterval = setInterval(() => {
    const minute = (new Date()).getMinutes();
    let arr = [];
    
    if (minute === 0)
      arr = ALERT_VALUES;
    else {
      for (let index = 0; index < ALERT_VALUES.length; index++)
        if (minute % ALERT_VALUES[index] === 0)
          arr.push(ALERT_VALUES[index]);
    }
    console.log(arr);
    
    Alerts.find({value: {$in: arr}}, (error, users) => {
      if (error)
        return console.log(error);
      
      users.forEach(user => {
        let message = 'Currency update was not available.';
        

        if (currenciesRate && currenciesRate[user.currency]) {
          message = `${user.value} min update: 1 ${user.currency} is worth ${currenciesRate[user.currency].last}`;
          
          callSendApi({
            recipient: { id: user.user_id },
            message: { text: message },
            notification_type: 'NO_PUSH'
          });
        }
      });
    });
    
  }, ALERT_TIME);
}, (function() {
  const date = new Date();

  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  if (minutes % 5 === 0)
    return 0;

  return ((4 - minutes % 5) * 60 + (60 - seconds)) * 1000;

})());

/***/