var app = require('../server/server.js');
var Promise = require("bluebird");
var Server = app.models.Server;
var Job = app.models.Job;
var User = app.models.User;

var createServers = function(users) {
  return new Promise(function(resolve, reject) {
    Server.create([
      {
        id: "test-server1",
        installedServices: [
          "ANT", "Jetty"
        ],
        instanceUrl: "http://www.myjavaserver.com",
        languages: [
          "java"
        ],
        name: "Java Server 1",
        operatingSystem: "Linux",
        password: "234567",
        platform: "java",
        repoName: "http://www.github.com/java1",
        status: "available",
        updatedAt: "Mon Jul 13 2015 10:34:59 GMT-0600 (MDT)",
        username: "jeff",
        jobId: 'test-job1'
      },
      {
        id: "test-server2",
        installedServices: [
          "Force.com", "MongoDB"
        ],
        instanceUrl: "http://www.force.com",
        languages: [
          "Apex", "Visualforce"
        ],
        name: "DE Org 1",
        operatingSystem: "Linux",
        password: "111111",
        platform: "Salesforce",
        repoName: "http://www.github.com/force1",
        status: "available",
        updatedAt: "Mon Jul 13 2015 10:34:59 GMT-0600 (MDT)",
        username: "steve",
        project: "ACME"
      }
    ], function(err, records) {
      if (err) reject(err);
      if (!err) resolve(users);
    });
  });
};

var createJobs = function() {
  return new Promise(function(resolve, reject) {
    Job.create([
      {
        id: "test-job1",
        createdAt: "Mon Jul 13 2015 11:10:03 GMT-0600 (MDT)",
        codeUrl: "http://cs-production.s3.amazonaws.com/challenges/2931/files.zip",
        endTime: "Mon Jul 13 2015 11:10:03 GMT-0600 (MDT)",
        language: "Apex",
        platform: "Heroku",
        startTime: "Mon Jul 13 2015 11:10:03 GMT-0600 (MDT)",
        updatedAt: "Mon Jul 13 2015 11:10:03 GMT-0600 (MDT)",
        project: "ACME",
        status: "in progress",
        notification: "email",
        steps: "all",
        userId: 1
      },
      {
        id: "test-job2",
        createdAt: "Mon Jul 13 2015 11:10:03 GMT-0600 (MDT)",
        codeUrl: "http://cs-production.s3.amazonaws.com/somecode.zip",
        endTime: "Mon Jul 13 2015 11:10:03 GMT-0600 (MDT)",
        language: "Apex",
        platform: "Salesforce",
        startTime: "Mon Jul 13 2015 11:10:03 GMT-0600 (MDT)",
        updatedAt: "Mon Jul 13 2015 11:10:03 GMT-0600 (MDT)",
        status: "in progress",
        notification: "email",
        steps: "all",
        userId: 1
      }
    ], function(err, records) {
      if (err) reject(err);
      if (!err) resolve(records);
    });
  });
};

before(function(done) {
  createJobs()
    .then(function(jobs) {
      createServers(jobs);
    })
    .finally(function() {
      done();
    })
    .catch(function(e) {
      console.log(e);
    });
})

after(function(done) {
   Server.destroyAll();
   Job.destroyAll();
   done();
})
