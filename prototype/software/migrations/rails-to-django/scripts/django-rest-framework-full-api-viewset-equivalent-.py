# Input:  HTTP requests to /api/v1/posts/
# Output: JSON responses with CRUD operations, pagination, filtering

# pip install djangorestframework django-filter

# posts/serializers.py
from rest_framework import serializers
from .models import Post


class PostSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)

    class Meta:
        model = Post
        fields = ['id', 'title', 'slug', 'body', 'published',
                  'author', 'author_name', 'created_at', 'updated_at']
        read_only_fields = ['slug', 'author', 'created_at', 'updated_at']


# posts/views_api.py
from rest_framework import viewsets, permissions, filters
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from .models import Post
from .serializers import PostSerializer


class PostPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'limit'
    max_page_size = 100


class PostViewSet(viewsets.ModelViewSet):
    """
    Replaces Rails PostsController with full CRUD.
    GET    /api/v1/posts/      -> list   (index)
    POST   /api/v1/posts/      -> create
    GET    /api/v1/posts/{id}/  -> retrieve (show)
    PUT    /api/v1/posts/{id}/  -> update
    DELETE /api/v1/posts/{id}/  -> destroy
    """
    queryset = Post.objects.published().select_related('author')
    serializer_class = PostSerializer
    pagination_class = PostPagination
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['published', 'author']
    search_fields = ['title', 'body']
    ordering_fields = ['created_at', 'title']

    def perform_create(self, serializer):
        """Replaces: before_action :set_author + create."""
        serializer.save(author=self.request.user)


# posts/urls.py — DRF router replaces Rails resource routes
from rest_framework.routers import DefaultRouter
from . import views_api

router = DefaultRouter()
router.register(r'posts', views_api.PostViewSet, basename='post')

# Include in myproject/urls.py:
# path('api/v1/', include(router.urls)),
