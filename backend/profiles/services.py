from .models import User, UserQuestionnaireSession, Answer

def get_user_details(user_id: int):
    """
    Retrieves user details for a given user.
    """
    try:
        user = User.objects.get(id=user_id)
        return {
            "user_id": user.id,
            "user_name": user.name,
            "user_email": user.email,
            "current_questionnaire_progress": user.current_questionnaire_progress,
            "gender": user.gender,
            "date_of_birth": user.date_of_birth,
            "height": user.height,
            "weight": user.weight,
        }
    except User.DoesNotExist:
        return None

def calculate_questionnaire_score(session_id: int):
    """
    Calculates the total score for a given questionnaire session.
    """
    answers = Answer.objects.filter(session_id=session_id)
    total_score = 0
    for answer in answers:
        if isinstance(answer.answer_data, dict) and 'value' in answer.answer_data:
            total_score += answer.answer_data['value']
    return total_score

def get_user_questionnaire_responses(user_id: int):
    """
    Retrieves all questionnaire responses for a given user.
    """
    try:
        user = User.objects.get(id=user_id)
        sessions = UserQuestionnaireSession.objects.filter(user=user)
        
        responses = {
            "questionnaires": []
        }

        for session in sessions:
            total_score = calculate_questionnaire_score(session.id)
            questionnaire_data = {
                "questionnaire": session.questionnaire.name,
                "completed_at": session.completed_at,
                "total_score": total_score,
                "is_completed": session.is_completed,
                "answers": []
            }
            
            answers = Answer.objects.filter(session=session)
            for answer in answers:
                questionnaire_data["answers"].append({
                    "question": answer.question.text,
                    "answer": answer.answer_data
                })
            
            responses["questionnaires"].append(questionnaire_data)
            
        return responses
    except User.DoesNotExist:
        return None
