from django.contrib import admin
from .models import AppSetting


@admin.register(AppSetting)
class AppSettingAdmin(admin.ModelAdmin):
    list_display = ("key", "is_secret", "updated_at")
    readonly_fields = ("value_encrypted",)
