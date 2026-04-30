# Input:  A Flask app that renders HTML with inline jQuery
# Output: The same app refactored to serve a React SPA with JSON API endpoints

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='react-app/dist')
CORS(app)

# BEFORE: Server-rendered HTML with embedded jQuery
# @app.route('/users')
# def users():
#     users = db.get_users()
#     return render_template('users.html', users=users)  # jQuery in template

# AFTER: JSON API endpoint for React to consume
@app.route('/api/users')
def api_users():
    users = db.get_users()
    return jsonify([{'id': u.id, 'name': u.name, 'email': u.email} for u in users])

# Serve React SPA for all non-API routes
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path and (app.static_folder / path).exists():
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True)
