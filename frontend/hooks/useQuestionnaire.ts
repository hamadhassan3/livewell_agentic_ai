import { useCallback, useEffect, useState } from 'react';
import { getQuestion, submitAnswer } from '../api/questionnaireService';
import { Option, QuestionnaireState } from '../types';

export const useQuestionnaire = () => {
  const [state, setState] = useState<QuestionnaireState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadQuestion();
  }, []);

  const loadQuestion = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSelectedOption(null);
    try {
      const data = await getQuestion();
      setState(data);
    } catch (e) {
      setError('Failed to load question.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectOption = (option: Option) => {
    setSelectedOption(option);
  };

  const handleNextQuestion = async () => {
    if (!selectedOption || !state) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await submitAnswer({
        questionnaire_name: state.questionnaire_name,
        answer_data: {
          value: selectedOption.value,
          label: selectedOption.label,
        },
      });

      if (state.is_completed || state.current_order === state.total_questions) {
        setState(prevState => prevState ? { ...prevState, is_completed: true } : null);
      } else {
        await loadQuestion();
      }
    } catch (e) {
      setError('Failed to submit answer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    state,
    isLoading,
    error,
    selectedOption,
    isSubmitting,
    handleSelectOption,
    handleNextQuestion,
  };
};
