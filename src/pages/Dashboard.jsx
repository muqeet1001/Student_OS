import React from 'react';
import SideNavBar from '../components/SideNavBar.jsx';

export default function Dashboard() {
  return (
    <div className="page-export page-dashboard bg-background font-body text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      {/* SideNavBar Shell */}
      <SideNavBar />
      {/* Main Content Canvas */}
      <main className="ml-72 min-h-screen">
        {/* TopNavBar Shell */}
        <header className="w-full h-20 sticky top-0 z-40 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl flex justify-between items-center px-8 w-full max-w-full ml-auto">
          <div className="flex items-center gap-6 flex-1">
            <div className="relative w-full max-w-md focus-within:ring-2 focus-within:ring-orange-500/20 rounded-full bg-surface-container-low px-4 py-2 flex items-center gap-3">
              <span className="material-symbols-outlined text-outline" data-icon="search">search</span>
              <input className="bg-transparent border-none focus:ring-0 text-sm w-full font-medium" placeholder="Search placement readiness..." type="text" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant" data-icon="notifications">notifications</span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/20">
              <div className="text-right">
                <p className="text-sm font-bold font-headline">Alex Rivera</p>
                <p className="text-xs text-on-surface-variant">Senior Year • CS</p>
              </div>
              <img alt="User Avatar" className="w-10 h-10 rounded-full object-cover" data-alt="close-up portrait of a young man with a friendly expression in a professional headshot style with soft studio lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA665PuVX25zqa_eXlKqGTQTqvGpk25atsoYZBdmaitBPoD7bQ2Gy7uZiu-RSE8SUCwkkb2TtxO8rsfXMB2SU07dQ1NyVEoy8t6SxB9FrjcljI3B_zpZu-TIhMZMwoezzrMi4IkFwmGegbsALKmWl3rFjW9ImHmUiSLGs2M0O4Q5Hv4cR7UBNRzsov8plsrFXXXrJO9gKmdvfDiqLcnI1wXhKZf516VXZ5VAYX1HQyUl39oiU1pbWeJMNkVAPr1KTd_wU6h9wuptc4" />
            </div>
          </div>
        </header>
        {/* Dashboard Body */}
        <div className="p-8 max-w-7xl mx-auto">
          {/* Welcome Hero */}
          <section className="mb-10 flex items-end justify-between gap-8">
            <div className="space-y-2">
              <h2 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">Welcome back, Alex! 👋</h2>
              <p className="text-lg text-on-surface-variant max-w-2xl font-medium">You're making great progress. Today's goal: Improve your <span className="text-primary font-bold">System Design</span> score by completing one mock interview.</p>
            </div>
            <div className="flex items-center gap-2 bg-secondary-container px-6 py-3 rounded-full text-on-secondary-container font-bold text-sm shadow-sm">
              <span className="material-symbols-outlined" data-icon="trending_up">trending_up</span>
              Top 5% this week
            </div>
          </section>
          {/* Bento Grid Layout */}
          <div className="bento-grid">
            {/* Readiness Score Card */}
            <div className="col-span-12 md:col-span-5 lg:col-span-4 bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col items-center justify-center text-center">
              <div className="relative mb-6">
                {/* Custom Stylized Ring */}
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle className="text-surface-container" cx={96} cy={96} fill="transparent" r={88} stroke="currentColor" strokeWidth={12} />
                  <circle className="text-primary" cx={96} cy={96} fill="transparent" r={88} stroke="currentColor" strokeDasharray="552.92" strokeDashoffset="82.93" strokeLinecap="round" strokeWidth={12} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black font-headline text-on-surface">85%</span>
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">Readiness</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold font-headline mb-2">Ready to Apply</h3>
              <p className="text-on-surface-variant text-sm px-4">Your profile matches 92% of requirements for <span className="font-bold text-primary">Senior Frontend Engineer</span> roles.</p>
              <button className="mt-8 w-full py-4 bg-primary text-on-primary rounded-full font-bold hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20">
                View Matching Jobs
              </button>
            </div>
            {/* Coding Stats Card */}
            <div className="col-span-12 md:col-span-7 lg:col-span-8 bg-inverse-surface text-white p-8 rounded-xl shadow-2xl relative overflow-hidden group">
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-bold font-headline mb-1">Coding Proficiency</h3>
                    <p className="text-neutral-400">Activity last 30 days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black font-headline text-primary-fixed">458</p>
                    <p className="text-xs uppercase font-bold tracking-widest text-neutral-500">Solved</p>
                  </div>
                </div>
                {/* Bar Chart Visualization */}
                <div className="mt-auto grid grid-cols-3 gap-6 items-end">
                  <div className="space-y-3">
                    <div className="relative h-40 bg-neutral-800 rounded-2xl overflow-hidden">
                      <div className="absolute bottom-0 w-full bg-secondary-fixed transition-all duration-500" style={{height: '85%'}} />
                    </div>
                    <div className="text-center">
                      <p className="font-bold">Easy</p>
                      <p className="text-xs text-neutral-500">210/250</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="relative h-40 bg-neutral-800 rounded-2xl overflow-hidden">
                      <div className="absolute bottom-0 w-full bg-tertiary-fixed transition-all duration-500" style={{height: '60%'}} />
                    </div>
                    <div className="text-center">
                      <p className="font-bold">Medium</p>
                      <p className="text-xs text-neutral-500">185/300</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="relative h-40 bg-neutral-800 rounded-2xl overflow-hidden">
                      <div className="absolute bottom-0 w-full bg-primary-fixed transition-all duration-500" style={{height: '35%'}} />
                    </div>
                    <div className="text-center">
                      <p className="font-bold">Hard</p>
                      <p className="text-xs text-neutral-500">63/150</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative Background Glow */}
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
            </div>
            {/* Skill Badges Horizontal */}
            <div className="col-span-12 bg-surface-container-low p-8 rounded-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold font-headline">Verified Skillset</h3>
                <a className="text-primary font-bold text-sm flex items-center gap-1" href="#">Manage Skills <span className="material-symbols-outlined text-sm" data-icon="chevron_right">chevron_right</span></a>
              </div>
              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
                {/* Skill Pill */}
                <div className="flex-shrink-0 bg-surface-container-lowest p-2 pr-6 rounded-full flex items-center gap-3 shadow-sm border border-outline-variant/10">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <span className="material-symbols-outlined" data-icon="terminal">terminal</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">React.js</p>
                    <p className="text-[10px] uppercase font-black text-blue-500 tracking-tighter">Advanced</p>
                  </div>
                </div>
                <div className="flex-shrink-0 bg-surface-container-lowest p-2 pr-6 rounded-full flex items-center gap-3 shadow-sm border border-outline-variant/10">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <span className="material-symbols-outlined" data-icon="dns">dns</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">Node.js</p>
                    <p className="text-[10px] uppercase font-black text-green-500 tracking-tighter">Expert</p>
                  </div>
                </div>
                <div className="flex-shrink-0 bg-surface-container-lowest p-2 pr-6 rounded-full flex items-center gap-3 shadow-sm border border-outline-variant/10">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                    <span className="material-symbols-outlined" data-icon="schema">schema</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">Python</p>
                    <p className="text-[10px] uppercase font-black text-yellow-600 tracking-tighter">Intermediate</p>
                  </div>
                </div>
                <div className="flex-shrink-0 bg-surface-container-lowest p-2 pr-6 rounded-full flex items-center gap-3 shadow-sm border border-outline-variant/10">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <span className="material-symbols-outlined" data-icon="database">database</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">PostgreSQL</p>
                    <p className="text-[10px] uppercase font-black text-purple-500 tracking-tighter">Advanced</p>
                  </div>
                </div>
                <div className="flex-shrink-0 bg-surface-container-lowest p-2 pr-6 rounded-full flex items-center gap-3 shadow-sm border border-outline-variant/10">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <span className="material-symbols-outlined" data-icon="cloud_done">cloud_done</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">AWS Cloud</p>
                    <p className="text-[10px] uppercase font-black text-orange-500 tracking-tighter">Beginner</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Resume Score */}
            <div className="col-span-12 lg:col-span-6 bg-tertiary-container/30 p-8 rounded-xl border border-tertiary-fixed flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-tertiary-fixed rounded-2xl text-on-tertiary-fixed">
                    <span className="material-symbols-outlined" data-icon="article">article</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold font-headline">Resume ATS Score</h4>
                    <p className="text-sm text-on-tertiary-fixed-variant">Last updated 12h ago</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-on-tertiary-container">78</span>
                  <span className="text-xl font-bold text-on-tertiary-fixed-variant">/ 100</span>
                </div>
              </div>
              <button className="px-8 py-3 bg-inverse-surface text-white rounded-full font-bold hover:bg-neutral-800 transition-colors shadow-lg">
                Review now
              </button>
            </div>
            {/* AI Interview Score */}
            <div className="col-span-12 lg:col-span-6 bg-secondary-container/30 p-8 rounded-xl border border-secondary-fixed flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-secondary-fixed rounded-2xl text-on-secondary-fixed">
                    <span className="material-symbols-outlined" data-icon="videocam">videocam</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold font-headline">AI Interview Score</h4>
                    <p className="text-sm text-on-secondary-fixed-variant">Last attempt 2 days ago</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-on-secondary-container">92%</span>
                  <span className="text-sm font-bold text-green-700 bg-green-100 px-2 rounded">+4% up</span>
                </div>
              </div>
              <button className="px-8 py-3 bg-secondary-container text-on-secondary-container rounded-full font-bold hover:opacity-90 transition-opacity border border-on-secondary-container/10">
                Practice again
              </button>
            </div>
            {/* Recommendations / Next Steps */}
            <div className="col-span-12 bg-white p-8 rounded-xl shadow-sm border border-outline-variant/10">
              <h3 className="text-2xl font-bold font-headline mb-8">Recommended for You</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Action Card 1 */}
                <div className="group bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/10 hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5 cursor-pointer">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined" data-icon="psychology">psychology</span>
                  </div>
                  <h4 className="text-lg font-bold font-headline mb-2">Behavioral Mock</h4>
                  <p className="text-sm text-on-surface-variant mb-6">Master the STAR method for leadership and conflict resolution questions.</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-full">15 Mins</span>
                    <span className="material-symbols-outlined text-primary" data-icon="arrow_forward">arrow_forward</span>
                  </div>
                </div>
                {/* Action Card 2 */}
                <div className="group bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/10 hover:border-secondary/30 transition-all hover:shadow-xl hover:shadow-secondary/5 cursor-pointer">
                  <div className="w-12 h-12 rounded-2xl bg-secondary-container/30 text-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined" data-icon="terminal">terminal</span>
                  </div>
                  <h4 className="text-lg font-bold font-headline mb-2">Solve 5 Easy Problems</h4>
                  <p className="text-sm text-on-surface-variant mb-6">Focused on Arrays &amp; Hashing to maintain your daily solving streak.</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-secondary px-3 py-1 bg-secondary-container/50 rounded-full">Streak: 12</span>
                    <span className="material-symbols-outlined text-secondary" data-icon="arrow_forward">arrow_forward</span>
                  </div>
                </div>
                {/* Action Card 3 */}
                <div className="group bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/10 hover:border-tertiary/30 transition-all hover:shadow-xl hover:shadow-tertiary/5 cursor-pointer">
                  <div className="w-12 h-12 rounded-2xl bg-tertiary-container/30 text-tertiary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined" data-icon="history_edu">history_edu</span>
                  </div>
                  <h4 className="text-lg font-bold font-headline mb-2">Google PYQ Set</h4>
                  <p className="text-sm text-on-surface-variant mb-6">Review the last 3 years of technical interview patterns from Google.</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-tertiary px-3 py-1 bg-tertiary-container/50 rounded-full">High Impact</span>
                    <span className="material-symbols-outlined text-tertiary" data-icon="arrow_forward">arrow_forward</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
    
  );
}
