import React from 'react';
import SideNavBar from '../components/SideNavBar.jsx';

export default function CodingPractice() {
  return (
    <div className="page-export page-coding-practice bg-background font-body text-on-surface">
      {/* Sidebar Wrapper */}
      <SideNavBar />
      {/* Main Content Area */}
      <main className="ml-72 min-h-screen flex flex-col">
        {/* Top Navigation */}
        <header className="w-full h-20 sticky top-0 z-40 bg-white/80 backdrop-blur-xl flex justify-between items-center px-8 font-['Manrope'] font-semibold text-base">
          <div className="flex items-center gap-4 bg-surface-container-low px-4 py-2 rounded-full focus-within:ring-2 focus-within:ring-orange-500/20 w-96">
            <span className="material-symbols-outlined text-outline" data-icon="search">search</span>
            <input className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-outline" placeholder="Search problems or topics..." type="text" />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary-container/20 rounded-full">
              <span className="material-symbols-outlined text-secondary" style={{fontVariationSettings: '"FILL" 1'}}>bolt</span>
              <span className="text-secondary-fixed-dim font-bold text-sm">42 Day Streak</span>
            </div>
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant" data-icon="notifications">notifications</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-outline leading-tight">Welcome back,</p>
                <p className="text-sm font-bold text-on-surface leading-tight">Alex Rivera</p>
              </div>
              <img alt="User Avatar" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" data-alt="portrait of a confident young male professional with a friendly smile, outdoor urban background with soft natural lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQNRSO8JeG_NtyAif_TDsodf68DLiT7_UaBXA6_JTuYa7tRXCEIdbknglH0d-4YjVVYmLukRA4ryLXcoaBJyavLaqb6GDDqyCKnOtWewZhvyC2mZyKc7kJFvR9DR8txhXtdaan5kBJek3mR0Sk1IT16jLug061zxyrrWJibBHl_YhdFs00Zhco8kpQ6EHer2kiISq7UfOH1XFYwEYJ04dj4Vmy9Yulqi4JkRWYYeNJ3EomV73JhU8yyTELPHAObFVA85dDQXJiySs" />
            </div>
          </div>
        </header>
        {/* Editor Workspace */}
        <div className="flex-1 p-6 flex flex-col gap-6">
          {/* Problem Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-tertiary-container text-on-tertiary-container rounded-full text-[10px] font-bold tracking-widest uppercase font-headline">Medium</span>
                <div className="flex items-center gap-1 ml-2">
                  <span className="material-symbols-outlined text-xs text-outline" data-icon="apartment">apartment</span>
                  <span className="text-xs text-on-surface-variant font-medium">Amazon, Google, Meta</span>
                </div>
              </div>
              <h2 className="text-3xl font-black font-headline text-on-surface tracking-tight">Problem 243: Reverse a Linked List</h2>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-highest text-on-surface font-bold rounded-full transition-transform active:scale-95">
                <span className="material-symbols-outlined text-sm" data-icon="lightbulb">lightbulb</span>
                <span>Hint</span>
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-highest text-on-surface font-bold rounded-full transition-transform active:scale-95">
                <span className="material-symbols-outlined text-sm" data-icon="bookmark">bookmark</span>
                <span>Save</span>
              </button>
            </div>
          </div>
          {/* Main Layout Bento Grid */}
          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
            {/* Left Panel: Problem Description */}
            <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-xl shadow-sm flex flex-col overflow-hidden">
              <div className="p-1 flex border-b border-surface-container">
                <button className="flex-1 py-3 text-sm font-bold text-primary border-b-2 border-primary bg-primary/5">Description</button>
                <button className="flex-1 py-3 text-sm font-bold text-outline hover:text-on-surface transition-colors">Solutions</button>
                <button className="flex-1 py-3 text-sm font-bold text-outline hover:text-on-surface transition-colors">Submissions</button>
              </div>
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
                <div className="space-y-4">
                  <p className="text-on-surface leading-relaxed font-medium">
                    Given the <code className="bg-surface-container px-1.5 py-0.5 rounded font-mono text-sm">head</code> of a singly linked list, reverse the list, and return <em className="italic">the reversed list</em>.
                  </p>
                  <div className="relative py-4">
                    <img className="w-full rounded-lg opacity-80" data-alt="abstract visualization of a data structure using glowing geometric shapes and interconnected lines on a dark background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDofB4SN_j7ezH9r95bkit1xNFwc6G-Kgdl1ac910n8WtrFthFDmDo7TyFGET2k9l3bBVefiivhxvxozeKK1YzIxD7PG_HWoMZLkr4pjdiSgj-_wlh7kFBxN23y3EfLEvhzLkbM8uotsc_DlR_7G41bAq9c7O7Crap8FpPTZd9iatL2kx19K6FqprjwvcJmjIo_83bJxOdZktbOWjbStxrU14N5OevgoJNbZI6rCu5feoT3jpuC0B52WOOfr2XpacIiWqlw_-V31Ng" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/20">Conceptual Visualization</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-headline font-extrabold text-sm text-on-surface uppercase tracking-wider">Example 1:</h4>
                    <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 font-mono text-sm space-y-2">
                      <p><span className="text-outline">Input:</span> head = [1,2,3,4,5]</p>
                      <p><span className="text-outline">Output:</span> [5,4,3,2,1]</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-headline font-extrabold text-sm text-on-surface uppercase tracking-wider">Constraints:</h4>
                    <ul className="list-disc list-inside text-sm text-on-surface-variant space-y-1 font-medium">
                      <li>The number of nodes in the list is the range <code className="font-mono">[0, 5000]</code>.</li>
                      <li><code className="font-mono">-5000 ≤ Node.val ≤ 5000</code></li>
                    </ul>
                  </div>
                  <div className="p-4 bg-tertiary-container/10 rounded-xl border-l-4 border-tertiary">
                    <p className="text-xs text-tertiary-dim font-bold leading-relaxed">
                      <span className="material-symbols-outlined align-middle mr-1 text-sm" data-icon="info">info</span>
                      Follow up: A linked list can be reversed either iteratively or recursively. Could you implement both?
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* Right Panel: Code Editor */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-4 min-h-0">
              {/* Editor Shell */}
              <div className="flex-1 code-editor-gradient rounded-xl shadow-2xl overflow-hidden flex flex-col border border-white/5">
                {/* Editor Header */}
                <div className="h-12 bg-white/5 border-b border-white/10 flex items-center justify-between px-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
                      <span className="material-symbols-outlined text-sm text-primary-fixed" data-icon="javascript">javascript</span>
                      <select className="bg-transparent border-none text-white text-xs font-bold focus:ring-0 p-0 cursor-pointer">
                        <option className="bg-neutral-900">JavaScript</option>
                        <option className="bg-neutral-900">Python 3</option>
                        <option className="bg-neutral-900">Java</option>
                        <option className="bg-neutral-900">C++</option>
                      </select>
                    </div>
                    <div className="h-4 w-[1px] bg-white/10" />
                    <button className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs font-bold">
                      <span className="material-symbols-outlined text-sm" data-icon="settings">settings</span>
                      Editor Settings
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="p-1.5 text-white/50 hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-sm" data-icon="fullscreen">fullscreen</span>
                    </button>
                  </div>
                </div>
                {/* Main Editor Body */}
                <div className="flex-1 flex overflow-hidden font-mono text-[13px] leading-relaxed">
                  {/* Line Numbers */}
                  <div className="w-12 bg-black/30 text-white/20 py-4 flex flex-col items-center select-none text-right pr-2">
                    <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span><span>11</span><span>12</span><span>13</span><span>14</span>
                  </div>
                  {/* Code Content */}
                  <div className="flex-1 py-4 px-4 overflow-y-auto custom-scrollbar">
                    <pre className="text-white/90"><span className="text-orange-400">/**</span>{"\n"}<span className="text-orange-400"> * Definition for singly-linked list.</span>{"\n"}<span className="text-orange-400"> * function ListNode(val, next) {"{"}</span>{"\n"}<span className="text-orange-400"> *{"     "}this.val = (val===undefined ? 0 : val)</span>{"\n"}<span className="text-orange-400"> *{"     "}this.next = (next===undefined ? null : next)</span>{"\n"}<span className="text-orange-400"> * {"}"}</span>{"\n"}<span className="text-orange-400"> */</span>{"\n"}<span className="text-orange-400">/**</span>{"\n"}<span className="text-orange-400"> * @param {"{"}ListNode{"}"} head</span>{"\n"}<span className="text-orange-400"> * @return {"{"}ListNode{"}"}</span>{"\n"}<span className="text-orange-400"> */</span>{"\n"}<span className="text-purple-400">var</span> <span className="text-blue-300">reverseList</span> = <span className="text-purple-400">function</span>(<span className="text-orange-300">head</span>) {"{"}{"\n"}{"    "}<span className="text-purple-400">let</span> prev = <span className="text-blue-300">null</span>;{"\n"}{"    "}<span className="text-purple-400">let</span> curr = head;{"\n"}{"    "}{"\n"}{"    "}<span className="text-purple-400">while</span> (curr !== <span className="text-blue-300">null</span>) {"{"}{"\n"}{"        "}<span className="text-purple-400">let</span> nextTemp = curr.next;{"\n"}{"        "}curr.next = prev;{"\n"}{"        "}prev = curr;{"\n"}{"        "}curr = nextTemp;{"\n"}{"    "}{"}"}{"\n"}{"    "}{"\n"}{"    "}<span className="text-purple-400">return</span> prev;{"\n"}{"}"};</pre>
                  </div>
                </div>
                {/* Execution Results */}
                <div className="bg-black/50 border-t border-white/10">
                  <div className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-6">
                      <button className="flex items-center gap-2 text-white text-xs font-bold opacity-100">
                        <span className="material-symbols-outlined text-sm text-green-400" style={{fontVariationSettings: '"FILL" 1'}}>check_circle</span>
                        Console
                      </button>
                      <button className="flex items-center gap-2 text-white/50 text-xs font-bold hover:opacity-100">
                        Test Cases
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="px-6 py-2 bg-white/10 text-white font-bold rounded-lg text-sm hover:bg-white/20 transition-all active:scale-95">
                        Run Code
                      </button>
                      <button className="px-8 py-2 bg-primary-container text-on-primary-container font-black rounded-lg text-sm hover:shadow-[0_0_20px_rgba(255,120,78,0.3)] transition-all active:scale-95">
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Bottom Status Bar */}
              <div className="bg-surface-container-low rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs font-bold text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Connected
                  </span>
                  <span className="text-outline">|</span>
                  <span>Memory: 12.4 MB</span>
                  <span className="text-outline">|</span>
                  <span>Runtime: 0ms</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-outline">Autosaved 2m ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Floating Action for Help */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-inverse-surface text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50">
        <span className="material-symbols-outlined" data-icon="psychology">psychology</span>
      </button>
    </div>
    
  );
}
