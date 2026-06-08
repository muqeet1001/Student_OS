import React from 'react';
import SideNavBar from '../components/SideNavBar.jsx';

export default function Profile() {
  return (
    <div className="page-export page-profile bg-surface text-on-surface min-h-screen">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 right-0 w-[calc(100%-18rem)] z-30 bg-white/80 dark:bg-[#0e0e0e]/80 backdrop-blur-md flex justify-between items-center h-20 px-10">
        <div className="flex items-center gap-8">
          <span className="text-xl font-extrabold text-[#0e0e0e] dark:text-white brand-font">Student OS</span>
          <div className="hidden md:flex gap-6 items-center">
            <a className="text-gray-500 font-plus-jakarta text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5 rounded-full px-3 py-1 transition-all" href="/dashboard">Dashboard</a>
            <a className="text-[#a83206] font-plus-jakarta text-sm font-bold hover:bg-gray-100 dark:hover:bg-white/5 rounded-full px-3 py-1 transition-all" href="/profile">Profile</a>
            <a className="text-gray-500 font-plus-jakarta text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5 rounded-full px-3 py-1 transition-all" href="/skill-test">Skill Test</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-stone-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-all active:scale-98">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 text-stone-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-all active:scale-98">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <div className="h-8 w-8 rounded-full bg-primary-container overflow-hidden">
            <img className="h-full w-full object-cover" data-alt="Portrait of a young male student smiling confidently with a modern blurred office background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDTednqR4FdHboq0S1yo1NtTPFX2ZzpnBO86QQKINwLltSgs5zgEIre6WVid9shBscRCrt9moi3rYDsnMcc2RLG1XrL65Dj6-ABab9BZENS-wQqeC2id6QNCKO9VscDo5_KDJhvGasIzzDPuUkMxl9ByhpYrqnMNHXwJ7dM_xz32YfLaea1WNYwoHAmmUGOSFR5aE9HtroP1vVdR8qDVhbv2XSgjyj1Y_dlJUtmGNT_gLmTZnPf3_HtdidCbTM2SAcffnH2unKAdGM" />
          </div>
        </div>
      </nav>
      {/* Side Navigation Bar (Desktop) */}
      <SideNavBar />
      {/* Main Content */}
      <main className="md:ml-72 pt-24 pb-12 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          {/* Profile Header Section */}
          <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-12">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="relative group">
                <div className="h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-surface-container-low shadow-xl overflow-hidden">
                  <img className="h-full w-full object-cover" data-alt="Close up portrait of a male student with glasses in a vibrant outdoor university setting with warm natural light" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWC8RYvURlX69AEq8EdIVUrAxhuROcg2myuMBASahjS5dIus9yN_oE8Dg5hCdaBJFA4RILFTn6jb7MGamXRyAYaWY7qEGExKncbFQ-fyI6GOck9OAXDe8mi8CPVCuHmyY80XtDPI7ggJ1mauOSvhM2JdHu4U_1Pi-kf9-0MNbcMnEzSU1lCOPgs4SyQTUMPc7pWOB6Dp6j2CrrOkcxcCcSfVv7q40ulpN2-y5f2ZxOztDrtx8GIcG-GyJ30o5GGWeaeabcc-nAPsQ" />
                </div>
                <button className="absolute bottom-2 right-2 p-2 bg-primary text-white rounded-full shadow-lg transform transition-transform group-hover:scale-110">
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-2">Arjun Malhotra</h1>
                <p className="text-lg font-medium text-stone-500 mb-4">Computer Science &amp; Engineering • Class of 2025</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                  <span className="px-4 py-1.5 bg-tertiary-container text-on-tertiary-container text-xs font-bold rounded-full tracking-wider uppercase">Technical Track</span>
                  <span className="px-4 py-1.5 bg-secondary-container text-on-secondary-container text-xs font-bold rounded-full tracking-wider uppercase">Top 1% Learner</span>
                </div>
              </div>
            </div>
            <button className="flex items-center gap-2 px-8 py-3 bg-inverse-surface text-surface rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-lg">
              <span className="material-symbols-outlined text-sm">edit_square</span>
              Edit Profile
            </button>
          </header>
          {/* Bento Grid Content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Skills Section (4 Cols) */}
            <section className="md:col-span-5 bg-surface-container-lowest rounded-xl p-8 shadow-[0px_24px_48px_rgba(14,14,14,0.04)]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">psychology</span>
                  Core Skills
                </h3>
                <span className="text-xs font-bold text-primary bg-primary-container/20 px-3 py-1 rounded-full">12 Verified</span>
              </div>
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Programming</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-4 py-2 bg-stone-100 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-orange-50 transition-colors cursor-default">
                      <img alt="JS" className="h-4 w-4" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHH6ORKTEJGR7wOQ16pZ8qU8wCkZlZFyWszxDQUOOQ-IbrrCI2Pjjy5BVsyA9cH007Vy3RVF1vbtGhSV_uKfaXAI08IrJigzdCyHAxiU_j2Zz2wWZTaq3Z9HR-8tsaJTnZo2YXtThln4i-Z8yEGyVK1fNVIk07ckV2cgWxqRG2Gz1HBCKq4lQg5bhvMcOKrpWoy2DkKaDVrHst7D88HRLv3ZQBwgP_3adsd6xil2nPa6gpudDdy_w7rbiHIJC3FePzAanMXNgieA8" /> JavaScript
                    </span>
                    <span className="px-4 py-2 bg-stone-100 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-orange-50 transition-colors cursor-default">
                      <img alt="Python" className="h-4 w-4" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9Twy1eqU-CmcVMVsxz6laIEidlFnuIqAXJ-3oXNWONW4adCWdZ359cJr0gnrZWoDlREXO8pmYAbS9biCCgI1CfaRkOamwPmEk0HnVsPKn7DeYW-xy73Zf-ZR_DzQ7c-jzJ7k9SkmkbPUQO8NEALgBQwde0KimzOS_hlSoQZSDWeCPR86r2Tbyd8cvXv4Gid3DEGTpOxslVISsRaMAEOwn-gCh_S0NxB6h0wPrm9CkKOwC7hKXGVvECeMLuw8xTJx9-36pWrryLGE" /> Python
                    </span>
                    <span className="px-4 py-2 bg-stone-100 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-orange-50 transition-colors cursor-default">
                      <img alt="C" className="h-4 w-4" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDKySbxcL028C3fShjeDNzwOhBtIOur-IdCduCIJ-Ldccvvteu7SSei6VBeBshoeVVyfZl325m26jt3e1gZyvhmr2w5Sum9652V4CPjAWBmv3JyN3aCg80teZIsKayjkjJIVATpm6-PVLNXs8hShv9p9gNwBibRvCiaEnpCZWZDF6zjjDYIFi4WQ9tVOmfSu0iTjyumU4urQWwO6XDcpOFxhuYjw0o5dnayK9XqZzftoQU6UCt8FgGX0Q8lXmRub80TBHq6XWRmwL8" /> C++
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Frontend &amp; UI</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-4 py-2 bg-tertiary-container/30 text-on-tertiary-container rounded-full text-sm font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">verified</span> React.js
                    </span>
                    <span className="px-4 py-2 bg-stone-100 rounded-full text-sm font-semibold">Tailwind CSS</span>
                    <span className="px-4 py-2 bg-stone-100 rounded-full text-sm font-semibold">Figma</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Soft Skills</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-4 py-2 bg-secondary-container/30 text-on-secondary-container rounded-full text-sm font-bold">Public Speaking</span>
                    <span className="px-4 py-2 bg-stone-100 rounded-full text-sm font-semibold">Team Leadership</span>
                  </div>
                </div>
              </div>
            </section>
            {/* Projects Section (7 Cols) */}
            <section className="md:col-span-7 bg-surface-container-lowest rounded-xl p-8 shadow-[0px_24px_48px_rgba(14,14,14,0.04)]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">rocket_launch</span>
                  Featured Projects
                </h3>
                <a className="text-sm font-bold text-primary flex items-center gap-1 hover:underline" href="#">View All <span className="material-symbols-outlined text-sm">arrow_forward</span></a>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Project Card 1 */}
                <div className="group bg-surface-container-low p-6 rounded-lg transition-all hover:bg-white hover:shadow-xl hover:-translate-y-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-primary">data_object</span>
                    </div>
                    <a className="text-stone-400 hover:text-black transition-colors" href="#">
                      <span className="material-symbols-outlined">link</span>
                    </a>
                  </div>
                  <h4 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">Algorithm Visualizer</h4>
                  <p className="text-stone-500 text-sm mb-4 line-clamp-2">A React application visualizing sorting and pathfinding algorithms in real-time.</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-stone-400 border border-stone-300 px-2 py-0.5 rounded uppercase">React</span>
                    <span className="text-[10px] font-bold text-stone-400 border border-stone-300 px-2 py-0.5 rounded uppercase">D3.js</span>
                  </div>
                </div>
                {/* Project Card 2 */}
                <div className="group bg-surface-container-low p-6 rounded-lg transition-all hover:bg-white hover:shadow-xl hover:-translate-y-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-primary">smart_toy</span>
                    </div>
                    <a className="text-stone-400 hover:text-black transition-colors" href="#">
                      <span className="material-symbols-outlined">link</span>
                    </a>
                  </div>
                  <h4 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">AI Content Engine</h4>
                  <p className="text-stone-500 text-sm mb-4 line-clamp-2">SaaS tool using OpenAI API to generate academic research summaries.</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-stone-400 border border-stone-300 px-2 py-0.5 rounded uppercase">Next.js</span>
                    <span className="text-[10px] font-bold text-stone-400 border border-stone-300 px-2 py-0.5 rounded uppercase">OpenAI</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-surface-container-high">
                <div className="flex items-center gap-4 bg-inverse-surface text-white p-4 rounded-xl">
                  <span className="material-symbols-outlined text-3xl">terminal</span>
                  <div className="flex-1">
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">GitHub Contribution</p>
                    <p className="text-sm font-medium">842 contributions in the last year</p>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 bg-primary-container rounded-sm" />
                    <div className="w-3 h-3 bg-primary-container rounded-sm" />
                    <div className="w-3 h-3 bg-primary rounded-sm" />
                    <div className="w-3 h-3 bg-primary-dim rounded-sm" />
                  </div>
                </div>
              </div>
            </section>
            {/* Certifications (8 Cols) */}
            <section className="md:col-span-8 bg-surface-container-lowest rounded-xl p-8 shadow-[0px_24px_48px_rgba(14,14,14,0.04)]">
              <h3 className="text-xl font-bold flex items-center gap-3 mb-8">
                <span className="material-symbols-outlined text-primary">workspace_premium</span>
                Certifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="p-4 bg-surface rounded-xl flex flex-col items-center text-center border-2 border-transparent hover:border-primary/20 transition-all cursor-pointer">
                  <div className="h-16 w-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-4 overflow-hidden">
                    <img alt="AWS" className="w-10 h-10 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAeSwyW0zGmYkWF04NSwSWoboYP263_IJYb8efRuX-jABO_JxOCi-T_umRlx0lD0zC0hvWB56DqUUYmcVlamqyJnl4mDr1BJx_blCA9RnZUC5qEakJCxB2y4MG4izs9qPfoNaGhyJ8H-zyEOv9JkAPtANBF995xvsOYLAA2jZkqp-ftZ19OAFh03mWa88k-n27Ws0NSJB_LtHXfZ1ZU0SuGPAdjf-BB9uiuQaHUzIyzS4dLwmHX6KGOZYjVg0BkmKK2MjBVLMWCmnk" />
                  </div>
                  <h5 className="font-bold text-sm">AWS Cloud Practitioner</h5>
                  <p className="text-[10px] text-stone-400 mt-1">ID: AWS-9302-LK</p>
                </div>
                <div className="p-4 bg-surface rounded-xl flex flex-col items-center text-center border-2 border-transparent hover:border-primary/20 transition-all cursor-pointer">
                  <div className="h-16 w-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-4 overflow-hidden">
                    <img alt="GCP" className="w-10 h-10 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYrFA2oCf5CgpFgfVamO4BKyODd0GMgRfEVOlTgJGImSt5eWNh8w3h5yFOlrHWyq63oaqz7vRMvgxRk8BEZYC1LfVAUykwKIv5ZC3qrWgQ4_2xDwDzz4d3qpL3ee5E4Tp3oMCb9wVcPpLlwN5F7oMZui4aLOY7DPAxtc-89N6APj1AORtoSz9Cr5rCYy1Sv3WypvVWYk8NqZV6vGSRYt55wVXV1U-g1V82FwrlUU99a3B60L0jLwk8897hG8C59CSxM1Yd63QkXTo" />
                  </div>
                  <h5 className="font-bold text-sm">GCP Associate Engineer</h5>
                  <p className="text-[10px] text-stone-400 mt-1">ID: GCP-4412-OP</p>
                </div>
                {/* Upload Area */}
                <div className="p-4 border-2 border-dashed border-outline-variant/30 rounded-xl flex flex-col items-center justify-center text-center hover:bg-stone-50 transition-colors group cursor-pointer">
                  <span className="material-symbols-outlined text-3xl text-outline-variant group-hover:text-primary mb-2">upload_file</span>
                  <h5 className="font-bold text-xs text-stone-500">Upload New</h5>
                  <p className="text-[10px] text-stone-400 mt-1">PDF, JPG up to 5MB</p>
                </div>
              </div>
            </section>
            {/* Experience/Stats (4 Cols) */}
            <section className="md:col-span-4 bg-primary text-white rounded-xl p-8 shadow-[0px_24px_48px_rgba(14,14,14,0.1)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full pointer-events-none" />
              <h3 className="text-xl font-bold mb-8 relative z-10">Quick Stats</h3>
              <div className="space-y-8 relative z-10">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Global Rank</p>
                    <p className="text-3xl font-black">#248</p>
                  </div>
                  <span className="text-[10px] bg-white/20 px-2 py-1 rounded-full">+12 this week</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Lessons Done</p>
                    <p className="text-3xl font-black">142</p>
                  </div>
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 rounded-full border-2 border-primary overflow-hidden">
                      <img className="w-full h-full object-cover" data-alt="Female student profile avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCwQBzWHrYF-h4pEQGZZVJjjk3d-T7x9N2xzfFZ3V8uXdAgnECZLmEQy4QsYtFW7h2sR6CHS5F_YRjQmlmKphmj9vKbizqyfUocW7XsJdSVUocsu6neotPY4er3UMQ7xAh-HQOCmAYhw1JmA2vFUKDj7dCDFBwyq8T42edBu2vwA3f-iS7EhvW4c_GNhmH8j9e3ptRaoLTSU2EfQiFfnsDILP3Mxsmeq24lwS_UE-4laX9FmgMBoKliI6WNajKTTQhOjxhyFelICfo" />
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-primary bg-primary-container flex items-center justify-center text-[8px] font-bold">+5</div>
                  </div>
                </div>
                <div className="pt-4">
                  <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Platform Activity</p>
                  <div className="h-1.5 w-full bg-white/20 rounded-full">
                    <div className="h-full w-[85%] bg-white rounded-full" />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
      {/* Mobile Navigation Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg px-6 h-20 flex items-center justify-between border-t border-surface-container-high z-50">
        <button className="flex flex-col items-center gap-1 text-stone-400">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-orange-600">
          <span className="material-symbols-outlined" style={{fontVariationSettings: '"FILL" 1'}}>person</span>
          <span className="text-[10px] font-bold">Profile</span>
        </button>
        <button className="relative -top-8 h-14 w-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-stone-400">
          <span className="material-symbols-outlined">quiz</span>
          <span className="text-[10px] font-bold">Tests</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-stone-400">
          <span className="material-symbols-outlined">description</span>
          <span className="text-[10px] font-bold">Resume</span>
        </button>
      </nav>
    </div>
    
  );
}
