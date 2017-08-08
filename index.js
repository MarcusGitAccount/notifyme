'use strict';

// dbconnection_pass~eurobtc2017
// marcuspop

const UPDATE_TIME = .5 * 60 * 1000;
const POLONIEX_URL_TICKER = 'https://poloniex.com/public?command=returnTicker';
const VERIFY_TOKEN = 'what_code_do_i_need_afterall_oh_my_verify_me_please';
const PAGE_TOKEN = 'EAAaezGvfcCwBAKxugZCpzz2zjd6bnA2DGUXGZAfX6ZBF1zr2Swd4urTMjbAweUtJHRj0Vy3zXz5AdnPAS8dR1U66Gx21bJuYI9kO7mXVhIMyykXRiodxRj4KhZAZBjooTFD25utXYgNsEEwSKjUavNFFtvW09fOVPYqVTG9xmWAZDZD';

const supportedCurrencies = ['sc'];
const currenciesRate = {};

const fetch = require('node-fetch');
const url = require('url');

const express = require('express');
const bodyParser = require('body-parser');
const req = require('request');

const UsersModel = require('./Users');

const app = express();
const Users = new UsersModel();


const expressions = {
  'hello': new RegExp(/^(hello|hei|hey|salut|greetings|sup|'sup)$/),
  'help': new RegExp(/^(help|helping|help pls| help please|halp)$/),
  //'currency': new RegExp(`^${[supportedCurrencies.join('|'), supportedCurrencies.map(item => item.toUpperCase()).join('|')].join('|')}$`),
  'currency': new RegExp(`^sc$`),
  'stop': new RegExp(/^stop|end|terminate$/),
  'site': new RegExp(/^site$/),
  //'livestream': new RegExp(`^(${supportedCurrencies.join('|')}) to [\d]+\.[\d]{8}$`)
  'livestream': new RegExp(`^sc to [\d]+\.[\d]{8}$`)
};
const messages = {
  hello: (message, id) => 'Greetings to you. For a list of available commands please type help. Thank you.',
  help: (message, id) => {
    return `Available commands: 
    a) sc to <value> to get notifications when Siacon reaches <value>. 1 minute stream.
    b) ${supportedCurrencies.join('; ')} to get the currency value in BTC.
    c) help
    d) stop/end/terminate to end currency livestream
    e) site - source of values`
  },
  currency: (message, id) => {
    console.log('CURRENCY');
    
    if (currenciesRate[message] === {} || !currenciesRate[message])
      return `Couldn't retrieve currency. Try later`;
    return `1 ${message} is worth ${currenciesRate[message].last} bitcoin`;
  },
  site: (message, id) => 'https://poloniex.com',
  stop: (message, id) => {
    Users.deleteUser(id, (error) => {
      if (error) {
        console.log(error);
        return 'Error while stopping the stream. Try another time please.';
      }
    });
    
    return 'Livestreaming currency has stopped';
  },
  livestream: (message, id) => {
    console.log('LIVESTREAM');
    
    const arr = message.split(' ');
    
    if (parseFloat(arr[2]) === 0)
      return 'Invalid value';
    
    Users.insert({
      user_id: id,
      last_text: message,
      last_livestream_value: parseFloat(arr[2]),
      currency: arr[0]
    }, (error, result) => {
      if (error) {
        console.log(error);
        return 'Error while starting the stream. Try another time please.';
      }
      
      if (parseFloat(arr[2]) === currenciesRate[arr[0]].last)
        return `Starting stream... ${arr[0]} reached your desired value.`;
      
      return 'Starting stream...';
    });
  }
};



app.set('port', (process.env.PORT || 5000));
app.set('case sensitive routing', true);

app.use(bodyParser.urlencoded({ 'extended': true}));		
app.use(bodyParser.json());

function processMessage(event) {
  console.log('tryng to get the message')
  
  sendMessage(event.sender.id, event.message.text);
}

function sendMessage(id, text) {
  console.log(id, text, 'next help pls');
  
  // logic
  Object.keys(expressions).forEach(regexpKey => {
    if (expressions[regexpKey].test(text)) {
      callSendApi({
        recipient: { id },
        message: { text: messages[regexpKey](text, id) }
      });
    }
  })

  
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
  console.log('here i lay in pure sadness')
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
    console.log(request.body.entry)
    request.body.entry.forEach((entry) => {
      console.log('message ', entry);
      entry.messaging.forEach((event) => {
        if (event.message) {
          processMessage(event);
        }
        else {
          console.log('Uhm, you were supposed to send me a message ):', JSON.stringify(event, null, 2));
        }
      });
    });
  }
  
  response.sendStatus(200);
});

app.get('*', (request, response) => {
  response.status(404).send('no page here you dummy');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

setInterval(() => {
  fetch(POLONIEX_URL_TICKER, {
    method: 'GET',
    headers: {'Content-Type': 'application/json'},
  })
    .then(response => response.json())
    .then(response => {
      for (let index = 0; index < supportedCurrencies.length; index++) {
        currenciesRate[supportedCurrencies[index]] = response[`BTC_${supportedCurrencies[index].toUpperCase()}`];
        
        if (index === supportedCurrencies.length) {
          Users.selectAllUsers((error, users) => {
            if (error)
              return console.log(error);
            
            users.forEach(user => {
              if (currenciesRate && user.last_livestream_value === currenciesRate[user.currency].last) {
                callSendApi({
                  recipient: { id: user.user_id },
                  message: { text: `${user.currency} reached your desired value.` }
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