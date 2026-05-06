from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0002_alter_membership_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='organization',
            name='monthly_cap_lkr',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='0 = unlimited. When monthly billed cost exceeds this, extraction is paused.',
                max_digits=12,
            ),
        ),
    ]
