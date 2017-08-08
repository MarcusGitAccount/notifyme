'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const app = express();

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ 'extended': true}));		
app.use(bodyParser.json());

app.set('case sensitive routing', true);

app.get('/', (request, response) => {
  response.status(200).send('Hello world');
});

const listener = app.listen(process.env.PORT, process.env.IP, () => {
  console.log(`Server up and running on http://${listener.address().address}:${listener.address().port}`);
});