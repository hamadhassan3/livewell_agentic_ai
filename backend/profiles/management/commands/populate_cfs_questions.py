from django.core.management.base import BaseCommand
from profiles.models import QuestionnaireTemplate, Question


class Command(BaseCommand):
    help = 'Populate CFS (Clinical Frailty Scale) questions'

    def handle(self, *args, **options):
        # Create or get CFS questionnaire template
        questionnaire, created = QuestionnaireTemplate.objects.get_or_create(
            name='CFS',
            defaults={
                'description': 'Clinical Frailty Scale assessment to evaluate functional status and frailty',
                'version': '1.0'
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS('Created CFS questionnaire template'))
        else:
            # Clear existing questions if updating
            questionnaire.questions.all().delete()
            self.stdout.write(self.style.SUCCESS('Updated existing CFS questionnaire template'))

        # CFS assessment questions based on functional status evaluation
        cfs_questions = [
            {
                'order': 1,
                'text': 'How would you describe your current level of physical activity and exercise?',
                'question_type': 'SINGLE_CHOICE',
                'options': [
                    {'value': 1, 'label': 'Very active - exercise vigorously and regularly'},
                    {'value': 2, 'label': 'Well - exercise occasionally but not regularly'},
                    {'value': 3, 'label': 'Managing well - occasional exercise or very active occasionally'},
                    {'value': 4, 'label': 'Living with very mild frailty - not dependent but slowed up'},
                    {'value': 5, 'label': 'Living with mild frailty - need help with some activities'},
                    {'value': 6, 'label': 'Living with moderate frailty - need help with many activities'},
                    {'value': 7, 'label': 'Living with severe frailty - completely dependent'},
                    {'value': 8, 'label': 'Living with very severe frailty - bed-bound'},
                    {'value': 9, 'label': 'Terminally ill'}
                ],
                'metadata': {
                    'scoring_weight': 1.0,
                    'category': 'physical_activity'
                }
            },
            {
                'order': 2,
                'text': 'How well can you manage your daily activities like dressing, bathing, and personal care?',
                'question_type': 'SINGLE_CHOICE',
                'options': [
                    {'value': 1, 'label': 'Completely independent'},
                    {'value': 2, 'label': 'Independent with minor difficulties'},
                    {'value': 3, 'label': 'Need minimal assistance occasionally'},
                    {'value': 4, 'label': 'Need some help but mostly independent'},
                    {'value': 5, 'label': 'Need regular help with some activities'},
                    {'value': 6, 'label': 'Need help with most daily activities'},
                    {'value': 7, 'label': 'Need help with all daily activities'},
                    {'value': 8, 'label': 'Unable to perform any activities independently'},
                    {'value': 9, 'label': 'Too ill to assess'}
                ],
                'metadata': {
                    'scoring_weight': 1.0,
                    'category': 'daily_activities'
                }
            },
            {
                'order': 3,
                'text': 'How well can you manage household tasks like cooking, cleaning, and shopping?',
                'question_type': 'SINGLE_CHOICE',
                'options': [
                    {'value': 1, 'label': 'Manage all household tasks independently'},
                    {'value': 2, 'label': 'Manage most tasks with occasional difficulty'},
                    {'value': 3, 'label': 'Need help with heavy housework only'},
                    {'value': 4, 'label': 'Need help with some household tasks'},
                    {'value': 5, 'label': 'Need help with most household tasks'},
                    {'value': 6, 'label': 'Cannot manage most household tasks'},
                    {'value': 7, 'label': 'Cannot manage any household tasks'},
                    {'value': 8, 'label': 'Unable to participate in household management'},
                    {'value': 9, 'label': 'Too ill to assess'}
                ],
                'metadata': {
                    'scoring_weight': 1.0,
                    'category': 'household_management'
                }
            },
            {
                'order': 4,
                'text': 'How is your mobility and ability to get around?',
                'question_type': 'SINGLE_CHOICE',
                'options': [
                    {'value': 1, 'label': 'No mobility issues, very active'},
                    {'value': 2, 'label': 'Some slowing down but no major limitations'},
                    {'value': 3, 'label': 'Occasional mobility issues but generally mobile'},
                    {'value': 4, 'label': 'Slow but steady, may use walking aid occasionally'},
                    {'value': 5, 'label': 'Limited mobility, often needs walking aid'},
                    {'value': 6, 'label': 'Significant mobility problems, needs help'},
                    {'value': 7, 'label': 'Very limited mobility, needs wheelchair or bed rest'},
                    {'value': 8, 'label': 'Bed-bound or chair-bound'},
                    {'value': 9, 'label': 'Too ill to assess mobility'}
                ],
                'metadata': {
                    'scoring_weight': 1.0,
                    'category': 'mobility'
                }
            },
            {
                'order': 5,
                'text': 'How would you describe your overall health and energy levels?',
                'question_type': 'SINGLE_CHOICE',
                'options': [
                    {'value': 1, 'label': 'Excellent health and energy'},
                    {'value': 2, 'label': 'Good health with minor issues'},
                    {'value': 3, 'label': 'Generally healthy but some health concerns'},
                    {'value': 4, 'label': 'Multiple health issues but stable'},
                    {'value': 5, 'label': 'Health problems affecting daily life'},
                    {'value': 6, 'label': 'Significant health problems requiring support'},
                    {'value': 7, 'label': 'Poor health requiring extensive care'},
                    {'value': 8, 'label': 'Very poor health, bed-bound'},
                    {'value': 9, 'label': 'Terminally ill'}
                ],
                'metadata': {
                    'scoring_weight': 1.0,
                    'category': 'general_health'
                }
            }
        ]

        # Create questions
        for question_data in cfs_questions:
            Question.objects.create(
                questionnaire=questionnaire,
                order=question_data['order'],
                text=question_data['text'],
                question_type=question_data['question_type'],
                options=question_data['options'],
                metadata=question_data['metadata']
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully populated {len(cfs_questions)} CFS questions'
            )
        )