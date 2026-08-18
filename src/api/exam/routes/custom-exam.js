'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/exams/my-scores',
      handler: 'exam.getMyScores',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/exams/:id/paper',
      handler: 'exam.getExamPaper',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/exams/:id/submit',
      handler: 'exam.submitExam',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/exams/:id/lock',
      handler: 'exam.lockExam',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/exams/:id/my-result',
      handler: 'exam.getMyResult',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
