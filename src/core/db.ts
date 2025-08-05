import DataStore from 'nedb';

const db: { servers: DataStore; words: DataStore; ignoredUsers: DataStore } = {
  servers: new DataStore('db/servers.db'),
  words: new DataStore('db/words.db'),
  ignoredUsers: new DataStore('db/ignoredUsers.db'),
};

export default db;
