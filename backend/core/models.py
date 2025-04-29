from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

class User(AbstractUser):
    ROLES = (
        ('worker', 'Trabajador'),
        ('manager', 'Manager'),
    )
    role = models.CharField(max_length=50, choices=ROLES, default='worker')
    department = models.CharField(max_length=100, blank=True, null=True)
    manager = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')
    photo = models.ImageField(upload_to='user_photos/', blank=True, null=True)
    temp_reset_code = models.CharField(max_length=10, blank=True, null=True)  # Clave temporal

    def __str__(self):
        return self.username

class Task(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    title = models.CharField(max_length=100)
    comments = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    assigned_to = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tasks')
    start_date = models.DateField()
    end_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    rejection_reason = models.TextField(blank=True, null=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_tasks')

    def __str__(self):
        return self.title

class Promotion(models.Model):
    name = models.CharField(max_length=100)  # Mapearemos a 'title' en el serializer
    code = models.CharField(max_length=50, unique=True)
    start_date = models.DateField()
    end_date = models.DateField()
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='promotions')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class PermissionRequest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='permission_requests')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='pending')
    review_reason = models.TextField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_permissions')
    hidden_by = models.ManyToManyField(User, related_name='hidden_permission_requests', blank=True)

    def __str__(self):
        return f"Permission Request by {self.user} - {self.start_date} to {self.end_date}"

class VacationRequest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vacation_requests')
    start_date = models.DateField()
    end_date = models.DateField()
    period = models.CharField(max_length=20)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
            ('modified', 'Modified'),
            ('deleted', 'Deleted'),
        ],
        default='pending'
    )
    review_reason = models.TextField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_vacations')
    hidden_by = models.ManyToManyField(User, related_name='hidden_vacation_requests', blank=True)

    def __str__(self):
        return f"Vacation Request by {self.user} - {self.start_date} to {self.end_date}"

class ShiftChangeRequest(models.Model):
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shift_requests')
    acceptor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shift_acceptances')
    date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='pending')
    review_reason = models.TextField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_shift_changes')
    hidden_by = models.ManyToManyField(User, related_name='hidden_shift_change_requests', blank=True)

    def __str__(self):
        return f"Shift Change Request by {self.requester} for {self.date}"

class KPI(models.Model):
    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name='kpis')
    period = models.CharField(max_length=50)
    sales_target = models.FloatField(default=0)
    sales_achieved = models.FloatField(default=0)
    warranties_target = models.IntegerField(default=0)
    warranties_achieved = models.IntegerField(default=0)
    financing_target = models.FloatField(default=0)
    financing_achieved = models.FloatField(default=0)
    reviews_target = models.IntegerField(default=0)
    reviews_achieved = models.IntegerField(default=0)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='kpis_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"KPI de {self.worker} - {self.period}"

    class Meta:
        unique_together = ('worker', 'period')

class News(models.Model):
    DEPARTMENT_CHOICES = (
        ('all', 'Todos'),
        ('G1', 'G1'),
        ('G2', 'G2'),
        ('G3', 'G3'),
    )
    title = models.CharField(max_length=200)
    content = models.TextField()
    department = models.CharField(max_length=3, choices=DEPARTMENT_CHOICES, default='all')
    created_by = models.ForeignKey('User', on_delete=models.CASCADE, related_name='news_created')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    read_by = models.ManyToManyField('User', related_name='news_read', blank=True)

    def __str__(self):
        return self.title