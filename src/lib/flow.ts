/**
 * Minimal rules engine:
 * - Each scenario has steps.
 * - For each step, we define keywords the "agent" should mention.
 * - If message matches the step, we advance and return the customer's reply for the *next* step.
 * - If not, we stay on the same step and return a nudge/clarification.
 */

export type Role = 'agent' | 'customer' | 'system'

export type FlowStep = {
  goal: string
  keywordsAny?: string[]
  keywordsAll?: string[]
  onPassReply: string
  onFailReply: string
}

export type ScenarioFlow = {
  opener: string
  steps: FlowStep[]
  closing: string
}

export const SCENARIO_FLOWS = {
  'Card lost': {
    opener:
      "Hi, I've lost my card and I'm really worried someone might use it. Can you help me block it immediately?",
    steps: [
      {
        goal: 'Verify identity and reassure customer',
        keywordsAny: [
          'verify',
          'security',
          'full name',
          'date of birth',
          'dob',
          'last 4',
          'phone',
          'email',
          'account number',
          'understand',
          'help',
        ],
        onPassReply:
          "Yes, my name is John Smith and my DOB is March 15th, 1985. Please block the card right away.",
        onFailReply:
          "I'm really panicked here. What do you need from me to verify it's me and block my card?",
      },
      {
        goal: 'Confirm card details and block the card',
        keywordsAny: [
          'card number',
          'last 4 digits',
          'block',
          'freeze',
          'deactivate',
          'cancel',
          'stop',
          'disable',
          'protect',
        ],
        onPassReply:
          'The last 4 digits are 1234. Yes, please block it immediately. When can I get a replacement?',
        onFailReply:
          "Can you actually block the card now? I'm worried about fraudulent charges. What's the process?",
      },
      {
        goal: 'Arrange replacement card and explain timeline',
        keywordsAny: [
          'replacement',
          'new card',
          'expedite',
          'rush',
          'timeline',
          'delivery',
          'address',
          'fee',
          'temporary',
        ],
        onPassReply:
          'Great, please expedite it to my home address. Is there a fee for rush delivery? I need it urgently.',
        onFailReply:
          "How long will a new card take? Can you expedite it? I need access to my account soon.",
      },
    ],
    closing:
      'Thank you so much for blocking it quickly and arranging the replacement. I feel much better now.',
  } as ScenarioFlow,

  'Transfer failed': {
    opener:
      "Hi, I tried to transfer $2,500 to my landlord but it failed. The money was taken from my account but didn't reach them.",
    steps: [
      {
        goal: 'Empathize and gather transfer details',
        keywordsAny: [
          'sorry',
          'understand',
          'transfer',
          'amount',
          'reference',
          'recipient',
          'date',
          'time',
          'account number',
          'routing',
        ],
        onPassReply:
          "I sent $2,500 yesterday at 3 PM. The reference was 'Rent March'. My landlord's account is at Chase Bank.",
        onFailReply:
          "This is really stressful because rent is due. Do you need the transfer reference or recipient details?",
      },
      {
        goal: 'Check transfer status and explain what happened',
        keywordsAny: [
          'status',
          'pending',
          'processing',
          'rejected',
          'returned',
          'bank holiday',
          'cutoff time',
          'validation',
          'account details',
        ],
        onPassReply:
          'So it\'s still processing? The landlord said they haven\'t received it. When should it arrive?',
        onFailReply:
          "I don't understand what happened. Is the money stuck somewhere? When will my landlord get it?",
      },
      {
        goal: 'Provide resolution timeline or next steps',
        keywordsAny: [
          'resolve',
          'timeline',
          'eta',
          'retry',
          'refund',
          'trace',
          'escalate',
          'ticket',
          'notify',
          'follow up',
        ],
        onPassReply:
          'Okay, please create a trace ticket and let me know the reference number. Will you notify me when it resolves?',
        onFailReply:
          "What can you do to fix this? I need the money to reach my landlord today. Can you escalate this?",
      },
    ],
    closing:
      'Thanks for investigating this. I\'ll wait for your update and the trace results.',
  } as ScenarioFlow,

  'Account locked': {
    opener:
      "My account is locked and I can't access my money. I tried logging in multiple times and now it says my account is suspended.",
    steps: [
      {
        goal: 'Verify identity and understand the lockout reason',
        keywordsAny: [
          'verify',
          'identity',
          'full name',
          'date of birth',
          'dob',
          'phone',
          'email',
          'security',
          'failed attempts',
          'suspicious activity',
        ],
        onPassReply:
          "My name is Sarah Johnson, DOB June 8th, 1990. I was trying to pay bills and kept getting errors. That's probably why it locked.",
        onFailReply:
          "I really need access to my account for bills. What information do you need to verify it's me?",
      },
      {
        goal: 'Review security concerns and account activity',
        keywordsAny: [
          'security review',
          'suspicious',
          'activity',
          'location',
          'device',
          'fraud',
          'protection',
          'recent transactions',
          'login attempts',
        ],
        onPassReply:
          'I only logged in from my home computer and phone. No unusual transactions. Can you see what triggered it?',
        onFailReply:
          "What security issue are you seeing? I haven't done anything unusual. How do we unlock it?",
      },
      {
        goal: 'Provide unlock process and timeline',
        keywordsAny: [
          'unlock',
          'restore access',
          'reset',
          'verify documents',
          'id upload',
          'timeline',
          'immediately',
          'ticket',
          'escalate',
        ],
        onPassReply:
          'I can upload my ID right now if that helps. How quickly can you restore access? I have bills due today.',
        onFailReply:
          "How long will this take to resolve? I need access to pay my bills. Is there an emergency process?",
      },
    ],
    closing:
      'Thank you for unlocking my account so quickly. I really appreciate the help with this urgent situation.',
  } as ScenarioFlow,
} satisfies Record<string, ScenarioFlow>

function normalize(s: string): string {
  return s.toLowerCase()
}

function matches(text: string, step: FlowStep): boolean {
  const t = normalize(text)

  if (step.keywordsAny && step.keywordsAny.length > 0) {
    const anyHit = step.keywordsAny?.some((keyword) => t.includes(normalize(keyword)))
    if (!anyHit) return false
  }

  if (step.keywordsAll && step.keywordsAll.length > 0) {
    const allHit = step.keywordsAll?.every((keyword) => t.includes(normalize(keyword)))
    if (!allHit) return false
  }
  return true
}

/**
 * Given a scenario, current step index, and the agent's new message,
 * decide the customer's next reply and the *next* step index.
 *
 * Conventions:
 * - currentStep = 0 means we are working on the first step in flow.steps[0]
 * - When we pass the last step, we return "closing" and mark isDone.
 */

export function evaluateNext(opts: {
  scenario: keyof typeof SCENARIO_FLOWS
  currentStep: number
  agentText: string
}) : {
  reply: string
  nextStep: number
  isDone: boolean
} {
  const flow = SCENARIO_FLOWS[opts.scenario]
  const step = flow.steps[opts.currentStep]

  if (!step)
    return { reply: flow.closing, nextStep: opts.currentStep, isDone: true }

  const ok = matches(opts.agentText, step)

  if (!ok)
    return { reply: step.onFailReply, nextStep: opts.currentStep, isDone: false }

  const next = opts.currentStep + 1
  const nextStepsExists = flow.steps[next] != null

  if (!nextStepsExists)
    return { reply: flow.closing, nextStep: next, isDone: true }

  return { reply: step.onPassReply, nextStep: next, isDone: false }
}

export function getOpener(scenario: keyof typeof SCENARIO_FLOWS) {
  return SCENARIO_FLOWS[scenario].opener
}