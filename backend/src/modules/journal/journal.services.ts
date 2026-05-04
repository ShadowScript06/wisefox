import { prisma } from "../../lib/prisma";

type CreateJournalInput = {
  accountId: string;
  script :string;
  date: Date;
  entryTime: Date;
  exitTime?: Date;
  pnl?: number;
  entryReason: string;
  exitReason?: string;
  quantity:number;
};

async function createJournal(data: CreateJournalInput) {
  return prisma.journal.create({
    data: {
      accountId: data.accountId,
      script:data.script,
      date: data.date,
      entryTime: data.entryTime,
      exitTime: data.exitTime ?? null,
      pnl: data.pnl ?? null,
      entryReason: data.entryReason,
      exitReason: data.exitReason ?? null,
      quantity:data.quantity
    },
    include: {
      notes: true,
    },
  });
}
async function getJournals(accountId: string) {
  return prisma.journal.findMany({
    where: {
      accountId,
    },
    include: {
      notes: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function getJournalById(journalId: string) {
  return prisma.journal.findUnique({
    where: {
      id: journalId,
    },
    include: {
      notes: true,
    },
  });
}

async function deleteJournal(journalId: string) {
  // clean notes first (safe delete)
  await prisma.note.deleteMany({
    where: {
      journalId,
    },
  });

  return prisma.journal.delete({
    where: {
      id: journalId,
    },
  });
}

async function addNote(journalId: string, content: string) {
    
  return prisma.note.create({
    data: {
      journalId,
      content,
    },
  });
}


async function getAllNotes(journalId: string) {
  return prisma.note.findMany({
    where: {
      journalId,
    },
  });
}


async function editNote(noteId: string, content: string) {
  return prisma.note.update({
    where: {
      id: noteId,
    },
    data: {
      content,
    },
  });
}

async function deleteNote(noteId: string) {
  return prisma.note.delete({
    where: {
      id: noteId,
    },
  });
}

const journalServices = {
  createJournal,
  getJournals,
  getJournalById,
  deleteJournal,
  addNote,
  editNote,
  deleteNote,
  getAllNotes
};

export default journalServices;