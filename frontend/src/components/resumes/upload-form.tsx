"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileText, Loader2, X } from "lucide-react";
import type { UploadResponse } from "@/types/resume";

interface UploadFormProps {
  onSuccess: () => void;
}

export function UploadForm({ onSuccess }: UploadFormProps) {
  const [candidateName, setCandidateName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuth();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && isValidFile(droppedFile)) {
      setFile(droppedFile);
    } else {
      toast.error("Only PDF and DOCX files are supported");
    }
  };

  const isValidFile = (f: File) =>
    f.name.toLowerCase().endsWith(".pdf") || f.name.toLowerCase().endsWith(".docx");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && isValidFile(selected)) {
      setFile(selected);
    } else if (selected) {
      toast.error("Only PDF and DOCX files are supported");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !candidateName.trim()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("candidate_name", candidateName.trim());

      const result = await api.postForm<UploadResponse>(
        "/resumes/upload/",
        formData,
        token
      );
      toast.success(`Resume uploaded — ${result.chunks_count} chunks extracted`);
      setCandidateName("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const fileSizeKb = file ? Math.round(file.size / 1024) : 0;

  return (
    <div className="rounded-2xl border border-border/70 card-elevated p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Upload className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Upload a resume</h2>
          <p className="text-xs text-muted-foreground">
            PDF or DOCX · Auto-extracted and indexed for search
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label
            htmlFor="candidate_name"
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Candidate name
          </Label>
          <Input
            id="candidate_name"
            placeholder="e.g. Ada Lovelace"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            required
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Resume file
          </Label>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all ${
              dragActive
                ? "border-primary bg-primary/5"
                : file
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "cursor-pointer border-border hover:border-primary/40 hover:bg-primary/2"
            }`}
          >
            {file ? (
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fileSizeKb.toLocaleString()} KB ·{" "}
                      {file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX"}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">
                  Drop your file here, or{" "}
                  <span className="text-primary">click to browse</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Supports PDF and DOCX up to 10 MB
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Resume file upload"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="h-11 w-full gap-2 shadow-md shadow-primary/15"
          disabled={loading || !file || !candidateName.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Extracting & indexing…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload Resume
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
