// Initialize memory cache
global.leaderboardCache = {};

module.exports = {
  async getLeaderboard(ctx) {
    const { batchId } = ctx.query;

    if (!batchId) {
      return ctx.badRequest('Missing batchId parameter');
    }

    try {
      const isNumeric = !isNaN(batchId) && String(batchId).trim() !== '';

      // 1. Fetch Active Leaderboard Settings for this Batch
      let config = [];
      if (strapi.documents) {
        try {
          config = await strapi.documents('api::leaderboard-setting.leaderboard-setting').findMany({
            filters: {
              batch: isNumeric ? { id: Number(batchId) } : { documentId: String(batchId) },
              isActive: true,
            },
            limit: 1,
          });
        } catch (e) {
          config = await strapi.documents('api::leaderboard-setting.leaderboard-setting').findMany({
            filters: { isActive: true },
            limit: 1,
          });
        }
      } else if (strapi.entityService) {
        try {
          config = await strapi.entityService.findMany('api::leaderboard-setting.leaderboard-setting', {
            filters: { isActive: true },
            limit: 1,
          });
        } catch (e) {}
      }

      let startDate, endDate, title;
      if (config && config.length > 0) {
        const activeConfig = config[0];
        startDate = activeConfig.startDate;
        endDate = activeConfig.endDate;
        title = activeConfig.title || 'Batch Standings';
      } else {
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        title = 'Monthly Standings';
      }

      // 2. Fetch Exam Results
      let examResults = [];
      if (strapi.documents) {
        try {
          examResults = await strapi.documents('api::exam-result.exam-result').findMany({
            populate: {
              exam: {
                populate: ['batch']
              },
              users_permissions_user: {
                populate: ['batch']
              },
            },
            limit: 1000,
          });
        } catch (e) {
          strapi.log.error('Error fetching examResults via documents:', e);
        }
      }

      if (!examResults || examResults.length === 0) {
        if (strapi.entityService) {
          try {
            examResults = await strapi.entityService.findMany('api::exam-result.exam-result', {
              populate: ['exam', 'users_permissions_user'],
              limit: 1000,
            });
          } catch (e) {
            strapi.log.error('Error fetching examResults via entityService:', e);
          }
        }
      }

      const startTimestamp = startDate ? new Date(`${startDate}T00:00:00.000Z`).getTime() : 0;
      const endTimestamp = endDate ? new Date(`${endDate}T23:59:59.999Z`).getTime() : Infinity;

      // Filter valid results matching batch & date range
      const validResults = (examResults || []).filter((result) => {
        const user = result.users_permissions_user || result.user;
        const exam = result.exam;
        if (!user || !exam) return false;

        const examBatch = exam.batch;
        const userBatch = user.batch;

        const matchesBatch =
          !batchId ||
          (isNumeric && (
            Number(examBatch?.id) === Number(batchId) ||
            Number(userBatch?.id) === Number(batchId) ||
            Number(exam.batch) === Number(batchId)
          )) ||
          (!isNumeric && (
            String(examBatch?.documentId || examBatch?.id) === String(batchId) ||
            String(userBatch?.documentId || userBatch?.id) === String(batchId) ||
            String(examBatch) === String(batchId)
          ));

        if (!matchesBatch && (examBatch || userBatch)) return false;

        const resultDateStr = result.attempt_start || result.createdAt || exam.start_time || exam.createdAt;
        if (resultDateStr) {
          const resTime = new Date(resultDateStr).getTime();
          if (resTime < startTimestamp || resTime > endTimestamp) return false;
        }

        return true;
      });

      // Group entrance scores per exam to calculate Percentiles
      const entranceScoresMap = new Map();
      validResults.forEach((result) => {
        const exam = result.exam;
        const rawType = (exam.type || exam.Type || 'theory').toString().toLowerCase();
        if (rawType.includes('entrance')) {
          const examKey = exam.documentId || String(exam.id);
          const marks = parseFloat(result.obtained_marks ?? result.obtainedMarks ?? 0);

          if (!entranceScoresMap.has(examKey)) {
            entranceScoresMap.set(examKey, []);
          }
          entranceScoresMap.get(examKey).push(marks);
        }
      });

      const getPercentile = (examKey, targetScore) => {
        const scores = entranceScoresMap.get(examKey) || [];
        if (scores.length === 0) return 100.0;
        const N_total = scores.length;
        let N_below = 0;
        let N_equal = 0;
        scores.forEach((s) => {
          if (s < targetScore) N_below++;
          else if (s === targetScore) N_equal++;
        });
        return Number((((N_below + 0.5 * N_equal) / N_total) * 100).toFixed(2));
      };

      // Aggregate Theory (average marks) vs Entrance (average percentile)
      const theoryData = {};
      const entranceData = {};

      validResults.forEach((result) => {
        const user = result.users_permissions_user || result.user;
        const exam = result.exam;

        const userId = user.id;
        const userDocId = user.documentId;
        const username = user.username || user.name || user.email || `Student (${userId})`;
        const key = userDocId || userId;

        const rawType = (exam.type || exam.Type || 'theory').toString().toLowerCase();
        const isEntrance = rawType.includes('entrance');
        const marks = parseFloat(result.obtained_marks ?? result.obtainedMarks ?? 0);

        if (isEntrance) {
          const examKey = exam.documentId || String(exam.id);
          const percentile = getPercentile(examKey, marks);

          if (!entranceData[key]) {
            entranceData[key] = { userId, documentId: userDocId, username, totalPercentile: 0, count: 0 };
          }
          entranceData[key].totalPercentile += percentile;
          entranceData[key].count += 1;
        } else {
          if (!theoryData[key]) {
            theoryData[key] = { userId, documentId: userDocId, username, totalMarks: 0, count: 0 };
          }
          theoryData[key].totalMarks += marks;
          theoryData[key].count += 1;
        }
      });

      const formattedTheory = Object.values(theoryData)
        .map((student) => ({
          userId: student.userId,
          documentId: student.documentId,
          username: student.username,
          averageMarks: parseFloat((student.totalMarks / student.count).toFixed(2)),
        }))
        .sort((a, b) => b.averageMarks - a.averageMarks);

      const formattedEntrance = Object.values(entranceData)
        .map((student) => ({
          userId: student.userId,
          documentId: student.documentId,
          username: student.username,
          averagePercentile: parseFloat((student.totalPercentile / student.count).toFixed(2)),
        }))
        .sort((a, b) => b.averagePercentile - a.averagePercentile);

      const responseData = {
        meta: {
          title,
          startDate,
          endDate,
        },
        leaderboards: {
          theory: formattedTheory,
          entrance: formattedEntrance,
        },
      };

      return responseData;
    } catch (err) {
      if (strapi.log) {
        strapi.log.error('Error generating leaderboards:', err);
      }
      return ctx.internalServerError(err.message || 'Error generating leaderboards');
    }
  },
};