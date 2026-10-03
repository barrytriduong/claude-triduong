// English / Vietnamese text for the whole site.
// Add a language by copying the `en` block. "a|b" picks singular/plural by {n}.

const en = {
  // Toolbar
  settings: "Settings", backup: "Backup", signOut: "Sign out", edit: "Edit", done: "Done",
  bulkBtn: "Many photos", langToggle: "Tiếng Việt",
  // Gate & sign-in
  gateTitle: "A little private place",
  gateText: "These memories are just for family. Please sign in to see them.",
  gateSignIn: "💕 Sign in", gateOther: "Use a different account",
  gateNoAccess: "You're signed in as {email}, but this account hasn't been given access yet. Ask the parents to add you.",
  gateSetup: "Almost there! The database setup needs updating: run the latest supabase/setup.sql in the Supabase SQL Editor.",
  loginTitle: "Welcome, family 💕", loginText: "Sign in with the email and password you were given.",
  email: "Email", password: "Password", signIn: "Sign in",
  wrongLogin: "That email or password isn't right.",
  welcomeAdmin: "Welcome back! Tap Edit to add memories ✏️", welcomeFamily: "Welcome! 💕", signedOut: "Signed out 👋",
  // Hero
  defaultName: "Our Little Star", defaultTagline: "Every little moment, kept forever",
  heroNow: "Now {age}", heroBirthday: "Today is her {age}", scrollDown: "scroll down",
  localBadge: "💻 saved in this browser only", pageTitle: "{name}'s Timeline",
  footerA: "made with", footerB: "for you",
  // Tabs
  tabTimeline: "🌈 Timeline", tabGrowth: "📏 Growth", tabLetters: "💌 Letters",
  // Timeline
  memoryCount: "{n} memory|{n} memories", filterAll: "All",
  onThisDay: "On this day", yearsAgo: "{n} year ago|{n} years ago",
  emptyTitle: "No memories yet", emptyText: "Tap Edit at the top, then Add a memory to start the story.",
  emptyFiltered: "No memories with this tag yet.", sampleBtn: "✨ Load a few sample memories",
  addMemory: "Add a memory", editCard: "✏️ Edit", ageShort: "age {n}", jumpTo: "Jump to",
  sampleAdded: "Sample memories added — edit or delete them anytime",
  // Ages
  ageWeeksBefore: "{n} week before you arrived|{n} weeks before you arrived",
  ageBeforeBirth: "Before you were born", ageBirthDay: "The day you were born 💕",
  ageDays: "{n} day old|{n} days old", ageWeeks: "{n} week old|{n} weeks old",
  ageMonths: "{n} month old|{n} months old", ageYears: "{n} year old|{n} years old",
  yearsN: "{n} year|{n} years", monthsN: "{n} month|{n} months", ageYM: "{years}, {months} old",
  ageBirthday: "{nth} birthday 🎂",
  // Hearts & comments
  commentPh: "Write something sweet…", send: "Send", deleteComment: "Delete",
  lovedBy: "Loved by {names}", heart: "Send a heart", comments: "Comments",
  confirmDeleteComment: "Delete this comment?",
  nameTitle: "What should we call you?", nameHint: "Shown next to your hearts, comments and letters, e.g. Grandma Lan.",
  nameLabel: "Your name",
  // Common
  save: "Save", cancel: "Cancel", close: "Close", saved: "Saved 💾",
  // Memory editor
  newMemory: "New memory", editMemory: "Edit memory", fTitle: "Title", fTitlePh: "First steps!",
  fEmoji: "Emoji", fDate: "Date", fColor: "Color", fStory: "The story",
  fStoryPh: "What happened, how it felt, the funny little details…",
  fTags: "Tags", fTagCustomPh: "Add your own tag + Enter",
  fMedia: "Photos & videos", addMedia: "📷 Add photos / videos",
  linkPh: "…or paste a YouTube / Vimeo / video link", addLink: "Add link",
  deleteBtn: "🗑️ Delete", saveMemory: "Save memory", saving: "Saving…",
  mediaNew: "new", mediaLink: "link", mediaVideoLink: "Video link", moveEarlier: "Move earlier", remove: "Remove",
  memoryAdded: "Memory added 🎉", memoryUpdated: "Memory updated ✨", memoryDeleted: "Memory deleted",
  confirmDeleteMemory: "Delete this memory and its photos/videos? This can't be undone.",
  videoTooBig: "\"{name}\" is over {mb} MB — upload it to YouTube (unlisted) and paste the link instead.",
  notALink: "That doesn't look like a link 🤔",
  // Tags
  tag_celebrate: "🎆 Celebration", tag_firsts: "🌟 Firsts", tag_birthday: "🎂 Birthdays", tag_trip: "✈️ Trips", tag_funny: "😂 Funny",
  tag_family: "👨‍👩‍👧 Family", tag_health: "🩺 Health", tag_school: "🎒 School", tag_holiday: "🎉 Holidays",
  // Settings
  aboutHer: "About her", sName: "Name", sBirthday: "Birthday", sTagline: "Tagline",
  sNewestFirst: "Show newest memories first",
  // Backup
  backupTitle: "Backup",
  backupLocalText: "Memories are saved in this browser only. Download a backup file regularly.",
  backupCloudText: "Download a .zip with every memory, photo, video, letter, comment and growth record — keep it somewhere safe.",
  downloadBackup: "⬇️ Download backup", restoreBackup: "⬆️ Restore from backup",
  restored: "Backup restored 🎉", badBackup: "Could not read that backup file",
  backupPreparing: "Preparing backup… {done}/{total} files", backupDone: "Backup downloaded 🎉",
  // Notify
  notifyTitle: "Let the family know? 💌",
  notifyText: "This opens your email app with a short message to everyone in the family. You can change it before sending.",
  notifyBtn: "📧 Email the family", notifySkip: "Not now",
  notifySubject: "New memory: {title}",
  notifyBody: "Hi!\n\nI just added a new memory to {name}'s timeline: \"{title}\" ({date}).\n\nTake a look: {url}\n\n💕",
  notifyBodyMany: "Hi!\n\nI just added {n} new memories to {name}'s timeline.\n\nTake a look: {url}\n\n💕",
  notifySubjectMany: "{n} new memories",
  // Growth
  growthTitle: "Growing up", addMeasurement: "＋ Add measurement", height: "Height", weight: "Weight",
  measuredOn: "on {date}", growthEmpty: "No measurements yet.",
  growthEmptyAdmin: "Add her height and weight from time to time to watch her grow.",
  mHeight: "Height (cm)", mWeight: "Weight (kg)", mNote: "Note", mNotePh: "e.g. 12-month check-up",
  newMeasurement: "New measurement", editMeasurement: "Edit measurement",
  needOneValue: "Enter a height or a weight.", colDate: "Date", colAge: "Age",
  allMeasurements: "All measurements", confirmDeleteMeasurement: "Delete this measurement?",
  sinceLast: "{delta} since last time", axisBirth: "birth", axisMonths: "{n} mo", axisYears: "{n} y",
  // Letters
  lettersTitle: "Letters to her",
  lettersIntro: "Write something for her to read when she's older. Seal a letter until a date and nobody can open it before then.",
  writeLetter: "✍️ Write a letter", lettersEmpty: "No letters yet. Be the first to write one!",
  letterFrom: "From {name}", writtenOn: "written {date}", sealedUntil: "🔒 Sealed until {date}",
  sealedOwn: "Only you can read this until then.", openedOn: "💌 Opened {date}",
  newLetter: "New letter", editLetter: "Edit letter", lTitlePh: "For your 18th birthday",
  lBody: "Your letter", lBodyPh: "Dear little one…", lFrom: "From",
  lUnlock: "Keep sealed until (optional)", lUnlockHint: "Leave empty to let everyone read it now.",
  saveLetter: "💌 Save letter", letterSaved: "Letter saved 💌", letterDeleted: "Letter deleted",
  confirmDeleteLetter: "Delete this letter? This can't be undone.",
  // Bulk upload
  bulkTitle: "Add many photos",
  bulkIntro: "Pick photos and videos from your phone or computer. They're dated from when they were taken.",
  bulkPick: "📷 Choose photos & videos", bulkPerDay: "One memory per day", bulkPerPhoto: "One memory per photo",
  bulkDefaultTitle: "Photos from {date}", bulkSave: "Add {n} memory|Add {n} memories",
  bulkProgress: "Uploading {done}/{total}…", bulkDone: "{n} memory added 🎉|{n} memories added 🎉",
  bulkFiles: "{n} file|{n} files", bulkReading: "Reading photo dates…",
  // v3: sharing, review, drafts
  shareBtn: "Share a memory", shareTitle: "Share a memory 📷", shareSend: "📬 Send for approval",
  shareSent: "Sent! The parents will take a look soon 💕",
  reviewBtn: "{n} to review", filterPending: "To review", filterDrafts: "Drafts",
  draftBadge: "📝 Draft — only admins can see this", pendingBadge: "⏳ Waiting for the parents to approve",
  pendingFrom: "📬 Shared by {name} — waiting for your approval",
  publishBtn: "Publish", approveBtn: "✅ Approve", rejectBtn: "Reject",
  published: "Published 🎉", approved: "Approved and published 🎉", rejected: "Removed",
  rejectConfirm: "Reject this memory? It and its photos will be deleted.",
  fVisible: "Visible to family (untick to keep it as a draft)",
  bulkFolder: "📁 Choose a folder", bulkAsDraft: "Save as drafts — publish each one after adding a story",
  bulkSkipped: "{n} video was over {mb} MB and was skipped — use a YouTube or Google Drive link instead|{n} videos were over {mb} MB and were skipped — use YouTube or Google Drive links instead",
  bulkDoneDrafts: "{n} draft added — add a story, then Publish 📝|{n} drafts added — add stories, then Publish 📝",
  // v3: slideshow
  slideshow: "Slideshow", slideTitle: "Slideshow ▶️", slideIntro: "The timeline scrolls by itself. Tap the screen to pause.",
  slideFrom: "From", slideTo: "To", slideSpeed: "Speed", speed_slow: "🐢 Slow", speed_normal: "🚶 Normal", speed_fast: "🐇 Fast",
  slideLoop: "Start again at the end", slideStart: "▶️ Start", slidePlay: "Play", slidePause: "Pause", slideStop: "Stop",
  // v3: family panel & invites
  familyBtn: "Family", familyTitle: "Family & access",
  famInviteTitle: "Invite someone", famInviteHelp: "You get a link to send them (Zalo, Messenger, email…). They open it and choose their own email and password. Links work once and expire after 14 days.",
  famInviteNamePh: "Their name, e.g. Bà Nội", famCreateInvite: "Create invite link",
  famLinkReady: "Invite link for {name} is ready — send it to them:", famCopy: "📋 Copy link", famCopied: "Link copied 📋",
  famShare: "📤 Share", famShareText: "{name}, you're invited to see {site}'s timeline 💕",
  famPending: "Invites not used yet", famExpires: "expires {date}", famRevoke: "Cancel", famRevoked: "Invite cancelled",
  famMembers: "People", famYou: "you", famLastSeen: "last visit {date}", famNeverSeen: "hasn't signed in yet",
  famRole: "Role", role_admin: "👑 Admin (can edit)", role_family: "👀 Family (can view)", role_none: "🚫 No access",
  famResetPw: "Set password", famNewPwPrompt: "New password for {name} (at least 8 characters):",
  famPwShort: "The password must be at least 8 characters.", famPwSet: "Password changed — let them know 🔑",
  famRemove: "Remove", famRemoveConfirm: "Remove {name}? Their account is deleted and they can no longer sign in.", famRemoved: "Removed",
  inviteHello: "Welcome, {name}! 💕", inviteIntro: "Create your login to see the family timeline.",
  newPassword: "Choose a password (8+ characters)", newPassword2: "Type the password again", inviteJoin: "Join 🎉",
  pwMismatch: "The two passwords don't match.", inviteInvalid: "This invite link is invalid, expired or already used. Ask the parents for a new one.",
  inviteCheckEmail: "Almost done! Check your email and click the confirmation link, then sign in.",
  inviteAlreadyRegistered: "This email already has an account — sign in instead, or use another email.",
  // v4: tags, dates, profile, music, cursor, create logins
  deleteTag: "Delete this tag", deleteTagConfirm: "Delete the tag “{tag}”? It will be removed from {n} memories.", tagDeleted: "Tag deleted",
  changeDate: "Change the date", dateChanged: "Date changed to {date} 📅",
  usePhotoDate: "📷 Use the photo's date: {date}",
  bulkDateUnsure: "⚠️ Couldn't find when these were taken — please check the date (or choose one memory per photo).",
  editProfile: "✏️ Edit photo & name", choosePhoto: "📷 Choose her photo", removePhoto: "Remove photo", decoration: "Decoration",
  frame_none: "None", frame_bow: "🎀 Bow", frame_crown: "👑 Crown", frame_flowers: "🌸 Flowers", frame_stars: "✨ Stars", frame_hearts: "💕 Hearts", frame_bunny: "🐰 Bunny",
  cropTitle: "Fit the photo", cropHint: "Drag the photo to move it, and use the slider to zoom.", cropZoom: "Zoom", useThisPhoto: "Use this photo",
  sCuteCursor: "Cute pointer with sparkles (on computers)",
  slideMusic: "🎵 Play music during the slideshow",
  song_firstLight: "🌅 First Light", song_canon: "🕊️ Canon for You", song_littleHands: "🤲 Little Hands",
  song_sleep: "🌙 Watching You Sleep", song_timeFlies: "⏳ Time Flies",
  backToTop: "Back to the beginning",
  musicTitle: "🎵 Music", musicPlay: "Play", musicPause: "Pause", musicOn: "Play music", musicOff: "Music playing — tap for options",
  musicVolume: "Volume", musicUpload: "＋ Upload a song", musicUploadHint: "MP3 or M4A, up to 15 MB. Everyone in the family can play it.",
  musicTooBig: "That song is over 15 MB — please choose a smaller file.", musicRemoveConfirm: "Remove the song “{name}”?",
  musicError: "Couldn't play that song.",
  famCreateTitle: "Create a login yourself", famCreateHelp: "Type their email and a password; the account works right away. Then send them the message below.",
  famPwPh: "Password (8+ characters)", famPwSuggest: "Suggest an easy password", famCreateBtn: "Create login",
  famCreated: "✅ Login for {name} is ready. Send them this:", famCreatedConfirm: "✅ Login for {name} created. They must first click the confirmation email Supabase sent them. Then send them this:",
  famCopyMessage: "📋 Copy message",
  famLoginMessage: "Hi {name}! 💕\nYou can now see our family timeline.\n\nWebsite: {site}\nEmail: {email}\nPassword: {password}",
  famEmailTaken: "That email already has an account. Use “Set password” on them below instead.",
  famSignupsOff: "Supabase is blocking new accounts. In Supabase → Authentication → Sign In / Providers, turn on “Allow new users to sign up”.",
};

