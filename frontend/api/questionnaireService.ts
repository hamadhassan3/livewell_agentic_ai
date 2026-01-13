import { AnswerPayload, QuestionnaireState } from "@/types/questionnaireTypes";
import apiClient from "./apiClient";

export const getQuestion = async (): Promise<QuestionnaireState> => {
  const response = await apiClient.get<QuestionnaireState>(
    `profiles/questionnaire/${process.env.EXPO_PUBLIC_FRAILTY_SCALE}/question/`
  );
  return response.data;
};

export const submitAnswer = async (
  payload: AnswerPayload
): Promise<{ success: boolean }> => {
  const response = await apiClient.post(
    "profiles/questionnaire/answer/",
    payload
  );
  return response.data;
};
