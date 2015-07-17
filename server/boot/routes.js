/**
* This boot script defines custom Express routes not tied to models
**/

var fs = require('fs');
var request = require('request');
var AdmZip = require('adm-zip');
var Git = require('nodegit');
var path = require("path");
var Promise = require("bluebird");
var fse = Promise.promisifyAll(require('fs-extra'));

module.exports = function(app) {

  /**
  * Defines a routes so that blogs are accessible by user
  * and slug: /jeffdonthemic/hello-world instead of id.
  **/
  app.get('/test', function(req, res) {
    // var download = request('http://cs-thurgood.s3.amazonaws.com/sfdc-test-thurgood-src.zip')
    //   .pipe(fs.createWriteStream('tmp/sfdc-test-thurgood-src1.zip'));
    // download.on('finish', function(){
    //   var zip = new AdmZip("tmp/sfdc-test-thurgood-src1.zip");
    //   zip.extractAllTo('tmp/', true);
    //   res.send('done');
    // })

    // var repodir = path.resolve(__dirname, '../../tmp/repo');
    // //fs.mkdirSync(path.resolve(__dirname, '../../tmp/repo'));

    var repoDir = '../../tmp/repo';
    var repository;
    var index;

    var zip = new AdmZip("tmp/sfdc-test-thurgood-src1.zip");

    fse.ensureDirAsync(path.resolve(__dirname, repoDir))
    .then(function() {
      return Git.Repository.init(path.resolve(__dirname, repoDir), 0);
    })
    .then(function(repo) {
      repository = repo;
      zip.extractAllTo(repository.workdir(), true);
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
      var author = Git.Signature.create("Thurgood", "thurgood@appirio.com", 123456789, 60);
      var committer = Git.Signature.create("Thurgood","thurgood@appirio.com", 987654321, 90);
      return repository.createCommit("HEAD", author, committer, "Initial commit courtesy of Thurgood!", oid, []);
    })
    // Add a new remote
    .then(function() {
      return Git.Remote.create(repository, "origin",
        "git@github.com:jeffdonthemic/push-test.git")
        .then(function(remote) {
          remote.connect(Git.Enums.DIRECTION.PUSH);

          var push;

          // We need to set the auth on the remote, not the push object
          remote.setCallbacks({
            credentials: function(url, userName) {
              return Git.Cred.sshKeyFromAgent(userName);
            }
          });

          // Create the push object for this remote
          return remote.push(
            ["refs/heads/master:refs/heads/master"], null, repository.defaultSignature(),"Push to master")
          .then(function(pushResult) {
            push = pushResult;
            return push.addRefspec("refs/heads/master:refs/heads/master");
          }).then(function() {
            // This is the call that performs the actual push
            return push.finish();
          }).then(function() {
            // Check to see if the remote accepted our push request.
            return push.unpackOk();
          });
        });


    }).done(function() {
      console.log('Done!');
    });

    res.send('done');

  });

}
