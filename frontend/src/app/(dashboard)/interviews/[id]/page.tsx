"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  Save,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  Wand2,
  CheckCircle2,
  Clock,
  Plus,
  User as UserIcon,
  Calendar,
} from "lucide-react";
import type { Interview, InterviewQuestion } from "@/types/interview";

interface GeneratedQuestion {
  question: string;
  category: string;
  difficulty: string;
  purpose: string;
}

interface GenerateQuestionsResponse {
  candidate_name: string;
  document_id: string;
  job_role: string;
  questions: GeneratedQuestion[];
}

export default function InterviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const interviewId = params.id as string;

  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [questionInput, setQuestionInput] = useState("");
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());
  const [savingAnswers, setSavingAnswers] = useState<Set<string>>(new Set());
  const [editedAnswers, setEditedAnswers] = useState<
    Record<string, { candidate_answer: string; interviewer_notes: string }>
  >({});

  const [showGeneratePanel, setShowGeneratePanel] = useState(false);
  const [jobRole, setJobRole] = useState("");
  const [numQuestions, setNumQuestions] = useState("5");
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [addingQuestions, setAddingQuestions] = useState<Set<number>>(new Set());

  const fetchInterview = useCallback(async () => {
    try {
      const data = await api.get<Interview>(`/interviews/${interviewId}/`, token);
      setInterview(data);
      const edits: Record<string, { candidate_answer: string; interviewer_notes: string }> = {};
      for (const q of data.questions) {
        edits[q.id] = {
          candidate_answer: q.candidate_answer,
          interviewer_notes: q.interviewer_notes,
        };
      }
      setEditedAnswers(edits);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load interview");
    } finally {
      setLoading(false);
    }
  }, [interviewId, token]);

  useEffect(() => {
    fetchInterview();
  }, [fetchInterview]);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = questionInput.trim();
    if (!question || askingQuestion) return;

    setAskingQuestion(true);
    try {
      const newQ = await api.post<InterviewQuestion>(
        `/interviews/${interviewId}/questions/`,
        { question },
        token
      );
      setInterview((prev) =>
        prev ? { ...prev, questions: [...prev.questions, newQ] } : prev
      );
      setEditedAnswers((prev) => ({
        ...prev,
        [newQ.id]: { candidate_answer: "", interviewer_notes: "" },
      }));
      setExpandedAnswers((prev) => new Set(prev).add(newQ.id));
      setQuestionInput("");
      toast.success("Question added with AI suggestion");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add question");
    } finally {
      setAskingQuestion(false);
    }
  };

  const handleSaveAnswer = async (questionId: string) => {
    const edits = editedAnswers[questionId];
    if (!edits) return;

    setSavingAnswers((prev) => new Set(prev).add(questionId));
    try {
      await api.post(
        `/interviews/${interviewId}/answer/`,
        {
          question_id: questionId,
          candidate_answer: edits.candidate_answer,
          interviewer_notes: edits.interviewer_notes,
        },
        token
      );
      setInterview((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          questions: prev.questions.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  candidate_answer: edits.candidate_answer,
                  interviewer_notes: edits.interviewer_notes,
                }
              : q
          ),
        };
      });
      toast.success("Answer saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save answer");
    } finally {
      setSavingAnswers((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }
  };

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const result = await api.post<{ summary: string; status: string }>(
        `/interviews/${interviewId}/summary/`,
        {},
        token
      );
      setInterview((prev) =>
        prev ? { ...prev, summary: result.summary, status: "completed" } : prev
      );
      toast.success("Summary generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!interview?.document_id) {
      toast.error("This interview has no linked resume.");
      return;
    }
    setGeneratingQuestions(true);
    try {
      const res = await api.post<GenerateQuestionsResponse>(
        "/analytics/generate-questions/",
        {
          document_id: interview.document_id,
          job_role: jobRole.trim(),
          num_questions: parseInt(numQuestions),
        },
        token
      );
      setGeneratedQuestions(res.questions);
      if (res.questions.length === 0) toast.error("No questions were generated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate questions");
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const handleAddGeneratedQuestion = async (question: string, index: number) => {
    setAddingQuestions((prev) => new Set(prev).add(index));
    try {
      const newQ = await api.post<InterviewQuestion>(
        `/interviews/${interviewId}/questions/`,
        { question },
        token
      );
      setInterview((prev) =>
        prev ? { ...prev, questions: [...prev.questions, newQ] } : prev
      );
      setEditedAnswers((prev) => ({
        ...prev,
        [newQ.id]: { candidate_answer: "", interviewer_notes: "" },
      }));
      setExpandedAnswers((prev) => new Set(prev).add(newQ.id));
      setGeneratedQuestions((prev) => prev.filter((_, i) => i !== index));
      toast.success("Added to interview");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add question");
    } finally {
      setAddingQuestions((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  const handleAddAllGeneratedQuestions = async () => {
    for (let i = 0; i < generatedQuestions.length; i++) {
      await handleAddGeneratedQuestion(generatedQuestions[i].question, i);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!interview) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Interview not found.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/interviews")}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isCompleted = interview.status === "completed";
  const initials = interview.candidate_name
    .split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const completedQuestions = interview.questions.filter(
    (q) => q.candidate_answer
  ).length;
  const progress = interview.questions.length > 0
    ? Math.round((completedQuestions / interview.questions.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push("/interviews")} className="-ml-2 text-muted-foreground">
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
        Back to interviews
      </Button>

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 card-elevated">
        <div className="absolute inset-x-0 top-0 -z-10 h-32 bg-linear-to-b from-primary/10 via-primary/5 to-transparent" />
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-lg ${
                isCompleted
                  ? "bg-linear-to-br from-emerald-500 to-emerald-700 shadow-emerald-500/25"
                  : "bg-linear-to-br from-primary to-chart-4 shadow-primary/25"
              }`}>
                {initials}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{interview.candidate_name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    {interview.interviewer}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(interview.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                isCompleted
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
              }`}
            >
              {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
              {isCompleted ? "Completed" : "In Progress"}
            </span>
          </div>

          {interview.questions.length > 0 && (
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Answer progress</span>
                <span className="font-semibold tabular-nums">
                  {completedQuestions} / {interview.questions.length} ({progress}%)
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-linear-to-r from-primary to-chart-4 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary card */}
      {interview.summary && (
        <div className="rounded-2xl border border-emerald-500/30 bg-linear-to-br from-emerald-500/5 to-transparent p-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">AI Interview Summary</h2>
              <p className="text-xs text-muted-foreground">
                Generated from Q&A and interviewer notes
              </p>
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{interview.summary}</p>
        </div>
      )}

      {/* Ask a question */}
      <div className="rounded-2xl border border-border/70 card-elevated p-5">
        <h2 className="mb-1 text-sm font-semibold">Ask a question</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Type a question; the AI will suggest an answer from the candidate&apos;s resume.
        </p>
        <form onSubmit={handleAskQuestion} className="flex gap-2">
          <Input
            placeholder="e.g. What's the candidate's experience with Python?"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            disabled={askingQuestion}
            className="flex-1 h-11"
          />
          <Button
            type="submit"
            disabled={askingQuestion || !questionInput.trim()}
            className="h-11 gap-1.5 shadow-md shadow-primary/15"
          >
            {askingQuestion ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Ask
          </Button>
        </form>
      </div>

      {/* AI Generator */}
      {interview.document_id && (
        <div className="overflow-hidden rounded-2xl border border-chart-4/30 bg-linear-to-br from-chart-4/5 to-transparent">
          <button
            type="button"
            onClick={() => setShowGeneratePanel(!showGeneratePanel)}
            className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-chart-4/5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-4/15 text-chart-4">
                <Wand2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">AI Question Generator</h2>
                <p className="text-xs text-muted-foreground">
                  Auto-generate tailored questions from the resume
                </p>
              </div>
            </div>
            {showGeneratePanel ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {showGeneratePanel && (
            <div className="space-y-4 border-t border-chart-4/20 p-5">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Job role (optional)
                  </label>
                  <Input
                    placeholder="e.g. Senior Frontend Engineer"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Count
                  </label>
                  <Select value={numQuestions} onValueChange={setNumQuestions}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleGenerateQuestions}
                  disabled={generatingQuestions}
                  className="gap-1.5 bg-chart-4 text-white hover:bg-chart-4/90"
                >
                  {generatingQuestions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Generate
                </Button>
              </div>

              {generatedQuestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">
                      {generatedQuestions.length} suggested
                    </p>
                    <Button size="sm" variant="outline" onClick={handleAddAllGeneratedQuestions}>
                      Add all
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {generatedQuestions.map((gq, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-card/50 p-3"
                      >
                        <div className="flex-1 space-y-1.5">
                          <p className="text-sm font-medium">{gq.question}</p>
                          <div className="flex flex-wrap gap-1">
                            <span className="rounded-full bg-chart-4/15 px-2 py-0.5 text-[10px] font-medium text-chart-4">
                              {gq.category}
                            </span>
                            <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {gq.difficulty}
                            </span>
                          </div>
                          {gq.purpose && (
                            <p className="text-[11px] italic text-muted-foreground">{gq.purpose}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddGeneratedQuestion(gq.question, idx)}
                          disabled={addingQuestions.has(idx)}
                          className="shrink-0 gap-1"
                        >
                          {addingQuestions.has(idx) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Questions */}
      {interview.questions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Questions ({interview.questions.length})
          </h2>
          {interview.questions.map((q, index) => {
            const isOpen = expandedAnswers.has(q.id);
            const hasAnswer = !!q.candidate_answer;
            return (
              <div key={q.id} className="rounded-xl border border-border/70 card-elevated">
                <button
                  type="button"
                  onClick={() => toggleExpanded(q.id)}
                  className="flex w-full items-start justify-between gap-3 p-4 text-left"
                >
                  <div className="flex flex-1 items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/60 font-mono text-xs text-muted-foreground">
                      Q{index + 1}
                    </span>
                    <p className="flex-1 text-sm font-medium">{q.question_text}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {hasAnswer && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        Answered
                      </span>
                    )}
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="space-y-4 border-t border-border/60 p-4">
                    <div>
                      <label className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        <Sparkles className="h-3 w-3 text-primary" />
                        AI suggested answer
                      </label>
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{q.ai_suggested_answer}</p>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Candidate answer
                      </label>
                      <Textarea
                        placeholder="Record the candidate's answer…"
                        value={editedAnswers[q.id]?.candidate_answer ?? ""}
                        onChange={(e) =>
                          setEditedAnswers((prev) => ({
                            ...prev,
                            [q.id]: { ...prev[q.id], candidate_answer: e.target.value },
                          }))
                        }
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Interviewer notes
                      </label>
                      <Textarea
                        placeholder="Add your notes…"
                        value={editedAnswers[q.id]?.interviewer_notes ?? ""}
                        onChange={(e) =>
                          setEditedAnswers((prev) => ({
                            ...prev,
                            [q.id]: { ...prev[q.id], interviewer_notes: e.target.value },
                          }))
                        }
                        rows={2}
                      />
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleSaveAnswer(q.id)}
                      disabled={savingAnswers.has(q.id)}
                      className="gap-1.5"
                    >
                      {savingAnswers.has(q.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Wrap up CTA */}
      {interview.questions.length > 0 && !isCompleted && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-linear-to-br from-primary/10 via-primary/5 to-transparent p-5">
          <div>
            <p className="text-sm font-semibold">Ready to wrap up?</p>
            <p className="text-xs text-muted-foreground">
              Generate an AI summary and mark this interview as completed.
            </p>
          </div>
          <Button
            onClick={handleGenerateSummary}
            disabled={generatingSummary}
            className="gap-1.5 shadow-md shadow-primary/15"
          >
            {generatingSummary ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate summary
          </Button>
        </div>
      )}
    </div>
  );
}
