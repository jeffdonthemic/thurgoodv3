/**
* This boot script defines custom Express routes not tied to models
**/

var fs = require('fs');
var request = require('request');
var AdmZip = require('adm-zip');
var nodegit = require('nodegit');
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
    var remote;
    var index;

    var zip = new AdmZip("tmp/sfdc-test-thurgood-src1.zip");

    fse.ensureDirAsync(path.resolve(__dirname, repoDir))
    .then(function() {
      return nodegit.Repository.init(path.resolve(__dirname, repoDir), 0);
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
      var author = nodegit.Signature.create("Thurgood", "thurgood@appirio.com", 123456789, 60);
      var committer = nodegit.Signature.create("Thurgood","thurgood@appirio.com", 987654321, 90);
      return repository.createCommit("HEAD", author, committer, "Initial commit courtesy of Thurgood!", oid, []);
    })
    .then(function(commit){
      repository.createBranch(
        "mybranch",
        commit,
        0,
        repository.defaultSignature(),
        "Created mybranch on HEAD");
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
      console.log('remote Connected?', remote.connected())
      return remote.push(
          ["refs/heads/master:refs/heads/master"],
          null,
          repository.defaultSignature(),
          "Push to master")
    })
    .then(function() {
      console.log('remote Pushed!')
    })
    .catch(function(reason) {
      console.log(reason);
    })
    .finally(function(){
      res.send('done');
    })

  });

}
