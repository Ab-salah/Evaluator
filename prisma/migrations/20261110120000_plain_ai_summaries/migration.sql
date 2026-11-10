-- House style: no em or en dashes in AI-written text. Older summaries were
-- stored before the rule, so rewrite them the same way new ones are written.
UPDATE "Submission"
SET "aiSummary" = REPLACE(REPLACE(REPLACE("aiSummary", ' ' || CHR(8212) || ' ', ', '), CHR(8212), ', '), CHR(8211), ' to ')
WHERE "aiSummary" LIKE '%' || CHR(8212) || '%' OR "aiSummary" LIKE '%' || CHR(8211) || '%';
