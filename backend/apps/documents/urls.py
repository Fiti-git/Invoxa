from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, InvoiceDraftViewSet, InvoiceLineDraftViewSet

router = DefaultRouter()
router.register(r"invoice-lines", InvoiceLineDraftViewSet)
router.register(r"invoices", InvoiceDraftViewSet)
router.register(r"", DocumentViewSet)

urlpatterns = router.urls
