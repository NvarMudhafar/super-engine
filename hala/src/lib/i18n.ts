import { createContext, useContext } from 'react';
import type { AckFailure, BanReason, ReportReason } from '../../shared/protocol.ts';
import { interestKey, placeOf } from '../../shared/interests.ts';
import type { EndKind, SystemLine, ToastCode } from './session.ts';
import type { CameraErrorCode } from './rtc.ts';

export type Lang = 'ar' | 'en';

type Pair = readonly [title: string, body: string];

/** Interest chips offered on the start screen, worded per language but matched as one. */
export const SUGGESTIONS: ReadonlyArray<{ ar: string; en: string }> = [
  { ar: 'كرة القدم', en: 'football' },
  { ar: 'أغاني', en: 'music' },
  { ar: 'ببجي', en: 'pubg' },
  { ar: 'أفلام', en: 'movies' },
  { ar: 'مسلسلات', en: 'series' },
  { ar: 'شعر', en: 'poetry' },
  { ar: 'طبخ', en: 'cooking' },
  { ar: 'كتب', en: 'books' },
  { ar: 'تكنولوجيا', en: 'tech' },
  { ar: 'أنمي', en: 'anime' },
  { ar: 'سيارات', en: 'cars' },
  { ar: 'انكليزي', en: 'english' },
];

