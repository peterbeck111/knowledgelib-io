# Input:  Django request with request.user
# Output: 403 HttpResponseForbidden or proceeds to view

from functools import wraps
from django.http import HttpResponseForbidden
from myapp.models import UserRole, RolePermission

def require_permission(action, resource):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return HttpResponseForbidden("Not authenticated")
            role_ids = UserRole.objects.filter(
                user=request.user
            ).values_list('role_id', flat=True)
            has_perm = RolePermission.objects.filter(
                role_id__in=role_ids,
                permission__action=action,
                permission__resource=resource
            ).exists()
            if not has_perm:
                return HttpResponseForbidden("Insufficient permissions")
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

# Usage
@require_permission('write', 'articles')
def create_article(request):
    pass  # only users with write:articles reach here
