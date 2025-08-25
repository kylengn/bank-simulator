import { createClient } from '../../../../../../utils/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { evaluateNext } from '@/lib/flow'

interface MessageRequest {
  content: string
  kind?: 'text' | 'audio' | 'video'
  step_no?: number
}

function validateMessageRequest(body: unknown): MessageRequest | null {
  if (!body || typeof body !== 'object') return null
  
  const bodyObj = body as Record<string, unknown>
  const { content, kind = 'text', step_no } = bodyObj
  
  if (!content || typeof content !== 'string' || !content.trim()) {
    return null
  }

  if (kind && (typeof kind !== 'string' || !['text', 'audio', 'video'].includes(kind))) {
    return null
  }
  
  if (step_no !== undefined && (typeof step_no !== 'number' || step_no < 0)) {
    return null
  }
  
  return {
    content: content.trim(),
    kind: kind as 'text' | 'audio' | 'video',
    step_no
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const supabase = await createClient()
    const { runId } = await params
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(runId)) {
      return NextResponse.json(
        { error: 'Invalid run ID format' },
        { status: 400 }
      )
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedInput = validateMessageRequest(body)
    
    if (!validatedInput) {
      return NextResponse.json(
        { error: 'Invalid request. Content is required and must be a non-empty string.' },
        { status: 400 }
      )
    }
    
    const { content, kind, step_no } = validatedInput


    const { data: run, error: runError } = await supabase
      .from('runs')
      .select('*')
      .eq('id', runId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (runError || !run) {
      return NextResponse.json(
        { error: 'Run not found, access denied, or simulation already ended' },
        { status: 404 }
      )
    }

    // Rate limiting - prevent spam
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { count: recentMessageCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('run_id', runId)
      .eq('role', 'agent')
      .gte('created_at', fiveMinutesAgo)

    if (recentMessageCount && recentMessageCount > 50) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down.' },
        { status: 429 }
      )
    }


    const { data: agentMessage, error: agentError } = await supabase
      .from('messages')
      .insert([{
        run_id: runId,
        role: 'agent',
        content,
        step_no,
        kind
      }])
      .select('id, run_id, role, content, step_no, created_at, kind')
      .single()

    if (agentError) {
      console.error('Agent message insert error:', {
        runId,
        userId: user.id,
        error: agentError
      })
      return NextResponse.json(
        { error: 'Failed to save agent message', details: agentError.message },
        { status: 500 }
      )
    }


    let flowResult
    try {
      flowResult = evaluateNext({
        scenario: run.scenario,
        currentStep: step_no || 0,
        agentText: content
      })
    } catch (flowError) {
      console.error('Flow evaluation error:', {
        runId,
        scenario: run.scenario,
        currentStep: step_no,
        error: flowError
      })
      return NextResponse.json(
        { error: 'Failed to process conversation flow' },
        { status: 500 }
      )
    }


    const { data: customerMessage, error: customerError } = await supabase
      .from('messages')
      .insert([{
        run_id: runId,
        role: 'customer',
        content: flowResult.reply,
        step_no: flowResult.nextStep,
        kind: 'text'
      }])
      .select('id, run_id, role, content, step_no, created_at, kind')
      .single()

    if (customerError) {
      console.error('Customer message insert error:', {
        runId,
        userId: user.id,
        flowResult,
        error: customerError
      })
      return NextResponse.json(
        { error: 'Failed to generate customer response', details: customerError.message },
        { status: 500 }
      )
    }


    if (flowResult.isDone) {
      const { error: updateError } = await supabase
        .from('runs')
        .update({ 
          status: 'ended', 
          ended_at: new Date().toISOString() 
        })
        .eq('id', runId)

      if (updateError) {
        console.error('Failed to update run status:', updateError)
      }
    }


    return NextResponse.json({
      success: true,
      agentMessage,
      customerMessage,
      flowResult: {
        nextStep: flowResult.nextStep,
        isDone: flowResult.isDone
      }
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
