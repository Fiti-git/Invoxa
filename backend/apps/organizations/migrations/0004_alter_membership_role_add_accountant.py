from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0003_organization_monthly_cap_lkr'),
    ]

    operations = [
        migrations.AlterField(
            model_name='membership',
            name='role',
            field=models.CharField(
                choices=[
                    ('admin', 'Admin'),
                    ('manager', 'Manager'),
                    ('member', 'Member'),
                    ('viewer', 'Viewer'),
                    ('accountant', 'Accountant'),
                ],
                default='member',
                max_length=20,
            ),
        ),
    ]
