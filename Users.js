'use strict';

// 27017

const mongoose = require('mongoose');

const Connection = require('../../system/database/MongoConnection')();

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const UserSchema = new Schema({
  id: ObjectId,
  user_id: {type: String, unique: true},
  last_text: {type: String, default: null},
  last_livestream_value: {type: Number, default: null}
});

const User = mongoose.model('users', UserSchema);

class UserModel {
  insert(data, callback) {
    const user = new User(data);
    
    user.save((err, result) => {
      if (err) {
        callback(err);
        return ;
      }
      
      callback(null, result);
    });
  }
  
  selectUser(data, callback) {
    User.findOne(data, (err, result) => {
      if (err) {
        callback(err);
        return ;
      }
      
      callback(null, result);
    });
  }
}

module.exports = UserModel;