const vi = {
  settings: "Cài đặt", backup: "Sao lưu", signOut: "Đăng xuất", edit: "Chỉnh sửa", done: "Xong",
  bulkBtn: "Nhiều ảnh", langToggle: "English",
  gateTitle: "Góc nhỏ riêng tư",
  gateText: "Những kỷ niệm này chỉ dành cho gia đình. Vui lòng đăng nhập để xem nhé.",
  gateSignIn: "💕 Đăng nhập", gateOther: "Dùng tài khoản khác",
  gateNoAccess: "Bạn đang đăng nhập bằng {email}, nhưng tài khoản này chưa được cấp quyền xem. Hãy nhờ bố mẹ bé thêm bạn vào nhé.",
  gateSetup: "Sắp xong rồi! Cần cập nhật cơ sở dữ liệu: hãy chạy file supabase/setup.sql mới nhất trong Supabase SQL Editor.",
  loginTitle: "Chào mừng cả nhà 💕", loginText: "Đăng nhập bằng email và mật khẩu đã được gửi cho bạn.",
  email: "Email", password: "Mật khẩu", signIn: "Đăng nhập",
  wrongLogin: "Email hoặc mật khẩu chưa đúng.",
  welcomeAdmin: "Chào mừng trở lại! Bấm Chỉnh sửa để thêm kỷ niệm ✏️", welcomeFamily: "Chào mừng bạn! 💕", signedOut: "Đã đăng xuất 👋",
  defaultName: "Ngôi sao nhỏ", defaultTagline: "Mỗi khoảnh khắc nhỏ, giữ mãi bên nhau",
  heroNow: "Bây giờ: {age}", heroBirthday: "Hôm nay là {age}", scrollDown: "cuộn xuống",
  localBadge: "💻 chỉ lưu trên trình duyệt này", pageTitle: "Hành trình của {name}",
  footerA: "làm bằng cả", footerB: "dành cho con",
  tabTimeline: "🌈 Hành trình", tabGrowth: "📏 Lớn khôn", tabLetters: "💌 Thư gửi con",
  memoryCount: "{n} kỷ niệm", filterAll: "Tất cả",
  onThisDay: "Ngày này năm xưa", yearsAgo: "{n} năm trước",
  emptyTitle: "Chưa có kỷ niệm nào", emptyText: "Bấm Chỉnh sửa ở trên, rồi Thêm kỷ niệm để bắt đầu câu chuyện.",
  emptyFiltered: "Chưa có kỷ niệm nào với nhãn này.", sampleBtn: "✨ Thêm vài kỷ niệm mẫu",
  addMemory: "Thêm kỷ niệm", editCard: "✏️ Sửa", ageShort: "{n} tuổi", jumpTo: "Đi tới",
  sampleAdded: "Đã thêm kỷ niệm mẫu — bạn có thể sửa hoặc xoá bất cứ lúc nào",
  ageWeeksBefore: "{n} tuần trước khi con chào đời",
  ageBeforeBirth: "Trước khi con chào đời", ageBirthDay: "Ngày con chào đời 💕",
  ageDays: "{n} ngày tuổi", ageWeeks: "{n} tuần tuổi", ageMonths: "{n} tháng tuổi", ageYears: "{n} tuổi",
  yearsN: "{n} tuổi", monthsN: "{n} tháng", ageYM: "{years} {months}",
  ageBirthday: "Sinh nhật lần thứ {n} 🎂",
  commentPh: "Viết đôi lời yêu thương…", send: "Gửi", deleteComment: "Xoá",
  lovedBy: "{names} đã thả tim", heart: "Thả tim", comments: "Bình luận",
  confirmDeleteComment: "Xoá bình luận này?",
  nameTitle: "Mọi người nên gọi bạn là gì?", nameHint: "Tên này hiện bên cạnh tim, bình luận và thư của bạn, ví dụ: Bà nội Lan.",
  nameLabel: "Tên của bạn",
  save: "Lưu", cancel: "Huỷ", close: "Đóng", saved: "Đã lưu 💾",
  newMemory: "Kỷ niệm mới", editMemory: "Sửa kỷ niệm", fTitle: "Tiêu đề", fTitlePh: "Những bước đi đầu tiên!",
  fEmoji: "Biểu tượng", fDate: "Ngày", fColor: "Màu", fStory: "Câu chuyện",
  fStoryPh: "Chuyện gì đã xảy ra, cảm xúc lúc đó, những chi tiết đáng yêu…",
  fTags: "Nhãn", fTagCustomPh: "Thêm nhãn riêng + Enter",
  fMedia: "Ảnh & video", addMedia: "📷 Thêm ảnh / video",
  linkPh: "…hoặc dán link YouTube / Vimeo / video", addLink: "Thêm link",
  deleteBtn: "🗑️ Xoá", saveMemory: "Lưu kỷ niệm", saving: "Đang lưu…",
  mediaNew: "mới", mediaLink: "link", mediaVideoLink: "Link video", moveEarlier: "Đưa lên trước", remove: "Bỏ",
  memoryAdded: "Đã thêm kỷ niệm 🎉", memoryUpdated: "Đã cập nhật kỷ niệm ✨", memoryDeleted: "Đã xoá kỷ niệm",
  confirmDeleteMemory: "Xoá kỷ niệm này cùng ảnh/video của nó? Không thể hoàn tác.",
  videoTooBig: "\"{name}\" lớn hơn {mb} MB — hãy tải lên YouTube (chế độ không công khai) rồi dán link vào nhé.",
  notALink: "Link này có vẻ chưa đúng 🤔",
  tag_celebrate: "🎆 Ăn mừng", tag_firsts: "🌟 Lần đầu", tag_birthday: "🎂 Sinh nhật", tag_trip: "✈️ Du lịch", tag_funny: "😂 Hài hước",
  tag_family: "👨‍👩‍👧 Gia đình", tag_health: "🩺 Sức khỏe", tag_school: "🎒 Đi học", tag_holiday: "🎉 Lễ Tết",
  aboutHer: "Về bé", sName: "Tên", sBirthday: "Ngày sinh", sTagline: "Lời tựa",
  sNewestFirst: "Hiện kỷ niệm mới nhất trước",
  backupTitle: "Sao lưu",
  backupLocalText: "Kỷ niệm chỉ được lưu trên trình duyệt này. Hãy tải bản sao lưu thường xuyên nhé.",
  backupCloudText: "Tải về một file .zip chứa mọi kỷ niệm, ảnh, video, thư, bình luận và số đo — hãy cất ở nơi an toàn.",
  downloadBackup: "⬇️ Tải bản sao lưu", restoreBackup: "⬆️ Khôi phục từ bản sao lưu",
  restored: "Đã khôi phục 🎉", badBackup: "Không đọc được file sao lưu này",
  backupPreparing: "Đang chuẩn bị… {done}/{total} tệp", backupDone: "Đã tải bản sao lưu 🎉",
  notifyTitle: "Báo cho cả nhà biết nhé? 💌",
  notifyText: "Ứng dụng email của bạn sẽ mở ra với lời nhắn ngắn gửi tới mọi người trong gia đình. Bạn có thể sửa trước khi gửi.",
  notifyBtn: "📧 Gửi email cho cả nhà", notifySkip: "Để sau",
  notifySubject: "Kỷ niệm mới: {title}",
  notifyBody: "Chào cả nhà!\n\nMình vừa thêm một kỷ niệm mới vào hành trình của {name}: \"{title}\" ({date}).\n\nVào xem nhé: {url}\n\n💕",
  notifyBodyMany: "Chào cả nhà!\n\nMình vừa thêm {n} kỷ niệm mới vào hành trình của {name}.\n\nVào xem nhé: {url}\n\n💕",
  notifySubjectMany: "{n} kỷ niệm mới",
  growthTitle: "Con lớn từng ngày", addMeasurement: "＋ Thêm số đo", height: "Chiều cao", weight: "Cân nặng",
  measuredOn: "ngày {date}", growthEmpty: "Chưa có số đo nào.",
  growthEmptyAdmin: "Thỉnh thoảng hãy thêm chiều cao và cân nặng của bé để xem con lớn lên nhé.",
  mHeight: "Chiều cao (cm)", mWeight: "Cân nặng (kg)", mNote: "Ghi chú", mNotePh: "ví dụ: khám định kỳ 12 tháng",
  newMeasurement: "Số đo mới", editMeasurement: "Sửa số đo",
  needOneValue: "Hãy nhập chiều cao hoặc cân nặng.", colDate: "Ngày", colAge: "Tuổi",
  allMeasurements: "Tất cả số đo", confirmDeleteMeasurement: "Xoá số đo này?",
  sinceLast: "{delta} so với lần trước", axisBirth: "sơ sinh", axisMonths: "{n} tháng", axisYears: "{n} tuổi",
  lettersTitle: "Thư gửi con",
  lettersIntro: "Viết đôi dòng để con đọc khi lớn. Niêm phong thư đến một ngày, và không ai mở được trước ngày đó.",
  writeLetter: "✍️ Viết thư", lettersEmpty: "Chưa có lá thư nào. Hãy là người viết đầu tiên nhé!",
  letterFrom: "Từ {name}", writtenOn: "viết ngày {date}", sealedUntil: "🔒 Niêm phong đến {date}",
  sealedOwn: "Chỉ bạn đọc được cho đến ngày đó.", openedOn: "💌 Mở ngày {date}",
  newLetter: "Thư mới", editLetter: "Sửa thư", lTitlePh: "Gửi con tuổi 18",
  lBody: "Nội dung thư", lBodyPh: "Con yêu…", lFrom: "Người viết",
  lUnlock: "Niêm phong đến ngày (không bắt buộc)", lUnlockHint: "Để trống nếu muốn mọi người đọc ngay.",
  saveLetter: "💌 Lưu thư", letterSaved: "Đã lưu thư 💌", letterDeleted: "Đã xoá thư",
  confirmDeleteLetter: "Xoá lá thư này? Không thể hoàn tác.",
  bulkTitle: "Thêm nhiều ảnh",
  bulkIntro: "Chọn ảnh và video từ điện thoại hoặc máy tính. Ngày được lấy theo lúc chụp.",
  bulkPick: "📷 Chọn ảnh & video", bulkPerDay: "Mỗi ngày một kỷ niệm", bulkPerPhoto: "Mỗi ảnh một kỷ niệm",
  bulkDefaultTitle: "Ảnh ngày {date}", bulkSave: "Thêm {n} kỷ niệm",
  bulkProgress: "Đang tải lên {done}/{total}…", bulkDone: "Đã thêm {n} kỷ niệm 🎉",
  bulkFiles: "{n} tệp", bulkReading: "Đang đọc ngày chụp…",
  shareBtn: "Chia sẻ kỷ niệm", shareTitle: "Chia sẻ kỷ niệm 📷", shareSend: "📬 Gửi để duyệt",
  shareSent: "Đã gửi! Bố mẹ bé sẽ xem sớm thôi 💕",
  reviewBtn: "{n} chờ duyệt", filterPending: "Chờ duyệt", filterDrafts: "Bản nháp",
  draftBadge: "📝 Bản nháp — chỉ quản trị viên thấy", pendingBadge: "⏳ Đang chờ bố mẹ bé duyệt",
  pendingFrom: "📬 {name} đã chia sẻ — đang chờ bạn duyệt",
  publishBtn: "Đăng", approveBtn: "✅ Duyệt", rejectBtn: "Từ chối",
  published: "Đã đăng 🎉", approved: "Đã duyệt và đăng 🎉", rejected: "Đã xoá",
  rejectConfirm: "Từ chối kỷ niệm này? Kỷ niệm và ảnh sẽ bị xoá.",
  fVisible: "Hiện cho gia đình (bỏ chọn để lưu nháp)",
  bulkFolder: "📁 Chọn cả thư mục", bulkAsDraft: "Lưu thành bản nháp — viết câu chuyện rồi mới đăng",
  bulkSkipped: "{n} video lớn hơn {mb} MB đã bị bỏ qua — hãy dùng link YouTube hoặc Google Drive",
  bulkDoneDrafts: "Đã thêm {n} bản nháp — viết câu chuyện rồi bấm Đăng 📝",
  slideshow: "Trình chiếu", slideTitle: "Trình chiếu ▶️", slideIntro: "Hành trình sẽ tự cuộn. Chạm vào màn hình để tạm dừng.",
  slideFrom: "Từ ngày", slideTo: "Đến ngày", slideSpeed: "Tốc độ", speed_slow: "🐢 Chậm", speed_normal: "🚶 Vừa", speed_fast: "🐇 Nhanh",
  slideLoop: "Chạy lại từ đầu khi hết", slideStart: "▶️ Bắt đầu", slidePlay: "Tiếp tục", slidePause: "Tạm dừng", slideStop: "Dừng",
  familyBtn: "Gia đình", familyTitle: "Gia đình & quyền truy cập",
  famInviteTitle: "Mời người thân", famInviteHelp: "Bạn sẽ có một đường link để gửi (Zalo, Messenger, email…). Người nhận mở link và tự chọn email, mật khẩu. Mỗi link dùng một lần và hết hạn sau 14 ngày.",
  famInviteNamePh: "Tên người được mời, ví dụ: Bà Nội", famCreateInvite: "Tạo link mời",
  famLinkReady: "Link mời cho {name} đã sẵn sàng — hãy gửi cho họ:", famCopy: "📋 Sao chép link", famCopied: "Đã sao chép link 📋",
  famShare: "📤 Chia sẻ", famShareText: "{name} ơi, mời bạn xem hành trình của {site} 💕",
  famPending: "Link mời chưa dùng", famExpires: "hết hạn {date}", famRevoke: "Huỷ", famRevoked: "Đã huỷ link mời",
  famMembers: "Thành viên", famYou: "bạn", famLastSeen: "vào lần cuối {date}", famNeverSeen: "chưa đăng nhập lần nào",
  famRole: "Vai trò", role_admin: "👑 Quản trị (được sửa)", role_family: "👀 Gia đình (chỉ xem)", role_none: "🚫 Không có quyền",
  famResetPw: "Đặt mật khẩu", famNewPwPrompt: "Mật khẩu mới cho {name} (ít nhất 8 ký tự):",
  famPwShort: "Mật khẩu cần ít nhất 8 ký tự.", famPwSet: "Đã đổi mật khẩu — hãy báo cho họ nhé 🔑",
  famRemove: "Xoá", famRemoveConfirm: "Xoá {name}? Tài khoản sẽ bị xoá và không đăng nhập được nữa.", famRemoved: "Đã xoá",
  inviteHello: "Chào mừng {name}! 💕", inviteIntro: "Tạo tài khoản để xem hành trình của bé.",
  newPassword: "Chọn mật khẩu (từ 8 ký tự)", newPassword2: "Nhập lại mật khẩu", inviteJoin: "Tham gia 🎉",
  pwMismatch: "Hai mật khẩu chưa khớp.", inviteInvalid: "Link mời không hợp lệ, đã hết hạn hoặc đã được dùng. Hãy xin bố mẹ bé link mới nhé.",
  inviteCheckEmail: "Sắp xong! Hãy mở email và bấm vào link xác nhận, rồi đăng nhập.",
  inviteAlreadyRegistered: "Email này đã có tài khoản — hãy đăng nhập, hoặc dùng email khác.",
  deleteTag: "Xoá nhãn này", deleteTagConfirm: "Xoá nhãn “{tag}”? Nhãn sẽ được gỡ khỏi {n} kỷ niệm.", tagDeleted: "Đã xoá nhãn",
  changeDate: "Đổi ngày", dateChanged: "Đã đổi ngày thành {date} 📅",
  usePhotoDate: "📷 Dùng ngày chụp ảnh: {date}",
  bulkDateUnsure: "⚠️ Không tìm thấy ngày chụp — hãy kiểm tra lại ngày (hoặc chọn mỗi ảnh một kỷ niệm).",
  editProfile: "✏️ Sửa ảnh & tên", choosePhoto: "📷 Chọn ảnh của bé", removePhoto: "Bỏ ảnh", decoration: "Trang trí",
  frame_none: "Không", frame_bow: "🎀 Nơ", frame_crown: "👑 Vương miện", frame_flowers: "🌸 Hoa", frame_stars: "✨ Sao", frame_hearts: "💕 Tim", frame_bunny: "🐰 Thỏ",
  cropTitle: "Căn chỉnh ảnh", cropHint: "Kéo ảnh để di chuyển, dùng thanh trượt để phóng to.", cropZoom: "Phóng to", useThisPhoto: "Dùng ảnh này",
  sCuteCursor: "Con trỏ chuột dễ thương lấp lánh (trên máy tính)",
  slideMusic: "🎵 Phát nhạc khi trình chiếu",
  song_firstLight: "🌅 Nắng mai", song_canon: "🕊️ Canon cho con", song_littleHands: "🤲 Bàn tay bé nhỏ",
  song_sleep: "🌙 Ngắm con ngủ", song_timeFlies: "⏳ Thời gian trôi",
  backToTop: "Về đầu trang",
  musicTitle: "🎵 Nhạc", musicPlay: "Phát", musicPause: "Tạm dừng", musicOn: "Phát nhạc", musicOff: "Đang phát nhạc — chạm để chọn",
  musicVolume: "Âm lượng", musicUpload: "＋ Tải bài hát lên", musicUploadHint: "MP3 hoặc M4A, tối đa 15 MB. Cả nhà đều nghe được.",
  musicTooBig: "Bài hát lớn hơn 15 MB — hãy chọn file nhỏ hơn.", musicRemoveConfirm: "Xoá bài hát “{name}”?",
  musicError: "Không phát được bài hát này.",
  famCreateTitle: "Tự tạo tài khoản", famCreateHelp: "Nhập email và mật khẩu; tài khoản dùng được ngay. Rồi gửi cho họ lời nhắn bên dưới.",
  famPwPh: "Mật khẩu (từ 8 ký tự)", famPwSuggest: "Gợi ý mật khẩu dễ nhớ", famCreateBtn: "Tạo tài khoản",
  famCreated: "✅ Tài khoản của {name} đã sẵn sàng. Gửi cho họ lời nhắn này:", famCreatedConfirm: "✅ Đã tạo tài khoản cho {name}. Họ cần bấm vào email xác nhận Supabase vừa gửi trước. Rồi gửi cho họ lời nhắn này:",
  famCopyMessage: "📋 Sao chép lời nhắn",
  famLoginMessage: "Chào {name}! 💕\nGiờ bạn đã xem được hành trình của bé.\n\nTrang web: {site}\nEmail: {email}\nMật khẩu: {password}",
  famEmailTaken: "Email này đã có tài khoản. Hãy dùng “Đặt mật khẩu” cho họ ở bên dưới.",
  famSignupsOff: "Supabase đang chặn tạo tài khoản mới. Vào Supabase → Authentication → Sign In / Providers và bật “Allow new users to sign up”.",
};

