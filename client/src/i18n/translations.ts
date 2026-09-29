export type Language = "ar" | "en";

const D = {
  waitingQuestion: ["بانتظار سؤال المعلم", "Waiting for the next question"],

  waitingQuestionHint: [
    "خليك جاهز، سيظهر السؤال هنا فور أن يبدأه المعلم.",
    "Stay ready. The question will appear here when your teacher launches it.",
  ],

  answerSent: ["تم إرسال إجابتك", "Answer sent"],

  answerSentHint: [
    "تم تسجيل إجابتك ودرجة ثقتك.",
    "Your answer and confidence have been recorded.",
  ],
  question: ["السؤال", "QUESTION"],

  oneMoreThing: ["خطوة أخيرة", "ONE MORE THING"],

  howSure: ["ما مدى ثقتك بإجابتك؟", "How sure are you?"],

  confidenceHint: [
    "لا تفكر فيها كثيرًا. اختر ما يعبّر عن شعورك.",
    "Don't overthink it. Choose what feels right.",
  ],

  guessing: ["أخمّن", "Guessing"],

  guessingHint: ["لست متأكدًا من الإجابة", "I'm mostly guessing"],

  fairlySure: ["متأكد إلى حد ما", "Fairly sure"],

  fairlySureHint: ["أعتقد أن إجابتي صحيحة", "I think I've got it"],

  certain: ["متأكد", "Certain"],

  certainHint: ["واثق من إجابتي", "I'm confident in my answer"],

  explainThinking: [
    "اشرح تفكيرك (اختياري)",
    "Explain your thinking (optional)",
  ],

  explainThinkingHint: [
    "اكتب باختصار كيف وصلت إلى إجابتك. هذا يساعد معلمك على معرفة أين تحتاج مراجعة.",
    "Briefly write how you got to your answer. This helps your teacher see where the gap is.",
  ],

  explanationPlaceholder: ["اكتب هنا...", "Type here..."],

  peerMoment: ["لحظة تعلّم مع زميل", "PEER LEARNING MOMENT"],
  yourPartner: ["شريكك", "Your partner"],
  yourRole: ["دورك الآن", "Your role"],
  explainRole: ["اشرح", "Explain"],
  listenRole: ["استمع", "Listen"],
  explainPromptLabel: ["مهمتك", "Your prompt"],
  listenPromptLabel: ["مهمتك", "Your prompt"],
  listenInstruction: [
    "استمع لشرح شريكك. ركّز على الفكرة والطريقة، مش بس الجواب النهائي.",
    "Listen to your partner explain their reasoning. Focus on the idea and the path, not only the final answer.",
  ],
  explainTipTitle: ["فكرة تساعدك", "A useful cue"],
  explainTip: [
    " اشرح كيف فكرت خطوة بخطوة، واذكر أين كنت واثقًا ولماذا.",
    " Explain your thinking step by step, including where you felt confident and why.",
  ],
  didItMakeSense: ["هل كان الشرح واضحًا؟", "Did it make sense?"],
  clarityHint: [
    "إجابتك تساعدنا نعرف إذا الشرح بين الطلاب فعلاً سدّ فجوة الفهم.",
    "Your feedback helps reveal whether peer explanation actually closed the learning gap.",
  ],
  clarityYes: ["نعم", "Yes"],
  clarityPartly: ["جزئيًا", "Partly"],
  clarityNo: ["لا", "No"],
  clarityRecorded: ["تم تسجيل رأيك", "Feedback recorded"],
  clarityRecordedHint: [
    "شكرًا. هذه الإشارة تساعد المعلم يعرف إذا الفكرة وصلت.",
    "Thanks. This signal helps the teacher see whether the idea landed.",
  ],
  peerFallbackPrompt: [
    "اشرح لشريكك كيف وصلت إلى إجابتك، خطوة بخطوة.",
    "Explain to your partner how you reached your answer, step by step.",
  ],

  back: ["رجوع →", "← Back"],

  joinTitle: ["انضم إلى صفك", "Join your class"],

  joinDescription: [
    "اكتب اسمك ورمز الحصة الذي أعطاك إياه المعلم.",
    "Enter your name and the class code your teacher gave you.",
  ],

  classCode: ["رمز الصف", "Class code"],

  yourName: ["اسمك", "Your name"],

  namePlaceholder: ["اكتب اسمك", "Enter your name"],

  joining: ["جارٍ الانضمام…", "Joining…"],

  join: ["انضم", "Join"],

  joinReady: ["جاهز للاتصال بالحصة مباشرة", "Ready to join the live class"],

  pulseWord: ["نبض", "PULSE"],

  pulseQuoteFirst: ["كل طالب يعطي إشارة.", "Every student sends a signal."],

  pulseQuoteSecond: [
    "الصف كله يصنع النبض.",
    "Together, the class creates the pulse.",
  ],

  liveClass: ["حصة مباشرة", "LIVE CLASS"],

  classNotFound: [
    "لم يتم العثور على الصف. تأكد من الرمز.",
    "Class not found. Check the code on the board.",
  ],

  startClass: ["ابدأ حصة", "Start a class"],

  startDesc: [
    "ستحصل على رمز لينضم الطلاب، وبعدها ابدأ التدريس كالمعتاد.",
    "You get a code for students to join. Then teach as usual.",
  ],

  className: ["اسم الحصة (اختياري)", "Class name (optional)"],

  classPlaceholder: ["مثال: رياضيات، الحصة الثالثة", "e.g. Math, period 3"],

  starting: ["جارٍ البدء…", "Starting…"],

  now: ["الآن", "Now"],

  follow: ["إلى أي درجة أنت فاهم؟", "How well are you following?"],

  studentHint: [
    "اضغط في أي وقت أثناء شرح المعلم، ويمكنك تغيير إجابتك متى شئت.",
    "Tap any time while your teacher talks. You can change it whenever you like.",
  ],

  teacherSees: ["المعلم يستطيع رؤية لونك.", "Your teacher can see your color."],

  focusStudent: [
    "وضع التركيز مفعّل: سيعرف المعلم إذا غادرت الصفحة.",
    "Focus mode is on: your teacher is told if you leave this page.",
  ],

  ended: ["انتهت الحصة", "Class ended"],

  thanks: ["شكرًا لمشاركتك!", "Thanks for joining!"],

  home: ["الرئيسية", "Home"],

  retry: ["حاول مرة أخرى", "Try again"],

  followGreen: ["فاهم", "I follow"],

  keep: ["كمل الشرح", "Keep going"],

  unsure: ["مش متأكد", "Not sure"],

  bitLost: ["ضايع شوي", "I am a bit lost"],

  lost: ["مش فاهم", "I'm lost"],

  slow: ["بطّئ أو أعد الشرح", "Please slow down or repeat"],

  selected: ["تم الاختيار", "Selected"],

  helpOptional: ["شو ممكن يساعدك؟ (اختياري)", "What would help? (optional)"],

  joinCode: ["رمز الانضمام", "Join code"],

  studentsOpen: ["يفتح الطلاب", "Students open"],

  endClass: ["إنهاء الحصة", "End class"],

  endConfirm: ["إنهاء الحصة لجميع الطلاب؟", "End this class for everyone?"],

  teaching: ["الشرح الحالي", "Now teaching"],

  topicLabel: [
    "الموضوع (حتى تعرف أين بدأ الصف يفقد الفهم)",
    "Topic (so you can see where the class got lost)",
  ],

  topicPlaceholder: ["مثال: توحيد المقامات", "e.g. Common denominators"],

  check: ["افحص الفهم الآن", "Check in now"],

  teacherHint: [
    "يستطيع الطلاب تغيير لونهم أثناء الشرح. فحص الفهم يمسح الاختيارات الحالية ليقيّم الطلاب فهمهم من جديد.",
    "Students can change their color any time while you talk. Check in now clears everyone’s color so they re-mark.",
  ],

  focusTeacher: [
    "وضع التركيز: نبّهني إذا غادر طالب الصفحة",
    "Focus mode: flag students who leave the page",
  ],

  understanding: ["فهم الصف", "Class understanding"],

  reteach: ["هل نجحت إعادة الشرح؟", "Did the re-teaching work?"],

  whereLost: ["أين بدأنا نفقدهم؟", "Where did we lose them?"],

  whatHelp: ["ما الذي قد يساعد؟", "What would help"],

  students: ["الطلاب", "Students"],

  hide: ["إخفاء الأسماء", "Hide names"],

  topics: ["المواضيع حتى الآن", "Topics so far"],

  alerts: ["تنبيهات التركيز", "Focus alerts"],

  aStudent: ["طالب", "A student"],

  left: ["غادر الصفحة", "left the page"],

  understandingSmall: ["مستوى فهم الصف", "class understanding"],

  marked: ["أجابوا", "have marked"],

  waiting: [
    "بانتظار الطلاب لتقييم فهمهم.",
    "Waiting for students to mark how well they follow.",
  ],

  good: ["معظم الصف متابع معك.", "Most of the class is with you."],

  medium: [
    "جزء من الصف بدأ يضيع. مراجعة سريعة قد تساعد.",
    "Part of the class is getting lost. A quick recap could help.",
  ],

  low: [
    "معظم الصف غير فاهم. جرّب التمهّل أو إعادة الشرح.",
    "Most of the class is lost. Consider slowing down or re-explaining.",
  ],

  gotIt: ["فاهم", "Got it"],

  notMarked: ["لم يجب", "Not marked"],

  noReason: ["لم يذكر أحد سببًا بعد.", "Nobody has given a reason yet."],

  nobody: [
    "لم ينضم أي طالب بعد. شارك رمز الصف.",
    "Nobody has joined yet. Share the code.",
  ],

  chartWait: [
    "سيظهر الرسم تلقائيًا عندما يبدأ الطلاب بالتقييم.",
    "The chart draws itself as students mark how well they follow.",
  ],

  general: ["عام", "General"],

  before: ["قبل إعادة الشرح", "Before re-teaching"],
  // ---- S4: Answer reveal & confidence calibration ----

  answerReveal: ["نتيجتك", "YOUR RESULT"],

  answerCorrect: ["إجابة صحيحة", "You got it right"],

  answerWrong: ["ليست الإجابة الصحيحة", "Not quite"],

  yourAnswer: ["إجابتك", "Your answer"],

  correctAnswer: ["الإجابة الصحيحة", "Correct answer"],

  surpriseMoment: ["لحظة تستحق الانتباه", "A SURPRISE MOMENT"],

  surpriseTitle: [
    "كنت متأكدًا… لكن الإجابة مختلفة",
    "You were certain… but the answer was different",
  ],

  surpriseLead: [
    "هذه بالضبط الفجوة التي نريد اكتشافها: شعور قوي بالثقة مع فكرة تحتاج مراجعة.",
    "This is exactly the gap worth catching: high confidence in an idea that needs another look.",
  ],

  calibrationLabel: ["معايرة الثقة", "CONFIDENCE CHECK"],

  calibrationCorrectCertain: [
    "ثقتك كانت في مكانها.",
    "Your confidence matched your understanding.",
  ],

  calibrationCorrectFairly: [
    "كنت تعرف أكثر مما شعرت.",
    "You knew more than you thought.",
  ],

  calibrationCorrectGuess: [
    "أجبت بشكل صحيح، والآن تأكد أنك تعرف لماذا.",
    "You got it right. Now make sure you know why.",
  ],

  calibrationWrongCertain: [
    "ثقتك كانت أعلى من فهمك هذه المرة.",
    "Your confidence was ahead of your understanding this time.",
  ],

  calibrationWrongFairly: [
    "كان عندك جزء من الفكرة، لكن ما زالت هناك فجوة تحتاج مراجعة.",
    "You had part of the idea, but there is still a gap to close.",
  ],

  calibrationWrongGuess: [
    "كنت تعرف أنك غير متأكد، والآن تعرف أين تحتاج للمراجعة.",
    "You knew you were unsure. Now you know where to focus.",
  ],

  surpriseWhyItMatters: [
    "اكتشاف الخطأ وأنت واثق منه مهم، لأنه يكشف فكرة كنت تظن أنك فهمتها.",
    "Catching a confident mistake matters because it reveals something you thought you already understood.",
  ],

  continueLearning: ["متابعة", "Continue"],
  questionLauncher: ["لوحة تشغيل الأسئلة", "Question launcher"],
  deck: ["مجموعة الأسئلة", "Deck"],
  chooseDeck: ["اختر مجموعة", "Choose a deck"],
  chooseQuestion: ["اختر سؤالًا", "Choose a question"],
  launchQuestion: ["ابدأ السؤال", "Launch"],
  closeQuestion: ["إغلاق", "Close"],
  pairUp: ["تكوين أزواج", "Pair up"],
  recheckQuestion: ["إعادة الفحص", "Re-check"],
  points: ["نقطة في", "points on"],

  // ---- Accounts ----
  signIn: ["تسجيل الدخول", "Sign in"],
  signOut: ["تسجيل الخروج", "Sign out"],
  createAccount: ["إنشاء حساب", "Create account"],
  signInTitle: ["أهلًا من جديد", "Welcome back"],
  signInLead: [
    "سجّل دخولك لتصل إلى حصصك وتقدّمك.",
    "Sign in to reach your classes and progress.",
  ],
  signUpTitle: ["أنشئ حسابك", "Create your account"],
  signUpLead: [
    "المعلم يحتفظ بسجل كل حصة وملخصها، والطالب يرى تقدّمه مع الوقت.",
    "Teachers keep a record and summary of every class. Students see their progress over time.",
  ],
  iAm: ["أنا", "I am"],
  roleTeacher: ["معلم", "Teacher"],
  roleStudent: ["طالب", "Student"],
  roleTeacherHint: ["أدير الحصص وأطرح الأسئلة", "I run classes and ask questions"],
  roleStudentHint: ["أنضم للحصص وأتابع تقدّمي", "I join classes and track my progress"],
  email: ["البريد الإلكتروني", "Email"],
  password: ["كلمة المرور", "Password"],
  passwordHint: ["6 أحرف على الأقل", "At least 6 characters"],
  pleaseWait: ["لحظة…", "Please wait…"],
  haveAccount: ["لديك حساب؟", "Already have an account?"],
  noAccount: ["ليس لديك حساب؟", "No account yet?"],
  accountsUnavailable: [
    "الحسابات غير متاحة الآن: الخادم يعمل بدون قاعدة بيانات.",
    "Accounts aren't available right now: the server is running without a database.",
  ],
  myAccount: ["حسابي", "My account"],
  loading: ["جارٍ التحميل…", "Loading…"],
  hello: ["أهلًا،", "Hi,"],
  studentCantTeach: [
    "أنت مسجّل بحساب طالب. سجّل الخروج وادخل بحساب معلم لبدء حصة.",
    "You're signed in with a student account. Sign out and use a teacher account to start a class.",
  ],
  signedInAs: ["مسجّل باسم", "Signed in as"],
  progressSaved: ["ستُحفظ إجاباتك في سجل تقدّمك.", "Your answers will be saved to your progress."],
  guestJoinNote: ["تنضم كضيف.", "You're joining as a guest."],
  signInToSave: ["سجّل الدخول لحفظ تقدّمك", "Sign in to save your progress"],

  // ---- Teacher: classes & class summary ----
  myClasses: ["حصصي", "MY CLASSES"],
  startNewClass: ["ابدأ حصة جديدة", "Start a new class"],
  noClassesYet: ["لا توجد حصص بعد", "No classes yet"],
  noClassesHint: [
    "كل حصة تبدأها ستظهر هنا مع ملخصها.",
    "Every class you start shows up here with its summary.",
  ],
  untitledClass: ["حصة بدون عنوان", "Untitled class"],
  live: ["مباشر", "Live"],
  questionsWord: ["الأسئلة", "Questions"],
  firstTry: ["المحاولة الأولى", "First try"],
  firstTryAccuracy: ["الدقة من أول محاولة", "First-try accuracy"],
  confidentlyWrong: ["خطأ بثقة", "Confidently wrong"],
  classSummary: ["ملخص الحصة", "Class summary"],
  backToClasses: ["→ حصصي", "← My classes"],
  openDashboard: ["افتح لوحة الحصة", "Open dashboard"],
  illusionGapLabel: ["فجوة الوهم", "Illusion gap"],
  illusionGapNote: [
    "متوسط الثقة ناقص الدقة. الموجب يعني ثقة زائدة.",
    "Average confidence minus accuracy. Positive means overconfident.",
  ],
  noStudents: ["لم ينضم أي طالب.", "No students joined."],
  noQuestions: ["لم تُطرح أسئلة في هذه الحصة.", "No questions were asked in this class."],
  answered: ["أجاب", "Answered"],
  avgConfidence: ["متوسط الثقة", "Avg confidence"],
  calibrationWord: ["المعايرة", "Calibration"],
  guest: ["ضيف", "Guest"],
  nameWord: ["الاسم", "Name"],
  noTopic: ["بدون موضوع", "No topic"],
  correctWord: ["صحيحة", "correct"],
  afterRecheck: ["بعد إعادة الفحص", "after re-check"],
  qMastered: ["متمكّن", "Mastered"],
  qFragile: ["هشّ", "Fragile"],
  qBlindspot: ["نقطة عمياء", "Blindspot"],
  qAware: ["مدرك", "Aware"],
  checkInsWord: ["جولات النبض", "Check-ins"],
  understood: ["فهم", "understood"],
  greenWord: ["أخضر", "green"],
  yellowWord: ["أصفر", "yellow"],
  redWord: ["أحمر", "red"],
  calWell: ["معايرة جيدة", "Well calibrated"],
  calOver: ["ثقة زائدة", "Overconfident"],
  calUnder: ["ثقة ناقصة", "Underconfident"],
  calNoData: ["لا بيانات", "No data"],

  // ---- Student: progress ----
  myProgress: ["تقدّمي", "MY PROGRESS"],
  joinAClass: ["انضم لحصة", "Join a class"],
  noProgressYet: ["لا يوجد تقدّم بعد", "No progress yet"],
  noProgressHint: [
    "انضم لحصة وأنت مسجّل الدخول وأجب عن الأسئلة، وسيظهر تقدّمك هنا.",
    "Join a class while signed in and answer its questions. Your progress shows up here.",
  ],
  classesWord: ["الحصص", "Classes"],
  calibrationOverTime: ["الثقة مقابل الدقة مع الوقت", "Confidence vs accuracy over time"],
  calibrationOverTimeHint: [
    "عندما يكون خط الثقة أعلى من خط الدقة، فأنت واثق أكثر مما تعرف.",
    "When the confidence line sits above accuracy, you're surer than you are right.",
  ],
  accuracyWord: ["الدقة", "Accuracy"],
  confidenceWord: ["الثقة", "Confidence"],
  showAsTable: ["عرض كجدول", "Show as table"],
  byTopic: ["الدقة حسب الموضوع", "Accuracy by topic"],
  pastClasses: ["الحصص السابقة", "Past classes"],
} as const;

export type TranslationKey = keyof typeof D;

export const tr = (language: Language, key: TranslationKey): string => {
  return D[key][language === "ar" ? 0 : 1];
};
