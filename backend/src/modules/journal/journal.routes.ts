import express from "express";
import journalController from "./journal.controllers"
import { validate } from "../../middlewares/inputvalidator";
import { createJournalSchema } from "../../config/validations/journal/createJournal";

const router = express.Router({ mergeParams: true });

// JOURNAL CRUD
router.post("/",validate(createJournalSchema), journalController.createJournal);

router.get("/", journalController.getJournals);

router.get("/:journalId", journalController.getJournalById);

router.delete("/:journalId", journalController.deleteJournal);

// NOTES
router.get("/:journalId/notes", journalController.getAllNotes);

router.post("/:journalId/notes", journalController.addNote);

router.put("/:journalId/notes/:noteId", journalController.editNote);

router.delete("/:journalId/notes/:noteId", journalController.deleteNote);

export default router;