const DICTS = { en, vi };
const LOCALES = { en: "en-US", vi: "vi-VN" };

function initialLang() {
  try {
    const saved = localStorage.getItem("lang");
    if (saved && DICTS[saved]) return saved;
  } catch { /* storage blocked */ }
  return (navigator.language || "").toLowerCase().startsWith("vi") ? "vi" : "en";
}

export let lang = initialLang();
export const locale = () => LOCALES[lang];

export function setLang(next) {
  lang = DICTS[next] ? next : "en";
  try { localStorage.setItem("lang", lang); } catch { /* ignore */ }
  document.documentElement.lang = lang;
  applyI18n();
}

/** Translate a key. "{x}" placeholders are filled from vars; "one|many" picks by vars.n. */
export function t(key, vars = {}) {
  let str = DICTS[lang][key] ?? en[key] ?? key;
  if (str.includes("|")) str = str.split("|")[vars.n === 1 ? 0 : 1];
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

/** Fill every element marked data-i18n / data-i18n-placeholder / data-i18n-title. */
export function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => { el.title = t(el.dataset.i18nTitle); });
}

// ---------- Dates & ages ----------

const parse = (s) => new Date(`${s}T00:00:00Z`);

export function fmtDate(iso, opts = { year: "numeric", month: "long", day: "numeric" }) {
  return parse(iso).toLocaleDateString(locale(), { ...opts, timeZone: "UTC" });
}

