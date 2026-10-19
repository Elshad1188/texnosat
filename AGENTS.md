# Project rules
- Homepage listings, search results, and map counts use the shared listing-scope hook and category resolver so the selected section remains consistent across navigation.
- Paginate homepage listings with React Query infinite queries and database category filters so rerenders cannot reset loaded pages.