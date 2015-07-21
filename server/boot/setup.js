/**
* This boot script ensures that an admin user always exists
**/

module.exports = function(app) {
  var User = app.models.User;
  var Role = app.models.Role;

  User.create([
    {
      username: 'jeffdonthemic',
      email: 'jeff@jeffdouglas.com',
      password: 'password'
    }
  ]);

};
