export interface Resume {
  _id: string;
  candidate_name: string;
  file_url: string;
  file_type: "pdf" | "docx";
  uploaded_by: string;
  created_at: string;
}

export interface ResumeChunk {
  _id: string;
  document_id: string;
  chunk_index: number;
  text: string;
  candidate_name: string;
}

export interface StructuredExperience {
  title: string;
  company: string;
  duration: string;
  description: string;
}

export interface StructuredEducation {
  degree: string;
  institution: string;
  year: string;
}

export interface StructuredProject {
  name: string;
  description: string;
  technologies: string[];
}

export interface StructuredData {
  summary: string;
  skills: string[];
  skills_lower?: string[];
  experience: StructuredExperience[];
  education: StructuredEducation[];
  projects: StructuredProject[];
}

export interface ResumeDetail extends Resume {
  raw_text: string;
  cloudinary_public_id: string;
  chunks: ResumeChunk[];
  structured_data?: StructuredData;
}

export interface UploadResponse {
  id: string;
  candidate_name: string;
  file_url: string;
  file_type: string;
  chunks_count: number;
}
