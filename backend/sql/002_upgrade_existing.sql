-- ONLY for the original Mini Jira schema. Preserves all existing data.
-- Stop the API, back up the database, then execute with psql -v ON_ERROR_STOP=1.
BEGIN;
CREATE TABLE IF NOT EXISTS "Sprints" (
    "Id" uuid NOT NULL PRIMARY KEY,
    "ProjectId" uuid NOT NULL REFERENCES "Projects"("Id") ON DELETE CASCADE,
    "Name" varchar(100) NOT NULL,
    "Goal" text,
    "StartDate" date NOT NULL,
    "EndDate" date NOT NULL,
    "Status" integer NOT NULL DEFAULT 0,
    "CompletedAt" timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Sprints_ProjectId" ON "Sprints" ("ProjectId") WHERE "Status" = 1;
ALTER TABLE "TaskItems" ADD COLUMN IF NOT EXISTS "SprintId" uuid;
ALTER TABLE "TaskItems" ADD COLUMN IF NOT EXISTS "IssueType" integer NOT NULL DEFAULT 0;
ALTER TABLE "TaskItems" ADD COLUMN IF NOT EXISTS "StoryPoints" integer;
ALTER TABLE "TaskItems" ADD COLUMN IF NOT EXISTS "DueDate" date;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_TaskItems_Sprints_SprintId' AND conrelid = '"TaskItems"'::regclass) THEN
        ALTER TABLE "TaskItems" ADD CONSTRAINT "FK_TaskItems_Sprints_SprintId"
            FOREIGN KEY ("SprintId") REFERENCES "Sprints"("Id") ON DELETE SET NULL;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS "IX_TaskItems_SprintId" ON "TaskItems"("SprintId");
COMMIT;
