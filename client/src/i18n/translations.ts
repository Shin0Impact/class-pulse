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

  oneMoreThing: ["خطوة أخيرة", "ONE LAST STEP"],

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

  explainThinkingHint: ["اكتب باختصار كيف وصلت إلى إجابتك. هذا يساعد معلمك على معرفة ما يحتاج إلى مراجعة.", "Briefly say how you got your answer. It helps your teacher see what to go over again."],

  explanationPlaceholder: ["اكتب هنا...", "Type here..."],

  peerMoment: ["تعلّم مع زميلك", "LEARN FROM A CLASSMATE"],
  yourPartner: ["شريكك", "Your partner"],
  yourRole: ["دورك الآن", "Your role"],
  explainRole: ["اشرح", "Explain"],
  listenRole: ["استمع", "Listen"],
  explainPromptLabel: ["مهمتك", "Your task"],
  listenPromptLabel: ["مهمتك", "Your task"],
  listenInstruction: ["استمع إلى شرح شريكك. ركّز على الفكرة وطريقة التفكير، وليس على الجواب النهائي فقط.", "Listen to how your partner got their answer. Focus on the steps, not just the final answer."],
  explainTipTitle: ["نصيحة سريعة", "A quick tip"],
  explainTip: ["اشرح كيف فكرت خطوة بخطوة، وأين كنت واثقًا ولماذا.", "Explain your thinking step by step, and say where you felt sure and why."],
  didItMakeSense: ["هل كان الشرح واضحًا؟", "Was the explanation clear?"],
  clarityHint: ["إجابتك تساعدنا على معرفة ما إذا كان الشرح بين الزملاء قد أوضح الفكرة فعلًا.", "Your answer shows whether explaining to a classmate really cleared things up."],
  clarityYes: ["نعم", "Yes"],
  clarityPartly: ["جزئيًا", "Partly"],
  clarityNo: ["لا", "No"],
  clarityRecorded: ["تم تسجيل رأيك", "Response saved"],
  clarityRecordedHint: ["شكرًا. هذا يساعد المعلم على معرفة ما إذا كانت الفكرة قد وصلت.", "Thanks. This helps your teacher see whether the idea got through."],
  peerFallbackPrompt: [
    "اشرح لشريكك كيف وصلت إلى إجابتك، خطوة بخطوة.",
    "Explain to your partner how you reached your answer, step by step.",
  ],

  back: ["رجوع →", "← Back"],

  joinTitle: ["انضم إلى صفك", "Join your class"],

  joinDescription: ["اكتب اسمك ورمز الصف الذي أعطاك إياه المعلم.", "Enter your name and the class code your teacher gave you."],

  classCode: ["رمز الصف", "Class code"],

  yourName: ["اسمك", "Your name"],

  namePlaceholder: ["اكتب اسمك", "Enter your name"],

  joining: ["جارٍ الانضمام…", "Joining…"],

  join: ["انضم", "Join"],

  joinReady: ["جاهز للانضمام إلى الحصة المباشرة", "Ready to join the live class"],

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

  follow: ["إلى أي مدى تفهم الشرح؟", "How well are you following?"],

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

  followGreen: ["فهمت", "Got it"],

  keep: ["تابع الشرح", "Keep going"],

  unsure: ["لست متأكدًا", "Not sure"],

  bitLost: ["تهت قليلًا", "I'm a little lost"],

  lost: ["لا أفهم", "I'm lost"],

  slow: ["من فضلك أبطئ أو أعد الشرح", "Please slow down or explain again"],

  selected: ["تم الاختيار", "Selected"],

  helpOptional: ["ما الذي قد يساعدك؟ (اختياري)", "What would help? (optional)"],

  joinCode: ["رمز الانضمام", "Join code"],

  studentsOpen: ["يفتح الطلاب", "Students open"],

  endClass: ["إنهاء الحصة", "End class"],
  cancel: ["إلغاء", "Cancel"],
  finishClass: ["إنهاء وإغلاق", "Finish and close"],

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

  surpriseMoment: ["لحظة تستحق الانتباه", "WORTH A CLOSER LOOK"],

  surpriseTitle: ["كنت متأكدًا… لكن الإجابة مختلفة", "You were sure, but the answer is different"],

  surpriseLead: ["هذا بالضبط ما نريد اكتشافه: ثقة عالية بفكرة تحتاج إلى مراجعة.", "This is the kind of mistake worth catching: you felt very sure about an idea that needs another look."],

  calibrationLabel: ["ثقتك وإجابتك", "CONFIDENCE CHECK"],

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

  calibrationWrongFairly: ["كان لديك جزء من الفكرة، لكن ما زال هناك ما يحتاج إلى مراجعة.", "You had part of the idea, but something is still missing."],

  calibrationWrongGuess: [
    "كنت تعرف أنك غير متأكد، والآن تعرف أين تحتاج للمراجعة.",
    "You knew you were unsure. Now you know where to focus.",
  ],

  surpriseWhyItMatters: ["اكتشاف خطأ كنت واثقًا منه أمر مهم، لأنه يكشف فكرة ظننت أنك فهمتها.", "Catching a mistake you felt sure about is useful, because it shows something you thought you understood."],

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
  roleTeacherHint: [
    "أدير الحصص وأطرح الأسئلة",
    "I run classes and ask questions",
  ],
  roleStudentHint: [
    "أنضم للحصص وأتابع تقدّمي",
    "I join classes and track my progress",
  ],
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
  progressSaved: [
    "ستُحفظ إجاباتك في سجل تقدّمك.",
    "Your answers will be saved to your progress.",
  ],
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
  noQuestions: [
    "لم تُطرح أسئلة في هذه الحصة.",
    "No questions were asked in this class.",
  ],
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
  calibrationOverTime: [
    "الثقة مقابل الدقة مع الوقت",
    "Confidence vs accuracy over time",
  ],
  calibrationOverTimeHint: [
    "عندما يكون خط الثقة أعلى من خط الدقة، فأنت واثق أكثر مما تعرف.",
    "When the confidence line sits above accuracy, you're surer than you are right.",
  ],
  accuracyWord: ["الدقة", "Accuracy"],
  confidenceWord: ["الثقة", "Confidence"],
  showAsTable: ["عرض كجدول", "Show as table"],
  byTopic: ["الدقة حسب الموضوع", "Accuracy by topic"],
  pastClasses: ["الحصص السابقة", "Past classes"],

  // ---- AI: present page, ask panel, summaries ----
  askTheClass: ["اسأل الصف", "Ask the class"],
  backToDashboard: ["→ لوحة الحصة", "← Dashboard"],
  openFile: ["افتح ملفًا", "Open file"],
  recentFiles: ["ملفاتي", "My files"],
  opening: ["جارٍ الفتح…", "Opening…"],
  savingFile: ["جارٍ حفظ الملف في حسابك…", "Saving the file to your account…"],
  saveFileFailed: [
    "الملف معروض، لكن لم يُحفظ في حسابك.",
    "The file is shown, but it wasn't saved to your account.",
  ],
  fileTypeError: [
    "افتح ملف PDF أو صورة (PNG أو JPG أو WebP).",
    "Open a PDF or an image (PNG, JPG, WebP).",
  ],
  fileSizeError: [
    "الحد الأقصى لحجم الملف 25 ميغابايت.",
    "Files can be at most 25 MB.",
  ],
  pageWord: ["الصفحة", "Page"],
  prevPage: ["الصفحة السابقة", "Previous page"],
  nextPage: ["الصفحة التالية", "Next page"],
  presentEmptyTitle: ["اعرض درسك هنا", "Show your lesson here"],
  presentEmptyHint: [
    "افتح ملف PDF أو صورة لشرحك. بعد أن تنتهي من صفحة، اسأل الصف عنها بضغطة واحدة. (شرائح PowerPoint أو Google Slides: صدّرها أولًا كملف PDF.)",
    "Open a PDF or an image of your lesson. When you finish a page, ask the class about it in one tap. (PowerPoint or Google Slides: export to PDF first.)",
  ],
  joinAt: ["ادخلوا على", "Join at"],
  askAboutPage: ["اسأل عن هذه الصفحة", "Ask about this page"],
  questionType: ["نوع السؤال", "Question type"],
  multipleChoice: ["اختيار من متعدد", "Multiple choice"],
  openQuestion: ["سؤال مفتوح", "Open question"],
  correctAnswerOptional: [
    "الإجابة الصحيحة (اختياري)",
    "Correct answer (optional)",
  ],
  generateFromPage: ["أنشئ سؤالًا من الصفحة", "Generate from page"],
  generating: ["جارٍ الإنشاء…", "Generating…"],
  openFileFirst: [
    "افتح ملفًا أولًا، أو اكتب سؤالك بنفسك.",
    "Open a file first, or write your own question.",
  ],
  orWord: ["أو", "or"],
  writeOwn: ["اكتب سؤالك", "Write your own"],
  checkBeforeLaunch: ["راجع قبل الإرسال", "Check before launching"],
  launchToClass: ["أرسل للصف", "Launch to class"],
  regenerate: ["أنشئ غيره", "Regenerate"],
  discard: ["إلغاء", "Discard"],
  questionWord: ["السؤال", "Question"],
  optionsMarkCorrect: [
    "الخيارات (اضغط على الحرف لتحديد الصحيح)",
    "Options (tap a letter to mark the right one)",
  ],
  markCorrect: ["حدّد كصحيح", "Mark correct"],
  optionWord: ["خيار", "Option"],
  removeOption: ["احذف الخيار", "Remove option"],
  addOption: ["أضف خيارًا", "Add option"],
  misconceptionWord: ["الخطأ الشائع", "Misconception"],
  modelAnswer: ["إجابة نموذجية (للمعلم فقط)", "Model answer (teacher only)"],
  modelAnswerHint: [
    "لا يراها الطلاب. تساعد الذكاء الاصطناعي على فهم ما يربك الصف.",
    "Students never see this. It helps the AI tell what the class is confused by.",
  ],
  needPrompt: ["اكتب السؤال أولًا.", "Write the question first."],
  needOptions: [
    "املأ كل الخيارات (خياران على الأقل).",
    "Fill in every option (at least two).",
  ],
  needCorrect: ["حدّد الإجابة الصحيحة.", "Mark the correct answer."],
  questionLive: ["السؤال مفتوح الآن", "Question is live"],
  questionClosed: ["أُغلق السؤال", "Question closed"],
  showAnswers: ["اعرض الإجابات", "Show answers"],
  hideAnswers: ["أخفِ الإجابات", "Hide answers"],
  summarize: ["لخّص إجابات الصف", "Summarize answers"],
  summarizeAgain: ["لخّص من جديد", "Summarize again"],
  askAnother: ["اسأل سؤالًا آخر", "Ask another question"],
  pairFromDashboard: [
    "للمناقشة في أزواج وإعادة الفحص، استخدم لوحة الحصة.",
    "To pair students up and re-check, use the dashboard.",
  ],
  aiOffHint: [
    "الذكاء الاصطناعي غير مفعّل على الخادم، فلن يظهر ملخص.",
    "AI isn't set up on the server, so there's no summary.",
  ],
  aiSummary: ["قراءة الذكاء الاصطناعي للصف", "AI read of the class"],
  aiSummarizing: [
    "الذكاء الاصطناعي يقرأ إجابات الصف…",
    "The AI is reading the class's answers…",
  ],
  aiSummaryFailed: [
    "تعذّر كتابة الملخص الآن.",
    "Couldn't write a summary right now.",
  ],
  aiReteach: ["أعد الشرح", "Re-teach"],
  aiMoveOn: ["تابع", "Move on"],
  aiWrittenBy: ["بواسطة", "by"],
  presentButton: ["اعرض الدرس", "Present"],
  liveOnline: ["متصلون", "online"],
  fullscreen: ["ملء الشاشة", "Full screen"],
  exitFullscreen: ["إنهاء ملء الشاشة", "Exit full screen"],
  scrollMode: ["تمرير الصفحات", "Scroll pages"],
  pageMode: ["صفحة واحدة", "One page at a time"],
  fitHint: [
    "اعرض كل الصفحات بعرض كامل ومرّر لأسفل بشكل متواصل. تتبعك نافذة العرض تلقائيًا.",
    "Show every page at full width and scroll down continuously. The screen window follows.",
  ],
  myFiles: ["ملفاتي", "My files"],
  pickFileTitle: ["اختر ملفًا", "Choose a file"],
  uploadNew: ["ارفع ملفًا جديدًا", "Upload a new file"],
  searchFiles: ["ابحث في ملفاتك", "Search your files"],
  noMatchingFiles: ["لا توجد ملفات مطابقة", "No matching files"],
  changeFile: ["تغيير الملف", "Change file"],
  noFilesYet: [
    "الملفات التي ترفعها تُحفظ هنا لتستخدمها لاحقًا.",
    "Files you upload are saved here so you can reuse them.",
  ],
  askSoFar: ["اسأل عن كل ما شرحناه حتى الآن", "Ask about everything so far"],
  newCheckIn: ["فحص جديد", "New check-in"],
  newCheckInHint: [
    "يمسح ألوان الجميع ليعيدوا التقييم، ثم قارن قبل وبعد.",
    "Clears everyone's colors so they re-mark, then compare before and after.",
  ],
  writeQuestionTitle: ["اسأل الصف", "Ask the class"],
  aiFromFile: ["✦ سؤال بالذكاء الاصطناعي من ملف PDF أو صورة", "✦ AI question from a PDF or image"],
  aiFromFileHint: [
    "ارفع الملف، اختر الصفحة، وسيكتب الذكاء الاصطناعي سؤالًا عنها لتراجعه.",
    "Upload the file, pick the page, and the AI drafts a question about it for you to check.",
  ],
  closeFile: ["إغلاق الملف", "Close file"],
  screenWindow: ["نافذة العرض", "Screen window"],
  screenWindowHint: [
    "تفتح الشريحة فقط في نافذة منفصلة للعرض على الشاشة. تتحكم بها من هذه النافذة.",
    "Opens just the slide in its own window for the projector. You control it from this window.",
  ],
  screenBlocked: [
    "منع المتصفح فتح النافذة. اسمح بالنوافذ المنبثقة لهذا الموقع.",
    "The browser blocked the window. Allow pop-ups for this site.",
  ],
  screenWaiting: ["بانتظار المعلم ليفتح ملفًا…", "Waiting for the teacher to open a file…"],
  screenUnsupported: [
    "هذا المتصفح لا يدعم مزامنة النوافذ.",
    "This browser can't sync windows.",
  ],
  screenAnswersClosed: ["أُغلق باب الإجابات", "Answers are closed"],
  screenLiveQuestion: ["سؤال مباشر", "Live question"],
  slideTab: ["الشريحة", "Slide"],
  moreMenu: ["المزيد", "More"],
  seeResults: ["النتائج", "Results"],
  quizCreate: ["إنشاء اختبار", "Create quiz"],
  quizFromFile: ["أنشئ اختبارًا", "Generate a quiz"],
  quizSettings: ["تعديل الإعدادات", "Change settings"],
  quizLaunched: ["بدأ الاختبار. النتائج أدناه.", "Quiz started. Results are below."],
  quizHeading: ["اختبار للطلاب", "Quiz for students"],
  quizHint: ["يحلّ الطلاب الأسئلة بسرعتهم الخاصة على هواتفهم.", "Students answer at their own pace on their phones."],
  quizHowMany: ["عدد الأسئلة", "How many questions"],
  quizTypes: ["نوع الأسئلة", "Question types"],
  quizMixed: ["مزيج", "Mixed"],
  quizPagesFrom: ["من صفحة", "From page"],
  quizPagesTo: ["إلى صفحة", "to page"],
  quizGenerate: ["أنشئ الاختبار", "Generate quiz"],
  quizCheck: ["راجع الأسئلة واحذف ما لا يعجبك ثم ابدأ.", "Check the questions, remove any you don't like, then start."],
  quizStart: ["ابدأ الاختبار", "Start quiz"],
  quizRemove: ["حذف السؤال", "Remove question"],
  quizKeepOne: ["أبقِ سؤالًا واحدًا على الأقل", "Keep at least one question"],
  quizFewer: ["كتب الذكاء الاصطناعي أسئلة أقل مما طلبت.", "The AI wrote fewer questions than you asked for."],
  quizPickFile: ["اختر ملف PDF أو صورة لإنشاء الاختبار منه.", "Pick a PDF or image to make the quiz from."],
  quizLive: ["الاختبار يعمل الآن", "Quiz is live"],
  quizIsClosed: ["انتهى الاختبار", "Quiz ended"],
  quizEnd: ["إنهاء الاختبار", "End quiz"],
  quizNew: ["اختبار جديد", "New quiz"],
  quizSubmittedCount: ["سلّموا", "submitted"],
  quizAnsweredCount: ["أجابوا", "answered"],
  quizCorrectWord: ["صحيحة", "correct"],
  quizNoAnswers: ["لا إجابات بعد", "No answers yet"],
  quizModelAnswer: ["الإجابة النموذجية", "Model answer"],
  quizQ: ["سؤال", "Question"],
  quizOf: ["من", "of"],
  quizNext: ["التالي", "Next"],
  quizPrev: ["السابق", "Previous"],
  quizSubmit: ["تسليم", "Submit"],
  quizSubmitting: ["جارٍ التسليم…", "Submitting…"],
  quizUnanswered: ["لم تجب عن بعض الأسئلة. هل تريد التسليم على أي حال؟", "Some questions are unanswered. Submit anyway?"],
  quizYourScore: ["نتيجتك", "Your score"],
  quizCorrectAnswer: ["الإجابة الصحيحة", "Correct answer"],
  quizNoAnswer: ["لم تجب", "No answer"],
  quizRight: ["صحيحة", "Correct"],
  quizWrong: ["خاطئة", "Wrong"],
  quizCompare: ["قارن إجابتك بالإجابة النموذجية.", "Compare your answer with the model answer."],
  quizBackToClass: ["العودة إلى الحصة", "Back to class"],
  quizEndedNotice: ["أنهى المعلم الاختبار.", "Your teacher ended the quiz."],
  screenFullscreenHint: ["اضغط F أو انقر مرتين لملء الشاشة", "Press F or double-click for full screen"],
  openAnswers: ["إجابات الطلاب", "Students' answers"],
  noAnswersYet: ["لا توجد إجابات بعد.", "No answers yet."],
  openAnswerPlaceholder: [
    "اكتب إجابتك بكلماتك…",
    "Write your answer in your own words…",
  ],
  teacherClosedQuestion: [
    "أغلق المعلم السؤال.",
    "Your teacher closed the question.",
  ],
  // ---- G9: Class Feedback ----

  feedbackEyebrow: ["تقييم الحصة", "CLASS FEEDBACK"],

  feedbackTitle: ["كيف كانت حصة اليوم؟", "How was today's class?"],

  feedbackDescription: [
    "رأيك يساعد في جعل الحصة القادمة أفضل.",
    "Your feedback helps make the next class better.",
  ],

  feedbackRate: ["قيّم حصة اليوم", "Rate today's class"],

  feedbackTellMore: ["أخبر معلمك بالمزيد", "Tell your teacher more"],

  feedbackOptional: ["اختياري", "Optional"],

  feedbackPlaceholder: [
    "ما الذي ساعدك اليوم؟ وما الذي يمكن تحسينه؟",
    "What helped you today? What could be better?",
  ],

  feedbackAnonymous: ["تقييم مجهول", "Anonymous feedback"],

  feedbackShowName: ["إظهار اسمي", "Show my name"],

  feedbackAnonymousHint: [
    "لن يظهر اسمك للمعلم.",
    "Your name won't be shown to the teacher.",
  ],

  feedbackNameHint: [
    "سيظهر اسمك للمعلم مع هذا التقييم.",
    "Your teacher will see your name with this feedback.",
  ],

  feedbackSend: ["إرسال التقييم", "Submit feedback"],

  feedbackSending: ["جارٍ الإرسال…", "Sending..."],

  feedbackAnonymousNote: [
    "سيتم إرسال هذا التقييم بشكل مجهول.",
    "This feedback will be sent anonymously.",
  ],

  feedbackNameNote: [
    "سيتم إرفاق اسمك بهذا التقييم.",
    "Your name will be included with this feedback.",
  ],

  feedbackChooseRating: [
    "اختر تقييمًا أولًا.",
    "Please choose a rating first.",
  ],

  feedbackSendError: ["تعذر إرسال تقييمك.", "Could not send your feedback."],

  feedbackThanks: ["شكرًا لك!", "Thank you!"],

  feedbackSuccess: [
    "تم إرسال تقييمك بنجاح.",
    "Your feedback was sent successfully.",
  ],

  feedbackStars: ["نجوم", "stars"],
  // ---- G9: Teacher Feedback ----

  feedbackTeacherEyebrow: ["تقييم الحصة", "CLASS FEEDBACK"],

  feedbackTeacherTitle: ["تقييم الحصة", "Class Feedback"],

  feedbackWaiting: [
    "بانتظار تقييمات الطلاب للحصة.",
    "Waiting for students to rate the class.",
  ],

  feedbackAverage: ["متوسط التقييم", "Average rating"],

  feedbackResponses: ["عدد الردود", "Responses"],

  feedbackNoResponses: [
    "لا توجد تقييمات بعد. ستظهر ردود الطلاب هنا مباشرة.",
    "No feedback yet. Student responses will appear here live.",
  ],

  feedbackFinishClose: ["إنهاء التقييم وإغلاق الحصة", "Finish & Close Class"],

  feedbackAnonymousStudent: ["طالب مجهول", "Anonymous student"],

  feedbackFinishConfirm: [
    "هل تريد إنهاء التقييم وإغلاق الحصة؟",
    "Finish feedback and close the class?",
  ],

  feedbackEndAskConfirm: [
    "هل تريد إنهاء الحصة وطلب تقييم من الطلاب؟",
    "End the class and ask students for feedback?",
  ],
  // ---- Reasons (what would help) ----
  reasonTooFast: ["الشرح سريع جدًا", "Too fast"],
  reasonUnclearSteps: ["الخطوات غير واضحة", "Steps unclear"],
  reasonNeedExample: ["أحتاج مثالًا", "Need an example"],
  reasonMissingBasics: ["تنقصني الأساسيات", "Missing basics"],
  reasonOther: ["سبب آخر", "Other reason"],
  reasonOtherLabel: ["اكتب السبب بكلماتك", "Say it in your own words"],
  reasonOtherPlaceholder: [
    "مثلًا: لم أفهم لماذا قسمنا هنا",
    "For example: I didn't get why we divided here",
  ],
  reasonSend: ["إرسال", "Send"],
  reasonSent: ["تم إرسال رسالتك إلى المعلم", "Sent to your teacher"],
} as const;

export type TranslationKey = keyof typeof D;

export const tr = (language: Language, key: TranslationKey): string => {
  return D[key][language === "ar" ? 0 : 1];
};
