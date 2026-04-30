# pip install python3-saml==1.16.0
# Input:  SAML response from IdP (POST to /saml/acs)
# Output: Authenticated user attributes

from onelogin.saml2.auth import OneLogin_Saml2_Auth

def prepare_saml_request(request):
    """Adapt framework request to python3-saml format."""
    return {
        'https': 'on',
        'http_host': request.host,
        'script_name': request.path,
        'get_data': request.args.copy(),
        'post_data': request.form.copy(),
    }

def saml_login(request):
    auth = OneLogin_Saml2_Auth(prepare_saml_request(request), custom_base_path='./saml/')
    return auth.login()  # Returns redirect URL to IdP

def saml_callback(request):
    auth = OneLogin_Saml2_Auth(prepare_saml_request(request), custom_base_path='./saml/')
    auth.process_response()  # Validates signature, timestamps, audience
    errors = auth.get_errors()
    if errors:
        raise ValueError(f"SAML error: {', '.join(errors)}: {auth.get_last_error_reason()}")
    if not auth.is_authenticated():
        raise ValueError("SAML authentication failed")
    # Extract attributes
    return {
        'name_id': auth.get_nameid(),
        'session_index': auth.get_session_index(),
        'attributes': auth.get_attributes(),  # Dict of SAML attributes
    }
