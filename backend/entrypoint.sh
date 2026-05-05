#!/usr/bin/env bash
set -e

python manage.py makemigrations organizations users documents extraction settings_app billing --noinput
python manage.py migrate --noinput --fake-initial
python manage.py collectstatic --noinput || true

# Auto-create dev superuser if env vars are set
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  python manage.py shell -c "
from django.contrib.auth import get_user_model
U = get_user_model()
u = '$DJANGO_SUPERUSER_USERNAME'
p = '$DJANGO_SUPERUSER_PASSWORD'
e = '${DJANGO_SUPERUSER_EMAIL:-admin@invoxa.local}'
if not U.objects.filter(username=u).exists():
    U.objects.create_superuser(username=u, email=e, password=p)
    print('superuser created')
else:
    print('superuser exists')
"
fi

exec "$@"
