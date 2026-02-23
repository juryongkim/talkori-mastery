import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Play, ChevronLeft, ChevronRight, Volume2,
  Menu, X, Zap, Gauge, ArrowLeft, LogOut,
  GraduationCap, LayoutGrid, Lock, Sparkles,
  BookOpen, HelpCircle, Activity, Map, MessageCircle, Lightbulb, Waves, Target,
  CheckCircle2, Check, MonitorPlay, BookA, ChevronDown, FileText, Mic
} from 'lucide-react';

import classData from './class_data.json';
import vocaData from './voca_data.json';

const ALLOWED_ORIGIN = "https://talkori.com";
const SALES_PAGE_URL = "https://talkori.com";
const PRICE_PAGE_URL = "https://talkori.com/price";
const BUNNY_CDN_HOST = "https://talkori.b-cdn.net";
const CDN_BASE_URL = `${BUNNY_CDN_HOST}/audio_tk`;
const CLASS_AUDIO_BASE_URL = `${BUNNY_CDN_HOST}/audio_class`;
const PDF_CDN_BASE_URL = `${BUNNY_CDN_HOST}/pdf-re`; 
const STORAGE_KEY = 'talkori_progress_v1';

// 🔽🔽🔽 여기에 마법의 지우개를 턱! 붙여넣으세요 🔽🔽🔽
const cleanWebContent = (htmlString) => {
  if (!htmlString) return "";
  
  // "Join for Free"라는 글자가 포함된 버튼이나 링크를 HTML에서 자동 삭제
  return htmlString
    .replace(/<a[^>]*>[\s\S]*?Join for Free[\s\S]*?<\/a>/gi, "")
    .replace(/<button[^>]*>[\s\S]*?Join for Free[\s\S]*?<\/button>/gi, "")
    .replace(/<div[^>]*class="[^"]*wp-block-button[^"]*"[^>]*>[\s\S]*?Join for Free[\s\S]*?<\/div>/gi, "");
};

// ★ 수술: 유튜브 + 버니넷(MP4) 완벽 호환 만능 하이브리드 플레이어 ★
const UniversalPlayer = ({ url }) => {
  // 유튜브 주소인지 버니넷(일반 영상) 주소인지 스스로 판단합니다.
  const isYouTube = url && (url.includes('youtu.be') || url.includes('youtube.com'));
  let videoId = "";
  if (isYouTube) {
    if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split('?')[0];
    else if (url.includes('v=')) videoId = url.split('v=')[1]?.split('&')[0];
    else if (url.includes('embed/')) videoId = url.split('embed/')[1]?.split('?')[0];
  }

  const ytContainerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const videoRef = useRef(null); // 버니넷(HTML5) 비디오용 조종간
  
  const loopData = useRef({ a: null, b: null }); 
  const [uiState, setUiState] = useState(0); 
  const loopIntervalRef = useRef(null);

  // 1. 유튜브 모드일 때만 작동하는 엔진 세팅
  useEffect(() => {
    if (!isYouTube) return;
    
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (!ytContainerRef.current) return;
      ytPlayerRef.current = new window.YT.Player(ytContainerRef.current, {
        videoId: videoId,
        playerVars: { rel: 0, playsinline: 1, enablejsapi: 1 },
        events: {
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) startLoopCheck();
            else stopLoopCheck();
          }
        }
      });
    };

    if (window.YT && window.YT.Player) { initPlayer(); } 
    else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); initPlayer(); };
    }

    return () => {
      stopLoopCheck();
      if (ytPlayerRef.current && ytPlayerRef.current.destroy) ytPlayerRef.current.destroy();
    };
  }, [isYouTube, videoId]);

  // 2. 통합 컨트롤러 (유튜브든 버니넷이든 알아서 조종합니다!)
  const getCurrentTime = () => {
    if (isYouTube && ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) return ytPlayerRef.current.getCurrentTime();
    if (!isYouTube && videoRef.current) return videoRef.current.currentTime;
    return 0;
  };

  const seekTo = (time) => {
    if (isYouTube && ytPlayerRef.current && ytPlayerRef.current.seekTo) ytPlayerRef.current.seekTo(time, true);
    if (!isYouTube && videoRef.current) videoRef.current.currentTime = time;
  };

  const playMedia = () => {
    if (isYouTube && ytPlayerRef.current && ytPlayerRef.current.playVideo) ytPlayerRef.current.playVideo();
    if (!isYouTube && videoRef.current) videoRef.current.play();
  };

  const startLoopCheck = () => {
    stopLoopCheck();
    loopIntervalRef.current = setInterval(() => {
      const current = getCurrentTime();
      const { a, b } = loopData.current;
      if (a !== null && b !== null && current >= b) seekTo(a);
    }, 100);
  };

  const stopLoopCheck = () => { if (loopIntervalRef.current) clearInterval(loopIntervalRef.current); };

  const skip = (seconds) => { seekTo(getCurrentTime() + seconds); };

  const toggleABRepeat = () => {
    const currentTime = getCurrentTime();
    
    if (uiState === 0) { 
      loopData.current.a = currentTime;
      setUiState(1);
    } else if (uiState === 1) { 
      if (currentTime > loopData.current.a) {
        loopData.current.b = currentTime;
        setUiState(2);
        seekTo(loopData.current.a);
        playMedia();
        if (!isYouTube) startLoopCheck(); // 버니넷 영상 재생 시 루프 강제 가동
      } else { 
        loopData.current.a = null;
        setUiState(0);
      }
    } else { 
      loopData.current.a = null;
      loopData.current.b = null;
      setUiState(0);
      if (!isYouTube && videoRef.current?.paused) stopLoopCheck();
    }
  };

return (
    <div className="flex flex-col w-full h-full bg-black md:rounded-[2rem] overflow-hidden shadow-2xl">
      <div className="aspect-video w-full relative bg-black flex items-center justify-center">
        {isYouTube ? (
          // ★ 리액트 멘붕 방지용 보호막(Wrapper) 한 겹 추가!
          <div className="absolute top-0 left-0 w-full h-full">
            <div ref={ytContainerRef} className="w-full h-full"></div>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            src={url} 
            controls 
            controlsList="nodownload" // 불법 다운로드 버튼 숨김 처리
            playsInline
            onPlay={startLoopCheck}
            onPause={stopLoopCheck}
            className="w-full h-full object-contain outline-none"
          ></video>
        )}
      </div>
      <div className="w-full bg-slate-900 p-3 md:p-4 flex items-center justify-center gap-2 md:gap-4 text-white shrink-0 z-10">
        <button onClick={() => skip(-5)} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1 transition-colors"><ChevronLeft size={16}/> 5s</button>
        <button onClick={toggleABRepeat} className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors border ${uiState === 2 ? 'bg-[#3713ec] border-[#3713ec] text-white shadow-lg shadow-[#3713ec]/50' : uiState === 1 ? 'bg-blue-500 border-blue-500 text-white animate-pulse' : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'}`}>
          {uiState === 0 ? 'A-B Repeat' : uiState === 1 ? 'Set B Point' : '🔄 Repeating A-B'}
        </button>
        <button onClick={() => skip(5)} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1 transition-colors">5s <ChevronRight size={16}/></button>
      </div>
    </div>
  );
};

