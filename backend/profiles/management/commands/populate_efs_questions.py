from django.core.management.base import BaseCommand
from profiles.models import QuestionnaireTemplate, Question


class Command(BaseCommand):
    help = 'Populate EFS (Edmonton Frail Scale) questions'

    def handle(self, *args, **options):
        questionnaire, created = QuestionnaireTemplate.objects.get_or_create(
            name='EFS',
            defaults={
                'description': 'Edmonton Frail Scale assessment to evaluate frailty across multiple domains',
                'version': '1.0'
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS('Created EFS questionnaire template'))
        else:
            questionnaire.questions.all().delete()
            self.stdout.write(self.style.SUCCESS('Updated existing EFS questionnaire template'))

        efs_questions = [
            {
                'order': 1,
                'text': 'Which of these activities do you usually do first in the morning?',
                'question_type': 'SINGLE_CHOICE',
                'options': [
                    {'value': 1, 'label': 'Watch TV'},
                    {'value': 0, 'label': 'Eat breakfast'},
                    {'value': 2, 'label': 'Turn off the lights'}
                ],
                'metadata': {'category': 'cognition'}
            },
            {
                'order': 2,
                'text': 'How do you rate your general health?',
                'question_type': 'SINGLE_CHOICE',
                'options': [
                    {'value': 0, 'label': 'Good'},
                    {'value': 1, 'label': 'Fair'},
                    {'value': 2, 'label': 'Poor'}
                ],
                'metadata': {'category': 'general_health'}
            },
            {
                'order': 3,
                'text': 'How many activities of daily living do you need help with?',
                'question_type': 'SINGLE_CHOICE',
                'options': [
                    {'value': 0, 'label': 'Independent'},
                    {'value': 1, 'label': 'Need help with 1 activity'},
                    {'value': 2, 'label': 'Need help with 2 or more activities'}
                ],
                'metadata': {'category': 'functional_independence'}
            },
            {
                'order': 4,
                'text': 'Do you have someone to help you when needed?',
                'question_type': 'SINGLE_CHOICE',
                'options': [
                    {'value': 0, 'label': 'Adequate support'},
                    {'value': 1, 'label': 'Inadequate support'}
                ],
                'metadata': {'category': 'social_support'}
            },
            {
                'order': 5,
                'text': 'How many medications are you taking daily?',
                'question_type': 'SINGLE_CHOICE',
                'options': [
                    {'value': 0, 'label': 'Less than 5'},
                    {'value': 1, 'label': '5 or more'}
                ],
                'metadata': {'category': 'medication_use'}
            },
            {
                'order': 6,
                'text': 'Have you had weight loss or poor appetite recently?',
                'question_type': 'SINGLE_CHOICE',
                'options': [
                    {'value': 0, 'label': 'No'},
                    {'value': 1, 'label': 'Yes'}
                ],
                'metadata': {'category': 'nutrition'}
            },
            {
                'order': 7,
                'text': 'Do you often feel sad or depressed?',
                'question_type': 'SINGLE_CHOICE',
                'options': [
                    {'value': 0, 'label': 'No'},
                    {'value': 1, 'label': 'Yes'}
                ],
                'metadata': {'category': 'mood'}
            },
            {
                'order': 8,
                'text': 'Do you have urinary or fecal incontinence?',
                'question_type': 'SINGLE_CHOICE',
                'options': [
                    {'value': 0, 'label': 'No'},
                    {'value': 1, 'label': 'Yes'}
                ],
                'metadata': {'category': 'continence'}
            },
            {
                'order': 9,
                'text': 'How long (in seconds) does it take you to complete the Timed Up and Go test?',
                'question_type': 'SINGLE_CHOICE',
                'options': [
                    {'value': 0, 'label': '≤ 10 seconds'},
                    {'value': 1, 'label': '11–20 seconds'},
                    {'value': 2, 'label': '> 20 seconds'}
                ],
                'metadata': {'category': 'functional_performance'}
            }
        ]

        for q in efs_questions:
            Question.objects.create(
                questionnaire=questionnaire,
                order=q['order'],
                text=q['text'],
                question_type=q['question_type'],
                options=q['options'],
                metadata=q['metadata']
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully populated {len(efs_questions)} EFS questions'
            )
        )
