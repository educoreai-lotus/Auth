const { connect, getDb, close } = require('./connections/mongodb');

module.exports = {
  connect,
  getDb,
  close,
};

