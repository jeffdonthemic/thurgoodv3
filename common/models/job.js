var Promise = require("bluebird");
var logger = require('strong-logger');
var sendgrid  = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);
var fs = require('fs');
var request = require('request');
var AdmZip = require('adm-zip');
var nodegit = require('nodegit');
var path = require("path");
var fse = Promise.promisifyAll(require('fs-extra'));

module.exports = function(Job) {

  // loopback doesn't support promises at this time :(
  var findJobById = function(id) {
    return new Promise(function(resolve, reject) {
      Job.findById(id, function(err, job){
        if (err) reject(err);
        if (!err) resolve(job);
      });
    });
  };

  var updateJob = function(job, attributes) {
    return new Promise(function(resolve, reject) {
      job.updateAttributes(attributes, function(err, job){
        if (err) reject(err);
        if (!err) resolve(job);
      });
    });
  };

  var pushToGithub = function(job) {
    return new Promise(function(resolve, reject) {

      var repoDir = '../../tmp/' + job.id;
      var repository = nodegit.Repository.init(path.resolve(__dirname, repoDir), 0);
      var remote;
      var index;

      var initRepo = function(dir) {
        return new Promise(function(resolve, reject) {
          resolve(nodegit.Repository.init(path.resolve(__dirname, dir), 0));
        });
      };

      //
      initRepo(repoDir)
      .then(function(repo) {
        repository = repo;
        return repository.openIndex();
      })
      .then(function(idx) {
        index = idx;
        index.read(1);
        return index.addAll(repoDir);
      })
      .then(function() {
        index.write();
        return index.writeTree();
      })
      .then(function(oid) {
        var now = Math.round(Date.now() / 1000);
        var author = nodegit.Signature.create("Thurgood", "thurgood@appirio.com", now, 0);
        var committer = nodegit.Signature.create("Thurgood","thurgood@appirio.com", now, 0);
        return repository.createCommit("HEAD", author, committer, "Initial commit courtesy of Thurgood!", oid, []);
      })
      .then(function(){
        return nodegit.Remote.create(repository, "origin", "git@github.com:jeffdonthemic/push-test.git");
      })
      .then(function(remoteResult){
        remote = remoteResult;
        remote.setCallbacks({
            credentials: function(url, userName) {
                return nodegit.Cred.sshKeyFromAgent(userName);
            }
        });
        return remote.connect(nodegit.Enums.DIRECTION.PUSH);
      })
      .then(function() {
        return remote.push(
            ["+refs/heads/master:refs/heads/master"],
            null,
            repository.defaultSignature(),
            "Push to master")
      })
      .then(function(result) {
        logger.error('[job-'+job.id+'] code pushed to github.');
        resolve(job);
      })
      .catch(function(err) {
        logger.error('[job-'+job.id+'] ' + err);
        reject(err)
      })
      .finally(function() {
        fse.delete(path.resolve(__dirname, repoDir), function (err) {
          if (err) logger.fatal('[job-'+job.id+'] error deleting directory:' + err);
        })
      });

    });
  }

  var downloadZip = function(job) {
    return new Promise(function(resolve, reject) {
      // create the job directory
      var dir = path.resolve(__dirname, '../../tmp/' + job.id);
      fse.ensureDirAsync(path.resolve(__dirname, dir))

      // download and upzip all contents
      var download = request(job.codeUrl)
        .pipe(fse.createWriteStream('tmp/' + job.id + '/archive.zip'));
      download.on('finish', function(){
        logger.info('[job-'+job.id+'] code successfully downloaded.');
        try {
          var zip = new AdmZip('tmp/' + job.id + '/archive.zip');
          zip.extractAllTo('tmp/' + job.id, true);
          logger.info('[job-'+job.id+'] code successfully unzipped.');
          resolve(job);
        } catch (err) {
          reject(err);
        }
      })
    });
  }

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
    findJobById(id)
       .then(downloadZip)
       .then(pushToGithub)
       .then(function(job) {
         updateJob(job, {status: 'in progress', startTime: new Date(), updatedAt: new Date()})
           .then(function(job) {
             cb(null, job);
           })
       }).catch(function(e) {
         cb(e)
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
