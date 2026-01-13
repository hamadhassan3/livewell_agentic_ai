from django.contrib import admin
from .models import User, QuestionnaireTemplate, Question, UserQuestionnaireSession, Answer


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0
    ordering = ['order']


@admin.register(QuestionnaireTemplate)
class QuestionnaireTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'version', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    inlines = [QuestionInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['questionnaire', 'order', 'text_preview', 'question_type', 'is_required']
    list_filter = ['questionnaire', 'question_type', 'is_required']
    search_fields = ['text']
    ordering = ['questionnaire', 'order']
    
    def text_preview(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_preview.short_description = 'Question Text'


class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 0
    readonly_fields = ['answered_at']


@admin.register(UserQuestionnaireSession)
class UserQuestionnaireSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'questionnaire', 'current_question_order', 'is_completed', 'started_at', 'completed_at']
    list_filter = ['questionnaire', 'is_completed', 'started_at']
    search_fields = ['user__email', 'questionnaire__name']
    readonly_fields = ['started_at']
    inlines = [AnswerInline]


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ['session_user', 'question_preview', 'answered_at']
    list_filter = ['question__questionnaire', 'answered_at']
    search_fields = ['session__user__email', 'question__text']
    readonly_fields = ['answered_at']
    
    def session_user(self, obj):
        return obj.session.user.email
    session_user.short_description = 'User'
    
    def question_preview(self, obj):
        return obj.question.text[:50] + '...' if len(obj.question.text) > 50 else obj.question.text
    question_preview.short_description = 'Question'


# Register the custom User model with the admin site
admin.site.register(User)
