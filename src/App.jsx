import React, { useState, useEffect, useRef } from 'react';
// ★ 필요한 아이콘들 (사용하시는 라이브러리에 맞게 유지해주세요, 예: lucide-react)
import { MonitorPlay, FileText, Mic } from 'lucide-react'; 

// ★ 데이터 파일 임포트 (대표님 환경에 맞게 경로를 맞춰주세요)
// import classData from './class_data.json';

const App = () => {
  // 1. 기본 상태 관리
  const [appMode, setAppMode] = useState('class');
  const isDemoMode = new URLSearchParams(window.location.search).get('demo') === 'true';
  const [contentTab, setContentTab] = useState('textbook'); // 'textbook' or 'shadowing'
  
  // (임시 데이터 연동: 실제 사용하시는 데이터 상태로 교체하시면 됩니다)
  const [selectedLesson, setSelectedLesson] = useState({
    // 예시 데이터 구조
    web_content: "", 
    pdf_url: "https://talkori.com/wp-content/uploads/2026/01/chl5-20-p.pdf"
  });

  // 2. 반응형(모바일) 감지
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = windowWidth <= 768;

  // 3. 웹 교재(HTML) 영역 참조
  const webContentRef = useRef(null);

  // 4. HTML 인터랙션 (퀴즈 & 스마트 토글) 통합 엔진
  useEffect(() => {
    if (!webContentRef.current) return;
    const container = webContentRef.current;

    // [전역 함수] 퀴즈 채점 로직
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

    // [이벤트 리스너] 스마트 토글 (1강, 5강 옛날 태그까지 모두 감지)
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
      container.removeEventListener('click', handleToggleClick);
      delete window.handleChoice;
      delete window.checkQuiz;
    };
  }, [selectedLesson, contentTab]);


  // 5. 화면 렌더링 (UI)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      
      {/* 탭 네비게이션 예시 */}
      <div className="w-full max-w-[900px] flex bg-white rounded-t-2xl shadow-sm border-b">
        <button 
          onClick={() => setContentTab('textbook')}
          className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 ${contentTab === 'textbook' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
        >
          <FileText size={18} /> TEXTBOOK
        </button>
        <button 
          onClick={() => setContentTab('shadowing')}
          className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 ${contentTab === 'shadowing' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
        >
          <Mic size={18} /> SHADOWING
        </button>
      </div>

      {/* 본문 영역 */}
      <div className="w-full max-w-[900px] bg-white shadow-xl rounded-b-2xl">
        {contentTab === 'textbook' && (
          <div className="flex flex-col">
            
            {/* HTML 콘텐츠 영역 */}
            {selectedLesson?.web_content && (
              <div 
                ref={webContentRef}
                dangerouslySetInnerHTML={{ __html: selectedLesson.web_content }}
                className="w-full"
              />
            )}

            {/* ★ Plan B: 하이브리드 PDF 아이프레임 (모바일은 구글 뷰어 우회, PC는 네이티브) ★ */}
            {selectedLesson?.pdf_url && (
              <div className="w-full h-[600px] md:h-[800px] bg-[#525659] rounded-b-2xl overflow-hidden relative">
                {isMobile ? (
                  <iframe 
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedLesson.pdf_url)}&embedded=true`}
                    className="w-full h-full border-0"
                    title="Talkori Textbook Mobile"
                  />
                ) : (
                  <iframe 
                    src={`${selectedLesson.pdf_url}#toolbar=0&navpanes=0&view=FitH`}
                    className="w-full h-full border-0"
                    title="Talkori Textbook PC"
                  />
                )}
              </div>
            )}
            
          </div>
        )}
      </div>

      {/* ★ 필수 CSS 주입 (리액트 문법에 맞게 백틱과 중괄호로 감쌈) ★ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;900&family=Noto+Sans+KR:wght@400;700;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@100..700&display=swap');

        body { font-family: 'Lexend', sans-serif; }
        .korean-text { font-family: 'Noto Sans KR', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        
        /* 아이콘 텍스트 깨짐 방어 */
        .material-symbols-outlined { 
          text-transform: none !important; 
          font-family: 'Material Symbols Outlined' !important;
          font-feature-settings: "liga" !important;
          font-variant-ligatures: normal !important;
          white-space: nowrap !important;
          letter-spacing: normal !important;
        } 

        /* 컬러 강제 복구 */
        .text-tk-primary { color: #526ae5 !important; }
        .bg-tk-primary { background-color: #526ae5 !important; }
        .border-tk-primary { border-color: #526ae5 !important; }
        .bg-tk-primary\\/5 { background-color: rgba(82, 106, 229, 0.05) !important; }
        .rounded-tk { border-radius: 1.5rem !important; }
        
        /* 카드 플립 애니메이션 엔진 */
        .flip-card { perspective: 1000px !important; }
        .flip-card-inner { transition: transform 0.6s !important; transform-style: preserve-3d !important; position: relative !important; width: 100% !important; height: 100% !important; }
        .flip-card-front, .flip-card-back { backface-visibility: hidden !important; -webkit-backface-visibility: hidden !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; }
        .flip-card.flipped .flip-card-inner { transform: rotateY(180deg) !important; }
        .flip-card-back { transform: rotateY(180deg) !important; }
      `}</style>

    </div>
  );
};

export default App;