/**
* This boot script ensures that an admin user always exists
**/

module.exports = function(app) {
  var User = app.models.User;
  var Role = app.models.Role;

  User.create([
    {
      id: 'jeffdonthemic',
      username: 'jeffdonthemic',
      email: 'jeff@jeffdouglas.com',
      password: 'password'
    }
  ], function(err, users) {
    if (err) {
      console.log('Error creating user', err);
    }
  });
};
