from django.contrib import admin
from .models import Goal, Medication, Event, StepCount


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'category', 'frequency', 'is_active', 'created_at')
    list_filter = ('category', 'frequency', 'is_active')
    search_fields = ('title', 'user__email')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ('user', 'name', 'dosage', 'frequency_type', 'is_active', 'created_at')
    list_filter = ('frequency_type', 'is_active')
    search_fields = ('name', 'user__email', 'dosage')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'start_date', 'when', 'is_attended', 'created_at')
    list_filter = ('is_attended', 'start_date')
    search_fields = ('title', 'user__email', 'address')
    readonly_fields = ('created_at',)


@admin.register(StepCount)
class StepCountAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'steps', 'created_at', 'updated_at')
    list_filter = ('date',)
    search_fields = ('user__email',)
    readonly_fields = ('created_at', 'updated_at')
