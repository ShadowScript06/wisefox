-- DropIndex
DROP INDEX "Position_accountId_symbol_isOpen_key";

CREATE UNIQUE INDEX unique_open_position
ON "Position" ("accountId", "symbol")
WHERE "isOpen" = true;