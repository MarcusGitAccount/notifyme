'use strict';

const UPDATE_TIME = 1 * 60 * 1000;
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

const app = express();

const expressions = {
  'hello': new RegExp(/^(hello|hei|hey|salut|greetings|sup|'sup)$/),
  'help': new RegExp(/^(help|helping|help pls| help please|halp)$/),
  'currency': new RegExp(`^${[supportedCurrencies.join('|'), supportedCurrencies.map(item => item.toUpperCase()).join('|')].join('|')}$`),
  'stop': new RegExp(/^stop|end|terminate$/)
};
const messages = {
  'hello': (message, id) => 'Greetings to you. For a list of available commands please type help. Thank you.',
  'help': (message, id) => {
    return `Available commands: 
    a) sc to <value> to get notifications when Siacon reaches <value>
    b) ${supportedCurrencies.join('; ')} to get the currency value in BTC
    c) help
    d) stop/end/terminate to end currency livestream`
  },
  'currency': (message, id) => {
    if (currenciesRate[message].last)
      return `1 ${message} is worth ${currenciesRate[message].last}`;
    return `Couldn't retrieve currency. Try later`;
  },
  'stop': (message, id) => {
    `Livestreaming currency has stopped`
  },
  livestream: (message, id) => {
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
      }
    })
    .catch(error => {
      console.log(`Fetch error: ${error}`);
    });
}, UPDATE_TIME);