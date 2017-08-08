'use strict';

const VERIFY_TOKEN = 'what_code_do_i_need_afterall_oh_my_verify_me_please';

const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.set('port', (process.env.PORT || 5000));
app.set('case sensitive routing', true);

app.use(bodyParser.urlencoded({ 'extended': true}));		
app.use(bodyParser.json());


app.use(express.static(__dirname + '/public'));

app.get('/', (request, response) => {
  response.status(200).send('index');
});

app.get('/webhook/', (request, response) => {
  if (request.query['hub.verify_token'] === VERIFY_TOKEN)
    request.status(200).send(request.query['hub.challenge']);
  response.status(403).send('Forbidden');          
});

app.get('*', (request, response) => {
  response.status(404).send('no page here you dummy');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
