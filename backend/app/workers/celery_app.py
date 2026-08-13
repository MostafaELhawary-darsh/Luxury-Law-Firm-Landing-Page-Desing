from celery import Celery
from app.core.config import settings

celery_app = Celery(__name__, broker=settings.REDIS_URL)

# Example: you can configure backend/result backend if needed
# celery_app.conf.result_backend = settings.REDIS_URL
