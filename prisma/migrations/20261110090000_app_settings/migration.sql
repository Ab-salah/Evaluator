-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- House style: no em or en dashes in matrix text (it is shown in the app
-- and sent to the AI as instructions).
UPDATE "MatrixElement"
SET "label" = REPLACE(REPLACE("label", ' — ', ', '), '–', ' to '),
    "description" = REPLACE(REPLACE(REPLACE("description", ' — ', ', '), '—', ', '), '–', ' to ');
