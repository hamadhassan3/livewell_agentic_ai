export interface Option {
  label: string;
  value: number | string;
}

export interface Question {
  id: number;
  order: number;
  text: string;
  question_type: 'SINGLE_CHOICE';
  options: Option[];
  is_required: boolean;
  metadata: {
    category: string;
  };
}

export interface QuestionnaireState {
  questionnaire_name: string;
  question: Question;
  current_order: number;
  total_questions: number;
  is_completed: boolean;
}

export interface AnswerPayload {
  questionnaire_name: string;
  answer_data: {
    value: number | string;
    label: string;
  };
}