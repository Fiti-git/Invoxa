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

# Auto-create accountant user on default org if env vars are set.
# Idempotent: creates user if missing, sets/updates membership role to accountant,
# but does NOT overwrite an existing password.
if [ -n "$INVOXA_ACC_USERNAME" ] && [ -n "$INVOXA_ACC_PASSWORD" ]; then
  python manage.py shell -c "
from django.contrib.auth import get_user_model
from apps.organizations.models import Membership, Organization
U = get_user_model()
u = '$INVOXA_ACC_USERNAME'
p = '$INVOXA_ACC_PASSWORD'
e = '${INVOXA_ACC_EMAIL:-acc@invoxa.local}'
org, _ = Organization.objects.get_or_create(slug='default', defaults={'name': 'Default Org'})
user, created = U.objects.get_or_create(username=u, defaults={'email': e})
if created:
    user.set_password(p)
    user.is_staff = False
    user.is_superuser = False
    user.save()
    print('accountant user created')
else:
    print('accountant user exists')
m, _ = Membership.objects.get_or_create(user=user, organization=org, defaults={'role': Membership.ROLE_ACCOUNTANT})
if m.role != Membership.ROLE_ACCOUNTANT:
    m.role = Membership.ROLE_ACCOUNTANT
    m.save(update_fields=['role'])
    print('accountant role enforced on existing membership')
"
fi

exec "$@"
