# Word filter (first step towards the App Store)

Apple asks apps where users post content to filter objectionable material, as
well as offering report and block (which YGIG already has). Migration
`20261112200000_word_filter.sql` adds a `blocked_words` list and database
triggers that refuse chat messages, profile text, listing text and request
notes containing a blocked word. The list covers slurs, sexual terms and
"kill yourself"; everyday swearing is allowed. Matching is whole-word, ignores
case and common swaps (0 for o, $ for s), so place names like Scunthorpe pass.

Nobody signed in can read the list. To add a word, run in the Supabase SQL
editor: `insert into public.blocked_words (word) values ('newword');`
Text saved before the filter is not changed.
