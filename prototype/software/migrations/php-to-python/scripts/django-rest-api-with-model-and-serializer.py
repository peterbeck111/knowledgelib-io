# Input:  HTTP GET /api/v2/products/?category=electronics&limit=10
# Output: JSON array of product objects with pagination

# core/models.py
from django.db import models

class Product(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    category = models.CharField(max_length=100, db_index=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'   # Match existing PHP table
        ordering = ['-created_at']

    def __str__(self):
        return self.name


# core/serializers.py
from rest_framework import serializers
from .models import Product

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'category', 'price',
                  'description', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


# core/views.py
from rest_framework import generics, filters
from rest_framework.pagination import PageNumberPagination
from .models import Product
from .serializers import ProductSerializer

class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'limit'
    max_page_size = 100

class ProductListView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'created_at', 'name']

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        return qs


# myproject/urls.py
from django.urls import path
from core.views import ProductListView

urlpatterns = [
    path('api/v2/products/', ProductListView.as_view(), name='product-list'),
]