const App = () => {
  // ==========================================
  // [초기 설정 및 URL 꼬리표 해독기] 
  // ==========================================
  const urlParams = new URLSearchParams(window.location.search);
  const initialAppMode = urlParams.get('tab') === 'voca' ? 'voca' : 'class';
  const initialDemoMode = urlParams.get('mode') === 'demo' || urlParams.get('demo') === 'true';
  const initialLessonId = urlParams.get('lesson');

  const [appMode, setAppMode] = useState(initialAppMode); 
  const [isDemoMode, setIsDemoMode] = useState(initialDemoMode);
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);

  // 🛡️ 보안 장치: 다이렉트 접속 차단 (공식 웹사이트를 통해서만 접속 가능)
  const [isAuthorized, setIsAuthorized] = useState(true);

  useEffect(() => {
    const referrer = document.referrer;
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    
    // 로컬 테스트 환경이 아니고, 공식 홈페이지(talkori.com)에서 부른 게 아니면 차단!
    if (!isLocal && (!referrer || !referrer.startsWith(ALLOWED_ORIGIN))) {
      setIsAuthorized(false);
    }
  }, []);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = windowWidth <= 768;

  const webContentRef = useRef(null);

  const getBunnyPdfUrl = (url) => {
    if (!url) return "";
    const fileName = url.split('/').pop(); 
    return `${PDF_CDN_BASE_URL}/${encodeURIComponent(fileName)}`; 
  };

  // ==========================================
  // [단어장 상태 및 로직] 
  // ==========================================
  const [showGuideMain, setShowGuideMain] = useState(true);
  const [progress, setProgress] = useState(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved) : { visitedWords: [], playedExamples: [] }; } 
    catch (e) { return { visitedWords: [], playedExamples: [] }; }
  });
  const saveProgress = (newProgress) => { setProgress(newProgress); localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress)); };

  const CURRICULUM = useMemo(() => {
    if (!Array.isArray(vocaData)) return [];
    const groups = {};
    vocaData.forEach(item => {
      const dayKey = String(item.day || "1");
      if (!groups[dayKey]) groups[dayKey] = { chapterId: dayKey, title: `Day ${dayKey}: ${item.situation || "Learning"}`, words: [] };
      groups[dayKey].words.push({ id: String(item.id), word: item.word, meaning: item.meaning, usage_note: item.usage_note, examples: item.examples || [] });
    });
    return Object.values(groups).map((group, index) => ({
  ...group,
  isLocked: index >= 3
}));
  }, [isDemoMode]);

  const [activeChapter, setActiveChapter] = useState(null);
  const [activeWord, setActiveWord] = useState(null);
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const audioRef = useRef(null);

  useEffect(() => { if (CURRICULUM.length > 0 && !activeChapter) setActiveChapter(CURRICULUM[0]); }, [CURRICULUM]);
  useEffect(() => { stopCurrentAudio(); }, [activeWord, activeChapter, showGuideMain, appMode]);

  const stopCurrentAudio = () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; } };

  const playAudio = (url, type, id) => {
    stopCurrentAudio();
    const audio = new Audio(url);
    audio.playbackRate = playbackRate;
    audioRef.current = audio;
    audio.play().catch(e => console.error("Audio Play Error:", e));
    if (type === 'example') {
      const key = `${id}`;
      if (!progress.playedExamples.includes(key)) saveProgress({ ...progress, playedExamples: [...progress.playedExamples, key] });
    }
  };

  const handleWordSelect = (word) => { setActiveWord(word); setCurrentExIdx(0); if (!progress.visitedWords.includes(word.id)) saveProgress({ ...progress, visitedWords: [...progress.visitedWords, word.id] }); };
  const getAudioUrl = (wordId, exIndex = null) => {
    const cleanId = String(wordId).trim();
    if (exIndex === null) return `${CDN_BASE_URL}/w_${cleanId}.mp3`;
    return `${CDN_BASE_URL}/w_${cleanId}_ex_${String(exIndex + 1).padStart(2, '0')}.mp3`;
  };
  const toggleSpeed = () => setPlaybackRate(prev => (prev === 1.0 ? 0.8 : prev === 0.8 ? 0.6 : 1.0));

  const handleExit = () => {
    if (isDemoMode) {
        window.parent.location.href = SALES_PAGE_URL;
    } else {
        window.parent.postMessage('exit_talkori', '*');
    }
  };

  const getChapterProgress = (chapter) => {
    if (!chapter || !chapter.words) return 0;
    let totalItems = 0; let completedItems = 0;
    chapter.words.forEach(word => {
      totalItems += 1; if (progress.visitedWords.includes(word.id)) completedItems += 1;
      word.examples.forEach((_, exIdx) => { totalItems += 1; if (progress.playedExamples.includes(`${word.id}_${exIdx}`)) completedItems += 1; });
    });
    return totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
  };

  const GuideBook = () => {
    return (
      <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
        <header className="flex items-center justify-between p-6 md:hidden sticky top-0 bg-white/90 backdrop-blur-sm z-10 border-b border-slate-100">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-50 rounded-lg shadow-sm mr-4"><Menu size={20}/></button>
          <h2 className="text-lg font-bold text-slate-900">Start Guide</h2>
          <div className="w-10"></div>
        </header>

        <div className="max-w-5xl mx-auto px-6 py-10 md:py-16 space-y-20">
          <section className="text-center animate-in slide-in-from-bottom-4 duration-500">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider mb-6">
              <HelpCircle size={14} /> Why can't I speak?
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
              You know the words.<br/>
              <span className="text-[#3713ec]">So why do you freeze?</span>
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Stop memorizing lists like <span className="font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">Delicious = 맛있다</span>.
              <br className="hidden md:block"/> Real conversations don't happen in single words.
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 animate-in slide-in-from-bottom-4 duration-700 delay-100">
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex flex-col items-center text-center opacity-70 grayscale transition-all hover:grayscale-0 hover:opacity-100 group">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">The Old Way</div>
              <div className="text-3xl font-bold text-slate-400 mb-2 line-through decoration-red-400 decoration-4 group-hover:text-slate-600 transition-colors">Delicious</div>
              <p className="text-sm text-slate-400">Just a frozen word. <br/>You can't use this in real life.</p>
            </div>
            <div className="bg-[#3713ec] p-8 rounded-3xl shadow-xl shadow-[#3713ec]/20 flex flex-col items-center text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="text-xs font-bold text-white/60 uppercase tracking-widest mb-4">The Matrix Way</div>
              <div className="space-y-2 mb-4 relative z-10">
                <div className="bg-white/10 px-4 py-2 rounded-lg text-white font-bold text-lg">"Is this delicious?" <span className="text-xs font-normal opacity-70 ml-2">(Question)</span></div>
                <div className="bg-white/10 px-4 py-2 rounded-lg text-white font-bold text-lg">"It wasn't delicious." <span className="text-xs font-normal opacity-70 ml-2">(Past)</span></div>
              </div>
              <p className="text-sm text-white/80">We give you <span className="font-bold text-white border-b border-white/40">10 real sentences</span> for every word.</p>
            </div>
          </section>

          <section className="animate-in slide-in-from-bottom-4 duration-700 delay-200">
             <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Your 45-Day Journey</h2>
                <p className="text-slate-500 max-w-2xl mx-auto leading-relaxed text-sm md:text-base">
                  "Talkori guides you from your room (Day 1) to the heart of Korean society (Day 45). <br className="hidden md:block"/>Expand your world one word at a time."
                </p>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 -z-10"></div>
                <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm relative hover:-translate-y-1 transition-transform">
                   <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm mb-4 border-4 border-white">01</div>
                   <div className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">Day 1 ~ 15</div>
                   <h3 className="font-bold text-lg text-slate-900 mb-2">Survival & Intuition</h3>
                   <p className="text-sm text-slate-500 leading-relaxed">
                     <span className="font-bold text-slate-700">"Me & My Home"</span><br/>
                     Focus on concrete nouns you can see and touch. Basic survival words like family, body, and food.
                   </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm relative hover:-translate-y-1 transition-transform">
                   <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm mb-4 border-4 border-white">02</div>
                   <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">Day 16 ~ 30</div>
                   <h3 className="font-bold text-lg text-slate-900 mb-2">Society & Action</h3>
                   <p className="text-sm text-slate-500 leading-relaxed">
                     <span className="font-bold text-slate-700">"The City"</span><br/>
                     Step outside. Use transport, banks, and shops. Start using verbs and expressing emotions.
                   </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm relative hover:-translate-y-1 transition-transform">
                   <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm mb-4 border-4 border-white">03</div>
                   <div className="text-xs font-bold text-purple-500 uppercase tracking-widest mb-1">Day 31 ~ 45</div>
                   <h3 className="font-bold text-lg text-slate-900 mb-2">Connection & Mastery</h3>
                   <p className="text-sm text-slate-500 leading-relaxed">
                     <span className="font-bold text-slate-700">"Deep Talk"</span><br/>
                     Master logic, abstract ideas, and polite manners (Honorifics). Complete your Korean nuance.
                   </p>
                </div>
             </div>
          </section>

          <section className="animate-in slide-in-from-bottom-4 duration-700 delay-300">
             <h2 className="text-2xl font-bold text-center text-slate-900 mb-10">How to Study?</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-lg transition-all group">
                  <div className="w-10 h-10 bg-white text-[#3713ec] rounded-lg shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Map size={20} /></div>
                  <h3 className="font-bold text-base text-slate-900 mb-1">1. The Context</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">Don't learn in a void. Every word starts in a real situation—like a convenience store or a blind date.</p>
                </div>
                <div className="p-6 rounded-2xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-lg transition-all group">
                  <div className="w-10 h-10 bg-white text-purple-600 rounded-lg shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><LayoutGrid size={20} /></div>
                  <h3 className="font-bold text-base text-slate-900 mb-1">2. The Matrix</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">Expand one word into 10 expressions. Practice questions, past tense, and even casual "Banmal".</p>
                </div>
                <div className="p-6 rounded-2xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-lg transition-all group">
                  <div className="w-10 h-10 bg-white text-pink-600 rounded-lg shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Waves size={20} /></div>
                  <h3 className="font-bold text-base text-slate-900 mb-1">3. The Waveform</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">Listen to the native audio pattern and shadow it until your voice matches the rhythm perfectly.</p>
                </div>
             </div>
          </section>

          <div className="text-center pb-10 animate-in slide-in-from-bottom-4 duration-700 delay-500">
            <p className="text-slate-400 font-medium mb-6 text-sm">Ready to turn the words you "know" into words you can "speak"?</p>
            <button 
              onClick={() => setShowGuideMain(false)} 
              className="w-full md:w-auto px-12 py-5 bg-[#3713ec] text-white text-lg font-bold rounded-2xl shadow-xl shadow-[#3713ec]/30 hover:scale-105 hover:bg-[#2a0eb5] transition-all flex items-center justify-center gap-3"
            >
              Start Day 1 Now <ArrowLeft className="rotate-180" size={20}/>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const COURSE_VIDEO_TABS = {
    'MAIN233': { shorts: 'SHORTS', logic: 'LOGIC', commentary: 'COMMENTARY' },
    'MUSTKNOW': { shorts: 'CONCEPT', logic: 'PRACTICE' }, 
    'DAILY': { shorts: 'EPISODE', logic: 'REVIEW' }     
  };

  const HIDE_DAILY_COURSE = true;

  // ==========================================
  // [강의실 상태 및 로직] 
  // ==========================================
  const [selectedCourse, setSelectedCourse] = useState('MAIN233');
  const [openSection, setOpenSection] = useState(null); 
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [videoTab, setVideoTab] = useState('logic');
  const [contentTab, setContentTab] = useState('pdf');

  const groupedClassData = useMemo(() => {
    const courses = { 'MAIN233': { title: 'Real Korean Patterns 233', sections: [] }, 'MUSTKNOW': { title: 'Must-Know Patterns', sections: [] }, 'DAILY': { title: 'Daily Korean', sections: [] } };
    
    // ★ 4강부터 자물쇠 채우기!
    const mainLessons = classData.filter(l => l.course === 'MAIN233').map((l, index) => ({ ...l, isLocked: index >= 3 }));
    const mustKnowLessons = classData.filter(l => l.course === 'MUSTKNOW').map((l, index) => ({ ...l, isLocked: index >= 3 }));
    const dailyLessons = classData.filter(l => l.course === 'DAILY').map((l, index) => ({ ...l, isLocked: index >= 3 })); 
    
    if (mainLessons.length > 0) {
      const ranges = [ { t: "1. Solutions & Suggestions", end: 25 }, { t: "2. Intentions & Excuses", end: 50 }, { t: "3. Guessing & Gossip", end: 75 }, { t: "4. Logic & Connections", end: 99 }, { t: "5. Emotions & Attitudes", end: 122 }, { t: "6. Habits & Experience", end: 145 }, { t: "7. Emphasis & Nuance", end: 172 }, { t: "8. Comparison & Passive", end: 196 }, { t: "9. Exaggeration & Lament", end: 218 }, { t: "10. Quoting & Recall", end: 235 } ];
      let start = 0; ranges.forEach(r => { courses['MAIN233'].sections.push({ title: r.t, lessons: mainLessons.slice(start, r.end) }); start = r.end; });
    }
    courses['MUSTKNOW'].sections = mustKnowLessons.length > 0 ? [ { title: "Chapter 1", lessons: mustKnowLessons.slice(0, 20) }, { title: "Chapter 2", lessons: mustKnowLessons.slice(20, 40) }, { title: "Chapter 3", lessons: mustKnowLessons.slice(40, 60) }, { title: "Chapter 4", lessons: mustKnowLessons.slice(60, 81) } ] : [{ title: "업데이트 준비 중", lessons: [] }];
    courses['DAILY'].sections = dailyLessons.length > 0 ? [ { title: "Season 1", lessons: dailyLessons.slice(0, 30) }, { title: "Season 2", lessons: dailyLessons.slice(30, 60) } ] : [{ title: "업데이트 준비 중", lessons: [] }];

    if (HIDE_DAILY_COURSE) {
      delete courses['DAILY'];
    }
      
    return courses;
  }, []);

  // ★ 꼬리표 해독 및 레슨 자동 셋팅
  useEffect(() => {
    const courseObj = groupedClassData[selectedCourse];
    if (courseObj && courseObj.sections.length > 0) {
      setOpenSection(courseObj.sections[0].title);
      
      if (initialLessonId) {
        const targetLesson = classData.find(l => String(l.lesson_id) === String(initialLessonId));
        if (targetLesson && targetLesson.course === selectedCourse) {
          setSelectedLesson(targetLesson);
          return;
        }
      }
      
      if (courseObj.sections[0].lessons.length > 0) setSelectedLesson(courseObj.sections[0].lessons[0]); 
      else setSelectedLesson(null);
    }
  }, [selectedCourse, groupedClassData, initialLessonId]);

  useEffect(() => {
    if (selectedLesson) {
      const courseTabs = COURSE_VIDEO_TABS[selectedLesson.course] || {};
      const availableKeys = Object.keys(courseTabs).filter(k => selectedLesson.video_urls?.[k]);
      
      if (availableKeys.length > 0 && !availableKeys.includes(videoTab)) {
        setVideoTab(availableKeys.includes('logic') ? 'logic' : availableKeys[0]);
      }
    }
    setContentTab('pdf');
  }, [selectedLesson]);

  useEffect(() => {
    if (appMode !== 'class' || contentTab !== 'pdf' || !webContentRef.current) return;
    const container = webContentRef.current;

    window.handleChoice = (element, isCorrect, feedbackId) => {
      const parentContainer = element.closest('.flex-col') || element.parentElement;
      const options = parentContainer.querySelectorAll('.quiz-option');
      const feedbackArea = document.getElementById(feedbackId);
      const resultText = document.getElementById('feedback-result');

      options.forEach(opt => {
        opt.style.borderColor = "#fff"; opt.style.backgroundColor = "#fff"; opt.style.color = "#334155";
      });

      if (isCorrect) {
        element.style.borderColor = "#22c55e"; element.style.backgroundColor = "#f0fdf4"; element.style.color = "#15803d";
        if (resultText) { resultText.innerText = "✅ Correct!"; resultText.style.color = "#22c55e"; }
      } else {
        element.style.borderColor = "#ef4444"; element.style.backgroundColor = "#fef2f2"; element.style.color = "#b91c1c";
        if (resultText) { resultText.innerText = "❌ Try Again!"; resultText.style.color = "#ef4444"; }
      }
      if (feedbackArea) feedbackArea.classList.remove('hidden');
    };

    window.checkQuiz = (num, isCorrect) => {
      document.querySelectorAll('.quiz-option').forEach(el => {
        el.classList.remove('active-correct', 'active-wrong');
        const span = el.querySelector('span:last-child');
        if (span) span.style.opacity = "0";
      });
      const selected = document.getElementById('opt-' + num);
      const mark = document.getElementById('mark-' + num);
      if (isCorrect) selected?.classList.add('active-correct');
      else selected?.classList.add('active-wrong');
      if (mark) mark.style.opacity = "1";
      document.getElementById('quiz-feedback')?.classList.remove('hidden');
    };

    const handleToggleClick = (e) => {
      const switchLabel = e.target.closest('.tk-switch');
      if (switchLabel) {
        setTimeout(() => {
          const sw = switchLabel.querySelector('input[type="checkbox"]');
          if (!sw) return;

          const idMatch = sw.id.match(/\d+/);
          if (!idMatch) return;
          const id = idMatch[0];

          const korText = document.getElementById('kor-' + id);
          const engText = document.getElementById('eng-' + id) || document.getElementById('nuance-' + id);

          if (korText) {
            const textOn = korText.getAttribute('data-opt2') || korText.getAttribute('data-transformed') || korText.getAttribute('data-casual') || korText.getAttribute('data-confirm');
            const textOff = korText.getAttribute('data-opt1') || korText.getAttribute('data-base') || korText.getAttribute('data-polite') || korText.getAttribute('data-simple');
            if (textOn && textOff) {
              korText.innerText = sw.checked ? textOn : textOff;
              korText.style.color = sw.checked ? '#526ae5' : '#1e293b';
            }
          }
          if (engText) {
            const engOn = engText.getAttribute('data-eng2') || engText.getAttribute('data-n2');
            const engOff = engText.getAttribute('data-eng1') || engText.getAttribute('data-n1');
            if (engOn && engOff) {
              engText.innerText = sw.checked ? engOn : engOff;
            }
          }
        }, 10);
      }
    };

    container.addEventListener('click', handleToggleClick);

    return () => {
      if (container) container.removeEventListener('click', handleToggleClick);
      delete window.handleChoice;
      delete window.checkQuiz;
    };
  }, [selectedLesson, contentTab, appMode]);

const renderMedia = (url) => {
    if (!url) return <div className="aspect-video w-full flex flex-col items-center justify-center text-white/50 font-bold gap-2"><MonitorPlay size={40} className="opacity-50"/>영상/음원이 아직 준비되지 않았습니다.</div>;
    
    // 오디오 파일(mp3, wav 등)은 기존대로 까만 화면에 소리만 나오게 처리
    if (url.match(/\.(m4a|mp3|wav)$/i)) {
      return (
        <div className="aspect-video w-full flex flex-col items-center justify-center bg-slate-900 md:rounded-[2rem]">
          <Volume2 size={48} className="text-white/30 mb-6" />
          <audio controls src={url} className="w-3/4 outline-none"></audio>
        </div>
      );
    }
    
    // 유튜브 영상과 버니넷(MP4) 영상은 모두 [만능 하이브리드 플레이어]가 씹어 먹습니다!
    return <UniversalPlayer url={url} />;
  };

  const currentCourseLessons = groupedClassData[selectedCourse]?.sections.flatMap(s => s.lessons) || [];
  const currentLessonIdx = currentCourseLessons.findIndex(l => l.lesson_id === selectedLesson?.lesson_id);
  const prevLesson = currentLessonIdx > 0 ? currentCourseLessons[currentLessonIdx - 1] : null;
  const nextLesson = currentLessonIdx !== -1 && currentLessonIdx < currentCourseLessons.length - 1 ? currentCourseLessons[currentLessonIdx + 1] : null;

  // 🛡️ 접근 거부 화면 (영문 번역 완료)
  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-10 text-center z-[9999] relative">
        <div className="bg-white p-10 md:p-16 rounded-[2rem] shadow-2xl border border-slate-100 max-w-lg w-full animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={40} />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">Access Denied</h1>
          <p className="text-slate-500 mb-8 font-medium text-sm md:text-base leading-relaxed">
            Talkori is exclusively available through our official website.<br/>
            Please access this application via Talkori.com.
          </p>
          <button 
            onClick={() => window.location.href = ALLOWED_ORIGIN} 
            className="w-full py-4 bg-[#3713ec] text-white rounded-xl font-bold shadow-lg shadow-[#3713ec]/20 hover:scale-105 transition-all"
          >
            Go to Official Website 🚀
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white md:bg-[#f6f6f8] font-sans text-slate-800 overflow-hidden relative">
      
      {/* 1. 사이드바 */}
      <div className={`w-80 bg-white border-r border-slate-200 shadow-xl flex flex-col h-full shrink-0 z-50 ${isSidebarOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'hidden md:flex'}`}>
        <div className="p-6 border-b border-slate-50 shrink-0 bg-[#3713ec] text-white flex justify-between items-center">
          <div className="flex items-center gap-3"><GraduationCap size={28} /><div><h1 className="font-black text-2xl tracking-tight">Talkori</h1><p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Mastery Platform</p></div></div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-white/70 hover:text-white"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {appMode === 'class' ? (
            <div className="animate-in fade-in duration-300">
              <div className="mb-6 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Select Course</p>
                {Object.keys(groupedClassData).map(cId => (
                  <button key={cId} onClick={() => setSelectedCourse(cId)} className={`w-full text-left p-3 rounded-xl text-sm font-bold transition-all ${selectedCourse === cId ? 'bg-[#3713ec] text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                    {groupedClassData[cId].title}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Curriculum</p>
                {groupedClassData[selectedCourse]?.sections.map((section, sIdx) => (
                  <div key={sIdx} className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
                    <button onClick={() => setOpenSection(openSection === section.title ? null : section.title)} className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <span className="font-bold text-sm text-slate-800 text-left">{section.title}</span><ChevronDown size={16} className={`text-slate-400 transition-transform ${openSection === section.title ? 'rotate-180' : ''}`} />
                    </button>
                    {openSection === section.title && (
                      <div className="p-2 space-y-1 bg-white border-t border-slate-100">
                        {section.lessons.length > 0 ? section.lessons.map((lesson, lIdx) => (
                          <div 
                            key={lesson.lesson_id} 
                            onClick={() => { 
                              // ★ 자물쇠 로직 장착!
                              if (isDemoMode && lesson.isLocked) {
                                setShowPremiumPopup(true);
                              } else {
                                setSelectedLesson(lesson); 
                                setIsSidebarOpen(false); 
                                window.scrollTo(0,0); 
                              }
                            }} 
                            className={`p-3 text-xs font-bold rounded-lg cursor-pointer transition-all flex justify-between items-center ${selectedLesson?.lesson_id === lesson.lesson_id ? 'bg-blue-50 text-[#3713ec]' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            <div className="flex-1 truncate">
                              <span className="text-slate-400 mr-2">{lIdx + 1}.</span> {lesson.title}
                            </div>
                            {/* ★ 데모 모드 + 잠긴 강의 = 자물쇠 표시 */}
                            {isDemoMode && lesson.isLocked && (
                              <span className="ml-2 text-slate-400 text-[10px] opacity-70">🔒</span>
                            )}
                          </div>
                        )) : <div className="p-3 text-xs font-bold text-slate-400 text-center">강의 준비 중입니다.</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
               <div onClick={() => { setShowGuideMain(true); setActiveWord(null); setIsSidebarOpen(false); }} className={`flex items-center gap-4 p-3 mb-4 rounded-xl border cursor-pointer transition-colors ${showGuideMain ? 'bg-blue-50 border-blue-100' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${showGuideMain ? 'bg-blue-200 text-blue-600' : 'bg-slate-100 text-slate-400'}`}><BookOpen size={16} /></div>
                <div><h3 className={`font-bold text-sm ${showGuideMain ? 'text-blue-800' : 'text-slate-700'}`}>How to Study?</h3><p className={`text-[10px] font-bold uppercase ${showGuideMain ? 'text-blue-500' : 'text-slate-400'}`}>Guide Book</p></div>
              </div>
              <div className="h-px bg-slate-100 mb-4 mx-2"></div>
              {CURRICULUM.map((chapter, idx) => {
                const percentage = getChapterProgress(chapter);
                const isActive = !showGuideMain && activeChapter?.chapterId === chapter.chapterId;
                return (
                  // ▼ 자물쇠와 팝업 스위치가 달린 새 코드로 교체합니다!
<div 
  key={idx} 
  onClick={() => { 
    // ★ 데모 모드인데 잠긴 챕터를 누르면 팝업 띄우기!
    if (isDemoMode && chapter.isLocked) {
      setShowPremiumPopup(true);
    } else {
      // 아니면 정상적으로 단어장 열기
      setActiveChapter(chapter); setActiveWord(null); setShowGuideMain(false); setIsSidebarOpen(false); 
    }
  }} 
  className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all mb-2 ${isActive ? 'bg-[#3713ec]/5 border border-[#3713ec]/10' : 'hover:bg-slate-50'}`}
>
  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${isActive ? 'bg-[#3713ec] text-white' : 'bg-slate-100 text-slate-400'}`}>{chapter.chapterId}</div>
  <div className="flex-1 overflow-hidden">
    <h3 className={`font-bold text-sm truncate ${isActive ? 'text-[#3713ec]' : 'text-slate-600'}`}>{chapter.title}</h3>
    <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex items-center"><div className="h-full bg-[#3713ec] transition-all duration-500" style={{ width: `${percentage}%` }}></div></div>
  </div>
  {/* ★ 데모 모드 + 잠긴 챕터 = 자물쇠 아이콘 표시 */}
  {isDemoMode && chapter.isLocked && (
    <span className="ml-2 text-slate-400 text-xs opacity-70">🔒</span>
  )}
</div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. 메인 화면 영역 */}
      <div className="flex-1 flex flex-col h-full relative overflow-x-hidden">
        
        <nav className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-6 shrink-0 z-40 relative">
          <div className="flex items-center gap-2 w-1/4 md:w-1/3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-500 hover:text-slate-800"><Menu size={24}/></button>
          </div>
          
          <div className="flex justify-center flex-1 md:w-1/3">
            <div className="flex bg-slate-100 p-1 rounded-full relative w-48 md:w-64">
              <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-out shadow-sm ${appMode === 'class' ? 'translate-x-0 bg-[#3713ec]' : 'translate-x-[calc(100%+8px)] bg-purple-600'}`}></div>
              <button onClick={() => { setAppMode('class'); stopCurrentAudio(); }} className={`relative z-10 flex-1 py-1.5 md:py-2 text-[10px] md:text-xs font-black uppercase transition-colors flex items-center justify-center gap-1.5 ${appMode === 'class' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}><MonitorPlay size={14} /> Class</button>
              <button onClick={() => { setAppMode('voca'); stopCurrentAudio(); }} className={`relative z-10 flex-1 py-1.5 md:py-2 text-[10px] md:text-xs font-black uppercase transition-colors flex items-center justify-center gap-1.5 ${appMode === 'voca' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}><BookA size={14} /> Voca</button>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-1 md:gap-3 w-1/4 md:w-1/3">
            <button onClick={toggleSpeed} className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-colors ${appMode === 'voca' ? 'bg-purple-600/10 text-purple-600' : 'bg-[#3713ec]/10 text-[#3713ec]'}`}>
              <Gauge size={14} /> <span className="hidden sm:inline">{playbackRate}x</span><span className="sm:hidden">{playbackRate}</span>
            </button>
            <button onClick={handleExit} className="p-2 text-slate-400 hover:text-red-500 transition-colors hidden sm:block">
              {isDemoMode ? <Sparkles size={18}/> : <LogOut size={18}/>}
            </button>
            <button onClick={handleExit} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors sm:hidden">
              <LogOut size={16}/>
            </button>
          </div>
        </nav>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-white md:bg-transparent">
          {appMode === 'class' ? (
            selectedLesson ? (
              <div className="max-w-4xl mx-auto md:p-8 w-full animate-in fade-in zoom-in-95 duration-300 pb-10">
                
                <header className="px-5 py-6 md:px-0 md:py-0 md:mb-6 space-y-2 bg-white md:bg-transparent">
                  <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900 korean-text leading-tight">{selectedLesson.title}</h1>
                  <div className="flex gap-4 text-[10px] md:text-xs font-bold text-slate-400 uppercase"><span className="flex items-center gap-1"><MonitorPlay size={14}/> {groupedClassData[selectedCourse].title}</span></div>
                </header>

                {(() => {
                  const courseTabs = COURSE_VIDEO_TABS[selectedLesson.course] || {};
                  const availableTabs = Object.keys(courseTabs).filter(k => selectedLesson.video_urls?.[k]);
                  
                  if (availableTabs.length === 0) {
                    const fallbackUrl = selectedLesson?.video_urls?.video || selectedLesson?.video_urls?.shorts;
                    if (!fallbackUrl) return null; 
                    return (
                      <section className="w-full mt-4 md:mt-0">
                        <div className="w-full bg-black md:rounded-[2rem] md:shadow-xl relative md:border-4 border-slate-200 flex flex-col items-center justify-center overflow-hidden">
                          {renderMedia(fallbackUrl)}
                        </div>
                      </section>
                    );
                  }

                  return (
                    <section className="w-full">
                      <div className="flex gap-2 overflow-x-auto px-5 md:px-0 pb-3 md:pb-3 custom-scrollbar">
                        {availableTabs.map(key => (
                          <button key={key} onClick={() => setVideoTab(key)} className={`px-6 py-2 rounded-full shrink-0 text-[10px] font-black uppercase transition-all ${videoTab === key ? 'bg-[#3713ec] text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>
                            {courseTabs[key]}
                          </button>
                        ))}
                      </div>
                      <div className="w-full bg-black md:rounded-[2rem] md:shadow-xl relative md:border-4 border-slate-200 flex flex-col items-center justify-center overflow-hidden">
                        {renderMedia(selectedLesson?.video_urls?.[videoTab])}
                      </div>
                    </section>
                  );
                })()}
                
                <section className="bg-white md:rounded-[2rem] md:border border-slate-200 md:shadow-sm overflow-hidden flex flex-col md:mt-8 border-t border-slate-100">
                  <div className="flex border-b border-slate-100">
                    <button onClick={() => setContentTab('pdf')} className={`flex-1 py-4 text-[10px] md:text-xs font-black tracking-widest transition-all flex items-center justify-center gap-1.5 md:gap-2 ${contentTab === 'pdf' ? 'text-[#3713ec] bg-blue-50/50' : 'text-slate-400 hover:bg-slate-50'}`}><FileText size={16}/> TEXTBOOK</button>
                    <button onClick={() => setContentTab('script')} className={`flex-1 py-4 text-[10px] md:text-xs font-black tracking-widest transition-all flex items-center justify-center gap-1.5 md:gap-2 ${contentTab === 'script' ? 'text-[#3713ec] bg-blue-50/50' : 'text-slate-400 hover:bg-slate-50'}`}><Mic size={16}/> SHADOWING</button>
                  </div>
                  
                  <div className="min-h-[500px] w-full bg-slate-50/30">
                    {contentTab === 'pdf' ? (
                      selectedLesson.course === 'MAIN233' ? (
                        selectedLesson.pdf_url ? (
                          <div className="w-full h-[600px] md:h-[800px] bg-[#525659] md:rounded-b-[2rem] overflow-hidden relative">
  {/* PC, 모바일 가릴 것 없이 무조건 안전한 전용 뷰어(PDF.js) + 버니넷 우회 주소 사용! */}
  <iframe 
    src={`/pdfjs/web/viewer.html?file=${encodeURIComponent(getBunnyPdfUrl(selectedLesson.pdf_url))}`}
    className="w-full h-full border-0"
    title="Talkori Textbook"
  />
</div>
                        ) : (<div className="flex flex-col items-center justify-center h-[400px] text-slate-400"><FileText size={48} className="mb-4 opacity-30"/><p className="font-bold text-sm">이 강의는 PDF 교재가 없습니다.</p></div>)
                      ) : (
                       selectedLesson.web_content ? (
                          <div className="w-full h-auto bg-white p-4 md:p-8" ref={webContentRef}>
                            {/* 👇 여기가 마법의 지우개가 적용된 부분입니다! 👇 */}
                            <div className="w-full text-left text-slate-800 leading-relaxed overflow-x-hidden" dangerouslySetInnerHTML={{ __html: cleanWebContent(selectedLesson.web_content) }} />
                          </div>
                        ) : (<div className="flex flex-col items-center justify-center h-[400px] text-slate-400"><FileText size={48} className="mb-4 opacity-30"/><p className="font-bold text-sm">웹 교재가 아직 등록되지 않았습니다.</p></div>)
                      )
                    ) : (
                      <div className="p-4 md:p-8 space-y-3">
                        {selectedLesson.script && selectedLesson.script.length > 0 ? (
                          selectedLesson.script.map((line, idx) => (
                            <div key={idx} className="flex items-center gap-3 md:gap-4 p-4 md:p-6 bg-white hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200 rounded-2xl transition-all shadow-sm group">
                              <button onClick={() => { const audioUrl = `${CLASS_AUDIO_BASE_URL}/${line.audio}`; playAudio(audioUrl, 'class', `${selectedLesson.lesson_id}_${idx}`); }} className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center group-hover:bg-[#3713ec] group-hover:text-white group-hover:border-[#3713ec] transition-all shadow-sm"><Volume2 size={18} /></button>
                              <div className="flex-1">
                                {line.type && <span className="text-[10px] font-bold text-[#3713ec] uppercase tracking-wider mb-1 block">{line.type}</span>}
                                <p className="text-base md:text-lg font-bold text-slate-800 korean-text leading-snug break-keep">{line.ko}</p>
                                <p className="text-xs md:text-sm text-slate-500 mt-1 italic">{line.en}</p>
                              </div>
                            </div>
                          ))
                        ) : (<div className="flex flex-col items-center justify-center h-[400px] text-slate-400"><Mic size={48} className="mb-4 opacity-30"/><p className="font-bold text-sm">오디오 스크립트가 아직 등록되지 않았습니다.</p></div>)}
                      </div>
                    )}
                  </div>
                </section>

                <footer className="flex justify-between items-center p-5 md:p-0 mt-2 md:mt-8 border-t border-slate-100 md:border-none bg-white md:bg-transparent">
                  {prevLesson ? (
                    <button onClick={() => { setSelectedLesson(prevLesson); window.scrollTo(0,0); }} className="flex items-center gap-1 md:gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all text-xs md:text-sm"><ChevronLeft size={16} /> <span className="hidden sm:inline">PREV LESSON</span><span className="sm:hidden">PREV</span></button>
                  ) : <div></div>}
                  
                  {nextLesson ? (
                    <button onClick={() => { setSelectedLesson(nextLesson); window.scrollTo(0,0); }} className="flex items-center gap-1 md:gap-2 px-5 md:px-8 py-2.5 md:py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-all text-xs md:text-sm"><span className="hidden sm:inline">NEXT LESSON</span><span className="sm:hidden">NEXT</span> <ChevronRight size={16}/></button>
                  ) : <div></div>}
                </footer>

              </div>
            ) : (<div className="flex h-full items-center justify-center text-slate-400 font-bold">좌측에서 레슨을 선택해주세요.</div>)
          ) : (
            <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-white md:bg-[#f6f6f8]">
              {showGuideMain ? (<GuideBook />) : !activeWord ? (
                <div className="flex-1 overflow-y-auto p-5 md:p-10 custom-scrollbar animate-in fade-in duration-300">
                  <header className="mb-6 md:mb-8 flex items-center justify-between"><div className="flex-1"><div className="flex items-center gap-2 text-purple-600 font-bold text-xs mb-1 uppercase tracking-wider"><Zap size={14} /> Matrix Learning System</div><h2 className="text-2xl md:text-3xl font-bold text-slate-900">{activeChapter?.title}</h2></div></header>
                  <div className="mb-6 md:mb-8 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"><div className="flex-1"><div className="flex justify-between items-center mb-2"><span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Chapter Progress</span><span className="text-xs md:text-sm font-bold text-purple-600">{getChapterProgress(activeChapter)}%</span></div><div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-purple-600 transition-all duration-1000" style={{ width: `${getChapterProgress(activeChapter)}%` }}></div></div></div></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 pb-10">
                    {activeChapter?.words.map((word, idx) => {
                      const isVisited = progress.visitedWords.includes(word.id);
                      return (
                        <div key={idx} onClick={() => handleWordSelect(word)} className={`bg-white p-5 md:p-6 rounded-2xl border-b-4 transition-all cursor-pointer shadow-sm group relative ${isVisited ? 'border-purple-600 bg-purple-50/10' : 'border-slate-100 hover:border-purple-600 hover:-translate-y-1'}`}>
                          {isVisited && <div className="absolute top-4 right-4 text-purple-600"><CheckCircle2 size={20} className="fill-purple-100" /></div>}
                          <h4 className={`text-xl md:text-2xl font-bold my-1 transition-colors korean-text ${isVisited ? 'text-purple-600' : 'text-slate-800 group-hover:text-purple-600'}`}>{word.word}</h4>
                          <p className="text-xs md:text-sm font-medium text-slate-500">{word.meaning}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden bg-[#f6f6f8] animate-in fade-in duration-300">
                  <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center shrink-0">
                    <button onClick={() => setActiveWord(null)} className="flex items-center gap-2 text-slate-500 font-bold text-xs md:text-sm hover:text-purple-600 transition-all">
                      <ArrowLeft size={16} /> Back
                    </button>
                  </header>
                  <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
                      <div className="lg:col-span-5 space-y-4 md:space-y-6">
                        <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-2 korean-text">{activeWord.word}</h2>
                          <p className="text-lg md:text-xl text-slate-500 font-medium mb-4">{activeWord.meaning}</p>
                          <button onClick={() => playAudio(getAudioUrl(activeWord.id), 'word', activeWord.id)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-purple-600 hover:text-white transition-all shadow-inner mb-4"><Volume2 size={20} /></button>
                          {activeWord.usage_note && (
                            <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100/50 text-[11px] md:text-xs text-purple-800 leading-relaxed korean-text font-medium">
                              <span className="font-bold underline">Note:</span> {activeWord.usage_note}
                            </div>
                          )}
                        </div>
                        <div className="bg-purple-600 rounded-2xl md:rounded-3xl p-6 md:p-10 text-white shadow-xl min-h-[250px] md:min-h-[300px] flex flex-col justify-center relative overflow-hidden"><span className="text-white/50 text-[10px] font-bold uppercase tracking-widest block mb-4">Pattern {currentExIdx + 1}: {activeWord.examples[currentExIdx]?.type}</span><h3 className="text-2xl md:text-4xl font-bold mb-4 korean-text break-keep leading-snug">{activeWord.examples[currentExIdx]?.ko}</h3><p className="text-white/70 text-base md:text-lg mb-8 md:mb-10 font-medium italic">{activeWord.examples[currentExIdx]?.en}</p><button onClick={() => playAudio(getAudioUrl(activeWord.id, currentExIdx), 'example', `${activeWord.id}_${currentExIdx}`)} className="w-14 h-14 md:w-16 md:h-16 bg-white text-purple-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform"><Volume2 size={28} className="fill-current" /></button></div>
                      </div>
                      <div className="lg:col-span-7 bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full lg:max-h-[650px] overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                          <div className="grid grid-cols-1 gap-2 md:gap-3">
                            {activeWord.examples.map((ex, idx) => {
                              const isPlayed = progress.playedExamples.includes(`${activeWord.id}_${idx}`);
                              return (
                                <button key={idx} onClick={() => { setCurrentExIdx(idx); playAudio(getAudioUrl(activeWord.id, idx), 'example', `${activeWord.id}_${idx}`); }} className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all text-left group ${currentExIdx === idx ? 'border-purple-600 bg-purple-600 text-white shadow-lg' : 'border-slate-50 bg-slate-50/50 hover:border-purple-600/30 text-slate-600'}`}>
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs transition-colors ${currentExIdx === idx ? 'bg-white/20 text-white' : isPlayed ? 'bg-green-100 text-green-600' : 'bg-white text-slate-300'}`}>{isPlayed ? <Check size={14}/> : idx + 1}</div>
                                  <div className="flex-1 overflow-hidden"><p className={`text-[10px] font-bold uppercase mb-0.5 tracking-tighter ${currentExIdx === idx ? 'text-white/60' : 'text-slate-400'}`}>{ex.type}</p><p className="font-bold text-sm md:text-base korean-text truncate">{ex.ko}</p></div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </main>
                  <footer className="bg-white border-t border-slate-100 p-4 flex justify-between items-center shrink-0">
                    <button onClick={() => { const idx = activeChapter.words.findIndex(w => w.id === activeWord.id); if(idx > 0) handleWordSelect(activeChapter.words[idx-1]); }} className="flex items-center gap-1 md:gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-all text-xs md:text-sm"><ChevronLeft size={16} /> PREV</button>
                    <button onClick={() => { const idx = activeChapter.words.findIndex(w => w.id === activeWord.id); if(idx < activeChapter.words.length - 1) handleWordSelect(activeChapter.words[idx+1]); }} className="flex items-center gap-1 md:gap-2 px-6 md:px-8 py-2.5 md:py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-all text-xs md:text-sm">NEXT WORD <ChevronRight size={16} /></button>
                  </footer>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;900&family=Noto+Sans+KR:wght@400;700;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@100..700&display=swap');

        body { font-family: 'Lexend', sans-serif; }
        .korean-text { font-family: 'Noto Sans KR', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        
        .material-symbols-outlined { 
          text-transform: none !important; 
          font-family: 'Material Symbols Outlined' !important;
          font-feature-settings: "liga" !important;
          font-variant-ligatures: normal !important;
          white-space: nowrap !important;
          letter-spacing: normal !important;
        } 

        .text-bori-primary { color: #f59e0b !important; }
        .bg-bori-primary { background-color: #f59e0b !important; }
        .border-bori-primary { border-color: #f59e0b !important; }
        .text-bori-secondary { color: #3b82f6 !important; }
        .bg-bori-secondary { background-color: #3b82f6 !important; }
        .border-bori-secondary { border-color: #3b82f6 !important; }
        .bg-bori-light { background-color: #fffbeb !important; }
        .text-tk-primary { color: #526ae5 !important; }
        .bg-tk-primary { background-color: #526ae5 !important; }
        .border-tk-primary { border-color: #526ae5 !important; }
        .bg-tk-primary\\/5 { background-color: rgba(82, 106, 229, 0.05) !important; }
        .rounded-tk { border-radius: 1.5rem !important; }
        
        .flip-card { perspective: 1000px !important; }
        .flip-card-inner { transition: transform 0.6s !important; transform-style: preserve-3d !important; position: relative !important; width: 100% !important; height: 100% !important; }
        .flip-card-front, .flip-card-back { backface-visibility: hidden !important; -webkit-backface-visibility: hidden !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; }
        .flip-card.flipped .flip-card-inner { transform: rotateY(180deg) !important; }
        .flip-card-back { transform: rotateY(180deg) !important; }
      `}</style>

      {/* 👑 프리미엄 가입 유도 팝업 */}
      {showPremiumPopup && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl transform transition-all">
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="text-2xl font-black mb-2 text-slate-800">Premium Content</h3>
            <p className="text-slate-500 mb-8 text-sm leading-relaxed">
              This lesson is for premium members only.<br/>Upgrade now to get <b>unlimited access to</b><br/>all classes and the wordbook!
            </p>
            <div className="flex flex-col gap-3">
              <button 
  // ★ SALES_PAGE_URL을 PRICE_PAGE_URL로 바꾸고, 중간에 parent. 를 추가했습니다!
  onClick={() => window.parent.location.href = PRICE_PAGE_URL} 
  className="w-full bg-[#3713ec] text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all"
>
  Upgrade Now 🚀
</button>
              <button 
                onClick={() => setShowPremiumPopup(false)} 
                className="w-full text-slate-400 font-medium py-2 text-sm hover:text-slate-600 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;