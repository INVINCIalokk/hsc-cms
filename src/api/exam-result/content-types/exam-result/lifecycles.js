'use strict';

const clearLeaderboardCache = () => {
  global.leaderboardCache = {};
};

module.exports = {
  afterCreate: clearLeaderboardCache,
  afterUpdate: clearLeaderboardCache,
  afterDelete: clearLeaderboardCache,
  afterCreateMany: clearLeaderboardCache,
  afterUpdateMany: clearLeaderboardCache,
  afterDeleteMany: clearLeaderboardCache,
};
