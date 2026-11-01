# Project rules
- Homepage listings, search results, and map counts use the shared listing-scope hook and category resolver so the selected section remains consistent across navigation.
- Paginate homepage listings with React Query infinite queries and database category filters so rerenders cannot reset loaded pages.
- Keep local navigation translation fallbacks; hosted admin translations override them so network failures never expose translation keys.
- Lay out homepage search inputs and actions in normal flex flow; floating helpers and scroll search must clear the actual header and bottom navigation so controls cannot overlap.