const en = {
  dir: 'ltr' as 'ltr' | 'rtl',
  locale: 'en',
  appName: 'hala',
  docTitle: 'hala — talk to someone new',
  newStranger: 'New stranger',
  newMessage: 'New message',
  online: (n: string) => `${n} online`,
  connecting: 'Connecting…',
  offline: 'Offline — retrying',
  onlineTitle: 'People connected right now',
  toLight: 'Switch to light theme',
  toDark: 'Switch to dark theme',
  otherLang: 'عربي',
  otherLangLabel: 'التبديل إلى العربية',
  goHome: 'Leave and go home',

  // home
  eyebrow: "Come on in, the chai's ready",
  heroBefore: 'Talk to someone ',
  heroAccent: 'new',
  heroAfter: '.',
  lede: 'One-on-one chats with someone who likes what you like. Text or video — no account, nothing to install.',
  interestsLabel: 'What are you into?',
  optional: 'Optional',
  interestEmpty: 'Type an interest and press Enter',
  interestMore: 'Add another…',
  interestFull: 'That’s the maximum',
  removeTag: (t: string) => `Remove ${t}`,
  suggestionsLabel: 'Suggestions',
  cityLabel: 'Your city',
  cityAny: 'Anywhere in Iraq',
  cityHint: "People from your city are matched first. It's only shown to someone who picked the same one.",
  fallback: (s: string) => `If nobody matches these, connect me with anyone after ${s} seconds`,
  consentBefore: "I'm 18 or older and I'll follow the ",
  consentLink: 'house rules',
  consentAfter: '.',
  consentNudge: "Please confirm you're 18+ and agree to the rules first.",
  textChat: 'Text chat',
  videoChat: 'Video chat',
  startingCamera: 'Starting camera…',
  connectingServer: 'Connecting to the server…',
  videoOptions: 'Video options',
  blurOption: "Blur each new stranger's video until I choose to show it",
  relayOption: 'Hide my IP address from strangers (relays video through the server)',
  noRelayHint:
    "Video connects directly between your browsers, so the other person's browser can see your IP address. This server doesn't offer a relay to hide it.",
  promises: [
    ['Matched on interests', 'People who share an interest or your city are paired first. Random only if you allow it.'],
    ['Video starts blurred', "You decide when to see a stranger's camera, every time."],
    ['One-tap report and block', 'People reported by several others are removed automatically.'],
    ['No accounts, no history', "Chats aren't stored. Spam bots get caught and kicked."],
  ] as Pair[],
  footRules: 'House rules & privacy',
  footKind: "Be kind. Leave if it's not for you.",
  camera: {
    insecure: 'Video needs a secure connection (https or localhost) and a browser with camera support.',
    blocked: "Camera and microphone access is blocked. Allow it in your browser's site settings, or use text chat.",
    'not-found': 'No camera or microphone was found on this device.',
    busy: 'Your camera is being used by another app. Close it and try again.',
    unknown: 'Could not start your camera.',
  } as Record<CameraErrorCode, string>,

  // rules
  rulesTitle: 'House rules & privacy',
  rulesHeading: 'The rules',
  rules: [
    ['18+ only.', 'If someone seems to be under 18, leave and report them.'],
    ['No nudity or sexual content,', 'on camera or in text.'],
    ['No harassment, threats or hate.', 'Disagreeing is fine; targeting someone is not.'],
    ['No spam, ads or bots.', 'Copy-pasted links get blocked automatically.'],
    ["Don't record or share", "anyone's video or messages without their permission."],
  ] as Pair[],
  rulesAfter:
    "Breaking these gets you reported. When several different people report the same person, they're removed automatically for a day.",
  safetyHeading: 'Watch out for blackmail',
  safety: [
    ['Anything on camera can be recorded.', "Don't show anything you wouldn't want shared."],
    ["Don't move to another app", "or send photos, your number or your accounts to someone you've just met."],
    ['If someone threatens you,', "don't pay and don't send anything more. Report them here, keep the evidence, and contact the Community Police."],
  ] as Pair[],
  privacyHeading: 'Your privacy',
  privacy: [
    [
      'No accounts.',
      "You're just “the other person”. Nothing identifies you unless you share it — so don't share your full name, address, school or socials with someone you just met.",
    ],
    ["Messages aren't stored.", 'They pass through the server to reach the other person and are kept in memory only for the length of the chat.'],
    ['Reports include evidence.', "If you report a chat, its last messages are saved with the report so a person can review it."],
    [
      'Video goes directly between browsers.',
      "It never touches the server, but a direct connection means each browser can see the other's IP address. Where this server offers a relay, “Hide my IP address” routes video through it instead.",
    ],
    ['Your IP address is never stored as-is.', 'The server keeps a scrambled (hashed) form to enforce bans and rate limits.'],
  ] as Pair[],
  gotIt: 'Got it',
  close: 'Close',

  // report
  reportTitle: 'Report this person',
  whatHappened: 'What happened?',
  reasons: {
    nudity: 'Nudity or sexual content',
    minor: 'They seem to be under 18',
    blackmail: 'Blackmail or threats',
    harassment: 'Harassment or insults',
    hate: 'Hate speech',
    spam: 'Spam, ads or a bot',
    other: 'Something else',
  } as Record<ReportReason, string>,
  noteLabel: 'Anything to add?',
  notePlaceholder: 'What happened, briefly',
  reportFinePrint:
    "The chat ends and you won't be matched with them again. The last messages of the chat are attached for review. They won't know who reported them.",
  justBlock: 'Just block',
  reportAndLeave: 'Report and leave',

  // chat
  statusChatting: 'Chatting',
  statusEnded: 'Chat ended',
  statusLooking: 'Looking…',
  report: 'Report',
  searchingTitle: 'Finding you someone…',
  searchingRandom: 'Matching you with a random stranger.',
  searchingFor: (place: string | null, list: string | null) =>
    place && list
      ? `Looking for someone from ${place} who also likes ${list}.`
      : place
        ? `Looking for someone from ${place}.`
        : `Looking for someone who also likes ${list}.`,
  searchingWidened: "Nobody matching that is online right now, so we're widening to anyone.",
  reconnecting: 'Reconnecting to the server…',
  tipBefore: 'Tip: press',
  tipAfter: 'twice to skip a chat.',
  bothLike: 'You both like',
  bothFrom: 'Both from',
  intro: (place: string | null, list: string | null) =>
    place && list
      ? `You're chatting with someone from ${place} who also likes ${list}. Say hi!`
      : place
        ? `You're chatting with someone from ${place}. Say hi!`
        : list
          ? `You're chatting with someone who also likes ${list}. Say hi!`
          : "You're now chatting with a random stranger. Say hi!",
  ended: {
    'you-left': 'You left the chat.',
    'partner-left': 'The other person left the chat.',
    'you-reported': "Reported. Thanks for flagging it — you won't be matched with them again.",
    'you-blocked': "Blocked. You won't be matched with them again.",
    'connection-lost': 'Your connection dropped, so the chat ended.',
  } as Record<EndKind, string>,
  typing: 'Typing',
  newChat: 'New chat',
  saveChat: 'Save chat',
  composerLive: 'Say something…',
  composerEnded: 'This chat has ended',
  composerWaiting: 'Waiting for someone…',
  next: 'Next',
  sure: 'Sure?',
  newShort: 'New',
  stop: 'Stop',
  stopTitle: 'Stop looking and go back',
  send: 'Send',
  icebreaker: 'Suggest a conversation starter',
  messageLabel: 'Message',
  fail: {
    'slow-down': 'Not sent — you are sending messages too quickly.',
    'repeat-opener': 'Not sent — that looks like a pasted opener. Try saying something to this person.',
    'not-in-chat': 'Not sent — the chat had already ended.',
    empty: 'Not sent.',
  } as Record<AckFailure, string>,
  you: 'You',
  them: 'The other person',

  // video
  videoSection: 'Video',
  conversation: 'Conversation',
  vLooking: 'Looking for someone…',
  vEnded: 'Chat ended',
  vFailed: "Video couldn't connect — you can still text.",
  vConnecting: 'Connecting video…',
  vCamOff: "Their camera is off",
  reveal: 'Show video',
  revealHint: "Blurred until you choose. Report it if anything's wrong.",
  partnerMuted: 'Their mic is off',
  mute: 'Mute microphone',
  unmute: 'Unmute microphone',
  camOff: 'Turn camera off',
  camOn: 'Turn camera on',
  blurThem: "Blur their video",
  showThem: "Show their video",
  yourVideo: 'Your video',
  theirVideo: "The other person's video",

  toasts: {
    'report-sent': "Thanks — report sent. You won't be matched with them again.",
    blocked: "Blocked. You won't be matched with them again.",
    restarting: 'The server is restarting — reconnecting shortly.',
    'skipping-fast': 'You are skipping very quickly — hang on a moment.',
    'reporting-fast': 'You have sent several reports — try again in a minute.',
    'nothing-to-report': 'There is no recent chat to report.',
    'not-in-chat': 'There is no recent chat.',
    'bad-request': 'That message could not be understood.',
    'too-many-tabs': 'You have hala open in too many tabs. Close some and this one will reconnect.',
    'video-failed': "Video couldn't connect between you two — text chat still works.",
  } as Record<ToastCode, string>,

  // banned
  bannedTitle: "You're taking a break from hala",
  banReason: {
    reports: 'Your connection was paused because several people reported you.',
    spam: 'Your connection was paused because the same link was sent to lots of people.',
  } as Record<BanReason, string>,
  canChatAgain: (when: string) => `You can chat again ${when}.`,
  whenNow: 'now',
  whenHours: (h: string, m: string) => `in about ${h}h ${m}m`,
  whenMinutes: (m: string) => `in about ${m} minutes`,
  bannedExplain:
    'This happens automatically when several different people report the same person, or when something behaves like a spam bot.',
  tryAgain: 'Try again',

  // transcript
  transcriptHeader: (date: string) => `hala chat — ${date}`,
  transcriptShared: (list: string) => `You both like: ${list}`,
  transcriptRandom: 'Random match',
  notSent: '(not sent)',

  icebreakers: [
    "What's something you're looking forward to this month?",
    'Chai or coffee?',
    'Dolma or quzi? You have to pick one.',
    "Who's a singer you've had on repeat lately?",
    "What's the best thing you've eaten lately?",
    "What's a hobby you picked up and never put down?",
    'What does a perfect lazy Friday look like for you?',
    "What's a skill you'd love to learn but haven't started yet?",
    "What's the last thing that made you laugh out loud?",
    'Early bird or night owl?',
    'If someone handed you a free plane ticket today, where would you go?',
    'What did you want to be when you were a kid?',
    "What's the best dish your family makes?",
    "What's a small thing that instantly makes your day better?",
    "What's a book, show or game you'd recommend to someone you just met?",
    "What's the best piece of advice anyone's given you?",
    "What's the weather like where you are right now?",
    "What's a place you've been that you still think about?",
    "What's something you changed your mind about recently?",
    'Real Madrid, Barça, or neither?',
  ],
  aboutInterest: [
    'So — what got you into {x}?',
    "What's your favourite thing about {x} right now?",
    'How long have you been into {x}?',
    "What's one {x} recommendation you'd give a beginner?",
  ],
  aboutPlace: [
    "What's the best thing about {x}?",
    "Where's the best food in {x}?",
    "What's one place in {x} everyone should see?",
  ],
};

