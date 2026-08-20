CREATE TYPE "GuardianAvatarKey" AS ENUM (
  'guardian_sword',
  'guardian_fist',
  'guardian_explorer'
);

ALTER TABLE "User"
ADD COLUMN "selectedGuardianAvatar" "GuardianAvatarKey";
