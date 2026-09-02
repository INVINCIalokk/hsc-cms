"use strict";

/**
 * exam controller (Strapi 5 Document ID & Strapi 4 Compatible)
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::exam.exam", ({ strapi }) => ({
  /**
   * Helper method to find an Exam by documentId or numeric id
   */
  async findExamByIdOrDocumentId(id, populate) {
    if (!id) return null;
    const strId = String(id).trim();
    const numId = !isNaN(strId) ? Number(strId) : null;

    if (strapi.documents && isNaN(strId)) {
      try {
        const doc = await strapi.documents("api::exam.exam").findOne({
          documentId: strId,
          populate,
        });
        if (doc) return doc;
      } catch (e) {
        strapi.log?.warn?.(
          `[ExamController] strapi.documents.findOne failed for ${strId}: ${e.message}`,
        );
      }
    }

    if (strapi.documents) {
      try {
        const filters =
          numId !== null
            ? { $or: [{ documentId: strId }, { id: numId }] }
            : { documentId: strId };

        const doc = await strapi.documents("api::exam.exam").findFirst({
          filters,
          populate,
        });
        if (doc) return doc;
      } catch (e) {
        strapi.log?.warn?.(
          `[ExamController] strapi.documents.findFirst failed for ${strId}: ${e.message}`,
        );
      }
    }

    if (strapi.entityService) {
      try {
        const filters =
          numId !== null
            ? { $or: [{ documentId: strId }, { id: numId }] }
            : { documentId: strId };

        const results = await strapi.entityService.findMany("api::exam.exam", {
          filters,
          populate,
          limit: 1,
        });
        if (results && results.length > 0) return results[0];
      } catch (e) {
        strapi.log?.warn?.(
          `[ExamController] entityService findMany failed for ${strId}: ${e.message}`,
        );
      }
    }

    if (strapi.db) {
      try {
        const where =
          numId !== null
            ? { $or: [{ documentId: strId }, { id: numId }] }
            : { documentId: strId };

        const result = await strapi.db.query("api::exam.exam").findOne({
          where,
          populate,
        });
        if (result) return result;
      } catch (e) {
        strapi.log?.warn?.(
          `[ExamController] db.query findOne failed for ${strId}: ${e.message}`,
        );
      }
    }

    return null;
  },

  /**
   * Helper method to find an ExamResult for a given user & exam
   */
  async findExamResult(exam, user) {
    if (!exam || !user) return null;

    const examDocId = exam.documentId || String(exam.id);
    const userDocId = user.documentId || String(user.id);
    const examNumId = exam.id ? Number(exam.id) : null;
    const userNumId = user.id ? Number(user.id) : null;

    if (strapi.documents) {
      try {
        const results = await strapi
          .documents("api::exam-result.exam-result")
          .findMany({
            filters: {
              $or: [
                {
                  exam: { documentId: examDocId },
                  users_permissions_user: { documentId: userDocId },
                },
                ...(examNumId && userNumId
                  ? [
                      {
                        exam: { id: examNumId },
                        users_permissions_user: { id: userNumId },
                      },
                    ]
                  : []),
              ],
            },
            limit: 1,
          });
        if (results && results.length > 0) return results[0];
      } catch (e) {
        strapi.log?.warn?.(
          `[ExamController] findExamResult documents failed: ${e.message}`,
        );
      }
    }

    if (strapi.entityService) {
      try {
        const results = await strapi.entityService.findMany(
          "api::exam-result.exam-result",
          {
            filters: {
              exam: examNumId || examDocId,
              users_permissions_user: userNumId || userDocId,
            },
            limit: 1,
          },
        );
        if (results && results.length > 0) return results[0];
      } catch (e) {
        strapi.log?.warn?.(
          `[ExamController] findExamResult entityService failed: ${e.message}`,
        );
      }
    }

    if (strapi.db) {
      try {
        const result = await strapi.db
          .query("api::exam-result.exam-result")
          .findOne({
            where: {
              exam: exam.id || examDocId,
              users_permissions_user: user.id || userDocId,
            },
          });
        if (result) return result;
      } catch (e) {}
    }

    return null;
  },

  /**
   * Helper method to save (create or update) an ExamResult
   */
  async saveExamResult(existingResult, resultData) {
    if (strapi.documents) {
      try {
        if (existingResult && existingResult.documentId) {
          return await strapi.documents("api::exam-result.exam-result").update({
            documentId: existingResult.documentId,
            data: resultData,
          });
        } else {
          return await strapi.documents("api::exam-result.exam-result").create({
            data: resultData,
          });
        }
      } catch (e) {
        strapi.log?.warn?.(
          `[ExamController] saveExamResult documents failed: ${e.message}`,
        );
      }
    }

    if (strapi.entityService) {
      if (existingResult && existingResult.id) {
        return await strapi.entityService.update(
          "api::exam-result.exam-result",
          existingResult.id,
          {
            data: resultData,
          },
        );
      } else {
        return await strapi.entityService.create(
          "api::exam-result.exam-result",
          {
            data: resultData,
          },
        );
      }
    }

    throw new Error("Could not save exam result");
  },

  /**
   * GET /api/exams/:id/paper
   */
  async getExamPaper(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;

    const populate = {
      batch: true,
      question_paper: {
        populate: {
          paper_questions: {
            populate: {
              question: {
                populate: ["mcq_options", "question_image", "solution_image"],
              },
            },
          },
        },
      },
    };

    const exam = await this.findExamByIdOrDocumentId(id, populate);

    if (!exam) {
      return ctx.notFound("Exam not found");
    }

    const status = (
      exam.exam_status ||
      exam.status ||
      "inactive"
    ).toLowerCase();

    if (status === "inactive") {
      return ctx.forbidden(
        "This question paper is currently inactive and cannot be accessed.",
      );
    }

    if (user) {
      const existingResult = await this.findExamResult(exam, user);
      if (existingResult && existingResult.is_locked) {
        return ctx.forbidden(
          "EXAM_LOCKED: Your exam access has been locked due to screen/tab switching. Contact your admin to unlock your exam.",
        );
      }
    }

    const questionPaper = exam.question_paper;
    if (!questionPaper) {
      return ctx.badRequest("No question paper is assigned to this exam.");
    }

    const rawQuestions = questionPaper.paper_questions || [];
    const examType = (
      exam.type ||
      questionPaper.type ||
      "theory"
    ).toLowerCase();

    if (status === "active") {
      const sanitizedPaperQuestions = rawQuestions.map((entry) => {
        const q = entry.question;
        if (!q) return entry;

        const { Solution, solution_video_url, solution_image, ...safeQuestion } = q;

        if (Array.isArray(safeQuestion.mcq_options)) {
          safeQuestion.mcq_options = safeQuestion.mcq_options.map((opt) => {
            const { is_correct, explanation, ...safeOpt } = opt;
            return safeOpt;
          });
        }

        return {
          ...entry,
          question: safeQuestion,
        };
      });

      return {
        data: {
          documentId: exam.documentId || String(exam.id),
          exam_id: exam.id,
          title: exam.title,
          type: examType,
          status: "active",
          duration_minutes:
            exam.duration_minutes || questionPaper.duration_minutes,
          total_marks: exam.total_marks || questionPaper.total_marks,
          instructions: exam.instructions || questionPaper.instructions,
          can_view_solutions: false,
          paper_questions: sanitizedPaperQuestions,
        },
      };
    }

    return {
      data: {
        documentId: exam.documentId || String(exam.id),
        exam_id: exam.id,
        title: exam.title,
        type: examType,
        status: "completed",
        duration_minutes:
          exam.duration_minutes || questionPaper.duration_minutes,
        total_marks: exam.total_marks || questionPaper.total_marks,
        instructions: exam.instructions || questionPaper.instructions,
        can_view_solutions: true,
        paper_questions: rawQuestions,
      },
    };
  },

  /**
   * POST /api/exams/:id/lock
   */
  async lockExam(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized("You must be logged in to access this exam.");
    }

    const { id } = ctx.params;
    const { reason } = ctx.request.body || {};

    const exam = await this.findExamByIdOrDocumentId(id);
    if (!exam) {
      return ctx.notFound("Exam not found");
    }

    const existingResult = await this.findExamResult(exam, user);
    const currentCount = existingResult?.tab_switch_count || 0;
    const newCount = currentCount + 1;
    const lockReason =
      reason ||
      `Tab switch detected at ${new Date().toLocaleTimeString()} (Attempt count: ${newCount})`;

    const userDocId = user.documentId || String(user.id);
    const examDocId = exam.documentId || String(exam.id);

    const resultData = {
      is_locked: true,
      tab_switch_count: newCount,
      lock_reason: lockReason,
      status: "in_progress",
      users_permissions_user: userDocId,
      exam: examDocId,
    };

    const examResult = await this.saveExamResult(existingResult, resultData);

    return {
      data: {
        is_locked: true,
        tab_switch_count: newCount,
        lock_reason: lockReason,
        message: "Exam locked successfully due to tab switching.",
      },
    };
  },

  /**
   * POST /api/exams/:id/submit
   */
  async submitExam(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized("You must be logged in to submit an exam.");
    }

    const { id } = ctx.params;
    const { responses, start_time } = ctx.request.body;

    if (!Array.isArray(responses)) {
      return ctx.badRequest("Responses must be an array of question answers.");
    }

    const populate = {
      question_paper: {
        populate: {
          paper_questions: {
            populate: {
              question: {
                populate: ["mcq_options"],
              },
            },
          },
        },
      },
    };

    const exam = await this.findExamByIdOrDocumentId(id, populate);

    if (!exam) {
      return ctx.notFound("Exam not found");
    }

    const status = (
      exam.exam_status ||
      exam.status ||
      "inactive"
    ).toLowerCase();
    if (status === "inactive") {
      return ctx.forbidden("Cannot submit answers for an inactive exam.");
    }

    const examType = (
      exam.type ||
      exam.question_paper?.type ||
      "theory"
    ).toLowerCase();
    const isTheory = examType === "theory";
    const paperQuestions = exam.question_paper?.paper_questions || [];
    const userDocId = user.documentId || String(user.id);
    const examDocId = exam.documentId || String(exam.id);

    let resultData = {};

    if (isTheory) {
      const totalMarksPossible = Number(
        exam.total_marks || exam.question_paper?.total_marks || 0,
      );

      resultData = {
        total_marks: totalMarksPossible,
        obtained_marks: null,
        start_time: start_time || new Date().toISOString(),
        submit_time: new Date().toISOString(),
        status: "submitted",
        responses,
        is_locked: false,
        users_permissions_user: userDocId,
        exam: examDocId,
      };
    } else {
      const questionMap = new Map();
      paperQuestions.forEach((pq) => {
        if (pq.question) {
          const qId = pq.question.documentId || pq.question.id;
          questionMap.set(String(qId), {
            question: pq.question,
            marks: pq.marks_override ?? pq.question.default_marks ?? 1.0,
            negative_marks:
              pq.negative_marks_override ??
              pq.question.default_negative_marks ??
              0.0,
          });
        }
      });

      let obtainedMarks = 0;
      let totalMarksPossible = 0;
      let correctCount = 0;
      let incorrectCount = 0;
      let unattemptedCount = 0;
      const evaluatedResponses = [];

      questionMap.forEach(({ question, marks, negative_marks }, questionId) => {
        totalMarksPossible += Number(marks);

        const userSubmission = responses.find(
          (r) =>
            String(r.question_id) === String(questionId) ||
            String(r.question_document_id) === String(questionId),
        );
        const selectedOptionKey = userSubmission?.selected_option_key;

        if (!selectedOptionKey) {
          unattemptedCount++;
          evaluatedResponses.push({
            question_id: questionId,
            selected_option_key: null,
            is_attempted: false,
            is_correct: false,
            marks_awarded: 0,
          });
        } else {
          const correctOption = (question.mcq_options || []).find(
            (opt) => opt.is_correct === true,
          );
          const isCorrect =
            correctOption &&
            String(correctOption.option_key).toUpperCase() ===
              String(selectedOptionKey).toUpperCase();

          let awarded = 0;
          if (isCorrect) {
            correctCount++;
            awarded = Number(marks);
            obtainedMarks += awarded;
          } else {
            incorrectCount++;
            awarded = -Math.abs(Number(negative_marks));
            obtainedMarks += awarded;
          }

          evaluatedResponses.push({
            question_id: questionId,
            selected_option_key: selectedOptionKey,
            correct_option_key: correctOption?.option_key || null,
            is_attempted: true,
            is_correct: isCorrect,
            marks_awarded: awarded,
          });
        }
      });

      const attemptedCount = correctCount + incorrectCount;
      const accuracy =
        attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;
      const passingMarks =
        exam.question_paper?.passing_marks || totalMarksPossible * 0.35;
      const remarks = obtainedMarks >= passingMarks ? "PASS" : "FAIL";

      resultData = {
        obtained_marks: obtainedMarks,
        total_marks: totalMarksPossible,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        unattempted_count: unattemptedCount,
        accuracy_percentage: Number(accuracy.toFixed(2)),
        start_time: start_time || new Date().toISOString(),
        submit_time: new Date().toISOString(),
        status: "evaluated",
        responses: evaluatedResponses,
        remarks,
        is_locked: false,
        users_permissions_user: userDocId,
        exam: examDocId,
      };
    }

    const existingResult = await this.findExamResult(exam, user);
    const examResult = await this.saveExamResult(existingResult, resultData);

    return {
      data: {
        result_id: examResult?.documentId || examResult?.id,
        type: examType,
        status: resultData.status,
        obtained_marks: resultData.obtained_marks,
        total_marks: resultData.total_marks,
        correct_count: resultData.correct_count,
        incorrect_count: resultData.incorrect_count,
        unattempted_count: resultData.unattempted_count,
        accuracy_percentage: resultData.accuracy_percentage,
        remarks: resultData.remarks,
        message: isTheory
          ? "Theory exam submitted successfully. Your paper will be evaluated by your instructor."
          : "Entrance exam submitted and evaluated successfully.",
      },
    };
  },

  /**
   * GET /api/exams/:id/my-result
   */
  async getMyResult(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized(
        "You must be logged in to view your exam result.",
      );
    }

    const { id } = ctx.params;
    const exam = await this.findExamByIdOrDocumentId(id);

    if (!exam) {
      return ctx.notFound("Exam not found");
    }

    const result = await this.findExamResult(exam, user);

    if (!result) {
      return ctx.notFound("No result found for this exam.");
    }

    return {
      data: result,
    };
  },

  /**
   * GET /api/exams/my-scores
   * Returns all batch exams for the logged-in student with scores, absent statuses, and entrance percentiles.
   */
  async getMyScores(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized("You must be logged in to view your scores.");
    }

    // Populate user's batch from DB if not present in ctx.state.user
    let fullUser = user;
    if (user) {
      if (strapi.documents) {
        try {
          const u = await strapi
            .documents("plugin::users-permissions.user")
            .findOne({
              documentId: user.documentId || String(user.id),
              populate: ["batch"],
            });
          if (u) fullUser = u;
        } catch (e) {}
      }
      if (!fullUser.batch && strapi.entityService) {
        try {
          const u = await strapi.entityService.findOne(
            "plugin::users-permissions.user",
            user.id,
            {
              populate: ["batch"],
            },
          );
          if (u) fullUser = u;
        } catch (e) {}
      }
      if (!fullUser.batch && strapi.db) {
        try {
          const u = await strapi.db
            .query("plugin::users-permissions.user")
            .findOne({
              where: { id: user.id },
              populate: ["batch"],
            });
          if (u) fullUser = u;
        } catch (e) {}
      }
    }

    const queryBatchId = ctx.query?.batchId;
    const userBatchDocId =
      queryBatchId ||
      fullUser.batch?.documentId ||
      fullUser.batch?.data?.documentId;
    const userBatchId =
      queryBatchId ||
      fullUser.batch?.id ||
      fullUser.batch?.data?.id ||
      fullUser.batch;

    // Fetch batch exams matching the student's batch or fetch all if no batch filter
    let batchExams = [];
    const filters =
      userBatchDocId || userBatchId
        ? {
            $or: [
              ...(userBatchDocId
                ? [
                    { batch: { documentId: userBatchDocId } },
                    { batch: userBatchDocId },
                  ]
                : []),
              ...(userBatchId
                ? [
                    { batch: { id: Number(userBatchId) } },
                    { batch: userBatchId },
                  ]
                : []),
            ],
          }
        : {};

    if (strapi.documents) {
      try {
        batchExams = await strapi.documents("api::exam.exam").findMany({
          filters,
          populate: ["question_paper", "batch"],
          limit: 500,
        });
      } catch (e) {
        strapi.log?.warn?.(
          `[getMyScores] documents findMany exams failed: ${e.message}`,
        );
      }
    }

    if (!batchExams || batchExams.length === 0) {
      if (strapi.entityService) {
        try {
          batchExams = await strapi.entityService.findMany("api::exam.exam", {
            filters,
            populate: ["question_paper", "batch"],
            limit: 500,
          });
        } catch (e) {}
      }
    }

    if (!batchExams || batchExams.length === 0) {
      if (strapi.db) {
        try {
          batchExams = await strapi.db.query("api::exam.exam").findMany({
            populate: ["question_paper", "batch"],
            limit: 500,
          });
        } catch (e) {}
      }
    }

    // Fetch all ExamResults across students
    let allResults = [];
    if (strapi.documents) {
      try {
        allResults = await strapi
          .documents("api::exam-result.exam-result")
          .findMany({
            populate: ["exam", "users_permissions_user"],
            limit: 1000,
          });
      } catch (e) {}
    }
    if (!allResults || allResults.length === 0) {
      if (strapi.entityService) {
        try {
          allResults = await strapi.entityService.findMany(
            "api::exam-result.exam-result",
            {
              populate: ["exam", "users_permissions_user"],
              limit: 1000,
            },
          );
        } catch (e) {}
      }
    }
    if (!allResults || allResults.length === 0) {
      if (strapi.db) {
        try {
          allResults = await strapi.db
            .query("api::exam-result.exam-result")
            .findMany({
              populate: ["exam", "users_permissions_user"],
              limit: 1000,
            });
        } catch (e) {}
      }
    }

    // Map of examKey -> array of obtained_marks across all students
    const entranceExamScoresMap = new Map();
    (allResults || []).forEach((res) => {
      const exam = res.exam;
      const resUser = res.users_permissions_user || res.user;
      if (!exam || !resUser) return;

      const eType = (exam.type || "theory").toString().toLowerCase();
      if (!eType.includes("entrance")) return;

      const examKey = exam.documentId || String(exam.id);
      const marks = parseFloat(res.obtained_marks ?? res.obtainedMarks ?? 0);

      if (!entranceExamScoresMap.has(examKey)) {
        entranceExamScoresMap.set(examKey, []);
      }
      entranceExamScoresMap.get(examKey).push(marks);
    });

    const calculatePercentile = (examKey, targetScore) => {
      const scores = entranceExamScoresMap.get(examKey) || [];
      if (scores.length === 0) return 100.0;

      const N_total = scores.length;
      let N_below = 0;
      let N_equal = 0;

      scores.forEach((s) => {
        if (s < targetScore) N_below++;
        else if (s === targetScore) N_equal++;
      });

      const percentile = ((N_below + 0.5 * N_equal) / N_total) * 100;
      return Number(percentile.toFixed(2));
    };

    const requestingUserDocId = fullUser.documentId || String(fullUser.id);
    const requestingUserId = Number(fullUser.id);

    const studentResultsMap = new Map();
    (allResults || []).forEach((res) => {
      const resUser = res.users_permissions_user || res.user;
      if (!resUser) return;

      const isSameUser =
        String(resUser.documentId) === String(requestingUserDocId) ||
        Number(resUser.id) === requestingUserId ||
        String(resUser.id) === String(requestingUserId);

      if (isSameUser && res.exam) {
        const eKey = res.exam.documentId || String(res.exam.id);
        studentResultsMap.set(eKey, res);
      }
    });

    const theoryScores = [];
    const entranceScores = [];
    let totalTheoryMarks = 0;
    let theoryExamCount = 0;
    let totalEntrancePercentile = 0;
    let entranceExamCount = 0;
    let absentCount = 0;

    // Deduplicate batchExams by unique documentId / id
    const uniqueExamsMap = new Map();
    (batchExams || []).forEach((exam) => {
      const eKey = exam.documentId || String(exam.id);
      if (!uniqueExamsMap.has(eKey)) {
        uniqueExamsMap.set(eKey, exam);
      }
    });
    const uniqueBatchExams = Array.from(uniqueExamsMap.values());

    (uniqueBatchExams || []).forEach((exam) => {
      const eKey = exam.documentId || String(exam.id);
      const eType = (exam.type || exam.question_paper?.type || "theory")
        .toString()
        .toLowerCase();
      const isEntrance = eType.includes("entrance");
      const studentRes = studentResultsMap.get(eKey);

      const title = exam.title || "Assessment";
      const totalMarks = Number(
        exam.total_marks || exam.question_paper?.total_marks || 100,
      );
      const date = exam.date || exam.start_time || exam.createdAt;

      if (studentRes) {
        const resStatus = studentRes.status || "evaluated";
        const obtainedMarks =
          studentRes.obtained_marks !== null &&
          studentRes.obtained_marks !== undefined
            ? Number(studentRes.obtained_marks)
            : null;

        if (isEntrance) {
          entranceExamCount++;
          const score = obtainedMarks !== null ? obtainedMarks : 0;
          const percentile = calculatePercentile(eKey, score);
          totalEntrancePercentile += percentile;

          entranceScores.push({
            exam_id: eKey,
            title,
            date,
            total_marks: totalMarks,
            obtained_marks: score,
            percentile,
            status: resStatus,
            is_absent: false,
          });
        } else {
          theoryExamCount++;
          const score = obtainedMarks !== null ? obtainedMarks : 0;
          totalTheoryMarks += score;

          theoryScores.push({
            exam_id: eKey,
            title,
            date,
            total_marks: totalMarks,
            obtained_marks: obtainedMarks,
            status: resStatus,
            is_absent: false,
          });
        }
      } else {
        absentCount++;
        if (isEntrance) {
          entranceExamCount++;
          entranceScores.push({
            exam_id: eKey,
            title,
            date,
            total_marks: totalMarks,
            obtained_marks: 0,
            percentile: 0.0,
            status: "absent",
            is_absent: true,
          });
        } else {
          theoryExamCount++;
          totalTheoryMarks += 0;

          theoryScores.push({
            exam_id: eKey,
            title,
            date,
            total_marks: totalMarks,
            obtained_marks: 0,
            status: "absent",
            is_absent: true,
          });
        }
      }
    });

    const theoryAvgMarks =
      theoryExamCount > 0
        ? Number((totalTheoryMarks / theoryExamCount).toFixed(2))
        : 0;
    const entranceAvgPercentile =
      entranceExamCount > 0
        ? Number((totalEntrancePercentile / entranceExamCount).toFixed(2))
        : 0;

    return {
      data: {
        summary: {
          theory_avg_marks: theoryAvgMarks,
          entrance_avg_percentile: entranceAvgPercentile,
          total_exams: uniqueBatchExams.length,
          absent_count: absentCount,
        },
        theory_scores: theoryScores,
        entrance_scores: entranceScores,
      },
    };
  },
}));
