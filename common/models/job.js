var Promise = require("bluebird");
var logger = require('strong-logger');
var sendgrid  = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);

module.exports = function(Job) {

  var updateJob = function(job, attributes) {
    return new Promise(function(resolve, reject) {
      job.updateAttributes(attributes, function(err, job){
        if (err) reject(err);
        if (!err) resolve(job);
      });
    });
  };

  // Register a 'message' remote method: /jobs/some-id/message
  Job.remoteMethod(
    'message',
    {
      http: {path: '/:id/message', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'string', required: true, http: { source: 'path' }},
        {arg: 'message', type: 'string'},
        {arg: 'sender', type: 'string'}
      ],
      returns: {root: true, type: 'object'},
      description: 'Posts a message for the job.'
    }
  );

  // the actual function called by the route to do the work
  Job.message = function(id, message, sender, cb) {
    Job.findById(id, function(err, job){
      if (err) cb(err);
      if (!err) {
        logger.info('[job-'+job.id+'] ' + message);
        cb(null, job);
      }
    });
  };

  // Register a 'submit' remote method: /jobs/some-id/submit
  Job.remoteMethod(
    'submit',
    {
      http: {path: '/:id/submit', verb: 'put'},
      accepts: {arg: 'id', type: 'string', required: true, http: { source: 'path' }},
      returns: {root: true, type: 'object'},
      description: 'Submits a job for processing.'
    }
  );

  // the actual function called by the route to do the work
  Job.submit = function(id, cb) {

    Job.findById(id, function(err, job){
      if (err) cb(err);
      if (!err) {
        updateJob(job, {status: 'in progress', startTime: new Date(), updatedAt: new Date()})
          .then(function(job) {
            logger.info('[job-'+job.id+'] submitted for processing.');
            cb(null, job);
          }).catch(function(e) {
            cb(e)
          });
      }
    });
  };

  // Register a 'complete' remote method: /jobs/some-id/complete
  Job.remoteMethod(
    'complete',
    {
      http: {path: '/:id/complete', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'string', required: true, http: { source: 'path' }}
      ],
      returns: {root: true, type: 'object'},
      description: 'Marks a job as complete & releases server.'
    }
  );

  // the actual function called by the route to do the work
  Job.complete = function(id, cb) {

    var findServerByJob = function(job) {
      return new Promise(function(resolve, reject) {
        var Server = Job.app.models.Server;
        Server.findOne({ where: {jobId: job.id}}, function(err, server){
          if (err) reject(err);
          if (!err) resolve(server);
        });
      });
    };

    var releaseServer = function(server) {
      return new Promise(function(resolve, reject) {
        server.updateAttributes({jobId: null, status: 'available', updatedAt: new Date()}, function(err, server){
          if (err) reject(err);
          if (!err) resolve(server);
        });
      });
    };

    var sendMail = function(job) {
      return new Promise(function(resolve, reject) {
        if (process.env.NODE_ENV === 'production' && job.notification === 'email') {
          sendgrid.send({
            to:       job.user().email,
            from:     'Thurgood',
            subject:  'Job ' + job.id + ' Complete',
            text:     'Your Thurgood job has been completed. You can view the job logs at ' + process.env.APP_URL + '/#/jobs/'+job.id+'/events.'
          }, function(err, json) {
            if (err) reject(err);
            if (!err) resolve(job);
          });
        } else {
          resolve(job);
        }
      });
    };

    Job.findOne({ where: {id: id}, include: 'user'}, function(err, job){
      if (err) cb(err);
      if (!err) {
        updateJob(job, {status: 'complete', endTime: new Date(), updatedAt: new Date()})
          .then(sendMail)
          .then(findServerByJob)
          .then(releaseServer)
          .then(function(server) {
            logger.info('[job-'+job.id+'] marked as complete.');
            cb(null, job);
          }).catch(function(e) {
            cb(e)
          });
      }
    });

  };

};
