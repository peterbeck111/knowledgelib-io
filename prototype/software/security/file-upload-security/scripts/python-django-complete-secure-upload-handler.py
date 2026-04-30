# views.py -- secure file upload with all validation layers
import os, uuid, magic
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.http import JsonResponse
from django.views.decorators.http import require_POST

ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']
ALLOWED_MIMES = {
    'image/jpeg', 'image/png', 'image/gif',
    'image/webp', 'application/pdf'
}
MAX_SIZE = 10 * 1024 * 1024  # 10MB
UPLOAD_DIR = '/var/uploads'   # Outside web root

@require_POST
def upload(request):
    file = request.FILES.get('file')
    if not file:
        return JsonResponse({'error': 'No file'}, status=400)
    # 1. Size check
    if file.size > MAX_SIZE:
        return JsonResponse({'error': 'File too large'}, status=413)
    # 2. Extension allowlist
    ext = os.path.splitext(file.name)[1].lower()
    if ext.lstrip('.') not in ALLOWED_EXT:
        return JsonResponse({'error': 'Type not allowed'}, status=400)
    # 3. Magic byte validation
    mime = magic.from_buffer(file.read(2048), mime=True)
    file.seek(0)
    if mime not in ALLOWED_MIMES:
        return JsonResponse({'error': f'Invalid content: {mime}'}, status=400)
    # 4. Generate safe filename, store outside web root
    safe_name = f'{uuid.uuid4().hex}{ext}'
    dest = os.path.join(UPLOAD_DIR, safe_name)
    with open(dest, 'wb') as f:
        for chunk in file.chunks():
            f.write(chunk)
    return JsonResponse({'id': safe_name}, status=201)
