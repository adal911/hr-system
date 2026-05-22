export interface InterviewQuestion {
  id: string;
  question_text: string;
  ai_suggested_answer: string;
  candidate_answer: string;
  interviewer_notes: string;
}

export interface Interview {
  _id: string;
  candidate_name: string;
  document_id: string | null;
  interviewer: string;
  status: "in_progress" | "completed";
  questions: InterviewQuestion[];
  summary: string;
  created_at: string;
  updated_at: string;
}

export interface InterviewListItem {
  _id: string;
  candidate_name: string;
  document_id: string | null;
  interviewer: string;
  status: "in_progress" | "completed";
  summary: string;
  created_at: string;
  updated_at: string;
}
