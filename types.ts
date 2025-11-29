export enum AppMode {
  MENU = 'MENU',
  BATTLE_SETUP = 'BATTLE_SETUP',
  BATTLE_GAME = 'BATTLE_GAME',
  PRACTICE_SETUP = 'PRACTICE_SETUP',
  PRACTICE_GAME = 'PRACTICE_GAME',
}

export enum Subject {
  BOTANY = 'Botany',
  ZOOLOGY = 'Zoology',
  PHYSICS = 'Physics',
  CHEMISTRY = 'Chemistry',
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface Chapter {
  id: string;
  name: string;
  subject: Subject;
}

export interface BattleConfig {
  questionCount: number;
}

export interface PracticeConfig {
  subject: Subject;
  chapters: string[];
  questionCount: number;
  customPrompt?: string;
}

export type Player = 'P1' | 'P2';