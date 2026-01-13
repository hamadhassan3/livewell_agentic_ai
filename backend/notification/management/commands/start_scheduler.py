"""
Django management command for starting background scheduler.
"""
import threading
import time

from django.core.management.base import BaseCommand
from notification.scheduler_tasks import NotificationScheduler


class Command(BaseCommand):
    """Start background scheduler for periodic tasks."""

    help = 'Start background scheduler for periodic tasks'

    def handle(self, *_args, **_options):
        """Handle the command execution."""
        self.stdout.write('Starting background scheduler...')
        
        # Create scheduler instance
        scheduler = NotificationScheduler(verbose=True)
        
        def cron_job():
            while True:
                scheduler.check_and_send_notifications()
                time.sleep(60)
        
        scheduler_thread = threading.Thread(target=cron_job, daemon=True)
        scheduler_thread.start()
        
        self.stdout.write('Background scheduler started successfully')
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stdout.write('Scheduler stopped')