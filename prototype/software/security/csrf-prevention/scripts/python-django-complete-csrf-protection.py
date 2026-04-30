# settings.py
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',  # CSRF enabled
    # ...
]
CSRF_COOKIE_SAMESITE = 'Strict'
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True  # Prevents JS from reading CSRF cookie
SESSION_COOKIE_SAMESITE = 'Strict'
SESSION_COOKIE_SECURE = True

# views.py -- CSRF token automatically validated on POST
from django.shortcuts import render

def transfer(request):
    if request.method == 'POST':
        # Token validated by CsrfViewMiddleware before this runs
        amount = request.POST['amount']
        recipient = request.POST['recipient']
        # ... process transfer
    return render(request, 'transfer.html')

# transfer.html
# <form method="post">
#   {% csrf_token %}
#   <input name="amount" type="number">
#   <input name="recipient" type="text">
#   <button type="submit">Transfer</button>
# </form>

# For AJAX requests from Django templates:
# const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
# fetch('/api/transfer', {
#   method: 'POST',
#   headers: { 'X-CSRFToken': csrfToken, 'Content-Type': 'application/json' },
#   body: JSON.stringify({ amount: 100, recipient: 'joe' })
# });