export type Dict = typeof en;

const ar: Dict = {
  dir: 'rtl',
  locale: 'ar-IQ',
  appName: 'هلا',
  docTitle: 'هلا — احچي ويا شخص جديد',
  newStranger: 'شخص جديد',
  newMessage: 'رسالة جديدة',
  online: (n) => `${n} متصل`,
  connecting: 'دنتصل…',
  offline: 'مقطوع — دنحاول',
  onlineTitle: 'الناس المتصلين هسه',
  toLight: 'الوضع الفاتح',
  toDark: 'الوضع الغامق',
  otherLang: 'EN',
  otherLangLabel: 'Switch to English',
  goHome: 'اطلع وارجع للبداية',

  eyebrow: 'هلا بيكم، الچاي حاضر',
  heroBefore: 'احچي ويا شخص ',
  heroAccent: 'جديد',
  heroAfter: '',
  lede: 'سوالف وحدة لوحدة ويا شخص يحب نفس الأشياء اللي تحبها. كتابة لو فيديو، بلا حساب وبلا تنزيل.',
  interestsLabel: 'شنو اهتماماتك؟',
  optional: 'اختياري',
  interestEmpty: 'اكتب شي تحبه واضغط Enter',
  interestMore: 'ضيف غيره…',
  interestFull: 'وصلت للحد الأعلى',
  removeTag: (t) => `شيل ${t}`,
  suggestionsLabel: 'اقتراحات',
  cityLabel: 'مدينتك',
  cityAny: 'أي مكان بالعراق',
  cityHint: 'نوصلك أول بناس من نفس مدينتك، وما تبين إلا لشخص مختار نفس المدينة.',
  fallback: (s) => `إذا ماكو أحد يطابق هذني، وصلني بأي أحد بعد ${s} ثواني`,
  consentBefore: 'عمري ١٨ سنة أو أكثر وراح ألتزم بـ',
  consentLink: 'آداب الگعدة',
  consentAfter: '.',
  consentNudge: 'أكّد أول إن عمرك ١٨ أو أكثر وإنك موافق على الآداب.',
  textChat: 'دردشة كتابة',
  videoChat: 'دردشة فيديو',
  startingCamera: 'دنشغّل الكاميرة…',
  connectingServer: 'دنتصل بالسيرفر…',
  videoOptions: 'خيارات الفيديو',
  blurOption: 'غبّش فيديو كل شخص جديد لحد ما أختار أشوفه',
  relayOption: 'خفّي عنوان الـIP مالي عن الناس (الفيديو يمر عبر السيرفر)',
  noRelayHint:
    'الفيديو يوصل مباشرة بين المتصفحات، فمتصفح الطرف الثاني يكدر يشوف عنوان الـIP مالك. هذا السيرفر ما بيه وسيط يخفيه.',
  promises: [
    ['نوصلك حسب اهتماماتك', 'اللي يشاركوك نفس الاهتمامات أو نفس المدينة يجون أول، والعشوائي بس إذا انت تريد.'],
    ['الفيديو يبدي مغبّش', 'انت تقرر شوكت تشوف كاميرة الطرف الثاني، كل مرة.'],
    ['بلاغ وحظر بضغطة وحدة', 'اللي يبلّغون عليه أكثر من شخص ينطرد تلقائياً.'],
    ['بلا حسابات وبلا سجلات', 'السوالف ما تنحفظ، وبوتات السبام تنكشف وتنطرد.'],
  ],
  footRules: 'آداب الگعدة والخصوصية',
  footKind: 'خلّي كلامك حلو، وإذا ما عجبتك السالفة اطلع.',
  camera: {
    insecure: 'الفيديو يحتاج اتصال آمن (https أو localhost) ومتصفح يدعم الكاميرة.',
    blocked: 'الكاميرة والمايك مسدودين. اسمح بيهم من إعدادات الموقع بالمتصفح، أو استعمل دردشة الكتابة.',
    'not-found': 'ما لگينا كاميرة أو مايك بهذا الجهاز.',
    busy: 'الكاميرة مشغولة ببرنامج ثاني. سدّه وجرّب مرة ثانية.',
    unknown: 'ما گدرنا نشغّل الكاميرة.',
  },

  rulesTitle: 'آداب الگعدة والخصوصية',
  rulesHeading: 'الآداب',
  rules: [
    ['١٨ سنة وفوگ بس.', 'إذا حسّيت أحد عمره أقل من ١٨، اطلع وبلّغ عليه.'],
    ['ممنوع العُري وأي محتوى جنسي،', 'بالكاميرة أو بالكتابة.'],
    ['ممنوع التحرش والتهديد والكراهية.', 'الاختلاف بالرأي عادي، بس الإساءة لأحد لا.'],
    ['ممنوع السبام والإعلانات والبوتات.', 'الروابط المنسوخة تنحظر تلقائياً.'],
    ['لا تسجّل ولا تنشر', 'فيديو أو رسائل أحد بدون موافقته.'],
  ],
  rulesAfter: 'اللي يخالف هذي الآداب ينبلّغ عليه، وإذا أكثر من شخص بلّغوا على نفس الشخص ينطرد تلقائياً ليوم كامل.',
  safetyHeading: 'دير بالك من الابتزاز',
  safety: [
    ['أي شي يبين بالكاميرة ممكن ينسجل.', 'لا تبيّن شي ما تريده ينتشر.'],
    ['لا تطلع لتطبيق ثاني', 'ولا تدز صور أو رقمك أو حساباتك لشخص هسه تعرفت عليه.'],
    ['إذا أحد هددك،', 'لا تدفع ولا تدز شي زيادة. بلّغ عليه هنا، احتفظ بالدليل، وتواصل ويا الشرطة المجتمعية.'],
  ],
  privacyHeading: 'خصوصيتك',
  privacy: [
    [
      'بلا حسابات.',
      'انت بس «الطرف الثاني». محد يعرفك إلا إذا انت گلت، فلا تنطي اسمك الكامل أو عنوانك أو مدرستك أو حساباتك لشخص هسه تعرفت عليه.',
    ],
    ['الرسائل ما تنحفظ.', 'تمر عبر السيرفر حتى توصل للطرف الثاني، وتبقى بالذاكرة بس طول السالفة.'],
    ['البلاغ يجي ويا دليل.', 'إذا بلّغت على سالفة، آخر رسائلها تنحفظ ويا البلاغ حتى يراجعها شخص.'],
    [
      'الفيديو يروح مباشرة بين المتصفحات.',
      'ما يمر بالسيرفر، بس الاتصال المباشر معناه كل متصفح يكدر يشوف عنوان الـIP مال الثاني. إذا السيرفر بيه وسيط، خيار «خفّي عنوان الـIP مالي» يمرر الفيديو عبره.',
    ],
    ['عنوان الـIP مالك ما ينحفظ مثل ما هو.', 'السيرفر يحتفظ بنسخة مشفّرة منه بس، حتى يطبّق الحظر وحدود السرعة.'],
  ],
  gotIt: 'تمام',
  close: 'سدّ',

  reportTitle: 'بلّغ عن هذا الشخص',
  whatHappened: 'شنو صار؟',
  reasons: {
    nudity: 'عُري أو محتوى جنسي',
    minor: 'يبين عمره أقل من ١٨',
    blackmail: 'ابتزاز أو تهديد',
    harassment: 'تحرش أو إساءة',
    hate: 'كلام كراهية',
    spam: 'سبام أو إعلانات أو بوت',
    other: 'شي ثاني',
  },
  noteLabel: 'تريد تضيف شي؟',
  notePlaceholder: 'شنو صار، باختصار',
  reportFinePrint:
    'السالفة تخلص وما راح تنربط وياه مرة ثانية. آخر رسائل السالفة تنرفق ويا البلاغ حتى تنراجع، وهو ما راح يعرف منو بلّغ.',
  justBlock: 'بس احظره',
  reportAndLeave: 'بلّغ واطلع',

  statusChatting: 'تسولفون',
  statusEnded: 'خلصت السالفة',
  statusLooking: 'ندوّر…',
  report: 'بلّغ',
  searchingTitle: 'ندوّر لك على أحد…',
  searchingRandom: 'راح نوصلك بشخص عشوائي.',
  searchingFor: (place, list) =>
    place && list
      ? `ندوّر على شخص من ${place} ويحب ${list} مثلك.`
      : place
        ? `ندوّر على شخص من ${place}.`
        : `ندوّر على شخص يحب ${list} مثلك.`,
  searchingWidened: 'هسه ماكو أحد يطابق اختياراتك، فراح نوصلك بأي أحد.',
  reconnecting: 'دنرجع نتصل بالسيرفر…',
  tipBefore: 'تلميحة: اضغط',
  tipAfter: 'مرتين حتى تتخطى السالفة.',
  bothLike: 'تحبون سوا',
  bothFrom: 'انتو الثنين من',
  intro: (place, list) =>
    place && list
      ? `وصلناك بشخص من ${place} ويحب ${list} مثلك. گول هلا!`
      : place
        ? `وصلناك بشخص من ${place}. گول هلا!`
        : list
          ? `وصلناك بشخص يحب ${list} مثلك. گول هلا!`
          : 'وصلناك بشخص عشوائي. گول هلا!',
  ended: {
    'you-left': 'طلعت من السالفة.',
    'partner-left': 'الطرف الثاني طلع من السالفة.',
    'you-reported': 'انرسل البلاغ، شكراً لأنك نبهتنا. ما راح تنربط وياه مرة ثانية.',
    'you-blocked': 'انحظر. ما راح تنربط وياه مرة ثانية.',
    'connection-lost': 'انقطع الاتصال، فالسالفة خلصت.',
  },
  typing: 'ديكتب',
  newChat: 'سالفة جديدة',
  saveChat: 'احفظ السالفة',
  composerLive: 'اكتب شي…',
  composerEnded: 'السالفة خلصت',
  composerWaiting: 'ننتظر أحد…',
  next: 'التالي',
  sure: 'متأكد؟',
  newShort: 'جديد',
  stop: 'وقّف',
  stopTitle: 'وقّف الدوَران وارجع',
  send: 'إرسال',
  icebreaker: 'اقترح سؤال تفتح بيه السالفة',
  messageLabel: 'رسالة',
  fail: {
    'slow-down': 'ما انرسلت، دتدز رسائل بسرعة كلش.',
    'repeat-opener': 'ما انرسلت، تبين رسالة منسوخة. جرّب تحچي ويا هذا الشخص بشي من عندك.',
    'not-in-chat': 'ما انرسلت، السالفة كانت خالصة.',
    empty: 'ما انرسلت.',
  },
  you: 'انت',
  them: 'الطرف الثاني',

  videoSection: 'الفيديو',
  conversation: 'السالفة',
  vLooking: 'ندوّر لك على أحد…',
  vEnded: 'خلصت السالفة',
  vFailed: 'الفيديو ما اشتغل، بس تكدر تكتب.',
  vConnecting: 'دنوصّل الفيديو…',
  vCamOff: 'كاميرة الطرف الثاني مسدودة',
  reveal: 'اعرض الفيديو',
  revealHint: 'مغبّش لحد ما تختار. إذا أكو شي غلط، بلّغ.',
  partnerMuted: 'مايك الطرف الثاني مسدود',
  mute: 'سدّ المايك',
  unmute: 'افتح المايك',
  camOff: 'سدّ الكاميرة',
  camOn: 'افتح الكاميرة',
  blurThem: 'غبّش فيديو الطرف الثاني',
  showThem: 'اعرض فيديو الطرف الثاني',
  yourVideo: 'الفيديو مالك',
  theirVideo: 'فيديو الطرف الثاني',

  toasts: {
    'report-sent': 'شكراً، انرسل البلاغ. ما راح تنربط وياه مرة ثانية.',
    blocked: 'انحظر. ما راح تنربط وياه مرة ثانية.',
    restarting: 'السيرفر ديعيد التشغيل، راح نرجع نتصل بعد شوية.',
    'skipping-fast': 'دتتخطى بسرعة كلش، اصبر شوية.',
    'reporting-fast': 'دزيت كم بلاغ ورا بعض، جرّب بعد دقيقة.',
    'nothing-to-report': 'ماكو سالفة قريبة تبلّغ عليها.',
    'not-in-chat': 'ماكو سالفة قريبة.',
    'bad-request': 'ما فهمنا هالرسالة.',
    'too-many-tabs': 'فاتح هلا بهواية تبويبات. سدّ قسم منها وهذا راح يرجع يتصل.',
    'video-failed': 'الفيديو ما اشتغل بيناتكم، بس الكتابة شغالة.',
  },

  bannedTitle: 'خذلك راحة من هلا شوية',
  banReason: {
    reports: 'انوگف اتصالك لأن أكثر من شخص بلّغ عليك.',
    spam: 'انوگف اتصالك لأن نفس الرابط انرسل لهواية ناس.',
  },
  canChatAgain: (when) => `تكدر ترجع تسولف ${when}.`,
  whenNow: 'هسه',
  whenHours: (h, m) => `بعد حوالي ${h} ساعة و${m} دقيقة`,
  whenMinutes: (m) => `بعد حوالي ${m} دقيقة`,
  bannedExplain: 'هذا يصير تلقائياً لما أكثر من شخص يبلّغون على نفس الشخص، أو لما شي يتصرف مثل بوت سبام.',
  tryAgain: 'جرّب مرة ثانية',

  transcriptHeader: (date) => `سالفة هلا — ${date}`,
  transcriptShared: (list) => `اهتمامات مشتركة: ${list}`,
  transcriptRandom: 'مطابقة عشوائية',
  notSent: '(ما انرسلت)',

  icebreakers: [
    'شلونك اليوم؟ شنو أحلى شي صار وياك؟',
    'چاي لو گهوة؟',
    'دولمة لو قوزي؟ لازم تختار وحدة!',
    'مسگوف لو كباب؟',
    'منو المطرب اللي دتسمعه هالأيام؟',
    'لو تكدر تسافر لأي مكان باچر، وين تروح؟',
    'انت من جماعة الصبح لو جماعة الليل؟',
    'شنو آخر فلم أو مسلسل عجبك؟',
    'شنو الهواية اللي ما تگدر تعوفها؟',
    'شنو الشي الصغير اللي يعدّل مزاجك بسرعة؟',
    'شنو أحسن نصيحة انطوك ياها؟',
    'لو تكدر تتعلم أي مهارة بيوم واحد، شنو تختار؟',
    'شنو چنت تريد تصير من چنت صغير؟',
    'شنو أطيب أكلة يسوونها بيتكم؟',
    'شلون الجو عدكم هسه؟',
    'شنو آخر شي ضحّكك من گلبك؟',
    'تشجع الزوراء لو الشرطة لو الجوية؟ لو انت من جماعة ريال وبرشلونة؟',
    'شنو الكتاب أو اللعبة اللي تنصح بيها شخص هسه تعرفت عليه؟',
    'لو عندك يوم فاضي كامل، شلون تقضيه؟',
    'شنو المكان اللي رحتله وبعدك تفكر بيه؟',
  ],
  aboutInterest: [
    'شلون بديت تحب {x}؟',
    'شنو أكثر شي يعجبك بـ{x} هالفترة؟',
    'من شوكت انت مهتم بـ{x}؟',
    'شنو تنصح واحد جديد على {x}؟',
  ],
  aboutPlace: ['شنو أحلى شي بـ{x}؟', 'وين أطيب أكل بـ{x}؟', 'شنو المكان اللي لازم أي أحد يشوفه بـ{x}؟'],
};

