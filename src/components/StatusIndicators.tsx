import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Clock,
  FileCheck,
  Archive,
  FileEdit,
} from 'lucide-react';
import { VerificationState, PolicyStatus, ReviewStatus, RuleSeverity } from '../types';

export const FourStateIndicator: React.FC<{ state: VerificationState }> = ({ state }) => {
  switch (state) {
    case 'Supported':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Supported</span>
        </span>
      );
    case 'Contradicted':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap shrink-0">
          <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span>Contradicted</span>
        </span>
      );
    case 'Unverified':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Unverified</span>
        </span>
      );
    case 'Ambiguous':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 whitespace-nowrap shrink-0">
          <HelpCircle className="w-3.5 h-3.5 text-violet-600 shrink-0" />
          <span>Ambiguous</span>
        </span>
      );
  }
};

export const PolicyStatusIndicator: React.FC<{ status: PolicyStatus }> = ({ status }) => {
  switch (status) {
    case 'Active':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap shrink-0">
          <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Active</span>
        </span>
      );
    case 'Draft':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap shrink-0">
          <FileEdit className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Draft</span>
        </span>
      );
    case 'Archived':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
          <Archive className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Archived</span>
        </span>
      );
  }
};

export const ReviewStatusIndicator: React.FC<{ status: ReviewStatus }> = ({ status }) => {
  switch (status) {
    case 'Approved':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Approved</span>
        </span>
      );
    case 'Flagged':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span>Flagged</span>
        </span>
      );
    case 'Pending Review':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap shrink-0">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Pending Review</span>
        </span>
      );
    case 'Rejected':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap shrink-0">
          <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Rejected</span>
        </span>
      );
  }
};

export const SeverityText: React.FC<{ severity: RuleSeverity }> = ({ severity }) => {
  const color =
    severity === 'Critical'
      ? 'text-red-700 font-semibold'
      : severity === 'High'
      ? 'text-amber-700 font-medium'
      : 'text-slate-600 font-medium';
  return <span className={`text-xs ${color} whitespace-nowrap shrink-0`}>{severity} Severity</span>;
};
