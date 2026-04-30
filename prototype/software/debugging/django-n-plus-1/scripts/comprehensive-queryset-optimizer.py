# Input:  Views with inconsistent query optimization
# Output: Reusable queryset manager that ensures optimal loading

from django.db import models
from django.db.models import Count, Prefetch

class BookQuerySet(models.QuerySet):
    def with_author(self):
        """Eager-load author (ForeignKey → select_related)."""
        return self.select_related('author')

    def with_publisher(self):
        """Eager-load publisher chain."""
        return self.select_related('author__publisher')

    def with_tags(self):
        """Eager-load tags (ManyToMany → prefetch_related)."""
        return self.prefetch_related('tags')

    def with_recent_reviews(self, limit=5):
        """Prefetch only recent reviews, filtered and limited."""
        return self.prefetch_related(
            Prefetch(
                'reviews',
                queryset=Review.objects.select_related('user')
                    .order_by('-created_at')[:limit],
                to_attr='recent_reviews'
            )
        )

    def with_stats(self):
        """Annotate aggregate stats without extra queries."""
        return self.annotate(
            review_count=Count('reviews'),
            tag_count=Count('tags', distinct=True),
        )

    def for_list_view(self):
        """Optimized for list pages — everything needed in 2-3 queries."""
        return (
            self.with_author()
                .with_tags()
                .with_stats()
                .only('id', 'title', 'slug', 'pub_date', 'author__name')
        )

    def for_detail_view(self):
        """Optimized for detail pages — full data."""
        return (
            self.with_publisher()
                .with_tags()
                .with_recent_reviews()
                .with_stats()
        )

class Book(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField()
    pub_date = models.DateField()
    author = models.ForeignKey('Author', on_delete=models.CASCADE)
    tags = models.ManyToManyField('Tag')

    objects = BookQuerySet.as_manager()

# Usage in views:
# books = Book.objects.for_list_view()
# book = Book.objects.for_detail_view().get(slug=slug)
