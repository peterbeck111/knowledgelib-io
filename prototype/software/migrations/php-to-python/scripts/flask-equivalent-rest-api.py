# Input:  HTTP GET /api/v2/products/?category=electronics&limit=10
# Output: JSON array of product objects with pagination

# app.py
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


class Product(db.Model):
    __tablename__ = 'products'  # Match existing PHP table

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), unique=True, nullable=False)
    category = db.Column(db.String(100), index=True)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    description = db.Column(db.Text, default='')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, onupdate=db.func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'category': self.category,
            'price': float(self.price),
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


@app.route('/api/v2/products/', methods=['GET'])
def list_products():
    category = request.args.get('category')
    limit = min(int(request.args.get('limit', 20)), 100)
    page = int(request.args.get('page', 1))

    query = Product.query.filter_by(is_active=True)
    if category:
        query = query.filter_by(category=category)

    query = query.order_by(Product.created_at.desc())
    pagination = query.paginate(page=page, per_page=limit, error_out=False)

    return jsonify({
        'results': [p.to_dict() for p in pagination.items],
        'total': pagination.total,
        'page': page,
        'pages': pagination.pages,
    })


if __name__ == '__main__':
    app.run(debug=True, port=8000)
