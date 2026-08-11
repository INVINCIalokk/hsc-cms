module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/leaderboard',
      handler: 'leaderboard.getLeaderboard',
      config: {
        auth: false, // Set to true if you only want logged-in users to see it
      },
    },
  ],
};
