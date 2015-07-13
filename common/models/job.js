var logger = require('strong-logger');

module.exports = function(Job) {

  // Register a 'message' remote method: /Jobs/some-id/message
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
        logger.info('['+job.id+'] ' + message);
        logger.info('['+job.id+'] ' + 'Got another message');
        logger.info('['+job.id+'] ' + 'Got a third message');
        cb(null, job);
      }
    })
  };

  // Register a 'complete' remote method: /Jobs/some-id/message
  Job.remoteMethod(
    'complete',
    {
      http: {path: '/:id/complete', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'string', required: true, http: { source: 'path' }}
      ],
      returns: {root: true, type: 'object'},
      description: 'Marks a job as complete.'
    }
  );

  // the actual function called by the route to do the work
  Job.complete = function(id, cb) {
    Job.findById(id, function(err, record){
      if (err) cb(err);
      if (!err) cb(null, record);
    })
  };


};
