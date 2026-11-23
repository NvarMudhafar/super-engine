const GENERAL = [
  "What's something you're looking forward to this month?",
  "What's the best thing you've eaten lately?",
  'If you could be fluent in one more language overnight, which would it be?',
  "What's a hobby you picked up and never put down?",
  "What's a song you've had on repeat recently?",
  'What does a perfect lazy Sunday look like for you?',
  "What's a skill you'd love to learn but haven't started yet?",
  "What's the last thing that made you laugh out loud?",
  'Early bird or night owl?',
  "What's something you're surprisingly good at?",
  'If someone handed you a free plane ticket today, where would you go?',
  'What did you want to be when you were a kid?',
  "What's your go-to comfort food?",
  'Mountains, beach, or city?',
  "What's a small thing that instantly makes your day better?",
  "What's the most interesting thing you learned this week?",
  "What's a book, show or game you'd recommend to a total stranger?",
  "What's an opinion you hold that most people would argue with?",
  "What's the best piece of advice anyone's given you?",
  "What's the weather like where you are right now?",
  'If you could master any instrument instantly, which one?',
  "What's a place you've been that you still think about?",
  'Cats, dogs, both, or neither?',
  "What's something you changed your mind about recently?",
  "What's a tiny luxury you refuse to give up?",
];

const ABOUT_INTEREST = [
  'So — what got you into {x}?',
  "What's your favourite thing about {x} right now?",
  'Hot take time: what do most people get wrong about {x}?',
  "How long have you been into {x}?",
  "What's one {x} recommendation you'd give a beginner?",
];

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

/** A conversation starter — about a shared interest when there is one. */
export function icebreaker(common: string[], avoid?: string): string {
  for (let i = 0; i < 5; i++) {
    const q =
      common.length > 0 && Math.random() < 0.6
        ? pick(ABOUT_INTEREST).replace('{x}', pick(common))
        : pick(GENERAL);
    if (q !== avoid) return q;
  }
  return pick(GENERAL);
}
