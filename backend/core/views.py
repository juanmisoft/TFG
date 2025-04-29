from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.utils import timezone
from datetime import datetime
from dateutil.relativedelta import relativedelta
from .models import User, Task, Promotion, PermissionRequest, VacationRequest, ShiftChangeRequest, KPI, News
from .serializers import UserSerializer, TaskSerializer, PromotionSerializer, PermissionRequestSerializer, VacationRequestSerializer, ShiftChangeRequestSerializer, KPISerializer, NewsSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer
import logging
from django.db import models
import random
import string
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'manager':
            return User.objects.all()
        return User.objects.filter(department=user.department)

    def perform_create(self, serializer):
        if self.request.user.role != 'manager':
            raise permissions.PermissionDenied("Solo los managers pueden crear usuarios")
        serializer.save()

    def perform_update(self, serializer):
        if self.request.user.role != 'manager' and self.request.user != self.get_object():
            raise permissions.PermissionDenied("No tienes permiso para editar este usuario")
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'manager':
            return Response({'detail': 'Solo los managers pueden eliminar usuarios'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def change_password(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not user.check_password(old_password):
            return Response({'detail': 'Contraseña antigua incorrecta'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        return Response({'detail': 'Contraseña cambiada exitosamente'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get', 'patch'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        user = request.user
        if request.method == 'GET':
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        elif request.method == 'PATCH':
            serializer = self.get_serializer(user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'manager':
            return Task.objects.filter(created_by=user)
        return Task.objects.filter(assigned_to=user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()
        if task.status not in ['approved', 'rejected']:
            return Response({'detail': 'Solo se pueden eliminar tareas aprobadas o rechazadas'}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role == 'manager' or task.assigned_to == request.user:
            return super().destroy(request, *args, **kwargs)
        return Response({'detail': 'No tienes permiso para eliminar esta tarea'}, status=status.HTTP_403_FORBIDDEN)

class PromotionViewSet(viewsets.ModelViewSet):
    serializer_class = PromotionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Promotion.objects.all().order_by('-start_date')

    @action(detail=False, methods=['get'])
    def past(self, request):
        current_date = timezone.now().date()
        queryset = Promotion.objects.filter(end_date__lt=current_date).order_by('-start_date')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        if self.request.user.role != 'manager':
            return Response({'detail': 'Solo los managers pueden crear promociones'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            start_date_str = request.data.get('start_date')
            end_date_str = request.data.get('end_date')
            
            if not start_date_str or not end_date_str:
                return Response({'detail': 'Las fechas de inicio y fin son obligatorias.'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                if end_date < start_date:
                    return Response({'detail': 'La fecha de fin no puede ser anterior a la fecha de inicio.'}, status=status.HTTP_400_BAD_REQUEST)
            except ValueError:
                return Response({'detail': 'Formato de fecha inválido. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
            
            serializer.save(created_by=self.request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PermissionRequestViewSet(viewsets.ModelViewSet):
    serializer_class = PermissionRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'manager':
            return PermissionRequest.objects.filter(user__department=user.department)
        return PermissionRequest.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        request_obj = self.get_object()
        request_obj.status = 'approved'
        request_obj.reviewed_by = request.user
        request_obj.save()
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        request_obj = self.get_object()
        request_obj.status = 'rejected'
        request_obj.review_reason = request.data.get('review_reason', '')
        request_obj.reviewed_by = request.user
        request_obj.save()
        return Response({'status': 'rejected'})

    @action(detail=True, methods=['post'])
    def hide(self, request, pk=None):
        request_obj = self.get_object()
        if request_obj.status not in ['approved', 'rejected']:
            return Response({'detail': 'Solo se pueden ocultar solicitudes aprobadas o rechazadas'}, status=status.HTTP_400_BAD_REQUEST)
        request_obj.hidden_by.add(request.user)
        request_obj.save()
        return Response({'status': 'hidden'})

    @action(detail=True, methods=['patch'])
    def modify(self, request, pk=None):
        request_obj = self.get_object()
        if request.user.role != 'manager':
            return Response({'detail': 'Solo los managers pueden modificar solicitudes'}, status=status.HTTP_403_FORBIDDEN)
        if request_obj.status not in ['pending', 'approved']:
            return Response({'detail': 'Solo se pueden modificar solicitudes pendientes o aprobadas'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(request_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        request_obj.status = 'modified'
        request_obj.review_reason = request.data.get('review_reason', '')
        request_obj.reviewed_by = request.user
        serializer.save()
        return Response(serializer.data)

class VacationRequestViewSet(viewsets.ModelViewSet):
    serializer_class = VacationRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'manager':
            return VacationRequest.objects.filter(user__department=user.department)
        return VacationRequest.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        request_obj = self.get_object()
        request_obj.status = 'approved'
        request_obj.reviewed_by = request.user
        request_obj.save()
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        request_obj = self.get_object()
        request_obj.status = 'rejected'
        request_obj.review_reason = request.data.get('review_reason', '')
        request_obj.reviewed_by = request.user
        request_obj.save()
        return Response({'status': 'rejected'})

    @action(detail=True, methods=['post'])
    def hide(self, request, pk=None):
        request_obj = self.get_object()
        if request_obj.status not in ['approved', 'rejected']:
            return Response({'detail': 'Solo se pueden ocultar solicitudes aprobadas o rechazadas'}, status=status.HTTP_400_BAD_REQUEST)
        request_obj.hidden_by.add(request.user)
        request_obj.save()
        return Response({'status': 'hidden'})

    @action(detail=True, methods=['patch'])
    def modify(self, request, pk=None):
        request_obj = self.get_object()
        if request.user.role != 'manager':
            return Response({'detail': 'Solo los managers pueden modificar solicitudes'}, status=status.HTTP_403_FORBIDDEN)
        if request_obj.status not in ['pending', 'approved']:
            return Response({'detail': 'Solo se pueden modificar solicitudes pendientes o aprobadas'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(request_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        request_obj.status = 'modified'
        request_obj.review_reason = request.data.get('review_reason', '')
        request_obj.reviewed_by = request.user
        serializer.save()
        return Response(serializer.data)

class ShiftChangeRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftChangeRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'manager':
            return ShiftChangeRequest.objects.filter(requester__department=user.department)
        return ShiftChangeRequest.objects.filter(models.Q(requester=user) | models.Q(acceptor=user))

    def perform_create(self, serializer):
        serializer.save(requester=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        request_obj = self.get_object()
        request_obj.status = 'approved'
        request_obj.reviewed_by = request.user
        request_obj.save()
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        request_obj = self.get_object()
        request_obj.status = 'rejected'
        request_obj.review_reason = request.data.get('review_reason', '')
        request_obj.reviewed_by = request.user
        request_obj.save()
        return Response({'status': 'rejected'})

    @action(detail=True, methods=['post'])
    def hide(self, request, pk=None):
        request_obj = self.get_object()
        if request_obj.status not in ['approved', 'rejected']:
            return Response({'detail': 'Solo se pueden ocultar solicitudes aprobadas o rechazadas'}, status=status.HTTP_400_BAD_REQUEST)
        request_obj.hidden_by.add(request.user)
        request_obj.save()
        return Response({'status': 'hidden'})

    @action(detail=True, methods=['patch'])
    def modify(self, request, pk=None):
        request_obj = self.get_object()
        if request.user.role != 'manager':
            return Response({'detail': 'Solo los managers pueden modificar solicitudes'}, status=status.HTTP_403_FORBIDDEN)
        if request_obj.status not in ['pending', 'approved']:
            return Response({'detail': 'Solo se pueden modificar solicitudes pendientes o aprobadas'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(request_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        request_obj.status = 'modified'
        request_obj.review_reason = request.data.get('review_reason', '')
        request_obj.reviewed_by = request.user
        serializer.save()
        return Response(serializer.data)

class KPIViewSet(viewsets.ModelViewSet):
    serializer_class = KPISerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        period = self.request.query_params.get('period', timezone.now().strftime('%Y-%m'))
        logger.info(f"Filtrando KPIs para user={user.username}, period={period}")
        if user.role == 'manager':
            qs = KPI.objects.filter(worker__manager=user, period=period) | KPI.objects.filter(created_by=user, period=period)
        else:
            qs = KPI.objects.filter(worker=user, period=period)
        logger.info(f"KPIs encontrados: {qs.count()}")
        return qs

    def create(self, request, *args, **kwargs):
        if request.user.role != 'manager':
            return Response({'detail': 'Solo los managers pueden crear KPIs'}, status=status.HTTP_403_FORBIDDEN)
        
        worker_username = request.data.get('worker')
        period = request.data.get('period')
        logger.info(f"Creando/actualizando KPI: worker={worker_username}, period={period}")
        try:
            worker = User.objects.get(username=worker_username)
            kpi = KPI.objects.filter(worker=worker, period=period).first()
            if kpi:
                serializer = self.get_serializer(kpi, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                logger.info(f"KPI actualizado: {serializer.data}")
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                serializer.save(created_by=self.request.user)
                logger.info(f"KPI creado: {serializer.data}")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        except User.DoesNotExist:
            return Response({'detail': 'Trabajador no encontrado.'}, status=status.HTTP_400_BAD_REQUEST)

class NewsViewSet(viewsets.ModelViewSet):
    serializer_class = NewsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if self.action == 'archived':
            return News.objects.filter(read_by=user).order_by('-created_at')
        if user.role == 'manager':
            return News.objects.all().order_by('-created_at')
        return News.objects.filter(
            models.Q(department='all') | models.Q(department=user.department)
        ).exclude(read_by=user).order_by('-created_at')

    def perform_create(self, serializer):
        if self.request.user.role != 'manager':
            raise permissions.PermissionDenied("Solo los managers pueden crear noticias")
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        if self.request.user.role != 'manager':
            raise permissions.PermissionDenied("Solo los managers pueden editar noticias")
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'manager':
            return Response({'detail': 'Solo los managers pueden eliminar noticias'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        news = self.get_object()
        user = request.user
        if user not in news.read_by.all():
            news.read_by.add(user)
            return Response({'detail': 'Noticia marcada como leída'}, status=status.HTTP_200_OK)
        return Response({'detail': 'La noticia ya estaba marcada como leída'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def archived(self, request):
        queryset = self.get_queryset()
        archived_by_month = {}
        for news in queryset:
            month_key = news.created_at.strftime('%Y-%m')
            if month_key not in archived_by_month:
                archived_by_month[month_key] = []
            archived_by_month[month_key].append(NewsSerializer(news).data)
        
        sorted_archived = dict(sorted(archived_by_month.items(), reverse=True))
        return Response(sorted_archived)

class PasswordResetRequestView(APIView):
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            email = serializer.validated_data['email']
            try:
                user = User.objects.get(username=username, email=email)
                temp_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
                user.temp_reset_code = temp_code
                user.save()
                send_mail(
                    'Clave Temporal para Restablecer Contraseña',
                    f'Tu clave temporal es: {temp_code}',
                    'from@example.com',
                    [email],
                    fail_silently=False,
                )
                return Response({'message': 'Clave temporal enviada al correo'}, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                return Response({'error': 'Usuario o correo no coinciden'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetConfirmView(APIView):
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            email = serializer.validated_data['email']
            temp_code = serializer.validated_data['temp_code']
            new_password = serializer.validated_data['new_password']
            try:
                user = User.objects.get(username=username, email=email, temp_reset_code=temp_code)
                user.set_password(new_password)
                user.temp_reset_code = None
                user.save()
                return Response({'message': 'Contraseña actualizada con éxito'}, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                return Response({'error': 'Usuario, correo o clave temporal inválidos'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)