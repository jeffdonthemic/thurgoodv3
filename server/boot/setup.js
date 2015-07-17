/**
* This boot script ensures that an admin user always exists
**/

module.exports = function(app) {
  var User = app.models.User;
  var Role = app.models.Role;

  if (process.env.NODE_ENV === 'test') {

    User.create([
      {
        username: 'jeffdonthemic',
        email: 'jeff@jeffdouglas.com',
        password: 'password'
      },
      {
        username: 'test-user1',
        email: 'test-user1@noemail.com',
        password: 'password'
      },
      {
        username: 'test-user2',
        email: 'test-user2@noemail.com',
        password: 'password'
      }
    ], function(err, users) {
      if (err) {
        console.log('Error creating user', err);
      }
    });

  }

};
