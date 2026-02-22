import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Play, ChevronLeft, ChevronRight, Volume2,
  Menu, X, Zap, Gauge, ArrowLeft, LogOut,
  GraduationCap, LayoutGrid, Lock, Sparkles,
  BookOpen, HelpCircle, Activity, Map, MessageCircle, Lightbulb, Waves, Target,
  CheckCircle2, Check, MonitorPlay, BookA, ChevronDown, FileText, Mic
} from 'lucide-react';

// ★ 자체 PDF 엔진 부품 불러오기
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF 워커(보조 일꾼) 설정 (버전에 맞는 일꾼을 CDN에서 데려옵니다)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import classData from './class_data.json';
import vocaData from './voca_data.json';

const ALLOWED_ORIGIN = "https://talkori.com";
const SALES_PAGE_URL = "https://talkori.com";
const BUNNY_CDN_HOST = "https://talkori.b-cdn.net";
const CDN_BASE_URL = `${BUNNY_CDN_HOST}/audio_tk`;
const CLASS_AUDIO_BASE_URL = `${BUNNY_CDN_HOST}/audio_class`;
const STORAGE_KEY = 'talkori_progress_v1';

const App = () => {
  const [appMode, setAppMode] = useState('class'); 
  const isDemoMode = new URLSearchParams(window.location.search).get('demo') === 'true';

  // 창 크기를 계산해서 모바일일 때 PDF 크기를 딱 맞게 조절하기 위한 상태
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = windowWidth <= 768;

  // PDF 페이지 수 상태
  const [numPages, setNumPages] = useState(null);

  // ==========================================
  // [웹 교재 (HTML) 필수 스크립트 전역 주입]
  // ==========================================
  useEffect(() => {
    window.handleChoice = (element, isCorrect, feedbackId) => {
      const parentContainer = element.closest('.flex-col');
      if (!parentContainer) return;
      const options = parentContainer.querySelectorAll('.quiz-option');
      const feedbackArea = document.getElementById(feedbackId);
      const resultText = document.getElementById('feedback-result');

      options.forEach(opt => {
        opt.style.borderColor = "#fff";
        opt.style.backgroundColor = "#fff";
        opt.style.color = "#334155";
      });

      if (isCorrect) {
        element.style.borderColor = "#22c55e";
        element.style.backgroundColor = "#f0fdf4";
        element.style.color = "#15803d";
        if (resultText) {
          resultText.innerText = "✅ Correct!";
          resultText.style.color = "#22c55e";
        }
      } else {
        element.style.borderColor = "#ef4444";
        element.style.backgroundColor = "#fef2f2";
        element.style.color = "#b91c1c";
        if (resultText) {
          resultText.innerText = "❌ Try Again!";
          resultText.style.color = "#ef4444";
        }
      }
      if (feedbackArea) feedbackArea.classList.remove('hidden');
    };

    window.toggleDesire = (id) => {
      const switchEl = document.getElementById('switch-' + id);
      const korText = document.getElementById('kor-' + id);
      const engText = document.getElementById('eng-' + id);
      if (!switchEl || !korText || !engText) return;
      
      const isChecked = switchEl.checked;
      korText.innerText = isChecked ? korText.getAttribute('data-opt2') : korText.getAttribute('data-opt1');
      engText.innerText = isChecked ? engText.getAttribute('data-eng2') : engText.getAttribute('data-eng1');
      korText.style.color = isChecked ? '#526ae5' : '#1e293b';
    };
  }, []);

  // ==========================================
  // [단어장 상태 및 로직] 
  // ==========================================
  const [showGuideMain, setShowGuideMain] = useState(true);
  const [progress, setProgress] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : { visitedWords: [], playedExamples: [] };
    } catch (e) { return { visitedWords: [], playedExamples: [] }; }
  });

  const saveProgress = (newProgress) => {
    setProgress(newProgress);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
  };

  const CURRICULUM = useMemo(() => {
    if (!Array.isArray(vocaData)) return [];
    const groups = {};
    vocaData.forEach(item => {
      const dayKey = String(item.day || "1");
      if (!groups[dayKey]) groups[dayKey] = { chapterId: dayKey, title: `Day ${dayKey}: ${item.situation || "Learning"}`, words: [] };
      groups[dayKey].words.push({ id: String(item.id), word: item.word, meaning: item.meaning, usage_note: item.usage_note, examples: item.examples || [] });
    });
    const allChapters = Object.values(groups);
    if (isDemoMode) return allChapters.slice(0, 3);
    return allChapters;
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

  const handleWordSelect = (word) => {
    setActiveWord(word); setCurrentExIdx(0);
    if (!progress.visitedWords.includes(word.id)) saveProgress({ ...progress, visitedWords: [...progress.visitedWords, word.id] });
  };

  const getAudioUrl = (wordId, exIndex = null) => {
    const cleanId = String(wordId).trim();
    if (exIndex === null) return `${CDN_BASE_URL}/w_${cleanId}.mp3`;
    const formattedNum = String(exIndex + 1).padStart(2, '0');
    return `${CDN_BASE_URL}/w_${cleanId}_ex_${formattedNum}.mp3`;
  };

  const toggleSpeed = () => setPlaybackRate(prev => (prev === 1.0 ? 0.8 : prev === 0.8 ? 0.6 : 1.0));
  const handleExit = () => { if (isDemoMode) window.parent.location.href = SALES_PAGE_URL; else window.parent.postMessage('exit_talkori', '*'); };

  const getChapterProgress = (chapter) => {
    if (!chapter || !chapter.words) return 0;
    let totalItems = 0; let completedItems = 0;
    chapter.words.forEach(word => {
      totalItems += 1;
      if (progress.visitedWords.includes(word.id)) completedItems += 1;
      word.examples.forEach((_, exIdx) => {
        totalItems += 1;
        if (progress.playedExamples.includes(`${word.id}_${exIdx}`)) completedItems += 1;
      });
    });
    return totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
  };

  const GuideBook = () => (
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
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">You know the words.<br/><span className="text-[#3713ec]">So why do you freeze?</span></h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">Stop memorizing lists like <span className="font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">Delicious = 맛있다</span>.<br className="hidden md:block"/> Real conversations don't happen in single words.</p>
        </section>
        <div className="text-center pb-10 animate-in slide-in-from-bottom-4 duration-700 delay-500">
          <button onClick={() => setShowGuideMain(false)} className="w-full md:w-auto px-12 py-5 bg-[#3713ec] text-white text-lg font-bold rounded-2xl shadow-xl shadow-[#3713ec]/30 hover:scale-105 hover:bg-[#2a0eb5] transition-all flex items-center justify-center gap-3">
            Start Day 1 Now <ArrowLeft className="rotate-180" size={20}/>
          </button>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // [강의실 상태 및 로직] 
  // ==========================================
  const [selectedCourse, setSelectedCourse] = useState('MAIN233');
  const [openSection, setOpenSection] = useState(null); 
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [videoTab, setVideoTab] = useState('logic');
  const [contentTab, setContentTab] = useState('pdf');

  const groupedClassData = useMemo(() => {
    const courses = {
      'MAIN233': { title: 'Real Korean Patterns 233', sections: [] },
      'MUSTKNOW': { title: 'Must-Know Patterns', sections: [] }, 
      'DAILY': { title: 'Daily Korean', sections: [] } 
    };

    const mainLessons = classData.filter(l => l.course === 'MAIN233');
    const mustKnowLessons = classData.filter(l => l.course === 'MUSTKNOW'); 
    const dailyLessons = classData.filter(l => l.course === 'DAILY'); 

    if (mainLessons.length > 0) {
      const ranges = [
        { t: "1. Solutions & Suggestions", end: 25 }, { t: "2. Intentions & Excuses", end: 50 },
        { t: "3. Guessing & Gossip", end: 75 }, { t: "4. Logic & Connections", end: 99 },
        { t: "5. Emotions & Attitudes", end: 122 }, { t: "6. Habits & Experience", end: 145 },
        { t: "7. Emphasis & Nuance", end: 172 }, { t: "8. Comparison & Passive", end: 196 },
        { t: "9. Exaggeration & Lament", end: 218 }, { t: "10. Quoting & Recall", end: 235 }
      ];
      let start = 0;
      ranges.forEach(r => {
        courses['MAIN233'].sections.push({ title: r.t, lessons: mainLessons.slice(start, r.end) });
        start = r.end;
      });
    }

    if (mustKnowLessons.length > 0) {
      courses['MUSTKNOW'].sections = [
        { title: "Chapter 1", lessons: mustKnowLessons.slice(0, 20) }, 
        { title: "Chapter 2", lessons: mustKnowLessons.slice(20, 40) },
        { title: "Chapter 3", lessons: mustKnowLessons.slice(40, 60) }, 
        { title: "Chapter 4", lessons: mustKnowLessons.slice(60, 81) }
      ];
    } else { courses['MUSTKNOW'].sections = [{ title: "업데이트 준비 중", lessons: [] }]; }

    if (dailyLessons.length > 0) {
      courses['DAILY'].sections = [
        { title: "Season 1", lessons: dailyLessons.slice(0, 30) }, 
        { title: "Season 2", lessons: dailyLessons.slice(30, 60) }
      ];
    } else { courses['DAILY'].sections = [{ title: "업데이트 준비 중", lessons: [] }]; }

    return courses;
  }, []);

  useEffect(() => {
    const courseObj = groupedClassData[selectedCourse];
    if (courseObj && courseObj.sections.length > 0) {
      setOpenSection(courseObj.sections[0].title);
      if (courseObj.sections[0].lessons.length > 0) setSelectedLesson(courseObj.sections[0].lessons[0]);
      else setSelectedLesson(null);
    }
  }, [selectedCourse, groupedClassData]);

  useEffect(() => {
    if (selectedLesson?.course === 'MAIN233') {
      const availableTabs = ['shorts', 'logic', 'commentary'].filter(t => selectedLesson.video_urls?.[t]);
      if (availableTabs.length > 0 && !availableTabs.includes(videoTab)) {
        setVideoTab(availableTabs.includes('logic') ? 'logic' : availableTabs[0]);
      }
    }
    setContentTab('pdf');
  }, [selectedLesson]);

  const renderMedia = (url) => {
    if (!url) return <div className="text-white/50 font-bold flex flex-col items-center gap-2"><MonitorPlay size={40} className="opacity-50"/>영상/음원이 아직 준비되지 않았습니다.</div>;
    if (url.includes('youtu.be') || url.includes('youtube.com')) {
      let vid = "";
      if (url.includes('youtu.be/')) vid = url.split('youtu.be/')[1]?.split('?')[0];
      else if (url.includes('v=')) vid = url.split('v=')[1]?.split('&')[0];
      else if (url.includes('embed/')) vid = url.split('embed/')[1]?.split('?')[0];
      return <iframe className="w-full h-full rounded-[2rem]" src={`https://www.youtube.com/embed/${vid}?rel=0`} allowFullScreen></iframe>;
    }
    if (url.match(/\.(m4a|mp3|wav)$/i)) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full">
          <Volume2 size={48} className="text-white/30 mb-6" />
          <audio controls src={url} className="w-3/4 outline-none"></audio>
        </div>
      );
    }
    return <video controls src={url} className="w-full h-full object-contain outline-none rounded-[2rem]"></video>;
  };

  return (
    <div className="flex h-screen bg-[#f6f6f8] font-sans text-slate-800 overflow-hidden relative">
      
      {/* 1. 사이드바 */}
      <div className={`w-80 bg-white border-r border-slate-200 shadow-xl flex flex-col h-full shrink-0 z-20 ${isSidebarOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'hidden md:flex'}`}>
        <div className="p-6 border-b border-slate-50 shrink-0 bg-[#3713ec] text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <GraduationCap size={28} />
            <div>
              <h1 className="font-black text-2xl tracking-tight">Talkori</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Mastery Platform</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-white/70 hover:text-white"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {appMode === 'class' ? (
            <div className="animate-in fade-in duration-300">
              <div className="mb-6 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Select Course</p>
                {Object.keys(groupedClassData).map(cId => (
                  <button 
                    key={cId} onClick={() => setSelectedCourse(cId)}
                    className={`w-full text-left p-3 rounded-xl text-sm font-bold transition-all ${selectedCourse === cId ? 'bg-[#3713ec] text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    {groupedClassData[cId].title}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Curriculum</p>
                {groupedClassData[selectedCourse]?.sections.map((section, sIdx) => (
                  <div key={sIdx} className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
                    <button onClick={() => setOpenSection(openSection === section.title ? null : section.title)} className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <span className="font-bold text-sm text-slate-800 text-left">{section.title}</span>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform ${openSection === section.title ? 'rotate-180' : ''}`} />
                    </button>
                    {openSection === section.title && (
                      <div className="p-2 space-y-1 bg-white border-t border-slate-100">
                        {section.lessons.length > 0 ? section.lessons.map((lesson, lIdx) => (
                          <div 
                            key={lesson.lesson_id} onClick={() => { setSelectedLesson(lesson); setIsSidebarOpen(false); }}
                            className={`p-3 text-xs font-bold rounded-lg cursor-pointer transition-all ${selectedLesson?.lesson_id === lesson.lesson_id ? 'bg-blue-50 text-[#3713ec]' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            <span className="text-slate-400 mr-2">{lIdx + 1}.</span> {lesson.title}
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
                  <div key={idx} onClick={() => { setActiveChapter(chapter); setActiveWord(null); setShowGuideMain(false); setIsSidebarOpen(false); }} className={`flex items-start gap-4 p-3 rounded-xl cursor-pointer transition-all mb-2 ${isActive ? 'bg-[#3713ec]/5 border border-[#3713ec]/10' : 'hover:bg-slate-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${isActive ? 'bg-[#3713ec] text-white' : 'bg-slate-100 text-slate-400'}`}>{chapter.chapterId}</div>
                    <div className="flex-1 overflow-hidden">
                      <h3 className={`font-bold text-sm truncate ${isActive ? 'text-[#3713ec]' : 'text-slate-600'}`}>{chapter.title}</h3>
                      <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex items-center"><div className="h-full bg-[#3713ec] transition-all duration-500" style={{ width: `${percentage}%` }}></div></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. 메인 화면 영역 */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-50">
        <nav className="h-16 bg-white border-b border-slate-200 flex items-center justify-between md:justify-center px-6 shrink-0 shadow-sm z-10 relative">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-500"><Menu size={24}/></button>
          <div className="flex gap-4">
            <button onClick={() => { setAppMode('class'); stopCurrentAudio(); }} className={`px-6 md:px-8 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-black uppercase transition-all flex items-center gap-2 ${appMode === 'class' ? 'bg-[#3713ec] text-white shadow-lg scale-105' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}><MonitorPlay size={18} /> Classroom</button>
            <button onClick={() => { setAppMode('voca'); stopCurrentAudio(); }} className={`px-6 md:px-8 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-black uppercase transition-all flex items-center gap-2 ${appMode === 'voca' ? 'bg-purple-600 text-white shadow-lg scale-105' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}><BookA size={18} /> Vocabulary</button>
          </div>
          <div className="w-8 md:hidden"></div>
        </nav>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          {appMode === 'class' ? (
            selectedLesson ? (
              <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in zoom-in-95 duration-300">
                <header className="space-y-2">
                  <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900 korean-text">{selectedLesson.title}</h1>
                  <div className="flex gap-4 text-[10px] md:text-xs font-bold text-slate-400 uppercase">
                    <span className="flex items-center gap-1"><MonitorPlay size={14}/> {groupedClassData[selectedCourse].title}</span>
                  </div>
                </header>

                {(() => {
                  const isMainCourse = selectedLesson.course === 'MAIN233';
                  if (isMainCourse) {
                    const availableTabs = ['shorts', 'logic', 'commentary'].filter(t => selectedLesson.video_urls?.[t]);
                    if (availableTabs.length === 0) return null;
                    return (
                      <section className="space-y-4">
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                          {availableTabs.map(t => (
                            <button key={t} onClick={() => setVideoTab(t)} 
                              className={`px-6 py-2 rounded-full shrink-0 text-[10px] font-black uppercase transition-all ${videoTab === t ? 'bg-[#3713ec] text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>
                              {t} Video
                            </button>
                          ))}
                        </div>
                        <div className="aspect-video bg-black rounded-2xl md:rounded-[2rem] shadow-xl relative border-4 border-slate-200 flex items-center justify-center">
                          {renderMedia(selectedLesson?.video_urls?.[videoTab])}
                        </div>
                      </section>
                    );
                  } else {
                    const subVideoUrl = selectedLesson?.video_urls?.video || selectedLesson?.video_urls?.shorts;
                    if (!subVideoUrl) return null;
                    return (
                      <section className="space-y-4">
                        <div className="aspect-video bg-black rounded-2xl md:rounded-[2rem] shadow-xl relative border-4 border-slate-200 flex items-center justify-center">
                          {renderMedia(subVideoUrl)}
                        </div>
                      </section>
                    );
                  }
                })()}
                
                <section className="bg-white rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="flex border-b border-slate-100">
                    <button onClick={() => setContentTab('pdf')} className={`flex-1 py-3 md:py-4 text-[10px] md:text-xs font-black tracking-widest transition-all flex items-center justify-center gap-1 md:gap-2 ${contentTab === 'pdf' ? 'text-[#3713ec] bg-blue-50/50' : 'text-slate-400 hover:bg-slate-50'}`}><FileText size={16}/> TEXTBOOK</button>
                    <button onClick={() => setContentTab('script')} className={`flex-1 py-3 md:py-4 text-[10px] md:text-xs font-black tracking-widest transition-all flex items-center justify-center gap-1 md:gap-2 ${contentTab === 'script' ? 'text-[#3713ec] bg-blue-50/50' : 'text-slate-400 hover:bg-slate-50'}`}><Mic size={16}/> SHADOWING</button>
                  </div>
                  
                  <div className="min-h-[500px] bg-slate-50/30">
                    {contentTab === 'pdf' ? (
                      selectedLesson.course === 'MAIN233' ? (
                        /* ★ 1. 메인 강의: 자체 PDF 엔진 렌더링 (모바일 완벽 대응) ★ */
                        selectedLesson.pdf_url ? (
                          <div className="bg-[#525659] p-4 flex flex-col items-center custom-scrollbar h-[600px] md:h-[800px] overflow-y-auto rounded-b-[2rem]">
                            <Document 
                              file={selectedLesson.pdf_url} 
                              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                              loading={<div className="text-white py-10">PDF 불러오는 중...</div>}
                              error={<div className="text-white bg-red-500/20 p-4 rounded-xl text-center">PDF를 불러오지 못했습니다. <br/>(워드프레스 CORS 권한 설정이 필요합니다.)</div>}
                            >
                              {Array.from(new Array(numPages), (el, index) => (
                                <Page 
                                  key={`page_${index + 1}`} 
                                  pageNumber={index + 1} 
                                  renderTextLayer={false} 
                                  renderAnnotationLayer={false}
                                  width={isMobile ? windowWidth - 60 : 700} // 모바일 화면에 꽉 차게 자동 조절!
                                  className="mb-4 shadow-xl"
                                />
                              ))}
                            </Document>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
                            <FileText size={48} className="mb-4 opacity-30"/>
                            <p className="font-bold text-sm">이 강의는 PDF 교재가 없습니다.</p>
                          </div>
                        )
                      ) : (
                        /* ★ 2. 서브 강의: 불필요한 패딩 싹 날려서 꽉 차게 보여주기 ★ */
                        selectedLesson.web_content ? (
                          <div className="w-full h-auto bg-white">
                            <div 
                              className="w-full text-left text-slate-800 leading-relaxed overflow-x-hidden"
                              dangerouslySetInnerHTML={{ __html: selectedLesson.web_content }} 
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
                            <FileText size={48} className="mb-4 opacity-30"/>
                            <p className="font-bold text-sm">웹 교재가 아직 등록되지 않았습니다.</p>
                          </div>
                        )
                      )
                    ) : (
                      <div className="p-4 md:p-8 space-y-3">
                        {selectedLesson.script && selectedLesson.script.length > 0 ? (
                          selectedLesson.script.map((line, idx) => (
                            <div key={idx} className="flex items-center gap-3 md:gap-4 p-3 md:p-6 bg-white hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200 rounded-2xl transition-all shadow-sm group">
                              <button 
                                onClick={() => {
                                  const audioUrl = `${CLASS_AUDIO_BASE_URL}/${line.audio}`;
                                  playAudio(audioUrl, 'class', `${selectedLesson.lesson_id}_${idx}`);
                                }}
                                className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center group-hover:bg-[#3713ec] group-hover:text-white group-hover:border-[#3713ec] transition-all shadow-sm"
                              >
                                <Volume2 size={18} />
                              </button>
                              <div className="flex-1">
                                <span className="text-[10px] font-bold text-[#3713ec] uppercase tracking-wider mb-1 block">
                                  {line.type || `Pattern ${idx + 1}`}
                                </span>
                                <p className="text-base md:text-lg font-bold text-slate-800 korean-text leading-snug break-keep">{line.ko}</p>
                                <p className="text-xs md:text-sm text-slate-500 mt-1 italic">{line.en}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
                            <Mic size={48} className="mb-4 opacity-30"/>
                            <p className="font-bold text-sm">오디오 스크립트가 아직 등록되지 않았습니다.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400 font-bold">좌측에서 레슨을 선택해주세요.</div>
            )
          ) : (
            <div className="flex-1 flex flex-col h-full relative overflow-hidden">
              {showGuideMain ? (
                <GuideBook />
              ) : !activeWord ? (
                <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar animate-in fade-in duration-300">
                  <header className="mb-8 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-purple-600 font-bold text-xs mb-1 uppercase tracking-wider"><Zap size={14} /> Matrix Learning System</div>
                      <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{activeChapter?.title}</h2>
                    </div>
                  </header>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-10">
                    {activeChapter?.words.map((word, idx) => {
                      const isVisited = progress.visitedWords.includes(word.id);
                      return (
                        <div key={idx} onClick={() => handleWordSelect(word)} className={`bg-white p-6 rounded-2xl border-b-4 transition-all cursor-pointer shadow-sm group relative ${isVisited ? 'border-purple-600 bg-purple-50/10' : 'border-slate-100 hover:border-purple-600 hover:-translate-y-1'}`}>
                          {isVisited && <div className="absolute top-4 right-4 text-purple-600"><CheckCircle2 size={20} className="fill-purple-100" /></div>}
                          <h4 className={`text-2xl font-bold my-1 transition-colors korean-text ${isVisited ? 'text-purple-600' : 'text-slate-800 group-hover:text-purple-600'}`}>{word.word}</h4>
                          <p className="text-sm font-medium text-slate-500">{word.meaning}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden bg-[#f6f6f8] animate-in fade-in duration-300">
                  <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
                    <button onClick={() => setActiveWord(null)} className="flex items-center gap-2 text-slate-500 font-bold text-sm hover:text-purple-600 transition-all"><ArrowLeft size={18} /> Back to List</button>
                  </header>
                  <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                          <h2 className="text-5xl font-black text-slate-900 mb-2 korean-text">{activeWord.word}</h2>
                          <p className="text-xl text-slate-500 font-medium mb-6">{activeWord.meaning}</p>
                          <button onClick={() => playAudio(getAudioUrl(activeWord.id), 'word', activeWord.id)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-purple-600 hover:text-white transition-all shadow-inner"><Volume2 size={20} /></button>
                        </div>
                        <div className="bg-purple-600 rounded-3xl p-8 md:p-10 text-white shadow-xl min-h-[300px] flex flex-col justify-center relative overflow-hidden">
                          <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest block mb-4">Pattern {currentExIdx + 1}: {activeWord.examples[currentExIdx]?.type}</span>
                          <h3 className="text-3xl md:text-4xl font-bold mb-4 korean-text break-keep leading-snug">{activeWord.examples[currentExIdx]?.ko}</h3>
                          <p className="text-white/70 text-lg mb-10 font-medium italic">{activeWord.examples[currentExIdx]?.en}</p>
                          <button onClick={() => playAudio(getAudioUrl(activeWord.id, currentExIdx), 'example', `${activeWord.id}_${currentExIdx}`)} className="w-16 h-16 bg-white text-purple-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform"><Volume2 size={32} className="fill-current" /></button>
                        </div>
                      </div>
                      <div className="lg:col-span-7 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full lg:max-h-[650px] overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                          <div className="grid grid-cols-1 gap-3">
                            {activeWord.examples.map((ex, idx) => {
                              const isPlayed = progress.playedExamples.includes(`${activeWord.id}_${idx}`);
                              return (
                                <button key={idx} onClick={() => { setCurrentExIdx(idx); playAudio(getAudioUrl(activeWord.id, idx), 'example', `${activeWord.id}_${idx}`); }} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group ${currentExIdx === idx ? 'border-purple-600 bg-purple-600 text-white shadow-lg' : 'border-slate-50 bg-slate-50/50 hover:border-purple-600/30 text-slate-600'}`}>
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs transition-colors ${currentExIdx === idx ? 'bg-white/20 text-white' : isPlayed ? 'bg-green-100 text-green-600' : 'bg-white text-slate-300'}`}>{isPlayed ? <Check size={14}/> : idx + 1}</div>
                                  <div className="flex-1 overflow-hidden">
                                    <p className={`text-[10px] font-bold uppercase mb-0.5 tracking-tighter ${currentExIdx === idx ? 'text-white/60' : 'text-slate-400'}`}>{ex.type}</p>
                                    <p className="font-bold korean-text truncate">{ex.ko}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </main>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;900&family=Noto+Sans+KR:wght@400;700;900&display=swap');
        body { font-family: 'Lexend', sans-serif; }
        .korean-text { font-family: 'Noto Sans KR', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};
export default App;