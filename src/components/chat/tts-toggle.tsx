'use client'
import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export default function TtsToggle({ onChange }: { onChange: (v: boolean) => void }) {
  const [on, setOn] = useState<boolean>(false)

  useEffect(() => onChange(on), [on, onChange])

  return (
    <div className="flex items-center gap-2">
      <Switch id="tts" checked={on} onCheckedChange={setOn} />
      <Label htmlFor="tts">Speak customer replies</Label>
    </div>
  )
}