'use strict';

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

app.get('/', (request, response) => {
  response.status(200).send('web hook');
});

app.get('*', (request, response) => {
  response.status(404).send('no page here you dummy');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
