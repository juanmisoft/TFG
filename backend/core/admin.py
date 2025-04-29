from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Task, Promotion, PermissionRequest, VacationRequest, ShiftChangeRequest, KPI, News

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ('username', 'email', 'role', 'department', 'manager', 'is_staff')
    list_filter = ('role', 'department', 'is_staff')
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Custom fields', {'fields': ('role', 'department', 'manager')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role', 'department', 'manager'),
        }),
    )
    search_fields = ('username', 'email')
    ordering = ('username',)

class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'assigned_to', 'created_by', 'start_date', 'end_date', 'created_at')
    list_filter = ('status', 'assigned_to', 'created_by')
    search_fields = ('title', 'comments')
    ordering = ('-created_at',)

class PromotionAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'start_date', 'end_date', 'created_by')
    list_filter = ('start_date', 'end_date', 'created_by')
    search_fields = ('name', 'code')
    ordering = ('-start_date',)

class PermissionRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'start_date', 'end_date', 'status', 'reviewed_by')
    list_filter = ('status',)
    search_fields = ('user__username', 'reason')
    ordering = ('-start_date',)

class VacationRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'start_date', 'end_date', 'period', 'status', 'reviewed_by')
    list_filter = ('status',)
    search_fields = ('user__username', 'period')
    ordering = ('-start_date',)

class ShiftChangeRequestAdmin(admin.ModelAdmin):
    list_display = ('requester', 'acceptor', 'date', 'status', 'reviewed_by')
    list_filter = ('status',)
    search_fields = ('requester__username', 'acceptor__username')
    ordering = ('-date',)

class KPIAdmin(admin.ModelAdmin):
    list_display = ('worker', 'period', 'sales_target', 'sales_achieved', 'financing_target', 'financing_achieved', 'created_by')
    list_filter = ('period', 'worker')
    search_fields = ('worker__username', 'period', 'created_by__username')
    actions = ['delete_selected']
    ordering = ('-period',)

class NewsAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_by', 'created_at', 'updated_at')
    list_filter = ('created_at',)
    search_fields = ('title', 'content')
    ordering = ('-created_at',)

admin.site.register(User, CustomUserAdmin)
admin.site.register(Task, TaskAdmin)
admin.site.register(Promotion, PromotionAdmin)
admin.site.register(PermissionRequest, PermissionRequestAdmin)
admin.site.register(VacationRequest, VacationRequestAdmin)
admin.site.register(ShiftChangeRequest, ShiftChangeRequestAdmin)
admin.site.register(KPI, KPIAdmin)
admin.site.register(News, NewsAdmin)