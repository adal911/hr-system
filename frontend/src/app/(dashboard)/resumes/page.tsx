"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UploadForm } from "@/components/resumes/upload-form";
import { toast } from "sonner";
import {
  FileText,
  Trash2,
  ExternalLink,
  Plus,
  X,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import type { Resume } from "@/types/resume";

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const { user, token } = useAuth();

  const canManage = user?.role === "admin" || user?.role === "hr";

  const fetchResumes = useCallback(async () => {
    try {
      const data = await api.get<Resume[]>("/resumes/", token);
      setResumes(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load resumes");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete resume for ${name}?`)) return;

    try {
      await api.delete(`/resumes/${id}/delete/`, token);
      toast.success("Resume deleted");
      fetchResumes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
            <FileText className="h-3 w-3" />
            Candidate Library
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Resumes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {resumes.length} resume{resumes.length !== 1 ? "s" : ""} indexed and ready to search.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => setShowUpload(!showUpload)}
            className="gap-1.5 shadow-md shadow-primary/15"
          >
            {showUpload ? (
              <>
                <X className="h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Upload Resume
              </>
            )}
          </Button>
        )}
      </div>

      {showUpload && canManage && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <UploadForm
            onSuccess={() => {
              fetchResumes();
              setShowUpload(false);
            }}
          />
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-muted/40 shimmer" />
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <Card className="card-elevated">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <p className="text-lg font-semibold">No resumes uploaded yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {canManage ? "Click 'Upload Resume' to add your first candidate." : "Ask HR to upload some resumes."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => (
            <ResumeCard
              key={resume._id}
              resume={resume}
              canManage={canManage}
              onDelete={() => handleDelete(resume._id, resume.candidate_name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ResumeCard({
  resume,
  canManage,
  onDelete,
}: {
  resume: Resume;
  canManage: boolean;
  onDelete: () => void;
}) {
  const initials = resume.candidate_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/70 card-elevated p-5 transition-all hover:border-primary/30 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-primary to-chart-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20">
            {initials}
          </div>
          <div className="min-w-0">
            <Link
              href={`/resumes/${resume._id}`}
              className="flex items-center gap-1 text-base font-semibold tracking-tight hover:text-primary"
            >
              <span className="truncate">{resume.candidate_name}</span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">
              by {resume.uploaded_by}
            </p>
          </div>
        </div>
        <span className="rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
          {resume.file_type}
        </span>
      </div>

      <div className="my-4 h-px bg-border/60" />

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {new Date(resume.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
        <div className="flex gap-1">
          <Link href={`/resumes/${resume._id}`}>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
              <Sparkles className="h-3 w-3" />
              View
            </Button>
          </Link>
          <a
            href={resume.file_url}
            target="_blank"
            rel="noopener noreferrer"
            title="Download original"
          >
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
          {canManage && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
