export const RIASEC_TRAITS = ['Realistic', 'Investigative', 'Artistic', 'Social', 'Enterprising', 'Conventional']

const RIASEC_OPPOSITE = {
  Realistic: 'Social',
  Social: 'Realistic',
  Investigative: 'Enterprising',
  Enterprising: 'Investigative',
  Artistic: 'Conventional',
  Conventional: 'Artistic',
}

function hash32(s) {
  let h = 5381
  const str = String(s || '')
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i)
  }
  return h >>> 0
}

function mulberry32(seed) {
  let a = Number(seed || 0) >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleInPlace(arr, rand = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

function vec(primary, secondary) {
  const v = {}
  const p = String(primary || '')
  const s = String(secondary || '')
  const opp = RIASEC_OPPOSITE[p]
  if (p) v[p] = 2
  if (s) v[s] = 1
  if (opp) v[opp] = -2
  return v
}

function opt(text, primary, secondary) {
  return { text: String(text || ''), scores: vec(primary, secondary) }
}

export function buildRiasecScenarios(seed = '', shuffleScenarios = false) {
  const base = [
    {
      id: 's1',
      text: 'Your group project is behind schedule and the deadline is in 2 days. What do you do first?',
      options: [
        opt('I decide priorities, assign roles, and keep the team moving.', 'Enterprising', 'Conventional'),
        opt('I check in with team members and help resolve tension so we can work together.', 'Social', 'Artistic'),
        opt('I look at what is failing and suggest a fix based on evidence.', 'Investigative', 'Realistic'),
        opt('I set up a simple plan (tasks, timeline, shared files) so the work is organized.', 'Conventional', 'Realistic'),
      ],
    },
    {
      id: 's2',
      text: 'You are volunteering to organize a school charity event. Which role do you naturally grab?',
      options: [
        opt("I'll design the posters, pick a theme, and decorate the venue.", 'Artistic', 'Social'),
        opt("I'll manage the budget, track sales, and handle logistics.", 'Conventional', 'Realistic'),
        opt("I'll find sponsors and encourage people to attend.", 'Enterprising', 'Social'),
        opt("I'll set up equipment (sound/lighting) and handle hands-on setup.", 'Realistic', 'Investigative'),
      ],
    },
    {
      id: 's3',
      text: 'A new AI study tool is released. What do you do first?',
      options: [
        opt('I test it systematically to understand how it works and where it fails.', 'Investigative', 'Realistic'),
        opt('I try it on a small task right away and learn the workflow by doing.', 'Realistic', 'Conventional'),
        opt('I suggest trying it with a small study group so we can learn together.', 'Social', 'Enterprising'),
        opt('I experiment with creative prompts and outputs and make it my own.', 'Artistic', 'Investigative'),
      ],
    },
    {
      id: 's4',
      text: 'Your class is planning a trip or group activity. What do you contribute first?',
      options: [
        opt('I handle the details: budget, schedule, and any forms or bookings.', 'Conventional', 'Realistic'),
        opt('I get people to commit, delegate tasks, and keep momentum.', 'Enterprising', 'Social'),
        opt('I sort out practical logistics like transport and equipment.', 'Realistic', 'Conventional'),
        opt('I compare options and risks and recommend a plan based on evidence.', 'Investigative', 'Realistic'),
      ],
    },
    {
      id: 's5',
      text: 'You are helping improve a classroom or shared space. What do you naturally do first?',
      options: [
        opt('I start assembling/fixing what is needed and rearrange the space hands-on.', 'Realistic', 'Conventional'),
        opt('I sketch a new layout and choose colors/materials to change the look and feel.', 'Artistic', 'Social'),
        opt('I coordinate the group, check in, and help people work smoothly together.', 'Social', 'Artistic'),
        opt('I create a materials list, budget, and step-by-step plan so nothing is missed.', 'Conventional', 'Realistic'),
      ],
    },
    {
      id: 's6',
      text: 'Your school wants a new initiative to help students succeed. What is your first move?',
      options: [
        opt('I gather information, look for patterns, and test what might work.', 'Investigative', 'Realistic'),
        opt('I brainstorm a concept and draft a message/visuals to introduce it.', 'Artistic', 'Investigative'),
        opt('I talk to students and staff, listen, and build support.', 'Social', 'Enterprising'),
        opt('I set goals, recruit people, and start organizing the launch steps.', 'Enterprising', 'Social'),
      ],
    },
    {
      id: 's7',
      text: 'In a new internship, a key process keeps failing and people are frustrated. What do you do first?',
      options: [
        opt('I fix the practical issue so work can continue.', 'Realistic', 'Conventional'),
        opt('I troubleshoot systematically to identify the root cause.', 'Investigative', 'Realistic'),
        opt('I align people on a plan and make decisions so the work can move forward.', 'Enterprising', 'Social'),
        opt('I document the steps and create a checklist so the process is consistent.', 'Conventional', 'Realistic'),
      ],
    },
    {
      id: 's8',
      text: 'You have to present what you learned for an assignment. Which approach do you choose?',
      options: [
        opt('I build a simple demonstration or prototype that shows it working.', 'Realistic', 'Investigative'),
        opt('I write an explanation with evidence and step-by-step reasoning.', 'Investigative', 'Realistic'),
        opt('I make a poster/video/story that communicates the idea clearly.', 'Artistic', 'Social'),
        opt('I run a short session with classmates and answer questions.', 'Social', 'Artistic'),
      ],
    },
    {
      id: 's9',
      text: 'A small student club wants to grow and stay active. What do you naturally focus on?',
      options: [
        opt('I handle practical setup for meetings and activities.', 'Realistic', 'Conventional'),
        opt('I create the brand: name, visuals, and creative content that stands out.', 'Artistic', 'Social'),
        opt('I focus on community: welcoming people, supporting members, and resolving issues.', 'Social', 'Artistic'),
        opt('I focus on growth: outreach, partnerships, and convincing people to join.', 'Enterprising', 'Social'),
      ],
    },
    {
      id: 's10',
      text: 'You have a lot of messy notes and an exam is coming. What do you do first?',
      options: [
        opt('I organize everything into a clear structure and schedule so I can follow it.', 'Conventional', 'Realistic'),
        opt('I focus on understanding the hardest concepts and do practice questions.', 'Investigative', 'Realistic'),
        opt('I create mind maps/diagrams/visual summaries to remember and connect ideas.', 'Artistic', 'Investigative'),
        opt('I form a study group so we can explain topics and support each other.', 'Social', 'Enterprising'),
      ],
    },
    {
      id: 's11',
      text: 'Your club wants to run a campaign for a cause. What role fits you best?',
      options: [
        opt('I design the message and create visuals/content.', 'Artistic', 'Social'),
        opt('I engage with people: reply, listen, and keep supporters involved.', 'Social', 'Artistic'),
        opt('I negotiate partnerships, set targets, and drive the campaign to grow.', 'Enterprising', 'Social'),
        opt('I manage the calendar, track tasks, and keep everything consistent.', 'Conventional', 'Realistic'),
      ],
    },
    {
      id: 's12',
      text: 'Your school receives new equipment/software and someone must set it up for everyone to use. What do you do?',
      options: [
        opt('I install/assemble it and handle the hands-on setup.', 'Realistic', 'Conventional'),
        opt('I test it carefully, identify issues, and get it working reliably.', 'Investigative', 'Realistic'),
        opt('I write a simple guide/checklist so others can use it consistently.', 'Conventional', 'Realistic'),
        opt('I lead the rollout: decide a plan, get buy-in, and make sure it is adopted.', 'Enterprising', 'Social'),
      ],
    },
  ]

  const scenarios = base.map((s) => ({
    id: String(s.id),
    text: String(s.text),
    options: (s.options || []).map((o, i) => ({
      id: `${s.id}:o${i}`,
      text: String(o.text),
      scores: { ...(o.scores || {}) },
    })),
  }))

  const s = String(seed || 'default')
  if (shuffleScenarios) {
    const randQ = mulberry32(hash32(`${s}:__questions__`))
    shuffleInPlace(scenarios, randQ)
  }
  for (const sc of scenarios) {
    const rand = mulberry32(hash32(`${s}:${sc.id}`))
    shuffleInPlace(sc.options, rand)
  }

  return scenarios
}
