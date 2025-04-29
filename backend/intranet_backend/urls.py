from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core.views import UserViewSet, TaskViewSet, PromotionViewSet, PermissionRequestViewSet, VacationRequestViewSet, ShiftChangeRequestViewSet, KPIViewSet, NewsViewSet, PasswordResetRequestView, PasswordResetConfirmView
from django.conf.urls.static import static
from django.conf import settings

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')  
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'promotions', PromotionViewSet, basename='promotion')
router.register(r'permission-requests', PermissionRequestViewSet, basename='permission-request')
router.register(r'vacation-requests', VacationRequestViewSet, basename='vacation-request')
router.register(r'shift-change-requests', ShiftChangeRequestViewSet, basename='shift-change-request')
router.register(r'kpis', KPIViewSet, basename='kpi')
router.register(r'news', NewsViewSet, basename='news')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/password_reset_request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('api/password_reset_confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('api/', include(router.urls)),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)