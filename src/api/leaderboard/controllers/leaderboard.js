// Initialize the global memory cache
global.leaderboardCache = global.leaderboardCache || {};

module.exports = {
  async getLeaderboard(ctx) {
    const { batchId } = ctx.query;

    if (!batchId) {
      return ctx.badRequest('Missing batchId parameter');
    }

    // 1. Check Cache
    const cacheKey = `batch_${batchId}`;
    if (global.leaderboardCache[cacheKey] && global.leaderboardCache[cacheKey].leaderboards) {
      return global.leaderboardCache[cacheKey]; // Serve instantly from memory
    }

    try {
      const isNumeric = !isNaN(batchId) && String(batchId).trim() !== '';

      // 2. Fetch Active Settings for this Batch (Strapi v5 Document Service / EntityService)
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
          // Fallback: search without batch filter if setting has no batch linked
          config = await strapi.documents('api::leaderboard-setting.leaderboard-setting').findMany({
            filters: {
              isActive: true,
            },
            limit: 1,
          });
        }
      } else if (strapi.entityService) {
        config = await strapi.entityService.findMany('api::leaderboard-setting.leaderboard-setting', {
          filters: {
            batch: batchId,
            isActive: true,
          },
          limit: 1,
        });
      }

      let startDate, endDate, title;

      if (config && config.length > 0) {
        const activeConfig = config[0];
        startDate = activeConfig.startDate;
        endDate = activeConfig.endDate;
        title = activeConfig.title || 'Batch Standings';
      } else {
        // Fallback: Current month
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        title = 'Monthly Standings';
      }

      // 3. Fetch all Exam Results for this batch within the date range
      let examResults = [];
      const examFilters = {
        exam: {
          batch: isNumeric ? { id: Number(batchId) } : { documentId: String(batchId) },
        },
      };

      if (startDate || endDate) {
        examFilters.exam.date = {};
        if (startDate) examFilters.exam.date.$gte = startDate;
        if (endDate) examFilters.exam.date.$lte = endDate;
      }

      if (strapi.documents) {
        examResults = await strapi.documents('api::exam-result.exam-result').findMany({
          filters: examFilters,
          populate: {
            exam: true,
            users_permissions_user: true,
          },
        });
      } else if (strapi.entityService) {
        examResults = await strapi.entityService.findMany('api::exam-result.exam-result', {
          filters: {
            exam: {
              batch: batchId,
              date: {
                ...(startDate ? { $gte: startDate } : {}),
                ...(endDate ? { $lte: endDate } : {}),
              },
            },
          },
          populate: ['exam', 'users_permissions_user'],
        });
      }

      // 4. Calculate Averages in memory
      const groupedData = { theory: {}, entrance: {} };

      (examResults || []).forEach((result) => {
        const user = result.users_permissions_user || result.user;
        const exam = result.exam;
        if (!user || !exam) return;

        const userId = user.id;
        const userDocId = user.documentId;
        const username = user.username || user.name || user.email || `Student (${userId})`;

        // Support both 'type' and 'Type' schema properties
        const rawType = (exam.type || exam.Type || 'theory').toString().toLowerCase();
        const examType = rawType.includes('entrance') ? 'entrance' : 'theory';

        // Support both 'obtained_marks' and 'obtainedMarks'
        const marks = parseFloat(result.obtained_marks ?? result.obtainedMarks ?? 0);

        const key = userDocId || userId;
        if (!groupedData[examType][key]) {
          groupedData[examType][key] = { userId, documentId: userDocId, username, totalMarks: 0, count: 0 };
        }

        groupedData[examType][key].totalMarks += marks;
        groupedData[examType][key].count += 1;
      });

      // Helper function to format and sort the grouped data
      const formatAndSort = (dataObj) => {
        return Object.values(dataObj)
          .map((student) => ({
            userId: student.userId,
            documentId: student.documentId,
            username: student.username,
            averageMarks: parseFloat((student.totalMarks / student.count).toFixed(2)),
          }))
          .sort((a, b) => b.averageMarks - a.averageMarks);
      };

      // 5. Build Final Response
      const responseData = {
        meta: {
          title,
          startDate,
          endDate,
        },
        leaderboards: {
          theory: formatAndSort(groupedData.theory),
          entrance: formatAndSort(groupedData.entrance),
        },
      };

      // 6. Save to Cache
      global.leaderboardCache[cacheKey] = responseData;

      return responseData;
    } catch (err) {
      if (strapi.log) {
        strapi.log.error('Error generating leaderboards:', err);
      }
      return ctx.internalServerError(err.message || 'Error generating leaderboards');
    }
  },
};