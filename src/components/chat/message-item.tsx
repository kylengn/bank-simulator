'use client'

import React from "react";
import { cn } from "@/lib/utils";
import { Message } from "@/lib/types";

interface MessageItemProps {
  message: Message;
  className?: string;
}

export default function MessageItem({ message: m, className }: MessageItemProps) {
  return (
    <div
      className={cn(
        'rounded-md p-3 text-sm',
        m.role === 'agent' && 'bg-primary/10 ml-auto max-w-[80%]',
        m.role === 'customer' && 'bg-muted max-w-[80%]',
        m.role === 'system' && 'bg-accent/20 text-muted-foreground text-xs text-center',
        className
      )}
      style={{ wordBreak: 'break-word' }}
    >
      {m.role !== 'system' && (
        <div className="text-[10px] uppercase tracking-wide mb-1 text-muted-foreground">
          {m.role} {typeof m.step_no === 'number' ? `(step ${m.step_no})` : ''}
        </div>
      )}

      {(m.kind === 'audio' || (m.attachment_url && m.mime_type?.startsWith('audio/'))) ? (
        <div className="space-y-2">
          <div className={m.role === 'system' ? 'italic' : ''}>{m.content}</div>
          <audio controls src={m.attachment_url} className="w-full max-w-xs" />
        </div>
      ) : (m.kind === 'video' || (m.attachment_url && m.mime_type?.startsWith('video/'))) ? (
        <div className="space-y-2">
          <div className={m.role === 'system' ? 'italic' : ''}>{m.content}</div>
          <video controls src={m.attachment_url} className="w-full max-w-xs rounded-md" />
        </div>
      ) : (
        <div className={m.role === 'system' ? 'italic' : ''}>{m.content}</div>
      )}
    </div>
  )
}
