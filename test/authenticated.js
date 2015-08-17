var app = require('../server/server.js');
var should = require('chai').should();
var assert = require('chai').assert;
var supertest = require('supertest');
var api = supertest('http://localhost:3000/api');

var User = app.models.User;

describe('Authenticated User', function() {

  var accessToken;
  var username = 'test-user1';
  var password = 'password'

  before(function(done){
    // populate the test db with data
    require('./setup');
    // log the user in
    User.login({username: username, password: password}, function(err, results) {
      if (err) { console.log(err); }
      accessToken = results.id;
      done();
    });
  });

  it('reads all jobs currectly', function(done) {
    api.get('/jobs?access_token='+accessToken)
    .expect(200, done);
  });

  it('reads all servers correctly', function(done) {
    api.get('/servers?access_token='+accessToken)
    .expect(200, done);
  });

  it('reads all projects currectly', function(done) {
    api.get('/projects?access_token='+accessToken)
    .expect(200, done);
  });

  it('successfully posts a new message', function(done) {
    api.post('/jobs/test-job1/message?access_token='+accessToken)
    .send({
      "message": "Ran successfully",
      "sender": "jenkins"
    })
    .expect(200, done);
  });

  it('successfully marks a job as complete', function(done) {
    api.get('/jobs/test-job1/complete?access_token='+accessToken)
    .expect(200)
    .expect(function (res) {
      assert.equal(res.body.status, 'complete');
    })
    .end(done);
  });

  it.only('successfully submits a job for processing', function(done) {
    api.put('/jobs/test-job1/submit?access_token='+accessToken)
    .expect(200)
    .expect(function (res) {
      assert.equal(res.body.status, 'in progress');
    })
    .end(done);
  });

  // it('run the test route correctly', function(done) {
  //   api2.get('/test?access_token=1'+accessToken)
  //   .expect(200)
  //   .end(function (err, res) {
  //      done();
  //    });
  // });

});
