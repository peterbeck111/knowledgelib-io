# Input:  Need to catch N+1 regressions in tests
# Output: Test patterns that enforce query count limits

from django.test import TestCase

class BookAPITest(TestCase):
    def setUp(self):
        # Create test data
        self.author = Author.objects.create(name="Test Author")
        for i in range(10):
            Book.objects.create(title=f"Book {i}", author=self.author)

    def test_book_list_no_n_plus_1(self):
        """Book list API should use constant number of queries."""
        # 2 queries: 1 for books + 1 for authors (select_related)
        with self.assertNumQueries(2):
            response = self.client.get('/api/books/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()['results']), 10)

    def test_book_list_scales(self):
        """Adding more books should not increase query count."""
        # Add 90 more books (100 total)
        for i in range(90):
            Book.objects.create(title=f"Extra {i}", author=self.author)

        # Still only 2 queries, not 101
        with self.assertNumQueries(2):
            response = self.client.get('/api/books/')

    def test_book_detail_limited_queries(self):
        """Detail view with prefetching should use 3-4 queries max."""
        book = Book.objects.first()
        with self.assertNumQueries(4):  # book + author + tags + reviews
            response = self.client.get(f'/api/books/{book.pk}/')