const ordinalEn = (n) => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");

/** Whole months between birthday and date (negative days → null). */
export function ageParts(birthday, dateStr) {
  const b = parse(birthday);
  const d = parse(dateStr);
  const days = Math.round((d - b) / 86400000);
  let months = (d.getUTCFullYear() - b.getUTCFullYear()) * 12 + (d.getUTCMonth() - b.getUTCMonth());
  if (d.getUTCDate() < b.getUTCDate()) months--;
  const isBirthday = days > 0 && d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() === b.getUTCDate();
  return { days, months, isBirthday };
}

export function ageLabel(birthday, dateStr) {
  if (!birthday || !dateStr) return "";
  const { days, months, isBirthday } = ageParts(birthday, dateStr);
  if (days < 0) {
    const weeks = Math.ceil(-days / 7);
    return weeks <= 42 ? t("ageWeeksBefore", { n: weeks }) : t("ageBeforeBirth");
  }
  if (days === 0) return t("ageBirthDay");
  if (months < 1) return days < 14 ? t("ageDays", { n: days }) : t("ageWeeks", { n: Math.floor(days / 7) });
  if (months < 24) return t("ageMonths", { n: months });
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (isBirthday) return t("ageBirthday", { n: years, nth: ordinalEn(years) });
  return rest ? t("ageYM", { years: t("yearsN", { n: years }), months: t("monthsN", { n: rest }) }) : t("ageYears", { n: years });
}
