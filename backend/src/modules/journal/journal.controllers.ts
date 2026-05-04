import { Request, Response } from "express";
import journalServices from 
"./journal.services";

// CREATE JOURNAL
async function createJournal(request: Request, response: Response) {
  try {
    const { accountId } = request.params as any;

    const journal = await journalServices.createJournal({
      ...request.body,
      accountId,
    });

    response.status(201).json({
      success: true,
      data: journal,
      message: "Journal created.",
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
}

// GET ALL JOURNALS
async function getJournals(request: Request, response: Response) {
  try {
    const { accountId } = request.params as any;

    const journals = await journalServices.getJournals(accountId);

    response.status(200).json({
      success: true,
      data: journals,
      message: "Journals fetched.",
    });
  } catch (error) {
    console.log(error);

    response.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
}

// GET JOURNAL BY ID
async function getJournalById(request: Request, response: Response) {
  try {
    const { journalId } = request.params as any;

    const journal = await journalServices.getJournalById(journalId);

    response.status(200).json({
      success: true,
      data: journal,
      message: "Journal fetched.",
    });
  } catch (error) {
    console.log(error);

    response.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
}

// DELETE JOURNAL
async function deleteJournal(request: Request, response: Response) {
  try {
    const { journalId } = request.params as any;
   
    await journalServices.deleteJournal(journalId);

    response.status(200).json({
      success: true,
      message: "Journal deleted.",
    });
  } catch (error) {
    console.log(error);

    response.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
}


async function getAllNotes(request: Request, response: Response) {
  try {
    const { journalId } = request.params as any;

    const notes = await journalServices.getAllNotes(journalId);

    response.status(201).json({
      success: true,
      data: notes,
      message: "Notes fetched",
    });
  } catch (error) {
    console.log(error);

    response.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
}

// ADD NOTE
async function addNote(request: Request, response: Response) {
  try {
    const { content } = request.body;
     const {journalId}=request.params as any;
    const note = await journalServices.addNote(journalId, content);

    response.status(201).json({
      success: true,
      data: note,
      message: "Note added.",
    });
  } catch (error) {
    console.log(error);

    response.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
}

// EDIT NOTE
async function editNote(request: Request, response: Response) {
  try {
    const {  content } = request.body;
     const {noteId}=request.params as any;

    const note = await journalServices.editNote(noteId, content);

    response.status(200).json({
      success: true,
      data: note,
      message: "Note updated.",
    });
  } catch (error) {
    console.log(error);

    response.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
}

// DELETE NOTE
async function deleteNote(request: Request, response: Response) {
  try {
    const { noteId } = request.params as any;

    await journalServices.deleteNote(noteId);

    response.status(200).json({
      success: true,
      message: "Note deleted.",
    });
  } catch (error) {
    console.log(error);

    response.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
}

// CONTROLLER EXPORT
const journalController = {
  createJournal,
  getJournals,
  getJournalById,
  deleteJournal,
  addNote,
  editNote,
  deleteNote,
  getAllNotes
};

export default journalController;