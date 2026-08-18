import type { Schema, Struct } from '@strapi/strapi';

export interface ExamResultQuestionResponse extends Struct.ComponentSchema {
  collectionName: 'components_exam_result_question_responses';
  info: {
    description: 'Component for storing user question responses and evaluation';
    displayName: 'question_response';
    icon: 'check';
  };
  attributes: {
    admin_feedback: Schema.Attribute.Text;
    obtained_marks: Schema.Attribute.Decimal;
    question: Schema.Attribute.Relation<'oneToOne', 'api::question.question'>;
    selected_option: Schema.Attribute.String;
    status: Schema.Attribute.Enumeration<
      ['correct', 'incorrect', 'unattempted', 'pending_evaluation']
    > &
      Schema.Attribute.DefaultTo<'unattempted'>;
    tita_answer: Schema.Attribute.String;
  };
}

export interface ImageImage extends Struct.ComponentSchema {
  collectionName: 'components_image_images';
  info: {
    displayName: 'Image';
  };
  attributes: {
    cards: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
  };
}

export interface PaperPaperQuestionEntry extends Struct.ComponentSchema {
  collectionName: 'components_paper_paper_question_entries';
  info: {
    description: 'Bridge component linking a question to a question paper with order and mark overrides';
    displayName: 'paper_question_entry';
    icon: 'bulletList';
  };
  attributes: {
    marks_override: Schema.Attribute.Decimal;
    negative_marks_override: Schema.Attribute.Decimal;
    order: Schema.Attribute.Integer;
    question: Schema.Attribute.Relation<'oneToOne', 'api::question.question'>;
    section_title: Schema.Attribute.String;
  };
}

export interface QuestionMcqOption extends Struct.ComponentSchema {
  collectionName: 'components_question_mcq_options';
  info: {
    description: 'MCQ Option component with text, image, correctness, and explanation';
    displayName: 'mcq_option';
    icon: 'list-ol';
  };
  attributes: {
    explanation: Schema.Attribute.Blocks;
    is_correct: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    option_image: Schema.Attribute.Media<'images'>;
    option_key: Schema.Attribute.String & Schema.Attribute.Required;
    option_text: Schema.Attribute.Blocks;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'exam-result.question-response': ExamResultQuestionResponse;
      'image.image': ImageImage;
      'paper.paper-question-entry': PaperPaperQuestionEntry;
      'question.mcq-option': QuestionMcqOption;
    }
  }
}
