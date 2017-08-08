'use strict';

const mongoose = require('mongoose');

let instance;
const _db = Symbol('_db');

class MongoConnection {
  constructor() {
    console.log('Connected to mongodb.');
    mongoose.connectUri('mongodb://marcuspop:dbconnection_pass~eurobtc2017@ds039271.mlab.com:39271/notifymedb');
    mongoose.Promise = global.Promise;
    this[_db] = mongoose.connection;
  }
  
  getConnection() {
    return this[_db];
  }
}

module.exports = function singleton() {
  if (!instance)
    instance = new MongoConnection();
    
  return instance;
};