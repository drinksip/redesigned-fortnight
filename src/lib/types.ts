/** Core domain types for the GCSE Tracker. */

export type RagStatus = "None" | "Red" | "Amber" | "Green";

export interface SubtopicRecord {
  rag: RagStatus;
  date: string; // ISO date last revised
}

/** Per-subtopic spec tracking: key = `${subjectId}__${topicId}__${index}` */
export type SpecData = Record<string, SubtopicRecord>;

export interface GradeRecord {
  target: number | null;
  predicted: number | null;
  working: number | null;
}

export type GradesData = Record<string, GradeRecord>;

/** timetable key = `${dayId}-${slotId}` -> subjectId */
export type TimetableData = Record<string, string>;

export interface TestEntry {
  id: string;
  subjectId: string;
  title: string;
  date: string; // ISO date
  type: "Mock" | "Exam" | "Test" | "Coursework";
}

export interface RevisionEntry {
  id: string;
  subjectId: string;
  minutes: number;
  date: string; // ISO datetime
  source: "pomodoro" | "manual";
  note?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

/** A saved AI conversation (the "AI chats" feature). */
export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

export interface UserData {
  username: string;
  yearGroup: "10" | "11";
  /** Master list of subjectIds the student is taking — single source of truth. */
  subjects: string[];
  timetable: TimetableData;
  spec: SpecData;
  grades: GradesData;
  tests: TestEntry[];
  conversations: Conversation[];
  revisionLog: RevisionEntry[];
  examDate?: string; // ISO — first exam date for countdown
  tutorialDone?: boolean;
}

export interface AppUser {
  uid: string;
  username: string;
  data: UserData;
}

export interface Subject {
  id: string;
  name: string;
  selectorName?: string;
  board: string;
  color: string;
  emoji: string;
  topics: { id: string; name: string; subtopics: string[] }[];
}
