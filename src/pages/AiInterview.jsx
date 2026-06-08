import React from 'react';
import SideNavBar from '../components/SideNavBar.jsx';

export default function AiInterview() {
  return (
    <div className="page-export page-ai-interview bg-surface text-on-surface">
      {/* SideNavBar Shell */}
      <SideNavBar />
      {/* TopNavBar Shell */}
      <header className="fixed top-0 right-0 w-[calc(100%-18rem)] z-30 bg-white/80 dark:bg-[#0e0e0e]/80 backdrop-blur-md flex justify-between items-center h-20 px-10 font-plus-jakarta">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold text-[#a83206]">Placement Readiness</span>
        </div>
        <div className="flex items-center gap-6 flex-1 justify-end">
          <div className="relative w-80 group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-[#ff784e] transition-colors">search</span>
            <input className="w-full bg-surface-container-low border-none rounded-full py-2.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-[#ff784e]/20 focus:bg-white transition-all" placeholder="Search resources..." type="text" />
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-all relative">
              <span className="material-symbols-outlined text-neutral-600" data-icon="notifications">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-orange-600 rounded-full border-2 border-white" />
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-all">
              <span className="material-symbols-outlined text-neutral-600" data-icon="settings">settings</span>
            </button>
            <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-orange-100 ml-2">
              <img alt="User Avatar" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuATJihYl-3-VAaoWVq9OV5u9pfoIdjwcwP_fQjvrLMEzwXMpLHvvZrrVJFHiKOYd3nUad4PWehoG__NTYWAkadJQwJdkDqrbo5LnwnChcpBmYO5d6jATozshizi6Bf4b3e-Be9emniBHKQQmZhNFLXBE9vliJUw6qy7cbKziYg8Oe5P_azb6I7FuP07Y5md7Fbwi0oN5CCAtwV6U7FCAcVUHP3Jg7GZL8Zoi7A0pz_PZVsH8BVIGgQp6Dnsy211R1eK4NP3EHg35go" />
            </div>
          </div>
        </div>
      </header>
      {/* Main Content Canvas */}
      <main className="ml-72 pt-28 p-8 min-h-[calc(100vh-80px)]">
        <div className="max-w-6xl mx-auto flex gap-8">
          {/* Chat Interface Area */}
          <div className="flex-1 flex flex-col bg-surface-container-lowest rounded-xl shadow-2xl shadow-black/5 border border-outline-variant/10 overflow-hidden min-h-[750px] relative">
            {/* Chat Session Header */}
            <div className="px-8 py-5 bg-white border-b border-outline-variant/10 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-tertiary-container/30 rounded-2xl flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined" style={{fontVariationSettings: '"FILL" 1'}}>psychology</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Interviewing for: <span className="text-primary">Junior Web Developer</span></h2>
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant font-medium">
                    <span className="material-symbols-outlined text-xs">timer</span>
                    Duration: 15:42
                  </div>
                </div>
              </div>
              <button className="px-6 py-2.5 bg-error/10 text-error hover:bg-error/20 font-bold rounded-full transition-all text-sm flex items-center gap-2">
                Finish Interview
                <span className="material-symbols-outlined text-lg">exit_to_app</span>
              </button>
            </div>
            {/* Chat Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* AI Message */}
              <div className="flex items-start gap-4 max-w-[85%]">
                <div className="w-10 h-10 rounded-full bg-tertiary-container flex-shrink-0 flex items-center justify-center text-tertiary ring-4 ring-tertiary-container/20">
                  <span className="material-symbols-outlined text-xl">smart_toy</span>
                </div>
                <div className="bg-tertiary-container/30 p-6 rounded-r-xl rounded-bl-xl text-on-surface leading-relaxed font-medium">
                  Welcome! It's great to have you here today. To start things off, could you tell me about a particularly challenging web development project you worked on recently? What was the biggest obstacle, and how did you overcome it?
                </div>
              </div>
              {/* User Message */}
              <div className="flex items-start gap-4 max-w-[85%] ml-auto flex-row-reverse">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex-shrink-0 overflow-hidden ring-4 ring-orange-50">
                  <img alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuALcUT_P3Yu3TimmkBAunBDa3_ZyQXNkiOovFdU4mjHnh7R3tGBG3eQS5tYCB-fNcr12yAVYXA3gPPDTgJxYfAZe0FKEekRwxjbS2UTvqIM9gi7kBuk1IF4thtWPzpXjW3TAxVKZljxqMmQUFAGSqqDp3BTkjd1pp8eDWJFvPoLhIkEeRQLKHFY-dBhxOi5fdHdbuBMBALSAul4Ol7u5-NioOxVzkfq9Xtzd_HqlLyJl90g1Twob36P-LAqERLb65BZ4X4Fq8RFPtk" />
                </div>
                <div className="bg-white border border-outline-variant/20 p-6 rounded-l-xl rounded-br-xl text-on-surface leading-relaxed shadow-sm">
                  I recently built a real-time collaborative code editor using React and WebSockets. The biggest challenge was managing state synchronization across multiple users while maintaining performance. I solved it by implementing an Operational Transformation (OT) algorithm and optimizing the Socket.io emitters.
                </div>
              </div>
              {/* AI Message */}
              <div className="flex items-start gap-4 max-w-[85%]">
                <div className="w-10 h-10 rounded-full bg-tertiary-container flex-shrink-0 flex items-center justify-center text-tertiary ring-4 ring-tertiary-container/20">
                  <span className="material-symbols-outlined text-xl">smart_toy</span>
                </div>
                <div className="bg-tertiary-container/30 p-6 rounded-r-xl rounded-bl-xl text-on-surface leading-relaxed font-medium">
                  That's an impressive use of OT algorithms! How did you handle edge cases like network latency or disconnected users during those synchronization events?
                </div>
              </div>
              {/* User Typing Simulation */}
              <div className="flex items-center gap-2 text-on-surface-variant italic text-sm ml-14">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-pulse delay-75" />
                  <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-pulse delay-150" />
                </span>
                Thinking...
              </div>
            </div>
            {/* Chat Input Area */}
            <div className="p-6 bg-white border-t border-outline-variant/10">
              <div className="relative flex items-center gap-3">
                <button className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors text-neutral-500">
                  <span className="material-symbols-outlined">mic</span>
                </button>
                <div className="flex-1 relative">
                  <input className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-full py-4 px-6 pr-14 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-inner" placeholder="Type your response here..." type="text" />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: '"FILL" 1'}}>send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Feedback Sidebar Panel */}
          <div className="w-80 flex flex-col gap-6">
            {/* Sentiment Tracking */}
            <div className="bg-surface-container-low p-6 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-on-surface-variant text-sm tracking-wide uppercase">Real-time Insights</h3>
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span>Confidence</span>
                    <span className="text-primary">82%</span>
                  </div>
                  <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                    <div className="h-full bg-primary-container w-[82%] rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span>Clarity</span>
                    <span className="text-secondary">94%</span>
                  </div>
                  <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                    <div className="h-full bg-secondary-container w-[94%] rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            {/* Key Keywords Detected */}
            <div className="bg-surface-container-low p-6 rounded-xl space-y-4">
              <h3 className="font-bold text-on-surface-variant text-sm tracking-wide uppercase">Keywords Tracked</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 bg-white rounded-full text-xs font-bold border border-outline-variant/20">WebSocket</span>
                <span className="px-3 py-1.5 bg-white rounded-full text-xs font-bold border border-outline-variant/20">Operational Transformation</span>
                <span className="px-3 py-1.5 bg-white rounded-full text-xs font-bold border border-outline-variant/20">Sync State</span>
                <span className="px-3 py-1.5 bg-white rounded-full text-xs font-bold border border-outline-variant/20">React Context</span>
              </div>
            </div>
            {/* AI Tips */}
            <div className="bg-tertiary-container/20 p-6 rounded-xl border border-tertiary-container/30">
              <div className="flex items-center gap-3 text-tertiary mb-3">
                <span className="material-symbols-outlined">lightbulb</span>
                <h4 className="font-bold text-sm">Quick Hint</h4>
              </div>
              <p className="text-sm text-on-tertiary-container leading-relaxed">
                Try to mention how you specifically optimized for **mobile users** in that project. Interviewers love hearing about cross-platform considerations!
              </p>
            </div>
            {/* Session Stats */}
            <div className="mt-auto p-4 border border-outline-variant/20 rounded-xl bg-white/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                  <span className="material-symbols-outlined">equalizer</span>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase">Performance Tier</p>
                  <p className="font-bold text-neutral-900">Advanced Developer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Post-Interview Success Modal (Example View - Hidden by default but shown for design representation) */}
      <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6 hidden">
        <div className="bg-surface max-w-3xl w-full rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
          <div className="bg-white p-12 text-center border-b border-outline-variant/10">
            <div className="w-24 h-24 bg-primary-container rounded-full mx-auto flex items-center justify-center text-on-primary-container mb-6 shadow-xl shadow-primary-container/20">
              <span className="material-symbols-outlined text-5xl">verified</span>
            </div>
            <h2 className="text-4xl font-black text-on-surface mb-2 tracking-tight">88% Readiness Score</h2>
            <p className="text-on-surface-variant font-medium text-lg">You're almost ready for the real thing! Your technical depth is exceptional.</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-outline-variant/10 bg-surface-container-lowest">
            <div className="p-8 text-center">
              <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Technical</p>
              <p className="text-2xl font-bold text-on-surface">92/100</p>
            </div>
            <div className="p-8 text-center">
              <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Soft Skills</p>
              <p className="text-2xl font-bold text-on-surface">78/100</p>
            </div>
            <div className="p-8 text-center">
              <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Confidence</p>
              <p className="text-2xl font-bold text-on-surface">85/100</p>
            </div>
          </div>
          <div className="p-10 bg-white space-y-6">
            <div>
              <h4 className="font-bold text-on-surface flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary">chat_bubble</span>
                Key Feedback
              </h4>
              <p className="text-on-surface-variant leading-relaxed">
                Strong understanding of architectural patterns. You articulated complex problems well. Minor point: Try to use fewer filler words (like "um" and "basically") when explaining your socket implementation.
              </p>
            </div>
            <div className="flex gap-4">
              <button className="flex-1 py-4 bg-primary text-white font-bold rounded-xl hover:scale-[1.02] transition-transform">Share to Profile</button>
              <button className="flex-1 py-4 bg-surface-container text-on-surface font-bold rounded-xl hover:bg-surface-container-high transition-colors">Back to Dashboard</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
  );
}
