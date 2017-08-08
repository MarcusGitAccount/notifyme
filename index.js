'use strict';

const POLONIEX_URL_TICKER = 'https://poloniex.com/public?command=returnTicker';
const VERIFY_TOKEN = 'what_code_do_i_need_afterall_oh_my_verify_me_please';
const PAGE_TOKEN = 'EAAaezGvfcCwBAKxugZCpzz2zjd6bnA2DGUXGZAfX6ZBF1zr2Swd4urTMjbAweUtJHRj0Vy3zXz5AdnPAS8dR1U66Gx21bJuYI9kO7mXVhIMyykXRiodxRj4KhZAZBjooTFD25utXYgNsEEwSKjUavNFFtvW09fOVPYqVTG9xmWAZDZD';

const url = require('url');

const express = require('express');
const bodyParser = require('body-parser');
const req = require('request');

const app = express();

const messages = {
  'help': () => {
    return `Available commands: a) sc up to <value> b) sc down to <value> c) help`;
  }
}

app.set('port', (process.env.PORT || 5000));
app.set('case sensitive routing', true);

app.use(bodyParser.urlencoded({ 'extended': true}));		
app.use(bodyParser.json());

function processMessage(event) {
  console.log('tryng to get the message')
  
  sendMessage(event.sender.id, JSON.stringify(event.message.text, null, 2));
}

function sendMessage(id, text) {
  console.log(id, text);
  
  // logic
  if (text === 'help') {
    text = messages['help'];
  }
  
  callSendApi({
    recipient: { id },
    message: { text }
  });
}

function callSendApi(data) {
  req({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token: PAGE_TOKEN},
    method: 'POST',
    json: data
  }, (error, response, body) => {
    if (!error && response.status === 200) {
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
  response.status(200).send('index');
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