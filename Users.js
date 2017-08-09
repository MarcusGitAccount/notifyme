'use strict';

// 27017

const mongoose = require('mongoose');

const Connection = require('./Singleton')();

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const UserSchema = new Schema({
  id: ObjectId,
  user_id: {type: String, unique: true},
  currency: {type: String},
  last_text: {type: String, default: null},
  last_livestream_value: {type: String, default: null}
});

const Users = mongoose.model('users', UserSchema);


class UserModel {
  constructor() {
    console.log('24:', JSON.stringify(Users, null, 2));
  }
  
  insert(data, callback) {
    const user = new Users(data);
    
    console.log(data)
    user.save((err, result) => {
      console.log(err, result)
      if (err) {
        callback(err); console.log(err)
        return ;
      }
      console.log('user inserted')
      callback(null, result);
    });
  }
  
  selectUser(data, callback) {
    Users.findOne(data, (err, result) => {
      if (err) {
        callback(err);
        return ;
      }
      
      callback(null, result);
    });
  }
  
  selectAllUsers(callback) {
    Users.find({}, (err, result) => {
      if (err) {
        callback(err);
        return ;
      }
      
      callback(null, result);
    });
  }
  
  deleteUser(user_id, callback) {
    Users.findOneAndRemove({user_id}, (err) => {
      if (err) {
        callback(err);
        return ;
      }
      
      callback(null);
    });
  }
}

module.exports = UserModel;