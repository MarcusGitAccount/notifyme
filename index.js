'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const app = express();

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ 'extended': true}));		
app.use(bodyParser.json());

app.set('port', process.env.PORT || 5000);
app.set('case sensitive routing', true);

app.get('/', (request, response) => {
  response.status(200).send('Hello world');
});

const listener = app.listen(app.get('port'), () => {
  console.log(`Server up and running on http://${listener.address().address}:${listener.address().port}`);
});