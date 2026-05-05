from django.urls import path
from .views import CapView, CostSummaryView, FxRefreshView, RecentRunsView

urlpatterns = [
    path("summary", CostSummaryView.as_view()),
    path("runs", RecentRunsView.as_view()),
    path("fx/refresh", FxRefreshView.as_view()),
    path("cap", CapView.as_view()),
]
