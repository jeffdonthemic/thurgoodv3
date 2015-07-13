var winston = require('winston');
var Papertrail = require('winston-papertrail').Papertrail;

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
    Job.findById(id, function(err, record){
      if (err) cb(err);
      if (!err) {

        var logger = new winston.Logger({
          transports: [
            new winston.transports.Papertrail({
              host: 'logs3.papertrailapp.com',
              port: 53467,
              program: 'jeffdonthemic',
              colorize: true,
              logFormat: function(level, message) {
                  return message;
              }
            })
          ]
        });

        // send the message to pt
        logger.info('I am being logged!!');

        cb(null, record);
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
