export const LANGS = {
  en: { code: 'en', native: 'English', uiName: 'English' },
  id: { code: 'id', native: 'Bahasa Indonesia', uiName: 'Indonesia' }
};

const DICT = {
  en: {
    appTitle: 'Turkish Is Easy', version: 'Learn Turkish by building meanings',
    selectProfile: 'Choose learner profile', selectProfileSub: 'Each learner has a separate language, mode, and progress record.',
    profileBella: 'Bella', profileBellaSub: 'English guidance · Kids mode', profileAyza: 'Ayza', profileAyzaSub: 'Bahasa Indonesia · Kids mode',
    profileAdult: 'Adult', profileAdultSub: 'Adult learning path', profileGuest: 'Guest', profileGuestSub: 'Temporary progress · cleared when you switch profile',
    language: 'Language', learnerMode: 'Learner mode', kids: 'Kids', family: 'Family', adult: 'Adult',
    changeProfile: 'Change profile', settings: 'Settings', close: 'Close', save: 'Save', back: 'Back', home: 'Home', dashboard: 'Dashboard', profile: 'Profile', learningPath: 'Learning path', resetProgress: 'Reset progress',
    start: 'Start', continue: 'Continue', completed: 'Completed', complete: 'Complete', lessons: 'Items', done: 'Done', dayStreak: 'Day streak',
    item: 'Item', of: 'of', previous: 'Previous', next: 'Next', finishTopic: 'Finish topic', mainPage: 'Dashboard',
    listen: 'Listen', mainSound: 'Main sound', exampleWord: 'Example word', contrastSound: 'Contrast sound', extraExample: 'Extra example',
    practiceDone: 'Practice done', alreadyKnow: 'I already know this', needsMorePractice: 'Needs more practice', startPractice: 'Start practice',
    practiceRule: 'Listen or practice first. Then choose one learning action.', practiceFirstWarning: 'Please listen or practice this item once before moving forward or marking it known.', practiceBeforeNext: 'This item is not complete yet. Listen or practice once, then press Practice done.', practiceSaved: 'Practice saved. You can continue.', alreadyKnowSaved: 'Marked as already known after practice.', needsMoreSaved: 'Saved — it will come back in Mixed Review.',
    answerHere: 'Build your answer here', clear: 'Clear', check: 'Check', correct: 'Correct. Great work.', wrong: 'Try again. Build from left to right.', tryAgain: 'Not quite — listen again and try.',
    audioLocked: 'Audio unlocks after the correct answer.', audioMissing: 'Audio file not configured.', audioLoading: 'Loading sound…', audioPlaying: 'Playing…', audioReady: 'Ready to replay.', audioError: 'Audio file could not be loaded.', audioTapAgain: 'Tap again to play sound.',
    layaGuide: 'Laya guide', guide: 'Guide', learnWhy: 'Learn why', thisWord: 'This word', keyRule: 'Key idea', whatHear: 'What should I hear?', mouthTip: 'Mouth / sound tip', commonMistake: 'Common mistake', miniPractice: 'Mini practice', contrast: 'Contrast',
    progressSavedFor: 'Progress saved for', noFinalAnswer: 'Final answer is hidden until you solve it.', greetingPraise: 'Great job!', greetingProgress: 'You’re doing amazing!', buildPrompt: 'Choose the blocks in the correct order.', builtMeaning: 'Great job! You built the meaning!', successTitle: 'Great!',
    heroLine: 'Let’s build meanings in Turkish today!',
    rootLead: 'The Turkish word “{word}” means “{meaning}”. Tap the speaker, listen carefully, then say “{word}” before practice.',
    recallLead: 'Now choose the Turkish word that means “{meaning}”.',
    recallTap: 'Tap the Turkish word for:',
    deconLead: 'Read or listen, then choose the meaning.', deconWhat: 'What does it mean?',
    sectionSounds: 'Sounds', sectionWords: 'First words', sectionBuilders: 'Meaning builders', sectionPractice: 'Practice & review',
    startHere: 'Start here',
    topicComplete: 'Topic complete!', youFinished: 'You finished “{topic}”!', accuracy: 'Accuracy', itemsLearned: 'Items learned', backHome: 'Back to dashboard',
    streakMilestone: '{n}-day streak! Amazing!',
    rewards: 'Rewards', badges: 'Topic badges', badgeEarned: 'Earned', badgeLocked: 'Keep going', milestones: 'Streak milestones', milestoneDays: '{n} days',
    reviewDue: '{n} to review', reviewFresh: 'Nothing waiting — great!',
    dailyGoal: 'Daily goal', goalDone: 'Goal reached!', today: 'Today',
    sayIt: 'Say it', listening: 'Listening…', sayItGreat: 'Great pronunciation!', sayItTry: 'Close! I heard “{word}”. Try again.', sayItFail: 'I could not hear you. Try again.',
    robotVoice: 'Robot voice (approx.)',
    storageWarning: 'Progress cannot be saved on this device (private browsing?).',
    errorReload: 'Something went wrong. Please reload the page.',
    guestCleared: 'Guest progress was cleared.',
    qaMode: 'QA Mode', qaSub: 'Developer-only checks. Open with ?qa=1.', qaAudioStatus: 'Audio verification', qaProgressStatus: 'Progress scope', qaRouteExpected: 'Expected in repo', qaVerified: 'Pronunciation verified', qaNotVerified: 'Needs human pronunciation approval', qaIntentionalNoAudio: 'Intentional: no isolated sound. Teach through real words.', qaImage: 'Image', qaPath: 'Path', qaItem: 'Item'
  },
  id: {
    appTitle: 'Turkish Is Easy', version: 'Belajar bahasa Turki dengan menyusun makna',
    selectProfile: 'Pilih profil pelajar', selectProfileSub: 'Setiap pelajar memiliki bahasa, mode, dan progres yang terpisah.',
    profileBella: 'Bella', profileBellaSub: 'Panduan bahasa Inggris · Mode anak', profileAyza: 'Ayza', profileAyzaSub: 'Bahasa Indonesia · Mode anak',
    profileAdult: 'Dewasa', profileAdultSub: 'Jalur belajar dewasa', profileGuest: 'Tamu', profileGuestSub: 'Progres sementara · dihapus saat ganti profil',
    language: 'Bahasa', learnerMode: 'Mode pelajar', kids: 'Anak', family: 'Keluarga', adult: 'Dewasa',
    changeProfile: 'Ganti profil', settings: 'Pengaturan', close: 'Tutup', save: 'Simpan', back: 'Kembali', home: 'Beranda', dashboard: 'Beranda', profile: 'Profil', learningPath: 'Jalur belajar', resetProgress: 'Hapus progres',
    start: 'Mulai', continue: 'Lanjutkan', completed: 'Selesai', complete: 'Selesai', lessons: 'Item', done: 'Dikerjakan', dayStreak: 'Hari beruntun',
    item: 'Nomor', of: 'dari', previous: 'Sebelumnya', next: 'Berikutnya', finishTopic: 'Selesaikan topik', mainPage: 'Beranda',
    listen: 'Dengarkan', mainSound: 'Bunyi utama', exampleWord: 'Contoh kata', contrastSound: 'Bunyi pembanding', extraExample: 'Contoh lain',
    practiceDone: 'Latihan selesai', alreadyKnow: 'Saya sudah tahu', needsMorePractice: 'Perlu latihan lagi', startPractice: 'Mulai latihan',
    practiceRule: 'Dengarkan atau latihan dulu. Setelah itu pilih satu aksi belajar.', practiceFirstWarning: 'Dengarkan atau latih item ini satu kali dulu sebelum lanjut atau menandai sudah tahu.', practiceBeforeNext: 'Item ini belum selesai. Dengarkan atau latihan satu kali, lalu tekan Latihan selesai.', practiceSaved: 'Latihan tersimpan. Kamu bisa lanjut.', alreadyKnowSaved: 'Ditandai sudah tahu setelah latihan.', needsMoreSaved: 'Tersimpan — akan muncul lagi di Ulang Campur.',
    answerHere: 'Susun jawaban di sini', clear: 'Hapus', check: 'Periksa', correct: 'Benar. Bagus sekali.', wrong: 'Coba lagi. Susun dari kiri ke kanan.', tryAgain: 'Belum tepat — dengarkan lagi lalu coba.',
    audioLocked: 'Audio terbuka setelah jawaban benar.', audioMissing: 'File audio belum dikonfigurasi.', audioLoading: 'Memuat suara…', audioPlaying: 'Memutar…', audioReady: 'Siap diputar lagi.', audioError: 'File audio tidak dapat dimuat.', audioTapAgain: 'Ketuk lagi untuk memutar suara.',
    layaGuide: 'Panduan Laya', guide: 'Panduan', learnWhy: 'Pelajari alasannya', thisWord: 'Kata ini', keyRule: 'Ide utama', whatHear: 'Apa yang perlu didengar?', mouthTip: 'Petunjuk mulut / bunyi', commonMistake: 'Kesalahan umum', miniPractice: 'Latihan kecil', contrast: 'Perbandingan',
    progressSavedFor: 'Progres tersimpan untuk', noFinalAnswer: 'Jawaban akhir disembunyikan sampai kamu menyelesaikannya.', greetingPraise: 'Hebat!', greetingProgress: 'Kamu semakin maju.', buildPrompt: 'Pilih blok dalam urutan yang benar.', builtMeaning: 'Hebat! Kamu berhasil menyusun maknanya!', successTitle: 'Hebat!',
    heroLine: 'Ayo susun makna dalam bahasa Turki hari ini!',
    rootLead: 'Kata bahasa Turki “{word}” berarti “{meaning}”. Ketuk tombol suara, dengarkan dengan saksama, lalu ucapkan “{word}” sebelum latihan.',
    recallLead: 'Sekarang pilih kata Turki yang berarti “{meaning}”.',
    recallTap: 'Ketuk kata Turki untuk:',
    deconLead: 'Baca atau dengarkan, lalu pilih artinya.', deconWhat: 'Apa artinya?',
    sectionSounds: 'Bunyi', sectionWords: 'Kata pertama', sectionBuilders: 'Penyusun makna', sectionPractice: 'Latihan & ulang',
    startHere: 'Mulai di sini',
    topicComplete: 'Topik selesai!', youFinished: 'Kamu menyelesaikan “{topic}”!', accuracy: 'Akurasi', itemsLearned: 'Item dipelajari', backHome: 'Kembali ke beranda',
    streakMilestone: 'Beruntun {n} hari! Hebat!',
    rewards: 'Hadiah', badges: 'Lencana topik', badgeEarned: 'Diraih', badgeLocked: 'Terus lanjut', milestones: 'Tonggak beruntun', milestoneDays: '{n} hari',
    reviewDue: '{n} untuk diulang', reviewFresh: 'Tidak ada yang menunggu — hebat!',
    dailyGoal: 'Target harian', goalDone: 'Target tercapai!', today: 'Hari ini',
    sayIt: 'Ucapkan', listening: 'Mendengarkan…', sayItGreat: 'Pelafalan bagus!', sayItTry: 'Hampir! Aku dengar “{word}”. Coba lagi.', sayItFail: 'Aku tidak mendengar. Coba lagi.',
    robotVoice: 'Suara robot (perkiraan)',
    storageWarning: 'Progres tidak dapat disimpan di perangkat ini (mode penyamaran?).',
    errorReload: 'Terjadi kesalahan. Muat ulang halaman.',
    guestCleared: 'Progres tamu telah dihapus.',
    qaMode: 'Mode QA', qaSub: 'Pemeriksaan khusus pengembang. Buka dengan ?qa=1.', qaAudioStatus: 'Verifikasi audio', qaProgressStatus: 'Ruang progres', qaRouteExpected: 'Diharapkan ada di repo', qaVerified: 'Pelafalan sudah diverifikasi', qaNotVerified: 'Perlu persetujuan pelafalan manusia', qaIntentionalNoAudio: 'Sengaja: tidak ada bunyi terpisah. Ajarkan melalui kata nyata.', qaImage: 'Gambar', qaPath: 'Jalur', qaItem: 'Item'
  }
};

export function t(lang, key, vars){
  let out = (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;
  if(vars) for(const k of Object.keys(vars)) out = out.split('{'+k+'}').join(String(vars[k]));
  return out;
}
export function localized(value, lang){
  if(value == null) return '';
  if(typeof value === 'string') return value;
  return value[lang] || value.en || value.id || '';
}
export function dictKeys(){ return { en: Object.keys(DICT.en), id: Object.keys(DICT.id) }; }
