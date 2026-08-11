'use strict';

const clearLeaderboardCache = () => {
  global.leaderboardCache = {};
};

module.exports = {
  afterCreate: clearLeaderboardCache,
  afterUpdate: clearLeaderboardCache,
  afterDelete: clearLeaderboardCache,
};
