import React from 'react';
import SideNavBar from '../components/SideNavBar.jsx';

export default function ResumeBuilder() {
  return (
    <div className="page-export page-resume-builder bg-surface font-body text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      {/* SideNavBar */}
      <SideNavBar />
      {/* TopAppBar (from COMPONENTS_21) */}
      <nav className="fixed top-0 right-0 w-[calc(100%-18rem)] z-30 flex justify-between items-center h-20 px-10 bg-white/80 dark:bg-[#0e0e0e]/80 backdrop-blur-md font-plus-jakarta">
        <div className="flex items-center gap-6">
          <span className="text-xl font-extrabold text-[#0e0e0e] dark:text-white">Resume Builder</span>
          <div className="hidden lg:flex items-center bg-surface-container-low px-4 py-1.5 rounded-full border border-outline-variant/10">
            <span className="text-xs font-label font-bold tracking-wider text-outline mr-3">ATS SCORE</span>
            <div className="w-24 h-2 bg-surface-container-highest rounded-full overflow-hidden relative">
              <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-primary-container w-[82%] rounded-full" />
            </div>
            <span className="ml-3 font-headline font-extrabold text-[#a83206]">82/100</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
            <input className="bg-gray-100 dark:bg-white/5 border-none rounded-full pl-9 pr-4 py-2 text-sm w-64 focus:ring-1 focus:ring-primary-container" placeholder="Search templates..." type="text" />
          </div>
          <div className="flex items-center gap-2">
            <button className="hover:bg-gray-100 dark:hover:bg-white/5 rounded-full p-2 transition-all active:opacity-80 active:scale-98">
              <span className="material-symbols-outlined text-gray-500">notifications</span>
            </button>
            <button className="hover:bg-gray-100 dark:hover:bg-white/5 rounded-full p-2 transition-all active:opacity-80 active:scale-98">
              <span className="material-symbols-outlined text-gray-500">settings</span>
            </button>
            <img alt="User Avatar" className="w-9 h-9 rounded-full ring-2 ring-primary-container/20 ml-2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDDNadEtcu5cxiembL5jwQQy46a9oM4BDYyjOv2HaRM6Rnd_CAyTYd8GpTckCb6isxW4QZtpeKZ8Rco-1L2X5KeEw7y-ynexdD9rSFqLG3jNQzH3CnMtvd-BaIwDyNygEN6zDShAxP8_1qchQrKrc7QUvhxc5TgkGfr4cmYDX3cRfVHaTHswZAEyuiqxN6F3341LlWOlf5HDaiXkGFQiGKNjx_N1whaDaVsuJE_XSYv46yuA5X0BI7hyrNN3kbAxNllEUG8fDYELfQ" />
          </div>
        </div>
      </nav>
      {/* Main Content Shell */}
      <main className="pl-72 pt-20 min-h-screen flex flex-col md:flex-row">
        {/* Left Side: Form Controls (Scrollable) */}
        <section className="w-full md:w-[45%] lg:w-[40%] h-[calc(100vh-80px)] overflow-y-auto bg-surface-container-low/30 px-6 py-8 border-r border-outline-variant/5">
          <div className="max-w-xl mx-auto space-y-8">
            {/* Section: Suggestions (Sticky Priority) */}
            <div className="bg-tertiary-container/20 rounded-xl p-5 border border-tertiary-container/30">
              <div className="flex items-center gap-2 mb-3 text-tertiary">
                <span className="material-symbols-outlined text-lg" data-icon="lightbulb">lightbulb</span>
                <h3 className="font-headline font-bold text-sm">Boost Your Score</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 group">
                  <span className="material-symbols-outlined text-primary-fixed-dim mt-0.5" data-icon="add_circle">add_circle</span>
                  <p className="text-sm text-on-surface-variant leading-relaxed">Add at least <span className="font-bold text-on-surface">3 quantifiable achievements</span> to your experience section (e.g., "Increased sales by 15%").</p>
                </li>
                <li className="flex items-start gap-3 group">
                  <span className="material-symbols-outlined text-primary-fixed-dim mt-0.5" data-icon="add_circle">add_circle</span>
                  <p className="text-sm text-on-surface-variant leading-relaxed">Include <span className="font-bold text-on-surface">"Cloud Computing"</span> or <span className="font-bold text-on-surface">"AWS"</span> keywords to match target roles.</p>
                </li>
              </ul>
            </div>
            {/* Personal Details Bento */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                  <span className="material-symbols-outlined" data-icon="person">person</span>
                </div>
                <h2 className="font-headline text-xl font-extrabold tracking-tight">Personal Details</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-label font-bold text-outline mb-1.5 uppercase tracking-wider">Full Name</label>
                  <input className="w-full bg-surface-container-lowest border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-container shadow-sm" type="text" defaultValue="Alex Rivera" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-label font-bold text-outline mb-1.5 uppercase tracking-wider">Job Title</label>
                  <input className="w-full bg-surface-container-lowest border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-container shadow-sm" type="text" defaultValue="Product Designer" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-label font-bold text-outline mb-1.5 uppercase tracking-wider">Professional Bio</label>
                  <textarea className="w-full bg-surface-container-lowest border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-container shadow-sm resize-none" rows={3} defaultValue={"Strategic product designer with 4+ years of experience in creating user-centric digital experiences for fintech and edutech sectors."} />
                </div>
              </div>
            </div>
            {/* Experience Bento */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-tertiary-container flex items-center justify-center text-on-tertiary-container">
                    <span className="material-symbols-outlined" data-icon="work">work</span>
                  </div>
                  <h2 className="font-headline text-xl font-extrabold tracking-tight">Experience</h2>
                </div>
                <button className="text-primary font-bold text-sm flex items-center gap-1 hover:underline">
                  <span className="material-symbols-outlined text-lg" data-icon="add">add</span> Add New
                </button>
              </div>
              <div className="space-y-4">
                {/* Experience Card 1 */}
                <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border-l-4 border-primary-container">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-headline font-bold text-on-surface">Senior Product Designer</h4>
                      <p className="text-xs text-outline font-medium">Fintech Solutions Inc. • Jan 2022 - Present</p>
                    </div>
                    <button className="text-outline-variant hover:text-error transition-colors">
                      <span className="material-symbols-outlined" data-icon="delete">delete</span>
                    </button>
                  </div>
                  <ul className="text-xs text-on-surface-variant space-y-2 list-disc list-inside">
                    <li>Led the redesign of the core mobile banking app, increasing DAU by 24%.</li>
                    <li>Collaborated with engineering to implement a unified design system.</li>
                  </ul>
                </div>
              </div>
            </div>
            {/* Skills Bento */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined" data-icon="psychology">psychology</span>
                </div>
                <h2 className="font-headline text-xl font-extrabold tracking-tight">Skills</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="bg-inverse-surface text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
                  Product Design <span className="material-symbols-outlined text-sm" data-icon="close">close</span>
                </span>
                <span className="bg-inverse-surface text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
                  UI/UX <span className="material-symbols-outlined text-sm" data-icon="close">close</span>
                </span>
                <span className="bg-inverse-surface text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
                  Figma <span className="material-symbols-outlined text-sm" data-icon="close">close</span>
                </span>
                <span className="bg-inverse-surface text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
                  React <span className="material-symbols-outlined text-sm" data-icon="close">close</span>
                </span>
                <button className="bg-surface-container-high text-on-surface px-3 py-1.5 rounded-full text-xs font-bold border-dashed border-2 border-outline-variant">
                  + Add Skill
                </button>
              </div>
            </div>
            <div className="pt-8 flex gap-4">
              <button className="flex-1 bg-primary text-on-primary py-4 rounded-full font-headline font-bold text-sm shadow-xl hover:scale-[1.02] transition-transform active:scale-95">
                Download PDF
              </button>
              <button className="px-6 bg-surface-container-high text-on-surface py-4 rounded-full font-headline font-bold text-sm hover:bg-surface-container-highest transition-colors">
                Share Link
              </button>
            </div>
          </div>
        </section>
        {/* Right Side: Live Preview (Canvas) */}
        <section className="flex-1 h-[calc(100vh-80px)] bg-surface-container p-6 lg:p-12 flex justify-center items-start overflow-y-auto">
          {/* The Resume "Paper" */}
          <div className="w-full max-w-[800px] bg-white aspect-[1/1.414] shadow-2xl rounded-sm origin-top transform scale-95 lg:scale-100 p-12 flex flex-col gap-8 relative overflow-hidden">
            {/* Decorative Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/10 rounded-bl-full" />
            {/* Resume Header */}
            <header className="flex justify-between items-end border-b-2 border-primary-container/20 pb-8">
              <div>
                <h1 className="font-headline text-4xl font-black text-on-surface leading-tight">ALEX RIVERA</h1>
                <p className="text-primary font-bold tracking-widest text-sm uppercase mt-1">Product Designer</p>
              </div>
              <div className="text-right text-xs text-outline space-y-1">
                <p className="flex items-center justify-end gap-2">alex.rivera@email.com <span className="material-symbols-outlined text-sm" data-icon="mail">mail</span></p>
                <p className="flex items-center justify-end gap-2">+1 (555) 012-3456 <span className="material-symbols-outlined text-sm" data-icon="call">call</span></p>
                <p className="flex items-center justify-end gap-2">San Francisco, CA <span className="material-symbols-outlined text-sm" data-icon="location_on">location_on</span></p>
              </div>
            </header>
            {/* Resume Body */}
            <div className="flex flex-col gap-8">
              {/* Summary */}
              <section>
                <h3 className="text-xs font-label font-bold text-primary mb-2 uppercase tracking-[0.2em]">Profile</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Strategic product designer with 4+ years of experience in creating user-centric digital experiences for fintech and edutech sectors. Proven track record of improving user engagement and streamlining complex workflows.
                </p>
              </section>
              {/* Work Experience */}
              <section className="space-y-4">
                <h3 className="text-xs font-label font-bold text-primary mb-4 uppercase tracking-[0.2em]">Experience</h3>
                <div className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:w-1.5 before:h-1.5 before:bg-primary-container before:rounded-full">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-bold text-on-surface text-sm">Senior Product Designer</h4>
                    <span className="text-[10px] font-bold text-outline">2022 — Present</span>
                  </div>
                  <p className="text-xs font-semibold text-on-surface-variant italic mb-2">Fintech Solutions Inc.</p>
                  <ul className="text-[11px] text-on-surface-variant space-y-2 list-disc list-outside ml-4">
                    <li>Led the end-to-end redesign of the flagship mobile application, resulting in a 24% increase in daily active users within 6 months.</li>
                    <li>Developed and maintained a comprehensive Figma design system used by 15+ cross-functional squad members.</li>
                    <li>Conducted 40+ moderated user research sessions to identify pain points in the onboarding funnel.</li>
                  </ul>
                </div>
                <div className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:w-1.5 before:h-1.5 before:bg-outline-variant before:rounded-full">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-bold text-on-surface text-sm">Junior UI Designer</h4>
                    <span className="text-[10px] font-bold text-outline">2019 — 2021</span>
                  </div>
                  <p className="text-xs font-semibold text-on-surface-variant italic mb-2">Creative Cloud Studio</p>
                  <ul className="text-[11px] text-on-surface-variant space-y-2 list-disc list-outside ml-4">
                    <li>Assisted in the production of high-fidelity prototypes for enterprise SaaS clients.</li>
                    <li>Optimized visual assets for web performance, reducing load times by 30%.</li>
                  </ul>
                </div>
              </section>
              {/* Two Column Section */}
              <div className="grid grid-cols-2 gap-12">
                {/* Education */}
                <section>
                  <h3 className="text-xs font-label font-bold text-primary mb-4 uppercase tracking-[0.2em]">Education</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-on-surface text-[11px]">B.S. in Interaction Design</h4>
                      <p className="text-[10px] text-on-surface-variant">Stanford University • 2019</p>
                    </div>
                  </div>
                </section>
                {/* Skills List */}
                <section>
                  <h3 className="text-xs font-label font-bold text-primary mb-4 uppercase tracking-[0.2em]">Expertise</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <span className="text-[11px] font-bold text-on-surface">• Figma</span>
                    <span className="text-[11px] font-bold text-on-surface">• User Research</span>
                    <span className="text-[11px] font-bold text-on-surface">• React</span>
                    <span className="text-[11px] font-bold text-on-surface">• Prototyping</span>
                    <span className="text-[11px] font-bold text-on-surface">• Design Ops</span>
                    <span className="text-[11px] font-bold text-on-surface">• Agile</span>
                  </div>
                </section>
              </div>
            </div>
            {/* Footer Page Indicator */}
            <div className="absolute bottom-6 left-0 w-full text-center">
              <span className="text-[9px] font-bold tracking-widest text-outline uppercase">Page 1 of 1</span>
            </div>
          </div>
        </section>
      </main>
      {/* Floating Help Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button className="w-14 h-14 bg-inverse-surface text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform group">
          <span className="material-symbols-outlined" data-icon="psychology">psychology</span>
          <div className="absolute right-full mr-4 bg-inverse-surface text-white px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            AI Resume Assistant
          </div>
        </button>
      </div>
    </div>
    
  );
}
