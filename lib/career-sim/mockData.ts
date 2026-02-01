// Mock data for Career Simulation feature
import { CareerSimulation } from './types';

export const MOCK_SIMULATIONS: Record<string, CareerSimulation> = {
  'stay-current-10y': {
    id: 'stay-current-10y',
    timeHorizon: 10,
    pathName: 'Stay at Current Company',
    confidence: 78,
    outcome: {
      title: 'Senior Engineering Manager',
      company: 'TechCorp',
      totalComp: 285000,
      location: 'San Francisco, CA',
      satisfaction: 4.2,
    },
    stats: {
      compensation: {
        base: 210000,
        equity: 75000,
      },
      growth: {
        promotions: 3,
        yearsToSenior: 4,
        teamSize: 12,
      },
      workLife: {
        hoursPerWeek: 48,
        burnoutRisk: 'Medium',
        flexibility: 'High',
      },
      skills: {
        technical: 'Advanced distributed systems, cloud architecture',
        leadership: 'Team management, strategic planning',
        expertise: 'Domain expert in fintech infrastructure',
      },
    },
    timeline: {
      milestones: [
        { year: 1, title: 'Senior Engineer', company: 'TechCorp', salary: 165000 },
        { year: 3, title: 'Staff Engineer', company: 'TechCorp', salary: 215000 },
        { year: 5, title: 'Engineering Manager', company: 'TechCorp', salary: 245000 },
        { year: 8, title: 'Senior EM', company: 'TechCorp', salary: 285000 },
        { year: 12, title: 'Director of Engineering', company: 'TechCorp', salary: 320000 },
        { year: 15, title: 'VP of Engineering', company: 'TechCorp', salary: 380000 },
      ],
    },
    globalComparison: {
      income: {
        yourComp: 285000,
        globalPercentile: 8,
        globalAverage: 120000,
        usAverage: 195000,
        topEarners: { range: '$450k - $650k', group: 'FAANG senior staff' },
        developingMarkets: { min: 45000, max: 80000 },
      },
      careerProgression: {
        yourLevel: 'Senior Manager level',
        globalPercentile: 12,
        mostCommon: 'Senior IC (no management)',
        fastest: 'Tech leads at unicorns (VP in 7 years)',
        many: 'Still mid-level engineer',
      },
      workLife: {
        yourHours: 50,
        globalPercentile: 55,
        range: { min: 35, minLabel: 'Europe', max: 80, maxLabel: 'startup hubs' },
        bestBalance: 'Nordic countries, remote workers',
        worstBalance: 'China tech, US startups',
      },
      equity: {
        yourEquity: 180000,
        globalPercentile: 25,
        mostEngineers: '$0 - $30k equity',
        lotteryWinners: { range: '$5M - $50M', percentage: 0.1 },
        note: 'You\'re in the top quartile by choosing stable equity',
      },
      geographic: {
        northAmerica: 12000,
        europe: 8500,
        asia: 45000,
        latinAmerica: 3200,
        note: 'You\'re in the top tier of a global workforce',
      },
      globalReality: 'An engineer in Bangalore with your skills makes $35k/year. An engineer in Berlin makes $110k. You make $285k in SF. Same job, wildly different outcomes based purely on geography and timing.',
    },
    zoomIns: {
      regretMoments: [
        {
          year: 2029,
          title: 'The Google Offer',
          description: '$280k total comp, VP track in 5 years. You said no because you\'d just gotten promoted and felt loyal. Google stock is up 340% since then. Your team from that time? All gone anyway.',
        },
        {
          year: 2032,
          title: 'The Startup',
          description: 'Your friend\'s Series B company offered you Head of Product, 0.5% equity. You calculated it was \'too risky\' with a mortgage. They got acquired last year. That equity would be worth $2.3M.',
        },
        {
          year: 2036,
          title: 'The Sabbatical',
          description: 'You had 6 months of runway saved. Wanted to travel Asia and \'figure out what you really want.\' You took the promotion instead. You still haven\'t been to Japan.',
        },
      ],
      reflection: 'Sometimes at 2am you wonder: Did you optimize for the wrong things?\n\nBut also: You have $1.2M in retirement accounts and you sleep well.\n\nBoth can be true.',
      cards: [
        { id: 'tuesday', title: 'Your lock screen screenshot', icon: '📱' },
        { id: 'email', title: 'The Email That Changed Everything', icon: '📧' },
        { id: 'calendar', title: 'Your Calendar Evolution', icon: '📅' },
        { id: 'feedback', title: 'What Your Team Says About You', icon: '💬' },
        { id: 'inbox', title: 'Your Inbox: Then vs Now', icon: '📬' },
      ],
      randomTuesday: {
        date: 'Tuesday, March 15, 2034',
        notifications: [
          { app: 'Calendar', icon: '📅', title: 'Engineering All-Hands', body: 'Starting in 15 minutes', time: '9:45 AM' },
          { app: 'Slack', icon: '💬', title: 'Sarah Chen', body: 'Can you review the architecture doc?', time: '9:30 AM' },
          { app: 'Gmail', icon: '📧', title: 'Promotion Committee', body: 'Your team member has been approved!', time: '8:15 AM' },
          { app: 'LinkedIn', icon: '💼', title: 'Mike Park commented on your post', body: '"Great insights on distributed systems"', time: '7:20 AM' },
        ],
        timeline: [
          { time: '7:30 AM', icon: '☕', title: 'Morning routine', description: 'Coffee and catch up on overnight Slack messages from global team' },
          { time: '9:00 AM', icon: '👥', title: 'Team standup', description: 'Sprint planning with 12-person engineering team' },
          { time: '10:00 AM', icon: '📊', title: 'Architecture review', description: 'Reviewing microservices proposal for Q2 roadmap' },
          { time: '12:00 PM', icon: '🍱', title: 'Lunch with mentor', description: 'Career advice session with VP of Engineering' },
          { time: '2:00 PM', icon: '💻', title: 'Deep work', description: 'Code review and technical documentation' },
          { time: '4:00 PM', icon: '🎯', title: 'Product sync', description: 'Quarterly planning with product leadership' },
          { time: '6:00 PM', icon: '🏃', title: 'Wrap up', description: 'Final emails and handoff to Asia-Pacific team' },
        ],
        stats: {
          decisionsMade: 23,
          imposterSyndromeMoments: 2,
        },
      },
      theEmail: {
        from: 'Jennifer Kao <jkao@techcorp.com>',
        to: 'you@techcorp.com',
        subject: 'Re: Staff Engineer Promotion - Congratulations!',
        timestamp: 'Mon, Apr 12, 2028 at 2:34 PM',
        body: 'Hi there,\n\nI\'m thrilled to officially confirm your promotion to Staff Engineer, effective next month! Your work on the payment infrastructure redesign was exceptional, and the leadership team unanimously agreed you\'ve earned this.\n\nYour new compensation package:\n• Base: $195,000\n• Equity refresh: 15,000 RSUs (4-year vest)\n• Bonus target: 20%\n\nWe\'ll discuss your expanded scope in our 1:1 this week. This role comes with more influence across the org - you\'ll be leading our architecture council and mentoring senior engineers.\n\nLooking forward to seeing what you accomplish next!\n\nBest,\nJennifer\nVP of Engineering',
        metadata: {
          folder: 'Career Milestones',
          timesOpened: 47,
          lastUpdate: 'You starred this message',
        },
      },
      calendar: {
        current: {
          year: 2026,
          events: [
            { day: 'Mon', time: '9:00 AM', title: 'Team Standup', color: '#4285F4', duration: 30 },
            { day: 'Mon', time: '2:00 PM', title: 'Code Review', color: '#0F9D58', duration: 60 },
            { day: 'Tue', time: '10:00 AM', title: '1:1 with Manager', color: '#F4B400', duration: 30 },
            { day: 'Tue', time: '3:00 PM', title: 'Sprint Planning', color: '#4285F4', duration: 90 },
            { day: 'Wed', time: '11:00 AM', title: 'Architecture Sync', color: '#DB4437', duration: 60 },
            { day: 'Thu', time: '9:00 AM', title: 'Team Standup', color: '#4285F4', duration: 30 },
            { day: 'Thu', time: '1:00 PM', title: 'Tech Talk', color: '#0F9D58', duration: 60 },
            { day: 'Fri', time: '9:00 AM', title: 'Team Standup', color: '#4285F4', duration: 30 },
          ],
        },
        future: {
          year: 2034,
          events: [
            { day: 'Mon', time: '9:00 AM', title: 'Leadership Sync', color: '#DB4437', duration: 60 },
            { day: 'Mon', time: '11:00 AM', title: 'Eng All-Hands', color: '#F4B400', duration: 60 },
            { day: 'Mon', time: '2:00 PM', title: 'Budget Review', color: '#DB4437', duration: 90 },
            { day: 'Tue', time: '10:00 AM', title: 'Skip-level 1:1s', color: '#4285F4', duration: 120 },
            { day: 'Tue', time: '3:00 PM', title: 'Hiring Committee', color: '#F4B400', duration: 60 },
            { day: 'Wed', time: '9:00 AM', title: 'Product Strategy', color: '#DB4437', duration: 90 },
            { day: 'Wed', time: '2:00 PM', title: 'Architecture Council', color: '#0F9D58', duration: 90 },
            { day: 'Thu', time: '10:00 AM', title: 'Performance Reviews', color: '#F4B400', duration: 120 },
            { day: 'Thu', time: '3:00 PM', title: 'Exec Presentation', color: '#DB4437', duration: 60 },
            { day: 'Fri', time: '9:00 AM', title: 'Team Retro', color: '#4285F4', duration: 60 },
            { day: 'Fri', time: '11:00 AM', title: 'Roadmap Planning', color: '#0F9D58', duration: 90 },
          ],
        },
        stats: {
          meetingsPerWeek: { current: 8, future: 18 },
          stressLevel: { current: 'Moderate', future: 'High' },
          controlLevel: { current: 'Medium', future: 'High' },
          lastOpenedFigma: { current: '2 hours ago', future: '3 weeks ago' },
        },
      },
      teamFeedback: {
        messages: [
          {
            author: 'Anonymous Teammate A',
            avatar: '👤',
            timestamp: '2:14 PM',
            message: 'They\'re incredibly patient when explaining complex systems. Never makes you feel dumb for asking questions.',
            reactions: [
              { emoji: '❤️', count: 8 },
              { emoji: '💯', count: 5 },
            ],
          },
          {
            author: 'Anonymous Teammate B',
            avatar: '👤',
            timestamp: '2:18 PM',
            message: 'Best code reviewer I\'ve worked with. Always provides context and suggests improvements rather than just pointing out issues.',
            reactions: [
              { emoji: '🙌', count: 12 },
              { emoji: '✨', count: 6 },
            ],
          },
          {
            author: 'Anonymous Teammate C',
            avatar: '👤',
            timestamp: '2:22 PM',
            message: 'Sometimes takes on too much and becomes a bottleneck. Wish they\'d delegate more.',
            reactions: [
              { emoji: '👀', count: 4 },
              { emoji: '💭', count: 3 },
            ],
          },
          {
            author: 'Anonymous Teammate D',
            avatar: '👤',
            timestamp: '2:31 PM',
            message: 'Their technical vision is solid, but I wish they\'d push back on product more. We end up building features that don\'t make sense.',
            reactions: [
              { emoji: '💯', count: 7 },
              { emoji: '👍', count: 5 },
            ],
          },
        ],
        finalMessage: 'What they don\'t say: "We worry they\'re too comfortable here and not pushing themselves anymore."',
      },
      inbox: {
        current: {
          year: 2026,
          emails: [
            { sender: 'GitHub', subject: 'Pull request #1247 merged', time: '9:42 AM', unread: true },
            { sender: 'Sarah Chen', subject: 'Quick question about the API', time: '9:15 AM', unread: true },
            { sender: 'Jira', subject: 'PROJ-445 assigned to you', time: '8:30 AM', unread: false },
            { sender: 'Manager', subject: '1:1 agenda for tomorrow', time: 'Yesterday', unread: false, important: true },
            { sender: 'HR', subject: 'Benefits enrollment deadline', time: 'Yesterday', unread: false },
            { sender: 'All-Eng', subject: 'Tech talk: Distributed tracing', time: '2 days ago', unread: false },
          ],
        },
        future: {
          year: 2034,
          emails: [
            { sender: 'Exec Team', subject: 'Q2 Budget Approval Needed', time: '10:15 AM', unread: true, important: true },
            { sender: 'Recruiting', subject: 'Senior Engineer candidates for review', time: '9:45 AM', unread: true },
            { sender: 'Product Lead', subject: 'Re: Roadmap concerns', time: '9:20 AM', unread: true, important: true },
            { sender: 'Skip-level Report', subject: 'Career development discussion', time: 'Yesterday', unread: false },
            { sender: 'Finance', subject: 'Headcount planning for 2035', time: 'Yesterday', unread: false, important: true },
          ],
          filteredCount: 23,
        },
        stats: {
          responseTime: { current: '2 hours', future: '4 hours' },
          stressLevel: { current: 'Low', future: 'Medium-High' },
        },
      },
    },
    societalImpact: {
      productsShipped: [
        'Led redesign of checkout flow used by 12M people monthly',
        'Shipped accessibility features used by 340k people with disabilities',
        'Your pricing model generated $180M in company revenue',
        '4 features you killed saved the company from bad bets',
      ],
      peopleInfluenced: [
        'Directly managed 23 people over 15 years',
        '8 of them are now Senior PMs or Directors',
        '2 left to start their own companies',
        '1 wrote you a LinkedIn message in 2038: \'You changed my career\'',
      ],
      industryContributions: [
        'Spoke at 6 conferences (total audience: ~4,000 people)',
        'Wrote 12 blog posts (combined: 180k views)',
        'Mentored 15 people outside your company',
        'That framework you created in 2031? Still used at 40+ companies',
      ],
      rippleEffect: 'Your direct reports managed 47 people. Those people managed 89 more. Your product decisions → affected 12M users → who told ~30M others. Your blog post about PM career paths? Changed 200+ people\'s trajectories.',
      honestAssessment: 'You didn\'t cure cancer. You didn\'t end poverty. But you made software slightly better for millions of people, and you helped dozens of people build better careers.\n\nYou created small, compounding positive impact.\n\nNot world-changing. But not nothing.',
    },
    alternatePaths: [
      { id: 'switch-faang', label: 'What if I joined a FAANG company?' },
      { id: 'startup-cto', label: 'What if I became a startup CTO?' },
      { id: 'ic-track', label: 'What if I stayed on the IC track?' },
    ],
  },
  'switch-faang-10y': {
    id: 'switch-faang-10y',
    timeHorizon: 10,
    pathName: 'Join FAANG Company',
    confidence: 72,
    outcome: {
      title: 'Principal Engineer',
      company: 'Meta',
      totalComp: 520000,
      location: 'Menlo Park, CA',
      satisfaction: 4.5,
    },
    stats: {
      compensation: {
        base: 280000,
        equity: 240000,
      },
      growth: {
        promotions: 4,
        yearsToSenior: 3,
        teamSize: 0,
      },
      workLife: {
        hoursPerWeek: 52,
        burnoutRisk: 'High',
        flexibility: 'Medium',
      },
      skills: {
        technical: 'Cutting-edge ML systems, massive scale infrastructure',
        leadership: 'Technical influence across organization',
        expertise: 'Industry-recognized expert in AI infrastructure',
      },
    },
    timeline: {
      milestones: [
        { year: 1, title: 'Software Engineer (E5)', company: 'Meta', salary: 320000 },
        { year: 2, title: 'Senior Software Engineer (E6)', company: 'Meta', salary: 410000 },
        { year: 5, title: 'Staff Engineer (E7)', company: 'Meta', salary: 480000 },
        { year: 8, title: 'Principal Engineer (E8)', company: 'Meta', salary: 520000 },
        { year: 12, title: 'Distinguished Engineer (E9)', company: 'Meta', salary: 650000 },
        { year: 15, title: 'Fellow / VP Engineering', company: 'Meta', salary: 800000 },
      ],
    },
    tradeoffs: {
      pros: [
        'Significantly higher compensation and equity',
        'Work on cutting-edge technology at massive scale',
        'World-class colleagues and learning opportunities',
        'Resume boost and industry recognition',
      ],
      cons: [
        'Intense competition and performance pressure',
        'Longer hours and higher stress levels',
        'Less work-life balance, especially early on',
        'Risk of getting lost in large organization',
      ],
    },
    assumptions: [
      { text: 'You pass the rigorous interview process', likelihood: 60, icon: '⚠️' },
      { text: 'You adapt quickly to high-performance culture', likelihood: 70, icon: '⚠️' },
      { text: 'Company maintains strong stock performance', likelihood: 65, icon: '⚠️' },
      { text: 'You thrive in competitive environment', likelihood: 75, icon: '✓' },
      { text: 'No major tech industry downturn', likelihood: 60, icon: '⚠️' },
    ],
    dayInLife: 'You wake up at 6:30 AM to get ahead of the day. The morning is spent in deep technical work on ML infrastructure that serves billions of users. Lunch is a working session with engineers from three different time zones. The afternoon brings architecture reviews where every decision is scrutinized by some of the smartest people in tech. You leave at 7 PM feeling exhausted but exhilarated by the technical challenges.',
    zoomIns: {
      randomTuesday: {
        date: 'Tuesday, June 8, 2034',
        notifications: [
          { app: 'Workplace', icon: '💬', title: 'Infrastructure Team', body: '47 new messages', time: '6:45 AM' },
          { app: 'Calendar', icon: '📅', title: 'Architecture Review', body: 'Starting in 30 minutes', time: '9:30 AM' },
          { app: 'Gmail', subject: 'Oncall Alert', body: 'P0 incident in prod', time: '3:20 AM' },
          { app: 'LinkedIn', icon: '💼', title: 'Recruiter message', body: 'Startup CTO opportunity', time: 'Yesterday' },
        ],
        timeline: [
          { time: '6:30 AM', icon: '☕', title: 'Early start', description: 'Review overnight incidents and global team updates' },
          { time: '8:00 AM', icon: '💻', title: 'Deep work', description: 'ML infrastructure optimization - uninterrupted focus time' },
          { time: '10:00 AM', icon: '🏛️', title: 'Architecture review', description: 'Present distributed training proposal to principal engineers' },
          { time: '12:00 PM', icon: '🍕', title: 'Working lunch', description: 'Cross-functional sync with ML research team' },
          { time: '2:00 PM', icon: '📊', title: 'Performance review', description: 'Calibration session for E7 promotions' },
          { time: '4:00 PM', icon: '🎯', title: 'Tech talk', description: 'Present at internal engineering summit' },
          { time: '6:00 PM', icon: '💬', title: 'Mentorship', description: 'Office hours for junior engineers' },
          { time: '7:30 PM', icon: '🏃', title: 'Wrap up', description: 'Final code reviews and planning for tomorrow' },
        ],
        stats: {
          decisionsMade: 31,
          imposterSyndromeMoments: 4,
        },
      },
      theEmail: {
        from: 'Alex Rivera <arivera@meta.com>',
        to: 'you@meta.com',
        subject: 'Promotion to E8 (Principal Engineer) - Approved!',
        timestamp: 'Thu, Sep 22, 2033 at 11:47 AM',
        body: 'Congratulations!\n\nI\'m excited to share that the promotion committee has approved your advancement to E8 (Principal Engineer). Your impact on our ML infrastructure has been transformative - the training efficiency improvements alone saved the company $40M annually.\n\nNew compensation (effective next cycle):\n• Base: $280,000\n• Target bonus: 25%\n• RSU refresh: $960,000 (4-year vest)\n• Total comp: ~$520,000\n\nAt E8, you\'ll have even broader influence across the org. We\'re expecting you to drive technical strategy for the entire AI infrastructure org and mentor our E7s.\n\nThis puts you in the top 2% of engineers at the company. Well deserved.\n\nAlex\nDirector of Engineering',
        metadata: {
          folder: 'Important',
          timesOpened: 89,
          lastUpdate: 'Forwarded to family',
        },
      },
      calendar: {
        current: {
          year: 2026,
          events: [
            { day: 'Mon', time: '9:00 AM', title: 'Team Sync', color: '#4285F4', duration: 30 },
            { day: 'Mon', time: '2:00 PM', title: 'Code Review', color: '#0F9D58', duration: 60 },
            { day: 'Tue', time: '10:00 AM', title: '1:1 with Manager', color: '#F4B400', duration: 30 },
            { day: 'Wed', time: '11:00 AM', title: 'Design Review', color: '#DB4437', duration: 60 },
            { day: 'Thu', time: '2:00 PM', title: 'Tech Talk', color: '#0F9D58', duration: 60 },
            { day: 'Fri', time: '3:00 PM', title: 'Team Social', color: '#4285F4', duration: 60 },
          ],
        },
        future: {
          year: 2034,
          events: [
            { day: 'Mon', time: '8:00 AM', title: 'Incident Review', color: '#DB4437', duration: 60 },
            { day: 'Mon', time: '10:00 AM', title: 'Architecture Council', color: '#0F9D58', duration: 90 },
            { day: 'Mon', time: '2:00 PM', title: 'Cross-org Sync', color: '#F4B400', duration: 60 },
            { day: 'Mon', time: '4:00 PM', title: 'Tech Strategy', color: '#DB4437', duration: 90 },
            { day: 'Tue', time: '9:00 AM', title: 'ML Infra Review', color: '#0F9D58', duration: 120 },
            { day: 'Tue', time: '2:00 PM', title: 'Promotion Committee', color: '#F4B400', duration: 90 },
            { day: 'Wed', time: '10:00 AM', title: 'Design Review (3 teams)', color: '#DB4437', duration: 120 },
            { day: 'Wed', time: '3:00 PM', title: 'Mentorship Office Hours', color: '#4285F4', duration: 90 },
            { day: 'Thu', time: '9:00 AM', title: 'Exec Tech Review', color: '#DB4437', duration: 90 },
            { day: 'Thu', time: '2:00 PM', title: 'Conference Talk Prep', color: '#0F9D58', duration: 60 },
            { day: 'Fri', time: '10:00 AM', title: 'Research Collaboration', color: '#F4B400', duration: 120 },
            { day: 'Fri', time: '3:00 PM', title: 'Deep Work Block', color: '#0F9D58', duration: 120 },
          ],
        },
        stats: {
          meetingsPerWeek: { current: 6, future: 22 },
          stressLevel: { current: 'Low', future: 'Very High' },
          controlLevel: { current: 'Low', future: 'Very High' },
          lastOpenedFigma: { current: '1 week ago', future: '2 months ago' },
        },
      },
      teamFeedback: {
        messages: [
          {
            author: 'Anonymous Teammate A',
            avatar: '👤',
            timestamp: '3:42 PM',
            message: 'Absolutely brilliant technically. Their system design is always elegant and scalable.',
            reactions: [
              { emoji: '🚀', count: 15 },
              { emoji: '💯', count: 12 },
            ],
          },
          {
            author: 'Anonymous Teammate B',
            avatar: '👤',
            timestamp: '3:45 PM',
            message: 'They set the bar incredibly high. Sometimes intimidating to work with, but you learn so much.',
            reactions: [
              { emoji: '💪', count: 9 },
              { emoji: '📚', count: 7 },
            ],
          },
          {
            author: 'Anonymous Teammate C',
            avatar: '👤',
            timestamp: '3:51 PM',
            message: 'Can be perfectionistic to a fault. Projects sometimes take longer because they want everything perfect.',
            reactions: [
              { emoji: '👀', count: 6 },
              { emoji: '⏰', count: 4 },
            ],
          },
          {
            author: 'Anonymous Teammate D',
            avatar: '👤',
            timestamp: '4:02 PM',
            message: 'I wish they\'d take more time to explain their thinking. Sometimes feels like they\'re on a different level.',
            reactions: [
              { emoji: '💭', count: 8 },
              { emoji: '🤔', count: 5 },
            ],
          },
        ],
        finalMessage: 'What they don\'t say: "We wonder if they\'ll burn out or leave for a startup soon."',
      },
      inbox: {
        current: {
          year: 2026,
          emails: [
            { sender: 'GitHub', subject: 'Pull request #1247 merged', time: '9:42 AM', unread: true },
            { sender: 'Sarah Chen', subject: 'Quick question about the API', time: '9:15 AM', unread: true },
            { sender: 'Jira', subject: 'PROJ-445 assigned to you', time: '8:30 AM', unread: false },
          ],
        },
        future: {
          year: 2034,
          emails: [
            { sender: 'VP Engineering', subject: 'Urgent: Production incident escalation', time: '11:23 AM', unread: true, important: true },
            { sender: 'Recruiter (External)', subject: 'Startup CTO role - $2M package', time: '10:45 AM', unread: true },
            { sender: 'Conference Committee', subject: 'Keynote invitation - ML Summit 2035', time: '10:12 AM', unread: true, important: true },
            { sender: 'Research Team', subject: 'Collaboration on new paper', time: '9:50 AM', unread: false },
            { sender: 'Workplace', subject: '156 unread messages in Infrastructure', time: '9:30 AM', unread: false },
            { sender: 'Manager', subject: 'Promotion packet feedback', time: 'Yesterday', unread: false, important: true },
          ],
          filteredCount: 67,
        },
        stats: {
          responseTime: { current: '2 hours', future: '6 hours' },
          stressLevel: { current: 'Low', future: 'Very High' },
        },
      },
    },
    alternatePaths: [
      { id: 'stay-current', label: 'What if I stayed at my current company?' },
      { id: 'startup-cto', label: 'What if I joined a startup as CTO?' },
      { id: 'consulting', label: 'What if I became an independent consultant?' },
    ],
  },
  'startup-cto-10y': {
    id: 'startup-cto-10y',
    timeHorizon: 10,
    pathName: 'Startup CTO Journey',
    confidence: 65,
    outcome: {
      title: 'Co-Founder & CTO',
      company: 'YourStartup (Series B)',
      totalComp: 180000,
      location: 'Remote / SF',
      satisfaction: 4.8,
    },
    stats: {
      compensation: {
        base: 180000,
        equity: 0, // Founder equity separate
      },
      growth: {
        promotions: 0,
        yearsToSenior: 0,
        teamSize: 25,
      },
      workLife: {
        hoursPerWeek: 65,
        burnoutRisk: 'Very High',
        flexibility: 'Very High',
      },
      skills: {
        technical: 'Full-stack, product architecture, infrastructure from scratch',
        leadership: 'Team building, fundraising, strategic vision',
        expertise: 'Startup operations, 0-to-1 product development',
      },
    },
    timeline: {
      milestones: [
        { year: 1, title: 'Joined Series A Startup as CTO', company: 'YourStartup', salary: 160000 },
        { year: 2, title: 'Led Series B Round ($15M)', company: 'YourStartup', salary: 175000 },
        { year: 4, title: 'Scaled Team to 25 Engineers', company: 'YourStartup', salary: 180000 },
        { year: 8, title: 'Series C / Preparing for Exit', company: 'YourStartup', salary: 180000 },
        { year: 12, title: 'Post-Exit / New Venture', company: 'NewVenture', salary: 200000 },
        { year: 15, title: 'Serial Founder / Advisor', company: 'Advisor / Multiple', salary: 250000 },
      ],
    },
    tradeoffs: {
      pros: [
        'Massive equity upside potential (3-5% founder stake)',
        'Complete autonomy over technical decisions',
        'Build something from scratch with your vision',
        'Incredibly fulfilling and meaningful work',
      ],
      cons: [
        'Lower cash compensation and financial uncertainty',
        'Extreme hours and work-life imbalance',
        'High stress and responsibility for company success',
        '90% chance of failure - equity may be worthless',
      ],
    },
    assumptions: [
      { text: 'Startup achieves product-market fit', likelihood: 40, icon: '❌' },
      { text: 'You successfully raise Series B and C', likelihood: 50, icon: '⚠️' },
      { text: 'You handle the stress and uncertainty', likelihood: 65, icon: '⚠️' },
      { text: 'Market conditions remain favorable', likelihood: 55, icon: '⚠️' },
      { text: 'Exit opportunity emerges (acquisition or IPO)', likelihood: 30, icon: '❌' },
    ],
    dayInLife: 'You wake up at 6 AM checking Slack messages from your distributed team. Morning is spent on a customer call debugging a critical issue, followed by interviewing engineering candidates. Lunch is a pitch meeting with potential Series C investors. The afternoon brings architecture planning for the next product milestone. You\'re still coding at 10 PM, energized by the impact you\'re creating despite the exhaustion.',
    zoomIns: {
      randomTuesday: {
        date: 'Tuesday, November 3, 2034',
        notifications: [
          { app: 'Slack', icon: '💬', title: '#engineering', body: 'Production issue - all hands', time: '6:15 AM' },
          { app: 'Calendar', icon: '📅', title: 'Investor Update Call', body: 'In 1 hour', time: '8:00 AM' },
          { app: 'Gmail', icon: '📧', title: 'Lead investor', body: 'Series C term sheet attached', time: '5:30 AM' },
          { app: 'Linear', icon: '✓', title: 'Sprint deadline', body: '12 tickets still open', time: 'Yesterday' },
        ],
        timeline: [
          { time: '6:00 AM', icon: '🚨', title: 'Emergency response', description: 'Critical bug affecting 30% of users - coordinate fix' },
          { time: '8:00 AM', icon: '💰', title: 'Investor call', description: 'Monthly update on metrics and roadmap' },
          { time: '10:00 AM', icon: '👥', title: 'Candidate interviews', description: 'Back-to-back interviews for senior engineer role' },
          { time: '12:30 PM', icon: '🍕', title: 'Working lunch', description: 'Product roadmap planning with co-founder' },
          { time: '2:00 PM', icon: '💻', title: 'Code review marathon', description: 'Review 15 PRs from team across time zones' },
          { time: '4:00 PM', icon: '📊', title: 'All-hands meeting', description: 'Company update and Q&A with entire team' },
          { time: '6:00 PM', icon: '🎯', title: 'Architecture planning', description: 'Design next quarter\'s technical roadmap' },
          { time: '9:00 PM', icon: '💻', title: 'Late night coding', description: 'Ship critical feature for demo tomorrow' },
        ],
        stats: {
          decisionsMade: 47,
          imposterSyndromeMoments: 6,
        },
      },
      theEmail: {
        from: 'David Park <david@sequoia.com>',
        to: 'you@yourstartup.com',
        subject: 'Series C Term Sheet - $40M at $200M valuation',
        timestamp: 'Tue, Nov 3, 2034 at 5:32 AM',
        body: 'Morning,\n\nAttached is our term sheet for the Series C round. After reviewing your metrics and talking to customers, we\'re excited to lead with $40M at a $200M post-money valuation.\n\nKey terms:\n• $40M Series C\n• $200M post-money valuation\n• 1 board seat\n• Standard liquidation preferences\n\nYour growth trajectory is impressive - 3x revenue YoY and strong unit economics. The team you\'ve built is world-class. We see a clear path to $100M ARR and eventual IPO.\n\nLet\'s discuss this week. I think we can move fast.\n\nDavid\nSequoia Capital',
        metadata: {
          folder: 'Fundraising',
          timesOpened: 127,
          lastUpdate: 'Forwarded to co-founders and lawyer',
        },
      },
      calendar: {
        current: {
          year: 2026,
          events: [
            { day: 'Mon', time: '9:00 AM', title: 'Team Standup', color: '#4285F4', duration: 30 },
            { day: 'Mon', time: '2:00 PM', title: 'Code Review', color: '#0F9D58', duration: 60 },
            { day: 'Tue', time: '10:00 AM', title: '1:1 with Manager', color: '#F4B400', duration: 30 },
            { day: 'Wed', time: '11:00 AM', title: 'Architecture Sync', color: '#DB4437', duration: 60 },
            { day: 'Fri', time: '3:00 PM', title: 'Team Happy Hour', color: '#4285F4', duration: 120 },
          ],
        },
        future: {
          year: 2034,
          events: [
            { day: 'Mon', time: '7:00 AM', title: 'Incident Response', color: '#DB4437', duration: 90 },
            { day: 'Mon', time: '9:00 AM', title: 'Investor Update', color: '#F4B400', duration: 60 },
            { day: 'Mon', time: '11:00 AM', title: 'Candidate Interviews (3)', color: '#0F9D58', duration: 180 },
            { day: 'Mon', time: '3:00 PM', title: 'Product Strategy', color: '#DB4437', duration: 90 },
            { day: 'Mon', time: '6:00 PM', title: 'Code Reviews', color: '#0F9D58', duration: 120 },
            { day: 'Tue', time: '8:00 AM', title: 'Board Prep', color: '#F4B400', duration: 120 },
            { day: 'Tue', time: '11:00 AM', title: 'Customer Escalation', color: '#DB4437', duration: 60 },
            { day: 'Tue', time: '2:00 PM', title: 'All-Hands', color: '#4285F4', duration: 60 },
            { day: 'Tue', time: '4:00 PM', title: 'Architecture Review', color: '#0F9D58', duration: 90 },
            { day: 'Wed', time: '9:00 AM', title: 'Fundraising Calls', color: '#F4B400', duration: 180 },
            { day: 'Wed', time: '2:00 PM', title: 'Sprint Planning', color: '#4285F4', duration: 90 },
            { day: 'Thu', time: '8:00 AM', title: 'Co-founder Sync', color: '#DB4437', duration: 60 },
            { day: 'Thu', time: '10:00 AM', title: 'Hiring Committee', color: '#0F9D58', duration: 120 },
            { day: 'Thu', time: '3:00 PM', title: 'Customer Demo', color: '#F4B400', duration: 60 },
            { day: 'Fri', time: '9:00 AM', title: 'Team Retro', color: '#4285F4', duration: 60 },
            { day: 'Fri', time: '11:00 AM', title: 'Deep Work (Coding)', color: '#0F9D58', duration: 240 },
          ],
        },
        stats: {
          meetingsPerWeek: { current: 5, future: 28 },
          stressLevel: { current: 'Low', future: 'Extreme' },
          controlLevel: { current: 'Low', future: 'Total' },
          lastOpenedFigma: { current: '1 week ago', future: '2 days ago' },
        },
      },
      teamFeedback: {
        messages: [
          {
            author: 'Anonymous Team Member A',
            avatar: '👤',
            timestamp: '5:23 PM',
            message: 'Most inspiring leader I\'ve worked with. They genuinely care about everyone\'s growth and the mission.',
            reactions: [
              { emoji: '❤️', count: 18 },
              { emoji: '🚀', count: 14 },
            ],
          },
          {
            author: 'Anonymous Team Member B',
            avatar: '👤',
            timestamp: '5:31 PM',
            message: 'They\'re in the trenches with us - still coding, reviewing PRs, debugging production. Respect.',
            reactions: [
              { emoji: '💪', count: 16 },
              { emoji: '👏', count: 12 },
            ],
          },
          {
            author: 'Anonymous Team Member C',
            avatar: '👤',
            timestamp: '5:44 PM',
            message: 'Sometimes makes decisions too quickly without enough input. Wish they\'d slow down and listen more.',
            reactions: [
              { emoji: '💭', count: 7 },
              { emoji: '👀', count: 5 },
            ],
          },
          {
            author: 'Anonymous Team Member D',
            avatar: '👤',
            timestamp: '5:52 PM',
            message: 'They work insane hours and it creates pressure for everyone else to do the same. Worried about burnout.',
            reactions: [
              { emoji: '😰', count: 9 },
              { emoji: '⏰', count: 6 },
            ],
          },
        ],
        finalMessage: 'What they don\'t say: "We\'re betting our careers on their vision. Hope they\'re right."',
      },
      inbox: {
        current: {
          year: 2026,
          emails: [
            { sender: 'GitHub', subject: 'Pull request #1247 merged', time: '9:42 AM', unread: true },
            { sender: 'Sarah Chen', subject: 'Quick question about the API', time: '9:15 AM', unread: true },
            { sender: 'Manager', subject: '1:1 agenda for tomorrow', time: 'Yesterday', unread: false, important: true },
          ],
        },
        future: {
          year: 2034,
          emails: [
            { sender: 'Sequoia Capital', subject: 'Series C term sheet - $40M', time: '5:32 AM', unread: true, important: true },
            { sender: 'Lead Customer', subject: 'URGENT: Production down', time: '6:15 AM', unread: true, important: true },
            { sender: 'Recruiter', subject: '3 candidates for senior role', time: '7:20 AM', unread: true },
            { sender: 'Co-founder', subject: 'Board deck review needed', time: 'Yesterday', unread: false, important: true },
            { sender: 'AWS', subject: 'Infrastructure cost spike alert', time: 'Yesterday', unread: false, important: true },
            { sender: 'Team', subject: 'Sprint retrospective notes', time: '2 days ago', unread: false },
            { sender: 'Lawyer', subject: 'Stock option plan updates', time: '2 days ago', unread: false },
          ],
          filteredCount: 89,
        },
        stats: {
          responseTime: { current: '2 hours', future: '30 minutes' },
          stressLevel: { current: 'Low', future: 'Extreme' },
        },
      },
    },
    alternatePaths: [
      { id: 'stay-current', label: 'What if I stayed at my current company?' },
      { id: 'switch-faang', label: 'What if I joined a FAANG company?' },
      { id: 'freelance', label: 'What if I went freelance?' },
    ],
  },
};

// Helper function to get simulation by parameters
export function getSimulation(
  pathType: 'stay' | 'switch' | 'startup',
  timeHorizon: 5 | 10 | 15
): CareerSimulation {
  const simulationMap = {
    stay: MOCK_SIMULATIONS['stay-current-10y'],
    switch: MOCK_SIMULATIONS['switch-faang-10y'],
    startup: MOCK_SIMULATIONS['startup-cto-10y'],
  };

  const baseSimulation = simulationMap[pathType];
  
  // Filter milestones to only include those within the time horizon
  const filteredMilestones = baseSimulation.timeline.milestones.filter(
    milestone => milestone.year <= timeHorizon
  );
  
  return {
    ...baseSimulation,
    timeHorizon,
    timeline: {
      milestones: filteredMilestones,
    },
  };
}
