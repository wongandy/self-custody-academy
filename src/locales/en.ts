// Source dictionary. Every other locale must match this shape exactly
// (same keys, same number of lines in every list) — see `Dictionary` below.
//
// Text shown on the simulated device screens (hardware wallet, exchange phone,
// Cairn wallet window) is intentionally NOT translated and lives in those
// components. When a mentor line names a button on one of those screens, keep
// the button's English label in the translation so it matches what's on screen.
//
// `{name}` placeholders are filled with `fmt()`. `{icon}` marks where an inline
// icon is drawn inside a mentor line.

const en = {
  common: {
    nudge: "No need to do that now. Let's stick to the plan.",
    nudgeLater: "We'll get to that later! For now, let's stick to the current step.",
    /** Spoken label for the inline ✓ chip on lines that show the icon without naming the button. */
    checkmarkButton: 'checkmark button',
    wrongAnswer: 'Not quite. Take another look at the choices and try again.',
    continue: 'Continue',
    completeLesson: 'Complete lesson',
    finishLesson: 'Finish lesson',
    mentorAria: '{name}, your mentor',
    academyMentorAria: 'Andy, your academy mentor',
    captionPhone: 'Phone',
    captionWalletSoftware: 'Wallet software',
    captionHardwareWallet: 'Hardware wallet',
  },
  quiz: {
    checkIn: 'Lesson check-in',
    groupAria: 'Quick knowledge check',
    progress: 'Question {current} of {total}',
    next: 'Next question',
    finish: 'Finish lesson',
  },
  header: {
    homeAria: 'Self Custody Academy home',
    backHome: 'Back to home',
    backRoadmap: 'Back to roadmap',
    toLight: 'Switch to light mode',
    toDark: 'Switch to dark mode',
    signOut: 'Sign out',
    language: 'Language',
  },
  home: {
    illustrationAria: 'Bitcoin self-custody illustration',
    titleBefore: 'The most fun way to master ',
    titleEm: 'self-custody',
    titleAfter: ' and secure your Bitcoin.',
    getStarted: 'Get started',
    haveAccount: 'I already have an account',
    footerMode: 'Learning mode: simulation only',
    footerNoBtc: 'No real BTC involved',
    footerSupportedBy: 'Supported by',
  },
  andyIntro: {
    lines: [
      "Hey there! I'm Andy, and I will teach you how to self-custody your Bitcoin. Learning to secure it requires patience and some practice.",
      'Everything here is simulated, so you can explore freely with zero risk. Choose the learning path that fits where you are, and build confidence one step at a time.',
      "Feel free to dive straight into any lesson that catches your eye, or just follow along step-by-step — it's completely up to you.",
    ],
  },
  pathSelector: {
    kicker: 'Your learning journey',
    title: 'Choose your path',
    subtitle: 'Start with the essential skills, or explore what comes next as your confidence grows.',
    pathsAria: 'Learning paths',
    availableNow: 'Available now',
    comingSoon: 'Coming soon',
    fundamentals: 'Fundamentals',
    fundamentalsDesc: 'The essential building blocks of self-custody.',
    includesLabel: 'Includes:',
    fundamentalsIncludes: 'hardware wallet setup, withdrawals, recovery, and more.',
    startLearning: 'Start learning',
    lessonCount: '{count} interactive lessons',
    recommendedByAndy: 'Andy recommends starting here',
    deeper: 'Going Deeper',
    deeperDesc: 'Advanced security for protecting larger amounts.',
    comingSoonLabel: 'Coming soon:',
    deeperIncludes: 'passphrases, multisig setups, watch-only wallets, and more.',
    deeperTopics: ['Passphrases', 'Multisig setups', 'Watch-only wallets'],
    inPreparation: 'In preparation',
  },
  roadmap: {
    label: 'Your learning path',
    pathComplete: 'Path complete',
    progress: '{completed} of {total} lessons complete',
    error: "We couldn't refresh saved progress. Your current view is still available.",
    loading: 'Loading your academy progress…',
    boardAria: 'Six-lesson learning path',
    start: 'START',
    titles: [
      'Set up hardware wallet',
      'Withdraw Bitcoin from exchange',
      'Recover hardware wallet',
      'Connect to wallet software',
      'Receiving Bitcoin',
      'Sending Bitcoin',
    ],
  },
  auth: {
    registerTitle: 'Time to create an account',
    loginTitle: 'Welcome back',
    registerSubtitle: 'Create an account to save your progress.',
    loginSubtitle: 'Pick up right where you left off.',
    errEmailPassword: 'Please enter your email and password.',
    errPasswordShort: 'Password must be at least 6 characters.',
    errPasswordMismatch: 'Passwords do not match.',
    errEmail: 'Please enter your email.',
    resetTitle: 'Reset your password',
    resetSentSubtitle: 'Check your email for a password reset link.',
    resetSubtitle: "Enter your email and we'll send you a link to reset your password.",
    resetSentBefore: "We've sent a password reset link to ",
    resetSentAfter: '. Click the link in the email to set a new password.',
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    password: 'Password',
    passwordPlaceholderNew: 'At least 6 characters',
    passwordPlaceholder: 'Your password',
    confirmPassword: 'Confirm password',
    confirmPlaceholder: 'Re-enter your password',
    pleaseWait: 'Please wait…',
    sendReset: 'Send reset link',
    backToSignIn: 'Back to sign in',
    createAccount: 'Create account',
    signIn: 'Sign in',
    forgot: 'Forgot password?',
    guest: 'Continue as guest',
    haveAccount: 'Already have an account?',
    newHere: 'New to the academy?',
    createAccountLink: 'Create an account',
    newPasswordTitle: 'Set a new password',
    newPasswordSubtitle: 'Choose a new password for your account.',
    newPassword: 'New password',
    saveNewPassword: 'Save new password',
    confirmTitle: 'Check your email',
    confirmSentBefore: "We've sent a confirmation link to ",
    confirmSentAfter: '. Click it to activate your account, then sign in.',
    errInvalidCredentials: 'Incorrect email or password.',
    errUserExists: 'An account with this email already exists. Try signing in instead.',
    errEmailNotConfirmed: 'Please confirm your email first — check your inbox for the link.',
    errSamePassword: 'Your new password must be different from your old one.',
    errEmailInvalid: 'Please enter a valid email address.',
    errRateLimit: 'Too many attempts. Please wait a few minutes and try again.',
    errLinkExpired: 'That link is invalid or has expired. Please request a new one.',
    errGeneric: 'Something went wrong. Please try again.',
  },

  // Lesson 1 — Set up hardware wallet (Andy)
  lesson1: {
    intro: [
      "Let's set up your hardware wallet. Quick refresher: it's a physical device that stores the private keys to your Bitcoin.",
      'Your private keys are what let you spend your Bitcoin — whoever holds them controls it. A secure chip inside the device protects them.',
    ],
    powerOn: "Nice hardware wallet you've got there! Click the power button{icon} to turn it on.",
    readyMenu: "We'll cover these options in later lessons. Let's wrap up for now.",
    factoryReset: "Resetting isn't part of this lesson, so let's leave it and wrap up instead.",
    booting: 'Great — the device is booting up. Hang tight for a moment.',
    menu: 'Next, create a wallet — this is where your device generates your private keys. Press the checkmark button{icon} to choose Create wallet.',
    createIntro: 'First, your device creates a 12-word recovery phrase, which your private keys come from. Press{icon} to continue.',
    createWords: [
      'This is your 12-word recovery phrase. Write it on paper — never photograph it or type it into a computer.',
      'Keep it somewhere safe and private, and never share it with anyone. Whoever gets it can steal your Bitcoin.',
    ],
    createQuiz: 'Now prove you wrote it down. Pick the correct word for the position shown, then press{icon}.',
    createDone: [
      "Nice work — your wallet is created! Remember, your Bitcoin doesn't live on this device. It stays on the blockchain.",
      'The device just holds the private keys that let you spend it.',
    ],
    recoverLater: "We'll cover wallet recovery later. Select Create Wallet for now.",
    receiveAddress: 'This is your receive address — press the copy button to copy it.',
    sendBlocked: "Sending isn't part of this lesson. Let's get your receive address first.",
    knowledgePrompts: [
      'Before we wrap up, two quick questions to make sure the key ideas stick.',
      'Good job. One more question about what makes a hardware wallet secure.',
    ],
    questions: [
      {
        question: 'Where should you keep your 12-word recovery phrase?',
        options: {
          photo: "Take a photo of it — it's always in my pocket",
          paper: 'Write it on paper and store it somewhere safe and private',
          phone: 'Save it in a note on my phone',
        },
        correctLine: 'Exactly. Write it down and keep it private. Anyone who gets your recovery phrase can control your Bitcoin.',
      },
      {
        question: 'Your hardware wallet keeps your Bitcoin safe because…',
        options: {
          offline: 'Your private keys never leave the device — even when you send Bitcoin',
          app: 'It runs a security app that scans every transaction for threats',
          backup: 'It automatically backs your Bitcoin up to the company that made it',
        },
        correctLine: 'Right. Your keys never leave the secure chip, so your Bitcoin stays safe even on a compromised computer.',
      },
    ],
  },

  // Lesson 2 — Withdraw from exchange (Andy)
  lesson2: {
    intro: [
      "This time, let's withdraw your Bitcoin from the exchange to your hardware wallet. Keeping it in your own wallet means you truly own it.",
      "You no longer rely on a third party to hold it for you. Your Bitcoin is in your hands — that's what self-custody is all about.",
    ],
    handover: "You've already set up your hardware wallet, so select 'Receive Bitcoin' to generate a receive address.",
    switchIntro: [
      "Receive address copied! Now let's switch over to the exchange on your phone so we can paste it there.",
      'Press "Switch to Exchange Wallet" at the top to head to the exchange on your phone.',
    ],
    exchangeIntro: [
      "Your BitExchange app is open on your phone with 0.05 BTC in it. Let's withdraw it to your hardware wallet.",
      "In the Send to address field, paste the receive address you copied from your hardware wallet. That's where your Bitcoin will go.",
    ],
    enterAmount: [
      'The network charges a small fee to process the transaction. It comes out of the amount you withdraw — see the Received line below.',
      'Good job. In the Withdraw amount field, type 0.05 to send your full balance, or tap MAX.',
    ],
    readyToWithdraw: 'Alright. Now click Withdraw to send your Bitcoin to your hardware wallet.',
    amountCorrection: 'The amount to withdraw should be 0.05 BTC. Type 0.05 or click MAX to continue.',
    receiveAddress: [
      'A receive address is a unique string your wallet generates. To receive Bitcoin from someone, you give them this address.',
      "There's your receive address. Click the copy button{icon} next to it to copy it.",
    ],
    panelExchange: 'Follow the instructions to withdraw your Bitcoin to your hardware wallet.',
    panelWallet: "Select 'Receive Bitcoin' to get your receive address.",
    walletBooting: 'The device is booting up. Hang tight for a moment.',
    walletMenu: "Feel free to explore the device. When you're ready, select 'Receive Bitcoin' to get your receive address.",
    walletSettings: "You can explore the device settings. Return to the menu when you're ready to continue.",
    walletMenuReceive: "Select 'Receive Bitcoin' to get your receive address.",
    walletMenuSendBlocked: "You can explore the wallet options here. Select 'Receive Bitcoin' whenever you're ready to continue.",
    walletReceiveCopied: 'Copied the address? Press the switch button above to go back to the exchange.',
    walletReceiveCopiedDesktop: "Address copied. The exchange is now open next to your wallet — let's paste the address there.",
    addressMismatch: "That address doesn't match your hardware wallet's. One wrong character sends your Bitcoin elsewhere — go back and copy it again.",
    exchangeConfirm: "Review carefully: the address on the exchange must match the one from your device. Once confirmed, the transaction can't be cancelled.",
    exchangeSuccess: "Well done! Your Bitcoin is on its way to your hardware wallet. Let's wrap this up.",
    factoryResetBlocked: "Factory resetting isn't part of this lesson — it would erase your wallet. Let's head back and keep going.",
    switchToWallet: 'Switch to Hardware Wallet',
    switchToExchange: 'Switch to Exchange Wallet',
    knowledgePrompts: [
      'Nice work. Before we wrap up, two quick questions about safely withdrawing Bitcoin.',
      'Good job. One more question about the withdrawal details.',
    ],
    questions: [
      {
        question: 'Why should you verify the receive address on your hardware wallet?',
        options: {
          speed: 'To make the withdrawal process faster',
          match: 'To make sure the address in the exchange matches the address from the device',
          fee: 'To avoid paying the network fee',
        },
        correctLine: 'Exactly. Address verification helps make sure your Bitcoin is going to the wallet you intended.',
      },
      {
        question: 'What is the network fee when you withdraw Bitcoin?',
        options: {
          extra: 'A small charge for processing the transaction, taken from the amount you withdraw',
          balance: 'The amount removed from your hardware wallet balance',
          exchange: 'A fee that replaces the Bitcoin being sent',
        },
        correctLine: 'Right. The network fee pays for processing the transaction and comes out of the amount you withdraw, so you receive slightly less.',
      },
    ],
  },

  // Lesson 3 — Recover hardware wallet (Andy)
  lesson3: {
    intro: [
      "Now let's cover one of the most overlooked skills in self-custody: recovering your wallet if your device is lost, stolen or destroyed.",
      "Your recovery phrase is universal — it works on most hardware wallets. Let's go back to your device and I'll show you how.",
    ],
    handover: 'First, we need a factory reset to wipe the device clean. Go to Settings to start.',
    recoverIntro: [
      'On the next screen, you will be asked to input each word of your recovery phrase.',
      'Lost your copy? This simulation lets you view it, but in real life no one can help you if you lose it. Always keep a paper copy.',
      'To view it, press the button with the paper symbol{icon} below my portrait.',
    ],
    recoverType: 'Type each word, or use Up/Down to pick a letter or suggested word. Press X to backspace.',
    walletMenu: 'Select Settings to reset the device to factory settings.',
    walletSettings: 'A factory reset erases everything — the device will forget your wallet. Only the recovery phrase you wrote down can restore it.',
    walletResetWarn: "Don't worry — as long as you've written down your recovery phrase, your Bitcoin is safe.",
    walletResetConfirm: "Last warning: be completely sure your recovery phrase is written down. I can't stress this enough.",
    walletResetCancelled: "Nothing was erased — your wallet is still on the device. Head back into Settings when you're ready.",
    walletResetDone: 'The device is wiping itself clean. Let it finish and restart.',
    walletBooting: "It's coming back up as a fresh, empty device. One moment.",
    walletWiped: "The device is blank now, just like new out of the box. Let's practice recovering — select Recover wallet.",
    walletRecoverDone: 'Your wallet is restored! Keep your recovery phrase safe and your Bitcoin is never lost — it works on any compatible device.',
    walletRecoverCelebrate: "Great job recovering your wallet! You just did something most Bitcoin owners never practice. Let's wrap this up!",
    walletReceiveBlocked: "Receiving isn't part of this lesson. Stick with Settings so we can reset the device and practise recovering it.",
    walletSendBlocked: "Sending isn't part of this lesson. Stick with Settings so we can reset the device and practise recovering it.",
    words: 'Here are your 12 words: {words}',
    wordsPractice: "Since you skipped Lesson 1, I made a practice recovery phrase for this wallet. Here are your 12 words: {words}",
    wordsMissing: 'I could not find your simulation phrase. You may need to redo Lesson 1 to generate a new wallet.',
    showPhrase: 'Show recovery phrase',
    hidePhrase: 'Hide recovery phrase',
    knowledgePrompts: [
      'Before we wrap up, two quick questions about recovering your wallet.',
      'Nice. One more question about what happens if you lose your device.',
    ],
    questions: [
      {
        question: 'What do you need to restore your wallet after a factory reset?',
        options: {
          phrase: 'Your 12-word recovery phrase',
          pin: 'Just the device PIN',
          support: "A call to the hardware wallet company's support team",
        },
        correctLine: 'Exactly. Your recovery phrase is the only thing that can bring your wallet back, so keep it safe.',
      },
      {
        question: 'If your hardware wallet is lost or broken, what happens to your Bitcoin?',
        options: {
          safe: 'It stays safe on the blockchain, and you can restore it on a new device with your recovery phrase',
          gone: "It's gone forever along with the device",
          company: 'The manufacturer can send it back to you',
        },
        correctLine: 'Right. Your Bitcoin never lived on the device. With your recovery phrase, you can recover it on any compatible device.',
      },
    ],
  },

  // Lesson 4 — Connect to wallet software (Andy hands over to Maria)
  lesson4: {
    andy: [
      "Now let's connect your hardware wallet to a wallet software. Maria is our expert here, so I'll hand you over to her!",
    ],
    maria: [
      "Hi, I'm Maria! I'll help you safely connect your device to a wallet software — a laptop app for viewing your wallet's balance, history and payments.",
      "You already have one installed called Cairn. Let's open it and take a look.",
    ],
    walletWaiting: "Let's wait for it to finish initializing.",
    walletIntro: "Cairn is open, but it has no wallet yet. Since we're setting up your hardware wallet for the first time, click New Wallet.",
    walletName: "Give your wallet a name so you can recognize it later — anything works, like 'Savings'. Then click CREATE WALLET.",
    walletSettings: [
      'This is the Settings tab. Single Signature means one key — the one on your hardware wallet — is all it takes to spend from this wallet.',
      'Native SegWit is the modern address format: addresses start with bc1 and cost less in fees. Both defaults are right for you, so leave them as they are.',
    ],
    deviceArrival: "Under Keystores, Cairn asks where this wallet's keys come from. Ours live on the hardware wallet, so let's plug it in.",
    connectDevice: 'Your hardware wallet is plugged in. Click CONNECT HARDWARE WALLET under Keystores to send the pairing request.',
    devicePrompt: 'Now confirm the pairing request on your hardware wallet by pressing the checkmark button.',
    keystoreDetails: [
      'Paired! Cairn read three things from your device. The master fingerprint identifies your hardware wallet, and the derivation path tells Cairn where your addresses live.',
      'The xpub lets Cairn see your balance and create addresses — but it can never spend. Your private keys never leave the device.',
    ],
    openTransactions: "Now let's find the Bitcoin you withdrew from the exchange earlier. Click the Transactions tab.",
    connected: 'There it is — the 0.04998 BTC you withdrew from the exchange earlier. This tab shows your balance and every payment you send or receive.',
    switchToSoftware: 'Switch to wallet software',
    switchToDevice: 'Switch to hardware wallet',
    knowledgePrompts: [
      'Nice work. Before we wrap up, two quick questions about connecting your wallet.',
      'Good job. One more question about where your keys live.',
    ],
    questions: [
      {
        question: 'What can the wallet software do with your xpub?',
        options: {
          view: 'See your balance and create receive addresses',
          spend: 'Spend your Bitcoin without the hardware wallet',
          recover: 'Restore your wallet, just like a recovery phrase',
        },
        correctLine: 'Exactly. The xpub lets the software watch your wallet and create addresses, but it can never spend. Spending still needs your hardware wallet.',
      },
      {
        question: 'Once your hardware wallet is connected to the wallet software, where are your private keys?',
        options: {
          device: 'Still on the hardware wallet',
          laptop: 'Copied onto the laptop',
          cloud: "Uploaded to the wallet software's servers",
        },
        correctLine: 'Right. Your private keys never leave the device. The software only ever receives public information.',
      },
    ],
  },

  // Lesson 5 — Receiving Bitcoin (Maria)
  lesson5: {
    intro: [
      "Let's walk through receiving Bitcoin with your hardware wallet. Remember: your Bitcoin lives on the blockchain, not inside the device.",
      "Your hardware wallet's main job is just to hold your private keys so you can safely access and control those funds.",
    ],
    goReceive: "First, open the Receive tab in Cairn — that's where you'll get your receive address.",
    verifyRule: "This is your receive address. Before copying it, let's prove it really came from your device — press 'Verify address on device' below it.",
    compareCheck: 'Your device now shows the address. If it matches the one in the wallet software, press the checkmark button on the device.',
    copyNow: "Verified — the address genuinely came from your device. Now press 'Copy address' to copy it.",
    copyTooEarly: 'Not yet — verify it on your device first. Malware can swap a copied address, so only copy once it checks out.',
    verifyReject: "Good instinct — if they didn't match, you'd press X to reject it and never use that address. These match, so press the checkmark.",
    handOver: 'Now paste the address and send it to me so I can send you some Bitcoin. For privacy, use a fresh receive address for every payment.',
    warn: "That doesn't match the address your device verified. Copy it again from the wallet and send it to me.",
    openTx: 'Open the Transactions tab in your wallet to watch for it.',
    waiting: 'It should show up in a few seconds. Real payments take about 10 minutes to confirm.',
    finished: "And there it is — 0.1 BTC received! Share an address, verify it on your device, and watch the payment arrive. Lesson complete.",
    sending: [
      "Got it! I'm sending you 0.1 BTC now — it's on its way.",
    ],
    chatPlaceholder: 'Paste the receive address…',
    pasteFallback: 'Paste here with Ctrl+V or ⌘V…',
    chatAria: 'Paste the receive address',
    pasteAria: 'Paste from clipboard',
    sendAria: 'Send address to Maria',
    knowledgePrompts: [
      'Nice work. Before we wrap up, two quick questions about receiving Bitcoin.',
      "Good job. One more question about what's safe to share.",
    ],
    questions: [
      {
        question: 'Why verify the receive address on your hardware wallet before sharing it?',
        options: {
          match: "To confirm the address really came from your device and wasn't swapped",
          faster: 'To make the payment arrive faster',
          fee: 'To lower the network fee',
        },
        correctLine: "Exactly. Malware on a computer can swap an address. Checking it on your device's screen catches that.",
      },
      {
        question: 'To receive Bitcoin from someone, what do you give them?',
        options: {
          address: 'Your receive address',
          phrase: 'Your 12-word recovery phrase',
          pin: 'Your device PIN',
        },
        correctLine: 'Right. A receive address is safe to share. Never give anyone your recovery phrase.',
      },
    ],
  },

  // Lesson 6 — Sending Bitcoin (Maria)
  lesson6: {
    intro: [
      "Let's send Bitcoin from your hardware wallet. The wallet software prepares the transaction, and your hardware wallet signs and approves it.",
      "I'll give you my receive address so you can send me {amount} BTC. Let me show you how!",
    ],
    openSend: 'Open the Send tab in the wallet software to get started.',
    enterAddress: "In the Pay to field, paste the recipient's address. Here's mine below — copy it and paste it there.",
    addressWrong: "That address doesn't look right. One wrong character sends your Bitcoin to someone else permanently. Paste my exact address from below.",
    enterLabel: "It's good practice to label transactions so you remember what they were for. Type a label in the Label field.",
    enterAmount: 'Now in the Amount field, enter {amount} BTC.',
    explainFees: 'Before sending, choose a transaction fee, also called a miner fee. It pays the network to process your payment — a higher fee confirms faster, but costs more.',
    selectFee: "Choose the Medium fee option, then click 'Review transaction' to build the payment.",
    reviewTx: 'Check the recipient, amount and fee carefully. If everything matches, send the transaction to your hardware wallet for its own review.',
    hardwareReview: 'Now check each detail on the hardware wallet screen. Press the checkmark to step through the recipient, amount and fee, then confirm the payment.',
    txSent: 'Approved and broadcast! Open the Transactions tab to see your payment.',
    maxNudge: 'MAX fills in your whole balance minus the fee — handy for emptying a wallet. I only need {amount} BTC, so type that instead.',
    sendReject: "Good instinct — if anything looked wrong, X would cancel it and nothing would be sent. Everything checks out, so press the checkmark.",
    finished: "There it is. Remember the habit: check the address, amount and fee on your hardware wallet's screen before you approve.",
    copyAddressAria: "Copy Maria's address",
    knowledgePrompts: [
      'Before we wrap up, two quick questions about sending Bitcoin.',
      'Good job. One more question about approving a payment.',
    ],
    questions: [
      {
        question: 'What does choosing a higher fee usually do?',
        options: {
          faster: 'Helps your transaction confirm faster, but costs more',
          more: 'Sends more Bitcoin to the recipient',
          refund: 'Lets you cancel the payment later',
        },
        correctLine: 'Exactly. A higher fee rate gets miners to include your payment sooner. The recipient still receives the same amount.',
      },
      {
        question: "Why approve the payment on your hardware wallet's screen?",
        options: {
          verify: 'To check the real recipient, amount and fee before signing',
          backup: 'To back up the transaction to the device',
          speed: 'To make the transaction broadcast faster',
        },
        correctLine: "Right. The hardware wallet's screen is the one you can trust. If the details there don't match, don't confirm.",
      },
    ],
  },
} as const;

type Widen<T> = T extends string ? string : { readonly [K in keyof T]: Widen<T[K]> };

/** The shape every locale must provide: same keys and list lengths as English, any text. */
export type Dictionary = Widen<typeof en>;

export default en as Dictionary;
