from rest_framework import serializers
from .models import User, Task, Promotion, PermissionRequest, VacationRequest, ShiftChangeRequest, KPI, News

class UserSerializer(serializers.ModelSerializer):
    manager = serializers.SlugRelatedField(slug_field='username', queryset=User.objects.all(), allow_null=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'first_name', 'last_name', 'email', 'role', 'department', 'photo', 'manager']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'photo': {'required': False},
            'manager': {'required': False},            
        }

    def create(self, validated_data):
        user = User(**validated_data)
        user.set_password(validated_data['password'])
        user.save()
        return user

    def update(self, instance, validated_data):
        if 'password' in validated_data:
            instance.set_password(validated_data.pop('password'))
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

class PasswordResetRequestSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()

class PasswordResetConfirmSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    temp_code = serializers.CharField(max_length=10)
    new_password = serializers.CharField(min_length=8)

class TaskSerializer(serializers.ModelSerializer):
    assigned_to = serializers.SlugRelatedField(slug_field='username', queryset=User.objects.all())
    created_by = serializers.SlugRelatedField(slug_field='username', read_only=True)
    approved_by = serializers.SlugRelatedField(slug_field='username', read_only=True, allow_null=True)

    class Meta:
        model = Task
        fields = '__all__'

class PromotionSerializer(serializers.ModelSerializer):
    created_by = serializers.SlugRelatedField(slug_field='username', read_only=True)

    class Meta:
        model = Promotion
        fields = ['id', 'name', 'code', 'start_date', 'end_date', 'created_by', 'created_at']

class PermissionRequestSerializer(serializers.ModelSerializer):
    user = serializers.SlugRelatedField(slug_field='username', read_only=True)
    reviewed_by = serializers.SlugRelatedField(slug_field='username', queryset=User.objects.all(), allow_null=True, required=False)
    hidden_by = serializers.SlugRelatedField(slug_field='username', many=True, read_only=True)

    class Meta:
        model = PermissionRequest
        fields = '__all__'
        read_only_fields = ['user', 'status']

class VacationRequestSerializer(serializers.ModelSerializer):
    user = serializers.SlugRelatedField(slug_field='username', read_only=True)
    reviewed_by = serializers.SlugRelatedField(slug_field='username', queryset=User.objects.all(), allow_null=True, required=False)
    hidden_by = serializers.SlugRelatedField(slug_field='username', many=True, read_only=True)

    class Meta:
        model = VacationRequest
        fields = '__all__'
        read_only_fields = ['user', 'status']

class ShiftChangeRequestSerializer(serializers.ModelSerializer):
    requester = serializers.SlugRelatedField(slug_field='username', read_only=True)
    acceptor = serializers.SlugRelatedField(slug_field='username', queryset=User.objects.all())
    reviewed_by = serializers.SlugRelatedField(slug_field='username', queryset=User.objects.all(), allow_null=True, required=False)
    hidden_by = serializers.SlugRelatedField(slug_field='username', many=True, read_only=True)

    class Meta:
        model = ShiftChangeRequest
        fields = '__all__'
        read_only_fields = ['requester', 'status']

class KPISerializer(serializers.ModelSerializer):
    worker = serializers.SlugRelatedField(slug_field='username', queryset=User.objects.all())
    created_by = serializers.SlugRelatedField(slug_field='username', read_only=True)

    class Meta:
        model = KPI
        fields = '__all__'

class NewsSerializer(serializers.ModelSerializer):
    created_by = serializers.SlugRelatedField(slug_field='username', read_only=True)
    read_by = serializers.SlugRelatedField(slug_field='username', many=True, read_only=True)

    class Meta:
        model = News
        fields = '__all__'