export const DICTS: Record<Lang, Dict> = { ar, en };

export const I18nContext = createContext<{ t: Dict; lang: Lang }>({ t: ar, lang: 'ar' });
export const useI18n = () => useContext(I18nContext);

/** "a, b and c" / «أ، ب وج» */
export function listify(items: string[], lang: Lang): string {
  if (items.length <= 1) return items.join('');
  const head = items.slice(0, -1).join(lang === 'ar' ? '، ' : ', ');
  const last = items[items.length - 1];
  return lang === 'ar' ? `${head} و${last}` : `${head} and ${last}`;
}

/** Numbers in the reader's digits — Arabic-Indic for Arabic. */
export const fmtNum = (n: number, t: Dict) => n.toLocaleString(t.locale);

/**
 * Show a tag in the reader's language when we know its translation (cities,
 * suggestion chips), otherwise exactly as the person typed it.
 */
export function localizeTag(tag: string, lang: Lang): string {
  const place = placeOf(tag);
  if (place) return place[lang];
  const key = interestKey(tag);
  const chip = SUGGESTIONS.find((s) => interestKey(s.en) === key);
  return chip ? chip[lang] : tag;
}

/** Split a list of interests into the city (if any) and everything else, localised. */
export function splitInterests(tags: string[], lang: Lang): { place: string | null; rest: string[] } {
  let place: string | null = null;
  const rest: string[] = [];
  for (const tag of tags) {
    const p = placeOf(tag);
    if (p && !place) place = p[lang];
    else if (!p) rest.push(localizeTag(tag, lang));
  }
  return { place, rest };
}

/** The words for a system line ("you're now chatting…", "they left"). */
export function systemText(sys: SystemLine, t: Dict, lang: Lang): string {
  if (sys.kind === 'end') return t.ended[sys.reason];
  const { place, rest } = splitInterests(sys.common, lang);
  return t.intro(place, rest.length ? listify(rest, lang) : null);
}
