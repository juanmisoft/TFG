from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'tu_clave_secreta_aqui'  
DEBUG = True

# Ajustamos ALLOWED_HOSTS para incluir los dominios específicos de Cloudflare
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    'https://lies-represents-thin-exclusion.trycloudflare.com',  # Dominio del frontend
    'https://freebsd-vsnet-webmaster-huge.trycloudflare.com',  # Dominio del backend
]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt',
    'core',
]

AUTH_USER_MODEL = 'core.User'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'intranet_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'intranet_backend.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'intranet_prueba_db',
        'USER': 'root',
        'PASSWORD': 'password123',
        'HOST': 'db',
        'PORT': '3306',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Configuración para archivos estáticos
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Configuración para archivos multimedia
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Ajustamos CORS para incluir los dominios específicos de Cloudflare
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://lies-represents-thin-exclusion.trycloudflare.com",  # Dominio del frontend
    "https://freebsd-vsnet-webmaster-huge.trycloudflare.com",  # Dominio del backend
]

# Ajustamos CSRF_TRUSTED_ORIGINS para incluir los dominios específicos de Cloudflare
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:8001",
    "https://lies-represents-thin-exclusion.trycloudflare.com",  # Dominio del frontend
    "https://freebsd-vsnet-webmaster-huge.trycloudflare.com",  # Dominio del backend
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

# Configuración de Simple JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
}

# Configuración de correo electrónico
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'intranetprueba4@gmail.com'
EMAIL_HOST_PASSWORD = 'zcst fuga xegv szkl'
DEFAULT_FROM_EMAIL = 'intranetprueba4@gmail.com'
